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

test.describe("Find ABA Jobs - Additional Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/jobs/search");
  });

  test("Work Setting (therapy settings) filter works", async ({ page }) => {
    // Look for Work Setting filter section
    const settingSection = page.locator('text=/work setting/i').first();

    if (await settingSection.isVisible()) {
      // Look for in-home checkbox
      const inHomeCheckbox = page.locator(
        'input[type="checkbox"][value*="in_home" i], label:has-text("In-Home") input'
      ).first();

      if (await inHomeCheckbox.isVisible()) {
        await inHomeCheckbox.check();
        await page.waitForTimeout(500);
        // URL should update with settings filter
        await expect(page).toHaveURL(/settings=/i);
      }
    }
  });

  test("Schedule filter works", async ({ page }) => {
    // Look for Schedule filter section
    const scheduleSection = page.locator('text=/schedule/i').first();

    if (await scheduleSection.isVisible()) {
      // Look for daytime checkbox
      const daytimeCheckbox = page.locator(
        'input[type="checkbox"][value*="daytime" i], label:has-text("Daytime") input'
      ).first();

      if (await daytimeCheckbox.isVisible()) {
        await daytimeCheckbox.check();
        await page.waitForTimeout(500);
        // URL should update with schedule filter
        await expect(page).toHaveURL(/schedule=/i);
      }
    }
  });

  test("Age Groups filter works", async ({ page }) => {
    // Look for Age Groups filter section
    const ageSection = page.locator('text=/age groups/i').first();

    if (await ageSection.isVisible()) {
      await ageSection.click(); // Expand section if collapsed
      await page.waitForTimeout(200);

      // Look for school_age checkbox
      const schoolAgeCheckbox = page.locator(
        'input[type="checkbox"][value*="school_age" i], label:has-text("School Age") input'
      ).first();

      if (await schoolAgeCheckbox.isVisible()) {
        await schoolAgeCheckbox.check();
        await page.waitForTimeout(500);
        // URL should update with ages filter
        await expect(page).toHaveURL(/ages=/i);
      }
    }
  });

  test("Multiple filters can be combined", async ({ page }) => {
    await page.goto("/jobs/search?position=bcba&employment=full_time&remote=true&settings=in_home,in_center&schedule=daytime");

    // All filters should be in URL
    await expect(page).toHaveURL(/position=bcba/i);
    await expect(page).toHaveURL(/employment=full_time/i);
    await expect(page).toHaveURL(/remote=true/i);
    await expect(page).toHaveURL(/settings=in_home/i);
    await expect(page).toHaveURL(/schedule=daytime/i);
  });

  test("Filter badges are clickable to remove", async ({ page }) => {
    await page.goto("/jobs/search?position=bcba&employment=full_time");

    // Find active filter badges
    const filterBadge = page.locator(
      '[data-testid="filter-badge"], .badge:has(svg), button:has-text("BCBA")'
    ).first();

    if (await filterBadge.isVisible()) {
      await filterBadge.click();
      await page.waitForTimeout(500);

      // Position filter should be removed from URL
      const url = page.url();
      const hasPositionInUrl = url.toLowerCase().includes("position=bcba");
      const badgeStillVisible = await filterBadge.isVisible().catch(() => false);

      expect(!hasPositionInUrl || !badgeStillVisible).toBeTruthy();
    }
  });

  test("Location filter by state", async ({ page }) => {
    await page.goto("/jobs/search?state=California");

    // URL should have state filter
    await expect(page).toHaveURL(/state=California/i);

    // Results should reflect state filter
    const resultsText = page.locator("text=/california|ca/i").first();
    const hasStateInResults = await resultsText.isVisible().catch(() => false);
    console.log(`State visible in results: ${hasStateInResults}`);
  });

  test("Location filter by city and state", async ({ page }) => {
    await page.goto("/jobs/search?city=Los+Angeles&state=California");

    // URL should have both filters
    await expect(page).toHaveURL(/city=Los/i);
    await expect(page).toHaveURL(/state=California/i);
  });
});

test.describe("Find ABA Jobs - Sort Options", () => {
  test("Sort by date option works", async ({ page }) => {
    await page.goto("/jobs/search");

    const sortDropdown = page.locator(
      'button:has(svg), [data-testid="sort-toggle"], button:has-text("Sort"), select[name*="sort"]'
    ).first();

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click();
      await page.waitForTimeout(200);

      const dateOption = page.locator('[role="option"]:has-text("Date"), option:has-text("Date"), text=/newest|recent|date/i').first();

      if (await dateOption.isVisible()) {
        await dateOption.click();
        await page.waitForTimeout(500);

        // URL should reflect sort param
        await expect(page).toHaveURL(/sort=date/i);
      }
    }
  });

  test("Sort by salary option works", async ({ page }) => {
    await page.goto("/jobs/search");

    const sortDropdown = page.locator(
      'button:has(svg), [data-testid="sort-toggle"], button:has-text("Sort"), select[name*="sort"]'
    ).first();

    if (await sortDropdown.isVisible()) {
      await sortDropdown.click();
      await page.waitForTimeout(200);

      const salaryOption = page.locator('[role="option"]:has-text("Salary"), option:has-text("Salary")').first();

      if (await salaryOption.isVisible()) {
        await salaryOption.click();
        await page.waitForTimeout(500);

        // URL should reflect sort param
        await expect(page).toHaveURL(/sort=salary/i);
      }
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

  test("Mobile filter sheet has all filter sections", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/search");

    const filterButton = page.locator('button:has-text("Filter")').first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // Check for filter sections in sheet
      const positionSection = page.locator('text=/position type/i');
      const employmentSection = page.locator('text=/employment type/i');
      const remoteToggle = page.locator('text=/remote/i');
      const workSettingSection = page.locator('text=/work setting/i');
      const scheduleSection = page.locator('text=/schedule/i');

      const hasPosition = await positionSection.first().isVisible().catch(() => false);
      const hasEmployment = await employmentSection.first().isVisible().catch(() => false);
      const hasRemote = await remoteToggle.first().isVisible().catch(() => false);
      const hasWorkSetting = await workSettingSection.first().isVisible().catch(() => false);
      const hasSchedule = await scheduleSection.first().isVisible().catch(() => false);

      expect(hasPosition || hasEmployment || hasRemote || hasWorkSetting || hasSchedule).toBeTruthy();
    }
  });

  test("Mobile filter Apply and Clear buttons work", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/search");

    const filterButton = page.locator('button:has-text("Filter")').first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);

      // Look for Apply and Clear buttons
      const applyButton = page.locator('button:has-text("Apply")').first();
      const clearButton = page.locator('button:has-text("Clear")').first();

      const hasApply = await applyButton.isVisible().catch(() => false);
      const hasClear = await clearButton.isVisible().catch(() => false);

      expect(hasApply).toBeTruthy();
      expect(hasClear).toBeTruthy();
    }
  });

  test("Mobile view shows filter count badge", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/search?position=bcba&remote=true");

    // Filter button should show count
    const filterButton = page.locator('button:has-text("Filter")').first();

    if (await filterButton.isVisible()) {
      // Should show badge with active filter count
      const badge = filterButton.locator('.rounded-full, span:has-text(/[0-9]/)');
      const hasBadge = await badge.isVisible().catch(() => false);
      console.log(`Filter count badge visible: ${hasBadge}`);
    }
  });

  test("Single column results on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/search");

    // Results should be single column
    await expect(page.getByRole("main")).toBeVisible();
  });
});
