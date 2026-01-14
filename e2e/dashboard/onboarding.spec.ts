import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Onboarding Flow Tests (DASH-002)
 *
 * Tests the provider onboarding process.
 * Requires authentication.
 */

// Helper to check if auth is available
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

test.describe("Dashboard - Onboarding Flow", () => {
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

  test("DASH-002: Onboarding welcome page loads", async ({ page }) => {
    await page.goto("/dashboard/onboarding");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required - set TEST_USER_EMAIL and TEST_USER_PASSWORD");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Onboarding welcome has both brand cards", async ({ page }) => {
    await page.goto("/dashboard/onboarding");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check for Find Clients and Find Staff sections
    await expect(page.locator("text=/find clients/i").first()).toBeVisible();
    await expect(page.locator("text=/find staff/i").first()).toBeVisible();
  });

  test("Onboarding welcome has Get Started button", async ({ page }) => {
    await page.goto("/dashboard/onboarding");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Get Started button
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("Onboarding details page loads", async ({ page }) => {
    await page.goto("/dashboard/onboarding/details");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required - set TEST_USER_EMAIL and TEST_USER_PASSWORD");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Onboarding details has practice name field", async ({ page }) => {
    await page.goto("/dashboard/onboarding/details");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Practice name input (2-100 chars)
    const nameInput = page.locator(
      'input[name*="name" i], input[placeholder*="practice" i], input[placeholder*="name" i]'
    ).first();
    await expect(nameInput).toBeVisible();
  });

  test("Onboarding details has about/description field", async ({ page }) => {
    await page.goto("/dashboard/onboarding/details");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // About practice textarea (50-2000 chars)
    const aboutInput = page.locator(
      'textarea[name*="about" i], textarea[name*="description" i], textarea'
    ).first();
    await expect(aboutInput).toBeVisible();
  });

  test("Onboarding details has services selection", async ({ page }) => {
    await page.goto("/dashboard/onboarding/details");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Services checkboxes - look within main content area to avoid matching sidebar nav
    await expect(
      page.getByRole("main").locator("text=/aba therapy|occupational|speech/i").first()
    ).toBeVisible();
  });

  test("Onboarding details has contact email field", async ({ page }) => {
    await page.goto("/dashboard/onboarding/details");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Contact email
    const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
    await expect(emailInput).toBeVisible();
  });

  test("Onboarding location page loads", async ({ page }) => {
    await page.goto("/dashboard/onboarding/location");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Onboarding location has service type selection", async ({ page }) => {
    await page.goto("/dashboard/onboarding/location");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Service types (In-Home, Center-Based, Telehealth, School-Based)
    await expect(
      page.locator("text=/in-home|center|telehealth|school/i").first()
    ).toBeVisible();
  });

  test("Onboarding location has address autocomplete", async ({ page }) => {
    await page.goto("/dashboard/onboarding/location");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Address input with autocomplete
    const addressInput = page.locator(
      'input[placeholder*="address" i], input[name*="address" i]'
    ).first();
    await expect(addressInput).toBeVisible();
  });

  test("Onboarding location has insurance selection", async ({ page }) => {
    await page.goto("/dashboard/onboarding/location");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Insurance checkboxes
    await expect(
      page.locator("text=/insurance|aetna|cigna|medicaid/i").first()
    ).toBeVisible();
  });

  test("Onboarding enhanced page loads", async ({ page }) => {
    await page.goto("/dashboard/onboarding/enhanced");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Onboarding enhanced has premium fields", async ({ page }) => {
    await page.goto("/dashboard/onboarding/enhanced");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Premium fields (ages, languages, diagnoses, specialties)
    await expect(
      page.locator("text=/ages|language|diagnos|specialt/i").first()
    ).toBeVisible();
  });

  test("Onboarding review page loads", async ({ page }) => {
    await page.goto("/dashboard/onboarding/review");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Onboarding review shows plan selection", async ({ page }) => {
    await page.goto("/dashboard/onboarding/review");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Plan cards (Free, Pro, Enterprise) - look within main content area
    await expect(
      page.getByRole("main").locator("text=/choose your plan/i").first()
    ).toBeVisible();
  });
});
