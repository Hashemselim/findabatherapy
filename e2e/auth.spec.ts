import { test, expect, type Page } from "@playwright/test";

import { BASE_URL, loadSessionUser } from "./lib/convex-e2e";
import { signInViaClerkUI } from "./lib/auth-helper";

const EMPTY_STORAGE_STATE = { cookies: [], origins: [] };

function credentialInput(page: Page) {
  return page
    .locator(
      [
        'input[name="identifier"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[autocomplete="username"]',
      ].join(", "),
    )
    .first();
}

function passwordInput(page: Page) {
  return page
    .locator(
      [
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete*="password"]',
      ].join(", "),
    )
    .first();
}

function primaryAuthButton(page: Page) {
  return page
    .locator(
      [
        'button:has-text("Continue")',
        'button:has-text("Sign in")',
        'button:has-text("Sign up")',
        'button[type="submit"]',
      ].join(", "),
    )
    .first();
}

async function expectClerkAuthScreen(
  page: Page,
  pathname: "/auth/sign-in" | "/auth/sign-up",
) {
  await expect(page).toHaveURL(new RegExp(`${pathname.replace("/", "\\/")}`));
  if (pathname === "/auth/sign-in") {
    await expect(credentialInput(page)).toBeVisible({ timeout: 15000 });
    const password = passwordInput(page);
    if (await password.count()) {
      await expect(password).toBeVisible({ timeout: 15000 });
    } else {
      await expect(primaryAuthButton(page)).toBeVisible({ timeout: 15000 });
    }
    return;
  }

  await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("textbox", { name: "First name", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("textbox", { name: "Email address", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test.use({ storageState: EMPTY_STORAGE_STATE });

test.describe("Authentication", () => {
  test("redirects protected routes to sign in with return path", async ({ page }) => {
    await page.goto("/dashboard/company", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/auth\/sign-in\?redirect=%2Fdashboard%2Fcompany/);
    await expectClerkAuthScreen(page, "/auth/sign-in");
  });

  test("sign in page renders Clerk credentials flow", async ({ page }) => {
    await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });

    await expectClerkAuthScreen(page, "/auth/sign-in");
  });

  test("sign up page renders Clerk credentials flow", async ({ page }) => {
    await page.goto("/auth/sign-up", { waitUntil: "domcontentloaded" });

    await expectClerkAuthScreen(page, "/auth/sign-up");
  });

  test("reset password page points Clerk users to account management", async ({ page }) => {
    await page.goto("/auth/reset-password", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reset your password", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage account", exact: true })).toHaveAttribute(
      "href",
      "/dashboard/account",
    );
    await expect(page.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  test("known Clerk test user can sign in from a clean browser state", async ({ page }) => {
    const user = loadSessionUser();

    await signInViaClerkUI(page, user.email, user.password);

    await expect(page).toHaveURL(/\/dashboard(\/|$)/, { timeout: 30000 });
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("signed in users are redirected away from auth routes", async ({ browser }) => {
    const user = loadSessionUser();
    const context = await browser.newContext({ storageState: EMPTY_STORAGE_STATE });
    const page = await context.newPage();

    try {
      await signInViaClerkUI(page, user.email, user.password);
      await expect(page).toHaveURL(/\/dashboard(\/|$)/, { timeout: 30000 });

      await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveURL(/\/dashboard\/clients\/pipeline(\/|$)/, {
        timeout: 30000,
      });
    } finally {
      await context.close();
    }
  });
});
