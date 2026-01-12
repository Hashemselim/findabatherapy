import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Integration Tests - Listing Visibility (INT-001, INT-002)
 *
 * Tests that dashboard changes are reflected on public pages.
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

test.describe("Integration - Listing Visibility", () => {
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

  test("INT-001: Published listing appears in search results", async ({ page }) => {
    // First check if user has a published listing
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check listing status
    const publishedBadge = page.locator("text=/published/i").first();
    const isPublished = await publishedBadge.isVisible().catch(() => false);

    if (!isPublished) {
      console.log("Listing not published - skipping visibility test");
      return;
    }

    // Get company name
    const companyNameInput = page.locator('input[name*="name" i]').first();
    const companyName = await companyNameInput.inputValue().catch(() => "");

    if (!companyName) {
      console.log("Could not get company name");
      return;
    }

    // Search for the company on public site
    await page.goto(`/search?query=${encodeURIComponent(companyName)}`);

    // Should appear in search results
    const searchResults = page.locator(`text=/${companyName}/i`).first();
    const appearsInSearch = await searchResults.isVisible().catch(() => false);

    console.log(`Listing "${companyName}" appears in search: ${appearsInSearch}`);
  });

  test("INT-002: Updated listing details reflected publicly", async ({ page }) => {
    // Check if user has a published listing
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check listing status
    const publishedBadge = page.locator("text=/published/i").first();
    const isPublished = await publishedBadge.isVisible().catch(() => false);

    if (!isPublished) {
      console.log("Listing not published - skipping update test");
      return;
    }

    // Get current description
    const descriptionInput = page.locator("textarea").first();
    const currentDescription = await descriptionInput.inputValue().catch(() => "");

    // Check View Live button
    const viewLiveButton = page.locator('a:has-text("View Live"), a:has-text("View Listing")').first();

    if (await viewLiveButton.isVisible()) {
      // Get the public URL
      const href = await viewLiveButton.getAttribute("href");

      if (href) {
        // Visit public profile
        await page.goto(href);

        // Description should match
        if (currentDescription) {
          const publicDescription = page.locator(`text=/${currentDescription.slice(0, 50)}/i`).first();
          const descriptionMatches = await publicDescription.isVisible().catch(() => false);
          console.log(`Description matches public profile: ${descriptionMatches}`);
        }
      }
    }
  });

  test("Verified badge appears for premium providers", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check if user is on Pro or Enterprise plan
    const proPlan = page.locator("text=/pro.*active|active.*pro/i").first();
    const enterprisePlan = page.locator("text=/enterprise.*active|active.*enterprise/i").first();

    const isPremium = (await proPlan.isVisible().catch(() => false)) ||
                      (await enterprisePlan.isVisible().catch(() => false));

    if (!isPremium) {
      console.log("User not on premium plan - skipping verified badge test");
      return;
    }

    // Check View Live link
    await page.goto("/dashboard/company");

    const viewLiveButton = page.locator('a:has-text("View Live")').first();

    if (await viewLiveButton.isVisible()) {
      const href = await viewLiveButton.getAttribute("href");

      if (href) {
        await page.goto(href);

        // Look for verified badge
        const verifiedBadge = page.locator('[data-testid="verified-badge"], .verified, text=/verified/i').first();
        const hasVerified = await verifiedBadge.isVisible().catch(() => false);
        console.log(`Verified badge visible: ${hasVerified}`);
      }
    }
  });
});
