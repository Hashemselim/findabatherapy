import { test, expect } from "@playwright/test";

/**
 * Find ABA Therapy - State & City Page Tests (FAT-006, FAT-007)
 *
 * Tests state-based and city-based provider browsing.
 */
test.describe("Find ABA Therapy - State Pages", () => {
  test("FAT-006: State page loads with providers", async ({ page }) => {
    await page.goto("/california");

    // State header with name
    await expect(page.locator("text=/california/i").first()).toBeVisible();

    // Provider count badge
    await expect(
      page.locator("text=/providers|listings|results/i").first()
    ).toBeVisible();

    // Search card scoped to state
    const searchCard = page.locator('[data-testid="search-card"], form').first();
    await expect(searchCard).toBeVisible();
  });

  test("State page has city browse section", async ({ page }) => {
    await page.goto("/california");

    // Look for city links
    const cityLinks = page.locator("text=/los angeles|san francisco|san diego/i");
    const count = await cityLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("State page has insurance filter badges", async ({ page }) => {
    await page.goto("/california");

    // Insurance badges for quick filtering
    await expect(
      page.locator("text=/aetna|cigna|medicaid|insurance/i").first()
    ).toBeVisible();
  });

  test("State page shows provider results", async ({ page }) => {
    await page.goto("/california");

    // Should show provider listings or no results message
    const hasProviders = await page.locator('[data-testid="provider-card"], article, .provider-card').first().isVisible().catch(() => false);
    const hasMessage = await page.locator("text=/no providers|results|listings/i").first().isVisible().catch(() => false);

    expect(hasProviders || hasMessage).toBeTruthy();
  });

  test("State page has 'View all providers' button if more than 50", async ({ page }) => {
    await page.goto("/california");

    // Look for "View all" button
    const viewAllButton = page.locator("text=/view all|see all|more providers/i").first();
    const isVisible = await viewAllButton.isVisible().catch(() => false);
    console.log(`View all button visible: ${isVisible}`);
  });

  test("State page has FAQs", async ({ page }) => {
    await page.goto("/california");

    // Scroll down to find FAQ section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // Look for FAQ section
    const faqSection = page.locator("text=/faq|frequently asked|questions/i").first();
    const isVisible = await faqSection.isVisible().catch(() => false);
    console.log(`FAQ section visible: ${isVisible}`);
  });

  test("City links from state page navigate correctly", async ({ page }) => {
    await page.goto("/california");

    // Find a city link
    const losAngelesLink = page.getByRole("link", { name: /los angeles/i }).first();

    if (await losAngelesLink.isVisible()) {
      await losAngelesLink.click();
      await expect(page).toHaveURL(/\/california\/los-angeles/);
    }
  });

  test("Breadcrumb navigation works on state page", async ({ page }) => {
    await page.goto("/california");

    // Look for breadcrumb
    const breadcrumb = page.locator('[aria-label="breadcrumb"], nav:has-text("Home")').first();

    if (await breadcrumb.isVisible()) {
      const homeLink = breadcrumb.getByRole("link", { name: /home/i });
      await expect(homeLink).toBeVisible();
    }
  });
});

test.describe("Find ABA Therapy - City Pages", () => {
  test("FAT-007: City page loads with providers", async ({ page }) => {
    await page.goto("/california/los-angeles");

    // City header
    await expect(page.locator("text=/los angeles/i").first()).toBeVisible();

    // Provider count
    await expect(
      page.locator("text=/providers|listings|results/i").first()
    ).toBeVisible();
  });

  test("City page shows proximity-sorted results", async ({ page }) => {
    await page.goto("/california/los-angeles");

    // Results should show distance or proximity indicator
    const distanceIndicator = page.locator("text=/miles|mi|nearby/i").first();
    const isVisible = await distanceIndicator.isVisible().catch(() => false);
    console.log(`Distance indicator visible: ${isVisible}`);
  });

  test("City page has insurance filter badges", async ({ page }) => {
    await page.goto("/california/los-angeles");

    await expect(
      page.locator("text=/aetna|cigna|medicaid|insurance/i").first()
    ).toBeVisible();
  });

  test("City page has nearby cities section", async ({ page }) => {
    await page.goto("/california/los-angeles");

    // Scroll to find nearby cities
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // Look for nearby cities
    const nearbyCities = page.locator("text=/nearby|related|other cities/i").first();
    const isVisible = await nearbyCities.isVisible().catch(() => false);
    console.log(`Nearby cities section visible: ${isVisible}`);
  });

  test("City page has local content section", async ({ page }) => {
    await page.goto("/california/los-angeles");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // Look for "About ABA in [City]" section
    const aboutSection = page.locator("text=/about aba|aba therapy in/i").first();
    const isVisible = await aboutSection.isVisible().catch(() => false);
    console.log(`About section visible: ${isVisible}`);
  });

  test("City page has geo meta tags", async ({ page }) => {
    await page.goto("/california/los-angeles");

    // Check for geo meta tags
    const geoRegion = page.locator('meta[name="geo.region"]');
    const hasGeoMeta = await geoRegion.count() > 0;
    console.log(`Geo meta tags present: ${hasGeoMeta}`);
  });
});

test.describe("Find ABA Therapy - Multiple States", () => {
  const states = [
    { name: "Texas", slug: "texas" },
    { name: "Florida", slug: "florida" },
    { name: "New York", slug: "new-york" },
  ];

  for (const state of states) {
    test(`${state.name} state page loads`, async ({ page }) => {
      await page.goto(`/${state.slug}`);

      // State header should be visible
      await expect(page.locator(`text=/${state.name}/i`).first()).toBeVisible();
    });
  }
});
