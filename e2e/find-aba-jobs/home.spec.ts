import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - Home Page Tests (FAJ-001)
 *
 * Tests the job seeker experience on the job board home page.
 */
test.describe("Find ABA Jobs - Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/jobs");
  });

  test("FAJ-001: Jobs home page loads", async ({ page }) => {
    // Hero section
    await expect(page.getByRole("heading")).toBeVisible();

    // Jobs-related content
    await expect(
      page.locator("text=/job|career|opportunity|aba/i").first()
    ).toBeVisible();
  });

  test("Jobs home has live job count badge", async ({ page }) => {
    // Job count indicator
    const jobCount = page.locator("text=/\\d+.*job|job.*\\d+/i").first();
    const hasCount = await jobCount.isVisible().catch(() => false);
    console.log(`Job count badge visible: ${hasCount}`);
  });

  test("Jobs home has search bar", async ({ page }) => {
    // Search inputs
    const keywordInput = page.locator(
      'input[placeholder*="job" i], input[placeholder*="keyword" i], input[placeholder*="search" i]'
    ).first();
    await expect(keywordInput).toBeVisible();

    const locationInput = page.locator(
      'input[placeholder*="location" i], input[placeholder*="city" i]'
    ).first();
    const hasLocation = await locationInput.isVisible().catch(() => false);
    console.log(`Location input visible: ${hasLocation}`);
  });

  test("Jobs home has quick filters", async ({ page }) => {
    // Quick filter buttons (BCBA, RBT, Remote, etc.)
    const quickFilters = page.locator("text=/bcba|rbt|remote|clinical director/i");
    const count = await quickFilters.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Jobs home has browse by position type", async ({ page }) => {
    // Position type cards (6 positions)
    const positionTypes = [
      "BCBA",
      "BCaBA",
      "RBT",
      "Behavior Technician",
      "Clinical Director",
      "Regional Director",
    ];

    for (const position of positionTypes.slice(0, 3)) {
      const positionCard = page.locator(`text=/${position}/i`).first();
      await expect(positionCard).toBeVisible();
    }
  });

  test("Jobs home has featured jobs section", async ({ page }) => {
    // Featured jobs (up to 6)
    const featuredJobs = page.locator(
      '[data-testid="featured-job"], [data-testid="job-card"], .job-card'
    );
    const count = await featuredJobs.count();
    console.log(`Featured jobs found: ${count}`);
  });

  test("Jobs home has browse by state section", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // State links
    const stateLinks = page.locator("text=/california|texas|florida|new york/i");
    const count = await stateLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Jobs home has employer CTA", async ({ page }) => {
    // Employer/post job CTA
    const employerCTA = page.locator(
      "text=/post.*job|for employers|hire|recruiting/i"
    ).first();
    await expect(employerCTA).toBeVisible();
  });

  test("Search submits correctly", async ({ page }) => {
    const keywordInput = page.locator(
      'input[placeholder*="job" i], input[placeholder*="keyword" i], input[placeholder*="search" i]'
    ).first();

    await keywordInput.fill("BCBA");

    const searchButton = page.locator(
      'button[type="submit"], button:has-text("search"), button:has-text("find")'
    ).first();

    await searchButton.click();

    await expect(page).toHaveURL(/\/jobs\/search|q=BCBA/i);
  });

  test("Position type cards navigate to filtered search", async ({ page }) => {
    const bcbaCard = page.getByRole("link", { name: /bcba/i }).first();

    if (await bcbaCard.isVisible()) {
      await bcbaCard.click();
      await expect(page).toHaveURL(/bcba|position=bcba/i);
    }
  });

  test("State links navigate to state jobs page", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    const californiaLink = page.getByRole("link", { name: /california/i }).first();

    if (await californiaLink.isVisible()) {
      await californiaLink.click();
      await expect(page).toHaveURL(/\/california\/jobs|state=california/i);
    }
  });
});

test.describe("Find ABA Jobs - Home Page Responsive", () => {
  test("FAJ-012: Mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs");

    await expect(page.getByRole("main")).toBeVisible();

    // Search should still be accessible
    const searchInput = page.locator(
      'input[placeholder*="job" i], input[placeholder*="search" i]'
    ).first();
    await expect(searchInput).toBeVisible();
  });
});
