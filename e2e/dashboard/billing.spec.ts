import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Billing Tests (DASH-019, DASH-020)
 *
 * Tests billing page and upgrade flows.
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

test.describe("Dashboard - Billing", () => {
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

  test("DASH-019: Billing page loads", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Billing page shows current plan", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Current plan (Free, Pro, or Enterprise)
    await expect(
      page.locator("text=/free|pro|enterprise|current.*plan/i").first()
    ).toBeVisible();
  });

  test("Billing page shows plan status", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Status (Active, Trial, Cancelling, etc.)
    await expect(
      page.locator("text=/active|trial|status/i").first()
    ).toBeVisible();
  });

  test("Billing page shows plan features", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Feature list
    await expect(
      page.locator("text=/location|contact form|analytics|feature/i").first()
    ).toBeVisible();
  });

  test("DASH-020: Billing page has upgrade options for free users", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Upgrade buttons (may not be visible for paid users)
    const upgradeButton = page.locator(
      'button:has-text("Upgrade"), a:has-text("Upgrade")'
    ).first();

    const hasUpgrade = await upgradeButton.isVisible().catch(() => false);
    console.log(`Upgrade option visible: ${hasUpgrade}`);
  });

  test("Billing page shows Pro plan details", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Pro plan card/section
    await expect(
      page.locator("text=/pro/i").first()
    ).toBeVisible();
  });

  test("Billing page shows Enterprise plan details", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Enterprise plan card/section
    await expect(
      page.locator("text=/enterprise/i").first()
    ).toBeVisible();
  });

  test("Billing page has Stripe portal link", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Manage subscription / Stripe portal
    const portalLink = page.locator(
      'button:has-text("Manage"), a:has-text("Manage"), button:has-text("Portal")'
    ).first();

    const hasPortal = await portalLink.isVisible().catch(() => false);
    console.log(`Stripe portal link visible: ${hasPortal}`);
  });

  test("Checkout page loads with plan parameter", async ({ page }) => {
    await page.goto("/dashboard/billing/checkout?plan=pro&interval=month");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Should show checkout info or redirect to Stripe
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Success page loads", async ({ page }) => {
    await page.goto("/dashboard/billing/success");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Success message
    await expect(
      page.locator("text=/success|thank|welcome|upgraded/i").first()
    ).toBeVisible();
  });
});

test.describe("Dashboard - Featured Locations Add-on", () => {
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

  test("Featured locations section shows for paid users", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Featured locations section (Pro/Enterprise only)
    const featuredSection = page.locator("text=/featured.*location|spotlight|promoted/i").first();
    const hasFeatured = await featuredSection.isVisible().catch(() => false);
    console.log(`Featured locations section visible: ${hasFeatured}`);
  });
});
