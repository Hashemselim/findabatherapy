import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

// Check if persistent test user credentials are configured
const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;

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
  setup("authenticate", async ({}) => {
    console.log(`Signing in via API: ${E2E_EMAIL}`);

    // Dynamic import to avoid loading dotenv/supabase in non-API path
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
    const timestamp = Date.now();
    const testEmail = `e2e-test-${timestamp}@test.findabatherapy.com`;
    const testPassword = `TestPass123!${timestamp}`;

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
