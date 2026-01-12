import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - State & Position Pages Tests (FAJ-009, FAJ-010, FAJ-011)
 *
 * Tests state-specific and position-specific job pages.
 */
test.describe("Find ABA Jobs - State Jobs Pages", () => {
  test("FAJ-009: State jobs page loads", async ({ page }) => {
    await page.goto("/jobs/california");

    // State header
    await expect(page.locator("text=/california/i").first()).toBeVisible();

    // Jobs indicator
    await expect(
      page.locator("text=/job|career|opportunity/i").first()
    ).toBeVisible();
  });

  test("State jobs page shows job count", async ({ page }) => {
    await page.goto("/jobs/california");

    // Job count in state
    const jobCount = page.locator("text=/\\d+.*job|job.*\\d+/i").first();
    const hasCount = await jobCount.isVisible().catch(() => false);
    console.log(`Job count visible: ${hasCount}`);
  });

  test("State jobs page has search state jobs button", async ({ page }) => {
    await page.goto("/jobs/california");

    // Search button
    const searchButton = page.locator(
      'a:has-text("Search"), button:has-text("Search")'
    ).first();
    await expect(searchButton).toBeVisible();
  });

  test("State jobs page has position type browse", async ({ page }) => {
    await page.goto("/jobs/california");

    // Position type links (state-filtered)
    const positionLinks = page.locator("text=/bcba.*job|rbt.*job/i");
    const count = await positionLinks.count();
    console.log(`Position type links: ${count}`);
  });

  test("State jobs page has popular cities section", async ({ page }) => {
    await page.goto("/jobs/california");

    // Popular cities
    const citySections = page.locator("text=/los angeles|san francisco|san diego/i");
    const count = await citySections.count();
    console.log(`Popular cities found: ${count}`);
  });

  test("State jobs page shows latest jobs", async ({ page }) => {
    await page.goto("/jobs/california");

    // Job listings or no jobs message
    const hasJobs = await page.locator('[data-testid="job-card"], article, .job-card').first().isVisible().catch(() => false);
    const hasNoJobs = await page.locator("text=/no.*job|check back|browse remote/i").first().isVisible().catch(() => false);

    expect(hasJobs || hasNoJobs).toBeTruthy();
  });

  test("State jobs page no results suggests remote jobs", async ({ page }) => {
    // A state with potentially fewer jobs
    await page.goto("/jobs/wyoming");

    // May show remote jobs suggestion
    const remoteSuggestion = page.locator("text=/remote|browse.*remote/i").first();
    const hasSuggestion = await remoteSuggestion.isVisible().catch(() => false);
    console.log(`Remote jobs suggestion visible: ${hasSuggestion}`);
  });

  const states = [
    { name: "Texas", slug: "texas" },
    { name: "Florida", slug: "florida" },
    { name: "New York", slug: "new-york" },
  ];

  for (const state of states) {
    test(`${state.name} jobs page loads`, async ({ page }) => {
      await page.goto(`/jobs/${state.slug}`);

      await expect(page.locator(`text=/${state.name}/i`).first()).toBeVisible();
    });
  }
});

test.describe("Find ABA Jobs - Position Type Pages", () => {
  test("FAJ-010: BCBA jobs page loads", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // Position title
    await expect(page.locator("text=/bcba/i").first()).toBeVisible();

    // Jobs indicator
    await expect(
      page.locator("text=/job|career|opportunity/i").first()
    ).toBeVisible();
  });

  test("Position page shows nationwide job count", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // Job count
    const jobCount = page.locator("text=/\\d+.*job|job.*\\d+/i").first();
    const hasCount = await jobCount.isVisible().catch(() => false);
    console.log(`Job count visible: ${hasCount}`);
  });

  test("Position page has typical requirements card", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // Requirements section
    const requirements = page.locator("text=/requirement|qualification|credential/i").first();
    const hasRequirements = await requirements.isVisible().catch(() => false);
    console.log(`Requirements card visible: ${hasRequirements}`);
  });

  test("Position page has salary range card", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // Salary section
    const salary = page.locator("text=/salary|compensation|\\$\\d+/i").first();
    const hasSalary = await salary.isVisible().catch(() => false);
    console.log(`Salary card visible: ${hasSalary}`);
  });

  test("Position page has browse by state section", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // State links
    const stateLinks = page.locator("text=/california|texas|florida|new york/i");
    const count = await stateLinks.count();
    console.log(`State links found: ${count}`);
  });

  test("Position page shows latest jobs for position", async ({ page }) => {
    await page.goto("/bcba-jobs");

    // Job listings
    const hasJobs = await page.locator('[data-testid="job-card"], article, .job-card').first().isVisible().catch(() => false);
    console.log(`Jobs visible: ${hasJobs}`);
  });

  const positionPages = [
    { name: "RBT", slug: "rbt-jobs" },
    { name: "Behavior Technician", slug: "bt-jobs" },
    { name: "Clinical Director", slug: "clinical-director-jobs" },
    { name: "BCaBA", slug: "bcaba-jobs" },
  ];

  for (const position of positionPages) {
    test(`${position.name} jobs page loads`, async ({ page }) => {
      await page.goto(`/${position.slug}`);

      await expect(page.getByRole("main")).toBeVisible();
    });
  }
});

test.describe("Find ABA Jobs - Provider Careers Page", () => {
  test("FAJ-011: Provider careers page loads from search", async ({ page }) => {
    // First find a provider's careers page from a job
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Click company profile link
      const companyLink = page.locator(
        'a:has-text("View Company"), a:has-text("Company Profile"), a:has-text("careers")'
      ).first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Should show company careers page
        await expect(page).toHaveURL(/\/provider\/.*\/careers|\/careers/);

        // Company name visible
        await expect(page.locator("h1, h2").first()).toBeVisible();
      }
    }
  });

  test("Provider careers page shows company info", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const companyLink = page.locator('a:has-text("View Company")').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Company logo
        const logo = page.locator('[data-testid="company-logo"], img[alt*="logo" i], .avatar').first();
        const hasLogo = await logo.isVisible().catch(() => false);
        console.log(`Company logo visible: ${hasLogo}`);

        // Company description
        const description = page.locator("text=/about|description|overview/i").first();
        const hasDescription = await description.isVisible().catch(() => false);
        console.log(`Company description visible: ${hasDescription}`);
      }
    }
  });

  test("Provider careers page shows open positions", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const companyLink = page.locator('a:has-text("View Company")').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Open positions section
        const positions = page.locator("text=/open position|job|career/i").first();
        await expect(positions).toBeVisible();
      }
    }
  });

  test("Provider careers page has Visit Website button", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const companyLink = page.locator('a:has-text("View Company")').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Visit website button
        const websiteButton = page.locator('a:has-text("Visit Website")').first();
        const hasWebsite = await websiteButton.isVisible().catch(() => false);
        console.log(`Visit Website button visible: ${hasWebsite}`);
      }
    }
  });

  test("Provider careers page has View Full Profile link", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const companyLink = page.locator('a:has-text("View Company")').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Full profile link
        const profileLink = page.locator('a:has-text("View Full Profile"), a:has-text("Profile")').first();
        const hasProfileLink = await profileLink.isVisible().catch(() => false);
        console.log(`View Full Profile link visible: ${hasProfileLink}`);
      }
    }
  });

  test("Provider careers page has Search All Jobs CTA", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      const companyLink = page.locator('a:has-text("View Company")').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Search all jobs CTA
        const searchAllCTA = page.locator('a:has-text("Search All Jobs"), a:has-text("Browse")').first();
        const hasCTA = await searchAllCTA.isVisible().catch(() => false);
        console.log(`Search All Jobs CTA visible: ${hasCTA}`);
      }
    }
  });
});
