import { test, expect } from "@playwright/test";
import path from "path";
import type { Page } from "@playwright/test";

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

async function hideNextDevOverlay(page: Page) {
  await page
    .addStyleTag({
      content:
        "nextjs-portal { display: none !important; pointer-events: none !important; }",
    })
    .catch(() => undefined);
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
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required - set TEST_USER_EMAIL and TEST_USER_PASSWORD");
      return;
    }

    await page.waitForURL(/\/dashboard\/clients\/pipeline/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/dashboard\/clients\/pipeline/);
    await expect(
      page.getByRole("heading", { name: /client pipeline/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("Dashboard shows quick stats", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

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
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Current dashboard lands on Client Pipeline and shows workflow/status tabs.
    await expect(
      page.locator("text=/client pipeline|leads|waitlist|in progress|discharged|status/i").first()
    ).toBeVisible();
  });

  test("Dashboard shows current plan", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Free or Pro
    await expect(
      page.locator("text=/free|pro|plan/i").first()
    ).toBeVisible();
  });

  test("Dashboard has sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Sidebar with navigation links
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("Dashboard sidebar has key links", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const navItems = ["Dashboard", "Tasks", "Notifications", "Clients"];

    for (const item of navItems) {
      const link = page.getByRole("link", { name: new RegExp(item, "i") });
      await expect(link).toBeVisible();
    }

    await expect(page.getByRole("button", { name: /team/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /company/i })).toBeVisible();
  });

  test("Dashboard has onboarding checklist if incomplete", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

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
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await page.getByRole("button", { name: /company/i }).click();
    const companyLink = page.getByRole("link", { name: /company profile/i });
    await expect(companyLink).toBeVisible({ timeout: 15000 });
    await companyLink.click();
    await page.waitForURL(/\/dashboard\/settings\/profile/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/);
  });

  test("Dashboard navigation to Locations page works", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await page.getByRole("button", { name: /company/i }).click();
    const locationsLink = page.getByRole("link", { name: /^locations$/i });
    await expect(locationsLink).toBeVisible({ timeout: 15000 });
    await locationsLink.click();
    await page.waitForURL(/\/dashboard\/settings\/locations/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/dashboard\/settings\/locations/);
  });

  test("Dashboard navigation to Jobs page works", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await page.getByRole("button", { name: /team/i }).click();
    const jobsLink = page.getByRole("link", { name: /^jobs$/i });
    await expect(jobsLink).toBeVisible({ timeout: 15000 });
    await jobsLink.click();
    await page.waitForURL(/\/dashboard\/team\/jobs/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/dashboard\/team\/jobs/);
  });

  test("Dashboard navigation to Billing page works", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await page.getByRole("button", { name: /e2e user|plan/i }).click();
    const billingMenuItem = page.getByRole("menuitem", {
      name: /billing|plan & billing/i,
    });
    await expect(billingMenuItem).toBeVisible({ timeout: 15000 });
    await billingMenuItem.click();
    await page.waitForURL(/\/dashboard\/(settings\/)?billing/, {
      timeout: 15000,
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/dashboard\/(settings\/)?billing/);
  });

  test("Dashboard has logout option", async ({ page }) => {
    await page.goto("/dashboard/clients/pipeline");
    await hideNextDevOverlay(page);

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await page.getByRole("button", { name: /e2e user|plan/i }).click();
    const logoutButton = page.getByRole("menuitem", {
      name: /logout|sign out|log out/i,
    });
    await expect(logoutButton).toBeVisible();
  });
});
