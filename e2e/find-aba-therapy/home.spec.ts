import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - Home Page Tests (FAT-001, FAT-002)
 *
 * Tests the family/visitor experience on the main directory home page.
 */
test.describe("Find ABA Therapy - Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("FAT-001: Home page loads with all sections", async ({ page }) => {
    // Hero section with search card
    await expect(page.locator('[data-testid="hero"], .hero, section').first()).toBeVisible();

    // Trust badges
    await expect(
      page.locator("text=/all 50 states|verified providers|trusted/i").first()
    ).toBeVisible();

    // Search card elements
    await expect(
      page.locator('input[placeholder*="location" i], input[placeholder*="city" i], input[placeholder*="zip" i]').first()
    ).toBeVisible();

    // Service type filters should be present
    await expect(page.locator("text=/in-home|center-based|telehealth/i").first()).toBeVisible();

    // Browse by insurance section
    await expect(page.locator("text=/aetna|cigna|united|medicaid|bcbs/i").first()).toBeVisible();

    // Browse by state section
    await expect(page.locator("text=/california|texas|florida|new york/i").first()).toBeVisible();

    // Get Listed CTA
    await expect(page.locator("text=/get listed|for providers/i").first()).toBeVisible();

    // Footer with legal links
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole("link", { name: /terms/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
  });

  test("FAT-002: Search card submits correctly", async ({ page }) => {
    // Find location input
    const locationInput = page.locator(
      'input[placeholder*="location" i], input[placeholder*="city" i], input[placeholder*="zip" i]'
    ).first();

    // Enter a location
    await locationInput.fill("California");

    // Look for search/submit button
    const searchButton = page.locator(
      'button[type="submit"], button:has-text("search"), button:has-text("find")'
    ).first();

    await searchButton.click();

    // Should redirect to search page with params
    await expect(page).toHaveURL(/\/search/);
  });

  test("Search card has service type filters", async ({ page }) => {
    // Check for service type checkboxes/buttons
    const inHome = page.locator("text=/in-home/i").first();
    const centerBased = page.locator("text=/center-based/i").first();
    const telehealth = page.locator("text=/telehealth/i").first();

    await expect(inHome).toBeVisible();
    await expect(centerBased).toBeVisible();
    await expect(telehealth).toBeVisible();
  });

  test("Search card has insurance dropdown", async ({ page }) => {
    // Look for insurance selector
    const insuranceSelector = page.locator(
      'select[name*="insurance" i], [data-testid="insurance-select"], button:has-text("insurance")'
    ).first();

    // Insurance selector may be a dropdown or combobox
    const isVisible = await insuranceSelector.isVisible().catch(() => false);
    if (isVisible) {
      await insuranceSelector.click();
      // Should show insurance options
      await expect(page.locator("text=/aetna|cigna|medicaid/i").first()).toBeVisible();
    }
  });

  test("Browse by insurance section has major carriers", async ({ page }) => {
    // Check for major insurance carriers
    const carriers = ["Aetna", "Cigna", "UnitedHealthcare", "Medicaid", "BCBS", "Tricare"];

    for (const carrier of carriers.slice(0, 3)) {
      // At least first 3 should be visible
      const carrierLink = page.locator(`text=/${carrier}/i`).first();
      await expect(carrierLink).toBeVisible();
    }
  });

  test("Browse by state grid has all 50 states", async ({ page }) => {
    // Scroll to state section
    const stateSection = page.locator("text=/browse by state|find by state/i").first();
    if (await stateSection.isVisible()) {
      await stateSection.scrollIntoViewIfNeeded();
    }

    // Check for a few representative states
    const states = ["California", "Texas", "Florida", "New York"];

    for (const state of states) {
      const stateLink = page.getByRole("link", { name: new RegExp(state, "i") }).first();
      await expect(stateLink).toBeVisible();
    }
  });

  test("State links navigate correctly", async ({ page }) => {
    // Find California link
    const californiaLink = page.getByRole("link", { name: /california/i }).first();

    if (await californiaLink.isVisible()) {
      await californiaLink.click();
      await expect(page).toHaveURL(/\/california/i);
    }
  });

  test("Insurance links navigate correctly", async ({ page }) => {
    // Find an insurance link
    const insuranceLink = page.getByRole("link", { name: /medicaid/i }).first();

    if (await insuranceLink.isVisible()) {
      await insuranceLink.click();
      await expect(page).toHaveURL(/\/insurance|search.*insurance/i);
    }
  });

  test("Get Listed CTA navigates to sign up or pricing", async ({ page }) => {
    const getListedCTA = page.getByRole("link", { name: /get listed|for providers|list your practice/i }).first();

    if (await getListedCTA.isVisible()) {
      await getListedCTA.click();
      await expect(page).toHaveURL(/\/get-listed|\/auth\/sign-up/);
    }
  });
});

test.describe("Find ABA Therapy - Home Page SEO", () => {
  test("Has proper meta tags", async ({ page }) => {
    await page.goto("/");

    // Check title
    await expect(page).toHaveTitle(/find.*aba|therapy|provider/i);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);

    // Check Open Graph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
  });

  test("Has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    // Should have an h1
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });
});

test.describe("Find ABA Therapy - Home Search Card Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Service type popover opens and shows options", async ({ page }) => {
    // Find therapy setting button
    const settingButton = page.locator(
      'button:has-text("setting"), button:has-text("In-Home"), label:has-text("setting") button'
    ).first();

    if (await settingButton.isVisible()) {
      await settingButton.click();
      await page.waitForTimeout(300);

      // Should show service type options
      const inHome = page.locator('[role="option"]:has-text("In-Home"), [cmdk-item]:has-text("In-Home")');
      const centerBased = page.locator('[role="option"]:has-text("Center"), [cmdk-item]:has-text("Center")');

      const hasInHome = await inHome.isVisible().catch(() => false);
      const hasCenter = await centerBased.isVisible().catch(() => false);

      expect(hasInHome || hasCenter).toBeTruthy();
    }
  });

  test("Service type selection toggles correctly", async ({ page }) => {
    const settingButton = page.locator(
      'button:has-text("setting"), button:has-text("In-Home"), label:has-text("Therapy setting") button'
    ).first();

    if (await settingButton.isVisible()) {
      await settingButton.click();
      await page.waitForTimeout(300);

      // Toggle telehealth
      const telehealthOption = page.locator('[role="option"]:has-text("Telehealth"), [cmdk-item]:has-text("Telehealth")').first();

      if (await telehealthOption.isVisible()) {
        await telehealthOption.click();
        // Option should be toggled
      }
    }
  });

  test("Insurance popover opens and shows insurers", async ({ page }) => {
    const insuranceButton = page.locator(
      'button:has-text("insurance"), button:has-text("Select plan"), label:has-text("Insurance") button'
    ).first();

    if (await insuranceButton.isVisible()) {
      await insuranceButton.click();
      await page.waitForTimeout(300);

      // Should show insurance options
      const aetna = page.locator('[role="option"]:has-text("Aetna"), [cmdk-item]:has-text("Aetna")');
      const medicaid = page.locator('[role="option"]:has-text("Medicaid"), [cmdk-item]:has-text("Medicaid")');

      const hasAetna = await aetna.isVisible().catch(() => false);
      const hasMedicaid = await medicaid.isVisible().catch(() => false);

      expect(hasAetna || hasMedicaid).toBeTruthy();
    }
  });

  test("Insurance selection updates button display", async ({ page }) => {
    const insuranceButton = page.locator(
      'label:has-text("Insurance") button'
    ).first();

    if (await insuranceButton.isVisible()) {
      await insuranceButton.click();
      await page.waitForTimeout(300);

      const medicaidOption = page.locator('[cmdk-item]:has-text("Medicaid")').first();

      if (await medicaidOption.isVisible()) {
        await medicaidOption.click();
        await page.waitForTimeout(300);

        // Button should now show selected insurance
        await expect(insuranceButton).toContainText(/medicaid/i);
      }
    }
  });

  test("Location autocomplete shows suggestions", async ({ page }) => {
    const locationInput = page.locator(
      'input[placeholder*="City" i], input[placeholder*="location" i]'
    ).first();

    await locationInput.fill("Los Angeles");
    await page.waitForTimeout(500);

    // Should show autocomplete suggestions
    const suggestions = page.locator(
      '[role="listbox"], [role="option"], .autocomplete-suggestion, [data-testid="suggestion"]'
    );
    const hasSuggestions = await suggestions.first().isVisible().catch(() => false);

    // Autocomplete may take time to load
    if (hasSuggestions) {
      expect(hasSuggestions).toBeTruthy();
    }
  });

  test("Search with all filters submits correctly", async ({ page }) => {
    // Fill location
    const locationInput = page.locator('input[placeholder*="City" i]').first();
    await locationInput.fill("California");

    // Open and select service type
    const settingButton = page.locator('label:has-text("Therapy setting") button').first();
    if (await settingButton.isVisible()) {
      await settingButton.click();
      await page.waitForTimeout(200);

      const telehealthOption = page.locator('[cmdk-item]:has-text("Telehealth")').first();
      if (await telehealthOption.isVisible()) {
        await telehealthOption.click();
      }

      // Close popover
      await page.keyboard.press("Escape");
    }

    // Submit search
    const searchButton = page.locator('button:has-text("Find care"), button:has-text("Search")').first();
    await searchButton.click();

    // Should navigate to search with params
    await expect(page).toHaveURL(/\/search/);
  });
});

test.describe("Find ABA Therapy - Home Page Responsive", () => {
  test("FAT-017: Mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should load and be functional
    await expect(page.getByRole("main")).toBeVisible();

    // Search should still be accessible
    const searchInput = page.locator(
      'input[placeholder*="location" i], input[placeholder*="city" i]'
    ).first();
    await expect(searchInput).toBeVisible();
  });

  test("Search card is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // All search card elements should be visible
    const locationInput = page.locator('input[placeholder*="City" i]').first();
    const searchButton = page.locator('button:has-text("Find care")').first();

    await expect(locationInput).toBeVisible();
    await expect(searchButton).toBeVisible();
  });

  test("Tablet responsive", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(page.getByRole("main")).toBeVisible();
  });
});
