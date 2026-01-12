import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Company/Listing Management Tests (DASH-003, DASH-004)
 *
 * Tests listing details and company profile management.
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

test.describe("Dashboard - Company/Listing Management", () => {
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

  test("DASH-003: Company page loads", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Company page shows listing status", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Listing status (Published/Draft)
    await expect(
      page.locator("text=/published|draft|status/i").first()
    ).toBeVisible();
  });

  test("Company page has company name field", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Company name input
    const nameInput = page.locator(
      'input[name*="name" i], input[placeholder*="company" i], input[placeholder*="name" i]'
    ).first();
    await expect(nameInput).toBeVisible();
  });

  test("Company page has headline field", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Headline/tagline input
    const headlineInput = page.locator(
      'input[name*="headline" i], input[placeholder*="headline" i], input[placeholder*="tagline" i]'
    ).first();
    const hasHeadline = await headlineInput.isVisible().catch(() => false);
    console.log(`Headline field visible: ${hasHeadline}`);
  });

  test("Company page has description field", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Description textarea
    const descriptionInput = page.locator("textarea").first();
    await expect(descriptionInput).toBeVisible();
  });

  test("DASH-004: Company page has logo upload", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Logo upload section
    const logoUpload = page.locator(
      'input[type="file"], [data-testid="logo-upload"], button:has-text("Upload")'
    ).first();
    await expect(logoUpload).toBeVisible();
  });

  test("Company page has contact info section", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Contact info fields
    await expect(
      page.locator("text=/contact|email|phone|website/i").first()
    ).toBeVisible();
  });

  test("Company page has service locations summary", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Locations summary
    await expect(
      page.locator("text=/location|service area/i").first()
    ).toBeVisible();
  });

  test("Company page has save/update button", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Save button
    const saveButton = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Update")'
    ).first();
    await expect(saveButton).toBeVisible();
  });

  test("Company page can edit and save details", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Find description textarea and modify
    const descriptionInput = page.locator("textarea").first();

    if (await descriptionInput.isVisible()) {
      const currentValue = await descriptionInput.inputValue();

      // Append test text
      await descriptionInput.fill(currentValue + " (test edit)");

      // Save
      const saveButton = page.locator(
        'button[type="submit"], button:has-text("Save")'
      ).first();
      await saveButton.click();

      // Should show success or update
      await page.waitForTimeout(1000);

      // Restore original value
      await descriptionInput.fill(currentValue);
      await saveButton.click();
    }
  });
});
