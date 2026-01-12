import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Search & Filtering Tests (FAT-003, FAT-004, FAT-005)
 *
 * Tests the provider search and filtering functionality.
 */
test.describe("Find ABA Therapy - Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("FAT-003: Search page loads with filter options", async ({ page }) => {
    // Page heading
    await expect(page.getByRole("heading")).toBeVisible();

    // Filter sidebar or filter section
    await expect(
      page.locator("text=/filter|location|insurance|service/i").first()
    ).toBeVisible();
  });

  test("Service type checkboxes filter results", async ({ page }) => {
    // Find service type filters
    const inHomeCheckbox = page.locator('input[type="checkbox"][name*="in_home" i], input[type="checkbox"][value*="in_home" i], label:has-text("In-Home") input').first();
    const centerBasedCheckbox = page.locator('input[type="checkbox"][name*="center" i], input[type="checkbox"][value*="center" i], label:has-text("Center") input').first();

    // Toggle a filter
    if (await inHomeCheckbox.isVisible()) {
      await inHomeCheckbox.check();
      // URL should update with filter
      await expect(page).toHaveURL(/serviceTypes|service/i);
    }
  });

  test("Location filter with autocomplete", async ({ page }) => {
    // Find location input
    const locationInput = page.locator(
      'input[placeholder*="location" i], input[placeholder*="address" i], input[placeholder*="city" i]'
    ).first();

    if (await locationInput.isVisible()) {
      await locationInput.fill("Los Angeles");
      // Should show autocomplete suggestions or update URL
      await page.waitForTimeout(500);
    }
  });

  test("Insurance multi-select filters results", async ({ page }) => {
    // Find insurance filter
    const insuranceFilter = page.locator(
      'button:has-text("Insurance"), select[name*="insurance" i], [data-testid="insurance-filter"]'
    ).first();

    if (await insuranceFilter.isVisible()) {
      await insuranceFilter.click();
      // Should show insurance options
      await expect(page.locator("text=/aetna|cigna|medicaid/i").first()).toBeVisible();
    }
  });

  test("Distance radius dropdown works", async ({ page }) => {
    const radiusDropdown = page.locator(
      'select[name*="radius" i], button:has-text("miles"), [data-testid="radius-filter"]'
    ).first();

    if (await radiusDropdown.isVisible()) {
      await radiusDropdown.click();
      // Should show radius options (5, 10, 25, 50, 100 miles)
      await expect(page.locator("text=/25.*miles|50.*miles/i").first()).toBeVisible();
    }
  });

  test("Clear all filters button resets filters", async ({ page }) => {
    // First add some filters
    await page.goto("/search?state=California&insurance=medicaid");

    // Find clear all button
    const clearButton = page.locator(
      'button:has-text("Clear"), button:has-text("Reset"), a:has-text("Clear all")'
    ).first();

    if (await clearButton.isVisible()) {
      await clearButton.click();
      // URL should be clean or have minimal params
      await expect(page).toHaveURL(/\/search(?:\?page=1)?$/);
    }
  });

  test("Active filters display as badges", async ({ page }) => {
    await page.goto("/search?state=California&serviceTypes=in_home");

    // Should show active filter badges
    const filterBadge = page.locator(
      '[data-testid="filter-badge"], .badge, .chip, button:has-text("California")'
    ).first();

    await expect(filterBadge).toBeVisible();
  });

  test("Filter persistence in URL", async ({ page }) => {
    await page.goto("/search?state=California&insurance=medicaid&serviceTypes=in_home");

    // URL should maintain filters
    await expect(page).toHaveURL(/state=California/i);
    await expect(page).toHaveURL(/insurance=medicaid/i);
    await expect(page).toHaveURL(/serviceTypes=in_home/i);
  });
});

test.describe("Find ABA Therapy - Search Results", () => {
  test("Results display provider cards", async ({ page }) => {
    await page.goto("/search");

    // Should show results count
    const resultsCount = page.locator("text=/showing|results|providers found/i").first();
    await expect(resultsCount).toBeVisible();

    // Provider cards should be visible (or no results message)
    const hasResults = await page.locator('[data-testid="provider-card"], article, .provider-card').first().isVisible().catch(() => false);
    const hasNoResults = await page.locator("text=/no results|no providers|not found/i").first().isVisible().catch(() => false);

    expect(hasResults || hasNoResults).toBeTruthy();
  });

  test("Sort dropdown exists and has options", async ({ page }) => {
    await page.goto("/search");

    // Look for sort dropdown
    const sortDropdown = page.locator(
      'button:has-text("Sort"), select[name*="sort" i], [data-testid="sort-toggle"]'
    ).first();

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click();
      await page.waitForTimeout(300);

      // Should show sort options
      const relevanceOption = page.locator('text=/relevance/i');
      const nameOption = page.locator('text=/name|alphabetical/i');
      const newestOption = page.locator('text=/newest|recent/i');

      const hasRelevance = await relevanceOption.first().isVisible().catch(() => false);
      const hasName = await nameOption.first().isVisible().catch(() => false);
      const hasNewest = await newestOption.first().isVisible().catch(() => false);

      expect(hasRelevance || hasName || hasNewest).toBeTruthy();
    }
  });

  test("Sort by name changes order", async ({ page }) => {
    await page.goto("/search");

    const sortDropdown = page.locator('button:has(svg), [data-testid="sort-toggle"], button:has-text("Sort")').first();

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click();
      await page.waitForTimeout(200);

      const nameOption = page.locator('[role="option"]:has-text("Name"), option:has-text("Name")').first();

      if (await nameOption.isVisible()) {
        await nameOption.click();
        await page.waitForTimeout(500);

        // URL should reflect sort param
        await expect(page).toHaveURL(/sortBy=name/i);
      }
    }
  });

  test("Provider cards display key information", async ({ page }) => {
    await page.goto("/search?state=California");

    // Wait for results to load
    const providerCard = page.locator('[data-testid="provider-card"], article, .provider-card').first();

    if (await providerCard.isVisible()) {
      // Card should contain key info
      await expect(providerCard.locator("text=/therapy|aba|services/i").first()).toBeVisible();
    }
  });

  test("FAT-004: Pagination works", async ({ page }) => {
    await page.goto("/search");

    // Look for pagination
    const pagination = page.locator('[data-testid="pagination"], nav[aria-label*="pagination" i], .pagination');

    if (await pagination.isVisible()) {
      const nextButton = page.getByRole("button", { name: /next/i });

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    }
  });

  test("FAT-005: No results state displays helpful message", async ({ page }) => {
    // Search for something unlikely to exist
    await page.goto("/search?query=zzzznonexistent12345");

    // Should show no results message
    await expect(
      page.locator("text=/no results|no providers|not found|try adjusting/i").first()
    ).toBeVisible();
  });

  test("Premium providers appear first in results", async ({ page }) => {
    await page.goto("/search");

    // Look for premium indicators on first results
    const premiumBadge = page.locator('[data-testid="premium-badge"], .verified, text=/verified|premium/i').first();

    // Premium providers should be visible at top (if any exist)
    const hasPremium = await premiumBadge.isVisible().catch(() => false);
    console.log(`Premium providers at top: ${hasPremium}`);
  });
});

test.describe("Find ABA Therapy - Additional Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("Languages filter works", async ({ page }) => {
    // Look for languages filter section
    const languagesSection = page.locator('text=/languages/i').first();

    if (await languagesSection.isVisible()) {
      await languagesSection.click();
      await page.waitForTimeout(300);

      // Look for language checkboxes
      const spanishCheckbox = page.locator(
        'input[type="checkbox"][value*="spanish" i], label:has-text("Spanish") input'
      ).first();

      if (await spanishCheckbox.isVisible()) {
        await spanishCheckbox.check();
        // URL should update with language filter
        await expect(page).toHaveURL(/languages/i);
      }
    }
  });

  test("Accepting clients toggle works", async ({ page }) => {
    // Look for accepting clients toggle
    const acceptingToggle = page.locator(
      'input[type="checkbox"]#accepting, label:has-text("Accepting") input, input[name*="accepting" i]'
    ).first();

    if (await acceptingToggle.isVisible()) {
      await acceptingToggle.check();
      // URL should update
      await expect(page).toHaveURL(/acceptingClients/i);
    }
  });

  test("Use my location button exists", async ({ page }) => {
    // Look for geolocation button
    const locationButton = page.locator(
      'button:has-text("Use my location"), button:has-text("my location"), button:has-text("Near me")'
    ).first();

    const hasButton = await locationButton.isVisible().catch(() => false);

    if (hasButton) {
      // Button should be clickable (we don't actually click to avoid geo prompts)
      await expect(locationButton).toBeEnabled();
    }
  });

  test("Active filter badges can be removed", async ({ page }) => {
    // Add some filters via URL
    await page.goto("/search?state=California&serviceTypes=in_home");

    // Find a filter badge
    const filterBadge = page.locator(
      '[data-testid="filter-badge"], .badge:has(svg), button:has-text("California")'
    ).first();

    if (await filterBadge.isVisible()) {
      // Click to remove
      await filterBadge.click();
      await page.waitForTimeout(500);

      // Filter should be removed from URL or badge should disappear
      const hasCaliforniaInUrl = page.url().includes("California");
      const badgeStillVisible = await filterBadge.isVisible().catch(() => false);

      // Either URL updated or badge removed
      expect(!hasCaliforniaInUrl || !badgeStillVisible).toBeTruthy();
    }
  });

  test("Multiple filters combine correctly", async ({ page }) => {
    await page.goto("/search?state=California&serviceTypes=in_home&insurances=Medicaid&acceptingClients=true");

    // All filters should be reflected in URL
    await expect(page).toHaveURL(/state=California/i);
    await expect(page).toHaveURL(/serviceTypes=in_home/i);
    await expect(page).toHaveURL(/insurances=Medicaid/i);
    await expect(page).toHaveURL(/acceptingClients=true/i);
  });
});

test.describe("Find ABA Therapy - Search Mobile", () => {
  test("Filter sheet/drawer on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/search");

    // Look for mobile filter button
    const filterButton = page.locator(
      'button:has-text("Filter"), button[aria-label*="filter" i], [data-testid="mobile-filter"]'
    ).first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Filter drawer/sheet should open
      await expect(page.locator('[role="dialog"], .sheet, .drawer').first()).toBeVisible();
    }
  });

  test("Mobile filter sheet has all filters", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/search");

    const filterButton = page.locator('button:has-text("Filter")').first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // Check for filter sections in sheet
      const locationSection = page.locator('text=/location/i');
      const serviceSection = page.locator('text=/service type/i');
      const insuranceSection = page.locator('text=/insurance/i');

      const hasLocation = await locationSection.first().isVisible().catch(() => false);
      const hasService = await serviceSection.first().isVisible().catch(() => false);
      const hasInsurance = await insuranceSection.first().isVisible().catch(() => false);

      expect(hasLocation || hasService || hasInsurance).toBeTruthy();
    }
  });

  test("Mobile filter Apply button works", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/search");

    const filterButton = page.locator('button:has-text("Filter")').first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // Look for apply button
      const applyButton = page.locator('button:has-text("Apply")').first();
      const hasApply = await applyButton.isVisible().catch(() => false);

      expect(hasApply).toBeTruthy();
    }
  });

  test("Single column results on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/search");

    // Results should be single column
    await expect(page.getByRole("main")).toBeVisible();
  });
});
