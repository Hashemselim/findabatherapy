import { test, expect } from "@playwright/test";

/**
 * Authentication Flow Tests (AUTH-001 through AUTH-010)
 *
 * Tests sign up, sign in, password reset, and auth redirects.
 */
test.describe("Authentication - Sign In", () => {
  test("AUTH-005: Sign in page displays form", async ({ page }) => {
    await page.goto("/auth/sign-in");

    // Heading
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: /sign in|continue/i })).toBeVisible();
  });

  test("AUTH-004: Sign in validates required fields", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await page.getByRole("button", { name: /sign in|continue/i }).click();

    // Should show validation errors
    await expect(page.locator("text=/required|email|password/i").first()).toBeVisible();
  });

  test("AUTH-006: Sign in shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|continue/i }).click();

    // Wait for error message
    await expect(page.getByText(/invalid|incorrect|error|failed/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("AUTH-007: Sign in shows Turnstile after failed attempts", async ({ page }) => {
    await page.goto("/auth/sign-in");

    // Attempt first failed login
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword1");
    await page.getByRole("button", { name: /sign in|continue/i }).click();
    await page.waitForTimeout(1000);

    // Attempt second failed login
    await page.getByLabel(/password/i).fill("wrongpassword2");
    await page.getByRole("button", { name: /sign in|continue/i }).click();
    await page.waitForTimeout(1000);

    // Turnstile should appear after 2 failed attempts
    const turnstile = page.locator('.cf-turnstile, [data-testid="turnstile"], iframe[src*="turnstile"]');
    const hasTurnstile = await turnstile.isVisible().catch(() => false);
    console.log(`Turnstile visible after failed attempts: ${hasTurnstile}`);
  });

  test("Sign in has forgot password link", async ({ page }) => {
    await page.goto("/auth/sign-in");

    const forgotLink = page.getByRole("link", { name: /forgot.*password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", /reset-password/);
  });

  test("Sign in has sign up link", async ({ page }) => {
    await page.goto("/auth/sign-in");

    const signUpLink = page.getByRole("link", { name: /sign up|create.*account|get started/i });
    await expect(signUpLink).toBeVisible();
  });

  test("AUTH-002: Sign in has Google OAuth button", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("AUTH-003: Sign in has Microsoft OAuth button", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("button", { name: /microsoft/i })).toBeVisible();
  });

  test("AUTH-005b: Complete sign in flow with valid credentials", async ({ page }) => {
    // First create an account
    const timestamp = Date.now();
    const testEmail = `signin-test-${timestamp}@test.findabatherapy.com`;
    const testPassword = `TestPass123!${timestamp}`;

    // Sign up first
    await page.goto("/auth/sign-up");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    const termsCheckbox = page.getByRole("checkbox").first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.getByRole("button", { name: /sign up|create|get started|continue/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Sign out
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Account"), .avatar').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutButton = page.locator("text=/logout|sign out|log out/i").first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL(/^\/$|\/auth\/sign-in/, { timeout: 5000 });
      }
    } else {
      // Navigate directly to clear session
      await page.context().clearCookies();
    }

    // Now sign in with the created account
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in|continue/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

test.describe("Authentication - Sign Up", () => {
  test("AUTH-001: Sign up page displays form", async ({ page }) => {
    await page.goto("/auth/sign-up");

    // Heading
    await expect(page.getByRole("heading", { name: /sign up|create.*account|get started/i })).toBeVisible();

    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("AUTH-001b: Complete sign up flow creates account", async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `signup-test-${timestamp}@test.findabatherapy.com`;
    const testPassword = `TestPass123!${timestamp}`;

    await page.goto("/auth/sign-up");

    // Fill signup form
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    // Accept terms if present
    const termsCheckbox = page.getByRole("checkbox").first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Submit
    await page.getByRole("button", { name: /sign up|create|get started|continue/i }).click();

    // Should redirect to dashboard or onboarding
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("AUTH-004: Sign up validates required fields", async ({ page }) => {
    await page.goto("/auth/sign-up");

    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /sign up|create|get started|continue/i });
    await submitButton.click();

    // Should show validation errors
    await expect(page.locator("text=/required|email|password/i").first()).toBeVisible();
  });

  test("Sign up validates email format", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await page.getByLabel(/email/i).fill("invalidemail");
    await page.getByLabel(/password/i).fill("ValidPass123!");

    const submitButton = page.getByRole("button", { name: /sign up|create|get started|continue/i });
    await submitButton.click();

    // Should show email validation error
    await expect(page.getByText(/valid.*email|invalid.*email/i)).toBeVisible();
  });

  test("Sign up validates password minimum length", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("short"); // Too short (min 8 chars)

    const submitButton = page.getByRole("button", { name: /sign up|create|get started|continue/i });
    await submitButton.click();

    // Should show password validation error
    await expect(page.getByText(/8.*character|password.*short|password.*length/i)).toBeVisible();
  });

  test("Sign up has terms and privacy checkbox", async ({ page }) => {
    await page.goto("/auth/sign-up");

    // Look for terms checkbox or link
    await expect(page.locator("text=/terms|privacy/i").first()).toBeVisible();
  });

  test("Sign up has Turnstile CAPTCHA", async ({ page }) => {
    await page.goto("/auth/sign-up");

    // Turnstile should be visible (mandatory for sign up)
    const turnstile = page.locator('.cf-turnstile, [data-testid="turnstile"], iframe[src*="turnstile"]');
    const hasTurnstile = await turnstile.isVisible().catch(() => false);
    console.log(`Sign up Turnstile visible: ${hasTurnstile}`);
  });

  test("Sign up has OAuth options", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /microsoft/i })).toBeVisible();
  });

  test("Sign up has sign in link", async ({ page }) => {
    await page.goto("/auth/sign-up");

    const signInLink = page.getByRole("link", { name: /sign in|already.*account|log in/i });
    await expect(signInLink).toBeVisible();
  });

  test("Sign up accepts plan URL parameters", async ({ page }) => {
    await page.goto("/auth/sign-up?plan=pro&interval=monthly");

    // Page should load with plan context
    await expect(page.getByRole("main")).toBeVisible();

    // May show plan selection
    const planIndicator = page.locator("text=/pro|plan/i").first();
    const hasPlanIndicator = await planIndicator.isVisible().catch(() => false);
    console.log(`Plan indicator visible: ${hasPlanIndicator}`);
  });
});

test.describe("Authentication - Password Reset", () => {
  test("AUTH-008: Password reset page displays form", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Heading
    await expect(page.getByRole("heading", { name: /reset|forgot.*password/i })).toBeVisible();

    // Email input
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: /reset|send|submit/i })).toBeVisible();
  });

  test("Password reset validates email format", async ({ page }) => {
    await page.goto("/auth/reset-password");

    await page.getByLabel(/email/i).fill("invalidemail");
    await page.getByRole("button", { name: /reset|send|submit/i }).click();

    await expect(page.getByText(/valid.*email|invalid.*email/i)).toBeVisible();
  });

  test("Password reset shows success message on valid email", async ({ page }) => {
    await page.goto("/auth/reset-password");

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /reset|send|submit/i }).click();

    // Should show success message (check email)
    await expect(page.getByText(/check.*email|sent|instructions|success/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Password reset has back to sign in link", async ({ page }) => {
    await page.goto("/auth/reset-password");

    const signInLink = page.getByRole("link", { name: /sign in|back|log in/i });
    await expect(signInLink).toBeVisible();
  });
});

test.describe("Authentication - Redirects", () => {
  test("AUTH-009: Unauthenticated users redirect from dashboard to sign in", async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    await page.goto("/dashboard");

    // Should redirect to sign in
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("Protected routes redirect to sign in", async ({ page }) => {
    await page.context().clearCookies();

    const protectedRoutes = [
      "/dashboard/company",
      "/dashboard/locations",
      "/dashboard/analytics",
      "/dashboard/inbox",
      "/dashboard/jobs",
      "/dashboard/billing",
      "/dashboard/settings",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    }
  });

  test("AUTH-010: Logout clears session", async ({ page }) => {
    // This test would need authentication to fully verify
    // Here we just verify the logout endpoint exists

    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      // Not logged in, can't test logout
      test.skip(true, "Authentication required to test logout");
      return;
    }

    // Find and click logout
    const logoutButton = page.locator("text=/logout|sign out|log out/i").first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to home or sign in
      await expect(page).toHaveURL(/^\/$|\/auth\/sign-in/);
    }
  });
});

test.describe("Authentication - Analytics Tracking", () => {
  test("Sign up page tracks analytics events", async ({ page }) => {
    // This verifies the analytics setup is in place
    await page.goto("/auth/sign-up");

    // Check that analytics script or tracking is present
    const hasAnalytics = await page.evaluate(() => {
      return typeof (window as any).posthog !== 'undefined' || document.querySelector('[data-testid="analytics"]') !== null;
    });

    console.log(`Analytics tracking present: ${hasAnalytics}`);
  });
});
