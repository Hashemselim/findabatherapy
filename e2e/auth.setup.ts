import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authentication setup - creates a test account and saves auth state
 *
 * This setup:
 * 1. Creates a new test account with a unique email
 * 2. Signs in with that account
 * 3. Saves the session for reuse across tests
 *
 * The test account email is generated fresh each run to avoid conflicts.
 * In dev environment, Turnstile passes automatically and no email verification is required.
 */
setup("authenticate", async ({ page }) => {
  // Generate unique test credentials for this run
  const timestamp = Date.now();
  const testEmail = `e2e-test-${timestamp}@test.findabatherapy.com`;
  const testPassword = `TestPass123!${timestamp}`;

  console.log(`Creating test account: ${testEmail}`);

  // Step 1: Sign up
  await page.goto("/auth/sign-up");

  // Fill signup form
  await page.getByLabel("Email").fill(testEmail);
  await page.getByLabel("Password").fill(testPassword);

  // Accept terms
  const termsCheckbox = page.getByRole("checkbox").first();
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }

  // Submit signup form
  await page.getByRole("button", { name: /sign up|create account|get started/i }).click();

  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  console.log("Account created successfully, verifying session...");

  // Verify we're logged in
  await expect(page).toHaveURL(/\/dashboard/);

  // Save storage state for other tests
  await page.context().storageState({ path: authFile });

  // Store credentials in environment for potential reuse
  process.env.TEST_USER_EMAIL = testEmail;
  process.env.TEST_USER_PASSWORD = testPassword;

  console.log("Auth setup complete - session saved");
});
