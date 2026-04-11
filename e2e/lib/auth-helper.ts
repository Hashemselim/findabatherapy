import dotenv from "dotenv";
import path from "path";
import type { Page } from "@playwright/test";

// Load .env.local for credentials
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export const AUTH_PROVIDER = "clerk" as const;

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export function getAdminClient() {
  throw new Error(
    "getAdminClient() has been removed. E2E auth is Clerk-only now.",
  );
}

export async function signInViaAPI(
  _email: string,
  _password: string
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
  throw new Error(
    "signInViaAPI() has been removed. Use Clerk browser sign-in helpers instead.",
  );
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
