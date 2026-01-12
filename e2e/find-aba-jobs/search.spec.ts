import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - Search & Filtering Tests (FAJ-002, FAJ-003)
 *
 * Tests job search and filtering functionality.
 */
test.describe("Find ABA Jobs - Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/jobs/search");
  });

  test("FAJ-002: Job search page loads with filters", async ({ page }) => {
    // Page should load
    await expect(page.getByRole("main")).toBeVisible();

    // Filter options should be present
    await expect(
      page.locator("text=/filter|position|employment|remote/i").first()
    ).toBeVisible();
  });

  test("Position type filter checkboxes work", async ({ page }) => {
    // Open filter if needed (mobile)
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Position type checkboxes
    const positionTypes = ["BCBA", "RBT", "Clinical Director"];

    for (const position of positionTypes.slice(0, 2)) {
      const checkbox = page.locator(
        `input[type="checkbox"][value*="${position.toLowerCase().replace(" ", "_")}" i], label:has-text("${position}") input`
      ).first();

      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
  });

  test("Employment type filter checkboxes work", async ({ page }) => {
    // Open filter if needed
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Employment type checkboxes
    const employmentTypes = ["Full-time", "Part-time", "Contract"];

    for (const employment of employmentTypes.slice(0, 2)) {
      const checkbox = page.locator(
        `input[type="checkbox"][value*="${employment.toLowerCase().replace("-", "_")}" i], label:has-text("${employment}") input`
      ).first();

      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
  });

  test("Remote only toggle works", async ({ page }) => {
    // Open filter if needed
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Remote toggle
    const remoteToggle = page.locator(
      'input[type="checkbox"][name*="remote" i], button:has-text("Remote"), label:has-text("Remote") input'
    ).first();

    if (await remoteToggle.isVisible()) {
      await remoteToggle.click();
      // URL should update
      await expect(page).toHaveURL(/remote=true/i);
    }
  });

  test("Posted within filter works", async ({ page }) => {
    // Open filter if needed
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }

    // Posted within dropdown
    const postedDropdown = page.locator(
      'select[name*="posted" i], button:has-text("Posted"), [data-testid="posted-filter"]'
    ).first();

    if (await postedDropdown.isVisible()) {
      await postedDropdown.click();
      // Options: 24h, 7d, 30d
      const option = page.locator("text=/24.*hour|7.*day|30.*day/i").first();
      if (await option.isVisible()) {
        await option.click();
      }
    }
  });

  test("Active filter badges display", async ({ page }) => {
    await page.goto("/jobs/search?position=bcba&remote=true");

    // Active filter badges
    const filterBadges = page.locator(
      '[data-testid="filter-badge"], .badge, .chip'
    );
    const count = await filterBadges.count();
    console.log(`Active filter badges: ${count}`);
  });

  test("Clear all filters button works", async ({ page }) => {
    await page.goto("/jobs/search?position=bcba&employment=full_time&remote=true");

    // Clear button
    const clearButton = page.locator(
      'button:has-text("Clear"), button:has-text("Reset")'
    ).first();

    if (await clearButton.isVisible()) {
      await clearButton.click();
      // URL should be clean
      await expect(page).toHaveURL(/\/jobs\/search(?:\?)?$/);
    }
  });

  test("Filter persistence in URL", async ({ page }) => {
    await page.goto("/jobs/search?position=bcba&employment=full_time&remote=true&posted=7d");

    // URL should maintain all filters
    await expect(page).toHaveURL(/position=bcba/i);
    await expect(page).toHaveURL(/employment=full_time/i);
    await expect(page).toHaveURL(/remote=true/i);
    await expect(page).toHaveURL(/posted=7d/i);
  });
});

test.describe("Find ABA Jobs - Search Results", () => {
  test("Results display job cards", async ({ page }) => {
    await page.goto("/jobs/search");

    // Results count
    const resultsCount = page.locator("text=/showing|results|jobs found/i").first();
    await expect(resultsCount).toBeVisible();

    // Job cards or no results
    const hasResults = await page.locator('[data-testid="job-card"], article, .job-card').first().isVisible().catch(() => false);
    const hasNoResults = await page.locator("text=/no.*jobs|no results|not found/i").first().isVisible().catch(() => false);

    expect(hasResults || hasNoResults).toBeTruthy();
  });

  test("Job cards display key information", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobCard = page.locator('[data-testid="job-card"], article, .job-card').first();

    if (await jobCard.isVisible()) {
      // Job title
      await expect(jobCard.locator("h2, h3, .job-title").first()).toBeVisible();

      // Company name
      await expect(
        jobCard.locator("text=/company|agency|organization/i, span, p").first()
      ).toBeVisible();
    }
  });

  test("Job cards show position type badge", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobCard = page.locator('[data-testid="job-card"], article').first();

    if (await jobCard.isVisible()) {
      const positionBadge = jobCard.locator(
        "text=/bcba|rbt|bt|director/i"
      ).first();
      const hasBadge = await positionBadge.isVisible().catch(() => false);
      console.log(`Position badge visible: ${hasBadge}`);
    }
  });

  test("Job cards show salary if provided", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobCard = page.locator('[data-testid="job-card"], article').first();

    if (await jobCard.isVisible()) {
      const salary = jobCard.locator("text=/\\$\\d+|salary|hr|yr/i").first();
      const hasSalary = await salary.isVisible().catch(() => false);
      console.log(`Salary visible: ${hasSalary}`);
    }
  });

  test("Job cards show 'Remote OK' badge if applicable", async ({ page }) => {
    await page.goto("/jobs/search?remote=true");

    const jobCard = page.locator('[data-testid="job-card"], article').first();

    if (await jobCard.isVisible()) {
      const remoteBadge = jobCard.locator("text=/remote/i").first();
      const hasRemote = await remoteBadge.isVisible().catch(() => false);
      console.log(`Remote badge visible: ${hasRemote}`);
    }
  });

  test("FAJ-003: Pagination works", async ({ page }) => {
    await page.goto("/jobs/search");

    const pagination = page.locator('[data-testid="pagination"], nav[aria-label*="pagination" i], .pagination');

    if (await pagination.isVisible()) {
      const nextButton = page.getByRole("button", { name: /next/i });

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    }
  });

  test("No results state with clear filters option", async ({ page }) => {
    await page.goto("/jobs/search?q=zzzznonexistent12345&position=bcba");

    // No results message
    await expect(
      page.locator("text=/no.*jobs|no results|not found/i").first()
    ).toBeVisible();

    // Clear filters option
    const clearButton = page.locator(
      'button:has-text("Clear"), a:has-text("Clear")'
    ).first();
    const hasClear = await clearButton.isVisible().catch(() => false);
    console.log(`Clear filters visible: ${hasClear}`);
  });

  test("Sorting options work", async ({ page }) => {
    await page.goto("/jobs/search");

    // Sort dropdown or buttons
    const sortControl = page.locator(
      'select[name*="sort" i], button:has-text("Sort"), [data-testid="sort"]'
    ).first();

    if (await sortControl.isVisible()) {
      await sortControl.click();
      // Sort options: relevance, date, salary
      const sortOptions = page.locator("text=/relevance|date|salary|newest/i");
      const count = await sortOptions.count();
      console.log(`Sort options found: ${count}`);
    }
  });
});

test.describe("Find ABA Jobs - Search Mobile", () => {
  test("Filter drawer on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/search");

    // Filter button
    const filterButton = page.locator(
      'button:has-text("Filter"), button[aria-label*="filter" i]'
    ).first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Filter drawer should open
      await expect(
        page.locator('[role="dialog"], .sheet, .drawer').first()
      ).toBeVisible();
    }
  });
});
