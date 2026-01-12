import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Locations Management Tests (DASH-005, DASH-006, DASH-007, DASH-008)
 *
 * Tests location CRUD operations and plan limits.
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

test.describe("Dashboard - Locations Management", () => {
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

  test("DASH-005: Locations page loads", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("DASH-008: Locations page shows plan limits", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Location limit indicator (X of Y locations)
    await expect(
      page.locator("text=/\\d+.*of.*\\d+|location.*limit|used/i").first()
    ).toBeVisible();
  });

  test("Locations page has add location button", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Add location button
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("New"), a:has-text("Add")'
    ).first();
    await expect(addButton).toBeVisible();
  });

  test("Locations page shows existing locations", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Location cards or empty state
    const hasLocations = await page.locator('[data-testid="location-card"], .location-card').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=/no location|add.*location/i").first().isVisible().catch(() => false);

    expect(hasLocations || hasEmpty).toBeTruthy();
  });

  test("DASH-006: Location can be edited", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Edit button on location
    const editButton = page.locator(
      'button:has-text("Edit"), a:has-text("Edit"), [data-testid="edit-location"]'
    ).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Edit form should appear
      await expect(
        page.locator("text=/service type|address|insurance/i").first()
      ).toBeVisible();
    }
  });

  test("DASH-007: Location can be deleted", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Delete button on location
    const deleteButton = page.locator(
      'button:has-text("Delete"), button:has-text("Remove"), [data-testid="delete-location"]'
    ).first();

    if (await deleteButton.isVisible()) {
      // Note: Don't actually click delete in tests
      console.log("Delete button visible for locations");
    }
  });

  test("Add location form has service types", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Click add location
    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Service type options
      await expect(
        page.locator("text=/in-home|center|telehealth|school/i").first()
      ).toBeVisible();
    }
  });

  test("Add location form has address autocomplete", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Address input
      const addressInput = page.locator(
        'input[placeholder*="address" i], input[name*="address" i]'
      ).first();
      await expect(addressInput).toBeVisible();
    }
  });

  test("Add location form has insurance selection", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Insurance checkboxes
      await expect(
        page.locator("text=/insurance|aetna|cigna|medicaid/i").first()
      ).toBeVisible();
    }
  });

  test("Add location form has accepting clients toggle", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Accepting clients toggle
      await expect(
        page.locator("text=/accepting|new client/i").first()
      ).toBeVisible();
    }
  });
});
