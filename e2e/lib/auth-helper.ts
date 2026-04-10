import dotenv from "dotenv";
import path from "path";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Load .env.local for credentials
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "clerk";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Supabase helpers (used when AUTH_PROVIDER=supabase)
// ---------------------------------------------------------------------------

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for test user management");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Gets a Supabase admin client (service role key) for user management.
 * In Clerk mode, throws — use Clerk testing utilities instead.
 */
export function getAdminClient() {
  if (AUTH_PROVIDER === "clerk") {
    throw new Error(
      "getAdminClient() is not available in Clerk mode. " +
      "Use Clerk testing utilities for E2E auth."
    );
  }
  return getSupabaseAdminClient();
}

/**
 * Signs in via the appropriate auth provider API and returns a storage state
 * compatible with Playwright's `use({ storageState })`.
 */
export async function signInViaAPI(
  email: string,
  password: string
): Promise<{
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}> {
  if (AUTH_PROVIDER === "clerk") {
    throw new Error(
      "[E2E] Clerk auth mode requires a real Playwright sign-in helper " +
        "or a pre-generated Clerk storage state. signInViaAPI() cannot " +
        "safely synthesize Clerk session cookies from email/password."
    );
  }

  // Supabase mode
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sign-in failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Extract the project ref from the Supabase URL for cookie naming
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  // Build the auth token value that Supabase SSR expects
  const tokenValue = JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
  });

  // Supabase SSR splits cookies into chunks — base64 encode the value
  const base64Value = Buffer.from(tokenValue).toString("base64");

  return {
    cookies: [
      {
        name: `${cookieName}.0`,
        value: `base64-${base64Value}`,
        domain: "localhost",
        path: "/",
        expires: data.expires_at ?? -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

function getBaseUrl() {
  return process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
}

async function getClerkSignInTokenUrl(
  email: string,
  pathOrUrl = "/auth/sign-in",
): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const users = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const userId = users.data[0]?.id;
  if (!userId) {
    return null;
  }

  const signInToken = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 600,
  });

  const targetUrl = /^https?:\/\//.test(pathOrUrl)
    ? new URL(pathOrUrl)
    : new URL(
        pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`,
        getBaseUrl(),
      );
  targetUrl.searchParams.set("__clerk_ticket", signInToken.token);
  return targetUrl.toString();
}

async function fillFirstVisible(
  page: Page,
  selectors: string[],
  value: string,
) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return true;
    }
  }

  return false;
}

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }

  return false;
}

async function clickAuthSubmitButton(page: Page) {
  const exactButtonNames = [/^Continue$/i, /^Sign in$/i];
  for (const name of exactButtonNames) {
    const button = page.getByRole("button", { name }).first();
    if ((await button.count()) > 0 && await button.isVisible().catch(() => false)) {
      await button.click();
      return true;
    }
  }

  return clickFirstVisible(page, [
    'button[type="submit"]',
    'button[data-localization-key*="formButtonPrimary"]',
  ]);
}

export async function signInViaClerkUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  if (AUTH_PROVIDER !== "clerk") {
    throw new Error("signInViaClerkUI() is only available when AUTH_PROVIDER=clerk");
  }

  const signInTokenUrl = await getClerkSignInTokenUrl(email, "/auth/sign-in");
  if (signInTokenUrl) {
    await page.goto(signInTokenUrl, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/(dashboard|auth\/callback)(\/|$)/, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });
    if (/\/auth\/callback(\/|$)/.test(page.url())) {
      await page.waitForURL(/\/dashboard(\/|$)/, {
        timeout: 30000,
        waitUntil: "domcontentloaded",
      });
    }
    return;
  }

  await page.goto(`${getBaseUrl()}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await page
    .locator(
      [
        'input[name="identifier"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[autocomplete="username"]',
      ].join(", "),
    )
    .first()
    .waitFor({ state: "visible", timeout: 15000 });

  const emailFilled = await fillFirstVisible(
    page,
    [
      'input[name="identifier"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
    ],
    email,
  );

  if (!emailFilled) {
    throw new Error("[E2E] Clerk sign-in email field not found");
  }

  const passwordLocator = page
    .locator(
      [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]',
      ].join(", "),
    )
    .first();

  if (!(await passwordLocator.isVisible().catch(() => false))) {
    await clickAuthSubmitButton(page);
  }

  await passwordLocator.waitFor({ state: "visible", timeout: 15000 });
  await passwordLocator.fill(password);

  const submitted = await clickAuthSubmitButton(page);
  if (!submitted) {
    throw new Error("[E2E] Clerk sign-in submit button not found");
  }

  const verificationCodeInput = page.getByLabel("Enter verification code");
  let authResult: "redirected" | "verification-required" | null = null;
  const authDeadline = Date.now() + 30000;

  while (Date.now() < authDeadline) {
    if (/\/(dashboard|auth\/callback)(\/|$)/.test(page.url())) {
      authResult = "redirected";
      break;
    }

    if (await verificationCodeInput.isVisible().catch(() => false)) {
      authResult = "verification-required";
      break;
    }

    await page.waitForTimeout(250);
  }

  if (!authResult) {
    throw new Error(
      `[E2E] Clerk sign-in did not reach dashboard or verification prompt. url=${page.url()}`,
    );
  }

  if (authResult === "verification-required") {
    await verificationCodeInput.click();
    await verificationCodeInput.fill("424242");

    const verificationValue = await verificationCodeInput.inputValue().catch(() => "");
    if (verificationValue.replace(/\D/g, "") !== "424242") {
      await verificationCodeInput.pressSequentially("424242", { delay: 50 });
    }

    const redirectedAfterCodeEntry = await page
      .waitForURL(/\/(dashboard|auth\/callback)(\/|$)/, {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      })
      .then(() => true)
      .catch(() => false);

    if (!redirectedAfterCodeEntry) {
      const factorSubmitted = await clickAuthSubmitButton(page);
      if (!factorSubmitted) {
        throw new Error("[E2E] Clerk factor-two submit button not found");
      }

      await page.waitForURL(/\/(dashboard|auth\/callback)(\/|$)/, {
        timeout: 30000,
        waitUntil: "domcontentloaded",
      });
    }
  }

  if (/\/auth\/callback(\/|$)/.test(page.url())) {
    await page.waitForURL(/\/dashboard(\/|$)/, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });
  }
}

export async function signInViaClerkPath(
  page: Page,
  pathOrUrl: string,
  email: string,
  password: string,
  destinationPattern?: RegExp,
): Promise<void> {
  if (AUTH_PROVIDER !== "clerk") {
    throw new Error("signInViaClerkPath() is only available when AUTH_PROVIDER=clerk");
  }

  const url = /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${getBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  const signInTokenUrl = await getClerkSignInTokenUrl(email, url);
  if (signInTokenUrl) {
    await page.goto(signInTokenUrl, { waitUntil: "domcontentloaded" });
    await page.waitForURL(destinationPattern ?? /\/(portal|auth\/callback)(\/|$)/, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });
    return;
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page
    .locator(
      [
        'input[name="identifier"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[autocomplete="username"]',
      ].join(", "),
    )
    .first()
    .waitFor({ state: "visible", timeout: 15000 });

  const emailFilled = await fillFirstVisible(
    page,
    [
      'input[name="identifier"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
    ],
    email,
  );

  if (!emailFilled) {
    throw new Error("[E2E] Clerk custom-path sign-in email field not found");
  }

  const passwordLocator = page
    .locator(
      [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]',
      ].join(", "),
    )
    .first();

  if (!(await passwordLocator.isVisible().catch(() => false))) {
    await clickAuthSubmitButton(page);
  }

  if ((await passwordLocator.count()) > 0 && await passwordLocator.isVisible().catch(() => false)) {
    await passwordLocator.fill(password);
    const clicked = await clickAuthSubmitButton(page);
    if (!clicked) {
      throw new Error("[E2E] Clerk custom-path sign-in submit button not found");
    }
  }

  await page.waitForURL(destinationPattern ?? /\/(portal|auth\/callback)(\/|$)/, {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });
}

export async function createClerkTestUser(
  email: string,
  password: string,
): Promise<TestUser> {
  if (AUTH_PROVIDER !== "clerk") {
    throw new Error("createClerkTestUser() is only available when AUTH_PROVIDER=clerk");
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to create Clerk E2E test users");
  }

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const user = await clerk.users.createUser({
    emailAddress: [email],
    firstName: "E2E",
    lastName: "User",
    password,
    skipPasswordChecks: true,
    skipLegalChecks: true,
  });

  return {
    id: user.id,
    email,
    password,
  };
}

export async function deleteClerkTestUser(userId: string): Promise<void> {
  if (AUTH_PROVIDER !== "clerk") {
    return;
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to delete Clerk E2E test users");
  }

  const { createClerkClient } = await import("@clerk/backend");
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  await clerk.users.deleteUser(userId);
}
