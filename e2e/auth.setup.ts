import { test as setup, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

import { api } from "../convex/_generated/api";

import {
  AUTH_PROVIDER,
  createClerkTestUser,
  signInViaClerkUI,
} from "./lib/auth-helper";

const authFile = path.join(__dirname, ".auth/user.json");
const authUserFile = path.join(__dirname, ".auth/user-meta.json");

// Check if persistent test user credentials are configured
const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;
const E2E_SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function getClerkUserIdByEmail(email: string): Promise<string> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required to look up Clerk E2E users");
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to look up Clerk user for E2E bootstrap: ${response.status} ${await response.text()}`,
    );
  }

  const users = (await response.json()) as Array<{ id?: string }>;
  const userId = users[0]?.id;
  if (!userId) {
    throw new Error(`No Clerk user found for ${email}`);
  }

  return userId;
}

async function provisionConvexDashboardWorkspaceForUser(args: {
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}) {
  if (AUTH_PROVIDER !== "clerk") {
    throw new Error("provisionConvexDashboardWorkspaceForUser() is only available in Clerk mode");
  }

  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for Convex E2E bootstrap");
  }

  if (!E2E_SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for Convex E2E bootstrap");
  }

  const convex = new ConvexHttpClient(CONVEX_URL);
  return convex.mutation(api.seed.provisionE2EDashboardWorkspace, {
    secret: E2E_SEED_SECRET,
    clerkUserId: args.clerkUserId,
    email: args.email,
    firstName: args.firstName,
    lastName: args.lastName,
  });
}

function writeAuthUserMeta(args: {
  clerkUserId: string;
  email: string;
  password: string;
  workspaceId: string;
  listingId: string;
}) {
  fs.mkdirSync(path.dirname(authUserFile), { recursive: true });
  fs.writeFileSync(authUserFile, JSON.stringify(args, null, 2));
}

function readAuthUserMeta():
  | {
      clerkUserId: string;
      email: string;
      password: string;
      workspaceId: string;
      listingId: string;
    }
  | null {
  if (!fs.existsSync(authUserFile)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(authUserFile, "utf8")) as Partial<{
      clerkUserId: string;
      email: string;
      password: string;
      workspaceId: string;
      listingId: string;
    }>;

    if (
      parsed.clerkUserId &&
      parsed.email &&
      parsed.password &&
      parsed.workspaceId &&
      parsed.listingId
    ) {
      return {
        clerkUserId: parsed.clerkUserId,
        email: parsed.email,
        password: parsed.password,
        workspaceId: parsed.workspaceId,
        listingId: parsed.listingId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Authentication setup — two strategies:
 *
 * 1. API sign-in (fast, ~50ms): When E2E_USER_EMAIL + E2E_USER_PASSWORD are set.
 *    Uses the persistent test user created by `npm run seed:test-user`.
 *
 * 2. UI sign-up (slow, ~3s): Fallback when env vars are not set.
 *    Creates a throwaway user via the sign-up form each run.
 */
if (E2E_EMAIL && E2E_PASSWORD) {
  // ─── Strategy 1: API sign-in with persistent test user ────────────────
  setup("authenticate", async ({ page }) => {
    if (AUTH_PROVIDER === "clerk") {
      console.log(`Signing in via Clerk UI: ${E2E_EMAIL}`);
      await signInViaClerkUI(page, E2E_EMAIL, E2E_PASSWORD);
      const clerkUserId = await getClerkUserIdByEmail(E2E_EMAIL);
      const workspace = await provisionConvexDashboardWorkspaceForUser({
        clerkUserId,
        email: E2E_EMAIL,
        firstName: "E2E",
        lastName: "User",
      });
      writeAuthUserMeta({
        clerkUserId,
        email: E2E_EMAIL,
        password: E2E_PASSWORD,
        workspaceId: workspace.workspaceId,
        listingId: workspace.listingId,
      });
      await page.context().storageState({ path: authFile });
      console.log("Auth setup complete (Clerk UI) — session saved");
      return;
    }

    console.log(`Signing in via API: ${E2E_EMAIL}`);

    // Dynamic import to avoid loading extra auth helpers in the UI path
    const { signInViaAPI } = await import("./lib/auth-helper");
    const storageState = await signInViaAPI(E2E_EMAIL, E2E_PASSWORD);

    // Write storage state file for other tests to use
    const fs = await import("fs");
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));

    console.log("Auth setup complete (API) — session saved");
  });
} else {
  // ─── Strategy 2: UI sign-up fallback ──────────────────────────────────
  setup("authenticate", async ({ page }) => {
    const existingAuthUser = readAuthUserMeta();
    if (AUTH_PROVIDER === "clerk" && existingAuthUser) {
      console.log(`Reusing Clerk test user: ${existingAuthUser.email}`);
      const workspace = await provisionConvexDashboardWorkspaceForUser({
        clerkUserId: existingAuthUser.clerkUserId,
        email: existingAuthUser.email,
        firstName: "E2E",
        lastName: "User",
      });
      await signInViaClerkUI(
        page,
        existingAuthUser.email,
        existingAuthUser.password,
      );
      await page.context().storageState({ path: authFile });
      writeAuthUserMeta({
        clerkUserId: existingAuthUser.clerkUserId,
        email: existingAuthUser.email,
        password: existingAuthUser.password,
        workspaceId: workspace.workspaceId,
        listingId: workspace.listingId,
      });
      console.log("Auth setup complete (Clerk reused user) — session saved");
      return;
    }

    const timestamp = Date.now();
    const testEmail = `e2e-test+clerk_test-${timestamp}@test.findabatherapy.com`;
    const testPassword = `TestPass123!${timestamp}`;

    if (AUTH_PROVIDER === "clerk") {
      console.log(`Creating Clerk test user via Backend API: ${testEmail}`);
      const testUser = await createClerkTestUser(testEmail, testPassword);
      const workspace = await provisionConvexDashboardWorkspaceForUser({
        clerkUserId: testUser.id,
        email: testUser.email,
        firstName: "E2E",
        lastName: "User",
      });
      await page.waitForTimeout(1000);
      await signInViaClerkUI(page, testEmail, testPassword);
      await page.context().storageState({ path: authFile });

      process.env.TEST_USER_EMAIL = testEmail;
      process.env.TEST_USER_PASSWORD = testPassword;

      writeAuthUserMeta({
        clerkUserId: testUser.id,
        email: testUser.email,
        password: testPassword,
        workspaceId: workspace.workspaceId,
        listingId: workspace.listingId,
      });

      console.log("Auth setup complete (Clerk generated user) — session saved");
      return;
    }

    console.log(`Creating test account via UI: ${testEmail}`);

    await page.goto("/auth/sign-up");

    // Fill signup form
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);

    // Accept terms
    const termsCheckbox = page.getByRole("checkbox").first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Submit — wait for Turnstile to pass
    const submitButton = page.getByRole("button", {
      name: "Continue",
      exact: true,
    });
    await submitButton.waitFor({ state: "visible" });
    await expect(submitButton).toBeEnabled({ timeout: 15000 });
    await submitButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    console.log("Account created, verifying session...");
    await expect(page).toHaveURL(/\/dashboard/);

    // Save storage state for other tests
    await page.context().storageState({ path: authFile });

    process.env.TEST_USER_EMAIL = testEmail;
    process.env.TEST_USER_PASSWORD = testPassword;

    console.log("Auth setup complete (UI) — session saved");
  });
}
