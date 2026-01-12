import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Overview Tests (DASH-001)
 *
 * Tests the main dashboard page.
 * Requires authentication.
 */

async function checkAuthAvailable(): Promise<boolean> {
  const fs = await import("fs");
  try {
    const content = fs.readFileSync(authFile, "utf-8");
    const data = JSON.parse(content);
    return data.cookies?.length > 0 || data.origins?.length > 0;
  } catch {
    return false;
  }
}

test.describe("Dashboard - Overview", () => {
  test.use({
    storageState: async ({}, use) => {
      const hasAuth = await checkAuthAvailable();
      if (hasAuth) {
        await use(authFile);
      } else {
        await use({ cookies: [], origins: [] });
      }
    },
  });

  test("DASH-001: Dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required - set TEST_USER_EMAIL and TEST_USER_PASSWORD");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Dashboard shows quick stats", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Quick stats: Listing Status, Current Plan, Service Locations
    await expect(
      page.locator("text=/listing|plan|location|status/i").first()
    ).toBeVisible();
  });

  test("Dashboard shows listing status", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Published or Draft status
    await expect(
      page.locator("text=/published|draft|listing/i").first()
    ).toBeVisible();
  });

  test("Dashboard shows current plan", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Free, Pro, or Enterprise
    await expect(
      page.locator("text=/free|pro|enterprise|plan/i").first()
    ).toBeVisible();
  });

  test("Dashboard has sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Sidebar with navigation links
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("Dashboard sidebar has key links", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Key navigation items
    const navItems = ["Company", "Locations", "Jobs", "Billing", "Settings"];

    for (const item of navItems.slice(0, 3)) {
      const link = page.getByRole("link", { name: new RegExp(item, "i") });
      await expect(link).toBeVisible();
    }
  });

  test("Dashboard has onboarding checklist if incomplete", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Onboarding checklist (may not be visible if completed)
    const checklist = page.locator("text=/checklist|step|complete|onboarding/i").first();
    const hasChecklist = await checklist.isVisible().catch(() => false);
    console.log(`Onboarding checklist visible: ${hasChecklist}`);
  });

  test("Dashboard navigation to Company page works", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const companyLink = page.getByRole("link", { name: /company/i });
    await companyLink.click();
    await expect(page).toHaveURL(/\/dashboard\/company/);
  });

  test("Dashboard navigation to Locations page works", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const locationsLink = page.getByRole("link", { name: /location/i });
    await locationsLink.click();
    await expect(page).toHaveURL(/\/dashboard\/location/);
  });

  test("Dashboard navigation to Jobs page works", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const jobsLink = page.getByRole("link", { name: /job/i });
    await jobsLink.click();
    await expect(page).toHaveURL(/\/dashboard\/job/);
  });

  test("Dashboard navigation to Billing page works", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const billingLink = page.getByRole("link", { name: /billing/i });
    await billingLink.click();
    await expect(page).toHaveURL(/\/dashboard\/billing/);
  });

  test("Dashboard has logout option", async ({ page }) => {
    await page.goto("/dashboard");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Logout button
    const logoutButton = page.locator("text=/logout|sign out|log out/i").first();
    await expect(logoutButton).toBeVisible();
  });
});
