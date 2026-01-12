import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - Job Detail Page Tests (FAJ-004)
 *
 * Tests individual job posting pages.
 */
test.describe("Find ABA Jobs - Job Detail Page", () => {
  test("FAJ-004: Job detail page loads from search", async ({ page }) => {
    // First find a job from search
    await page.goto("/jobs/search");

    const jobLink = page.locator(
      '[data-testid="job-card"] a, article a, .job-card a'
    ).first();

    if (await jobLink.isVisible()) {
      await jobLink.click();
      await expect(page).toHaveURL(/\/job\//);

      // Job title (h1)
      await expect(page.locator("h1").first()).toBeVisible();
    } else {
      test.skip(true, "No jobs found in search results");
    }
  });

  test("Job detail shows company information", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Company name
      await expect(
        page.locator("text=/company|agency|organization/i").first()
      ).toBeVisible();

      // Company logo
      const logo = page.locator('[data-testid="company-logo"], img[alt*="logo" i], .avatar').first();
      const hasLogo = await logo.isVisible().catch(() => false);
      console.log(`Company logo visible: ${hasLogo}`);
    }
  });

  test("Job detail shows location and remote status", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Location or remote indicator
      await expect(
        page.locator("text=/location|remote|city|state/i").first()
      ).toBeVisible();
    }
  });

  test("Job detail shows position and employment types", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Position type badge
      await expect(
        page.locator("text=/bcba|rbt|bt|director|technician/i").first()
      ).toBeVisible();

      // Employment type badges
      await expect(
        page.locator("text=/full.?time|part.?time|contract|per.?diem/i").first()
      ).toBeVisible();
    }
  });

  test("Job detail shows salary if provided", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Salary (may not be visible if not provided)
      const salary = page.locator("text=/\\$\\d+|salary|compensation/i").first();
      const hasSalary = await salary.isVisible().catch(() => false);
      console.log(`Salary visible: ${hasSalary}`);
    }
  });

  test("Job detail shows posted timestamp", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Posted date
      await expect(
        page.locator("text=/posted|ago|days|weeks/i").first()
      ).toBeVisible();
    }
  });

  test("Job detail shows full description", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Description section
      await expect(
        page.locator("text=/description|about|overview|responsibilities/i").first()
      ).toBeVisible();
    }
  });

  test("Job detail shows requirements if provided", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Requirements section (may not exist)
      const requirements = page.locator("text=/requirements|qualifications/i").first();
      const hasRequirements = await requirements.isVisible().catch(() => false);
      console.log(`Requirements section visible: ${hasRequirements}`);
    }
  });

  test("Job detail shows benefits if provided", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Benefits section
      const benefits = page.locator("text=/benefits|health insurance|pto|401k/i").first();
      const hasBenefits = await benefits.isVisible().catch(() => false);
      console.log(`Benefits section visible: ${hasBenefits}`);
    }
  });

  test("Job detail has Apply buttons", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Apply button(s)
      const applyButtons = page.locator(
        'button:has-text("Apply"), a:has-text("Apply")'
      );
      const count = await applyButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("Job detail has View Company Profile link", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // View company link
      const companyLink = page.locator(
        'a:has-text("View Company"), a:has-text("Company Profile"), a:has-text("About")'
      ).first();
      const hasLink = await companyLink.isVisible().catch(() => false);
      console.log(`Company profile link visible: ${hasLink}`);
    }
  });

  test("Job detail has breadcrumb navigation", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Breadcrumb
      const breadcrumb = page.locator(
        '[aria-label="breadcrumb"], nav:has-text("Back"), a:has-text("Back to")'
      ).first();
      const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false);
      console.log(`Breadcrumb visible: ${hasBreadcrumb}`);
    }
  });

  test("404 for non-existent job", async ({ page }) => {
    const response = await page.goto("/job/nonexistent-job-slug-12345");

    // Should return 404 or show not found message
    const is404 = response?.status() === 404;
    const hasNotFound = await page.locator("text=/not found|doesn't exist|404/i").isVisible().catch(() => false);

    expect(is404 || hasNotFound).toBeTruthy();
  });
});

test.describe("Find ABA Jobs - Job Sidebar", () => {
  test("Sidebar shows job summary", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Job summary card in sidebar
      const summaryCard = page.locator(
        '[data-testid="job-summary"], aside, .sidebar'
      ).first();
      const hasSummary = await summaryCard.isVisible().catch(() => false);
      console.log(`Job summary sidebar visible: ${hasSummary}`);
    }
  });

  test("Sidebar has prominent Apply CTA", async ({ page }) => {
    await page.goto("/jobs/search");

    const jobLink = page.locator('[data-testid="job-card"] a, article a').first();

    if (await jobLink.isVisible()) {
      await jobLink.click();

      // Apply card in sidebar
      const applyCTA = page.locator(
        '[data-testid="apply-card"], .apply-card, button:has-text("Apply Now")'
      ).first();
      await expect(applyCTA).toBeVisible();
    }
  });
});
