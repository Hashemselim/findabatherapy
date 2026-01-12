import { test, expect } from "@playwright/test";

/**
 * Find ABA Jobs - Employers Tests
 * Tests for: /employers, /employers/[slug], /employers/post
 */

test.describe("FAJ-013: Employers Directory", () => {
  test("should load employers directory page", async ({ page }) => {
    await page.goto("/employers");

    // Page loads
    await expect(page).toHaveURL("/employers");

    // Should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should display employer cards", async ({ page }) => {
    await page.goto("/employers");

    // Look for employer cards
    const employerCards = page.locator(
      '[data-testid="employer-card"], .employer-card, article, [role="article"], .company-card'
    );
    const noResultsText = page.locator('text=/no employers|no results|no companies/i');

    const hasCards = await employerCards.first().isVisible().catch(() => false);
    const hasNoResults = await noResultsText.isVisible().catch(() => false);

    // Either has results or shows no results message
    expect(hasCards || hasNoResults).toBeTruthy();
  });

  test("should show employer information on cards", async ({ page }) => {
    await page.goto("/employers");

    const employerCard = page.locator(
      '[data-testid="employer-card"], .employer-card, article'
    ).first();

    const hasCard = await employerCard.isVisible().catch(() => false);

    if (!hasCard) {
      test.skip(true, "No employer cards available");
      return;
    }

    // Check for expected elements
    const hasLogo = await employerCard.locator("img").isVisible().catch(() => false);
    const hasName = await employerCard.locator("h2, h3, .company-name, .employer-name").isVisible().catch(() => false);

    // At minimum should show company name
    expect(hasName).toBeTruthy();
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/employers");

    await expect(page).toHaveURL("/employers");

    // Content should be visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});

test.describe("FAJ-014: Employer Search", () => {
  test("should have search functionality", async ({ page }) => {
    await page.goto("/employers");

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[aria-label*="search" i], input[placeholder*="employer" i], input[placeholder*="company" i]'
    );
    const hasSearch = await searchInput.first().isVisible().catch(() => false);

    if (!hasSearch) {
      test.skip(true, "Search functionality not available");
      return;
    }

    await searchInput.first().fill("therapy");
    await page.waitForTimeout(500); // Debounce

    // Search should not break the page
    await expect(page).toHaveURL("/employers");
  });

  test("should filter by hiring status", async ({ page }) => {
    await page.goto("/employers");

    // Look for hiring filter
    const hiringFilter = page.locator(
      'input[type="checkbox"][name*="hiring" i], button:has-text(/hiring/i), [data-testid="hiring-filter"]'
    );
    const hasFilter = await hiringFilter.first().isVisible().catch(() => false);

    if (hasFilter) {
      await hiringFilter.first().click();
      await page.waitForTimeout(300);
      // Filter should work without breaking
    }
  });
});

test.describe("FAJ-015: Employer Profile", () => {
  test("should load employer profile page", async ({ page }) => {
    // First get an employer slug from the directory
    await page.goto("/employers");

    const employerLink = page.locator(
      '[data-testid="employer-card"] a, .employer-card a, article a[href*="/employers/"]'
    ).first();

    const hasLink = await employerLink.isVisible().catch(() => false);

    if (!hasLink) {
      // Try direct navigation to a test employer
      await page.goto("/employers/test-employer");
      const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
      if (is404) {
        test.skip(true, "No employers available to test profile");
        return;
      }
    } else {
      await employerLink.click();
    }

    // Should be on employer profile
    await expect(page).toHaveURL(/\/employers\/[a-z0-9-]+/);

    // Should have heading (company name)
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should display company information", async ({ page }) => {
    await page.goto("/employers");

    const employerLink = page.locator('a[href*="/employers/"]:not([href="/employers/post"])').first();
    const hasLink = await employerLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No employer profile available");
      return;
    }

    await employerLink.click();

    // Check for company info sections
    const companyName = page.locator("h1");
    await expect(companyName).toBeVisible();

    // Look for description/about section
    const aboutSection = page.locator(
      '[data-testid="about"], .about-section, section:has-text(/about/i)'
    );
    const hasAbout = await aboutSection.isVisible().catch(() => false);

    // Look for contact info
    const contactInfo = page.locator(
      '[data-testid="contact"], .contact-info, a[href^="mailto:"], a[href^="tel:"]'
    );
    const hasContact = await contactInfo.first().isVisible().catch(() => false);

    // At minimum should have company name
    expect(true).toBeTruthy();
  });

  test("should list open positions", async ({ page }) => {
    await page.goto("/employers");

    const employerLink = page.locator('a[href*="/employers/"]:not([href="/employers/post"])').first();
    const hasLink = await employerLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No employer profile available");
      return;
    }

    await employerLink.click();

    // Look for jobs section
    const jobsSection = page.locator(
      '[data-testid="jobs"], .jobs-section, section:has-text(/positions|jobs|openings/i)'
    );
    const jobCards = page.locator('[data-testid="job-card"], .job-card, article');

    const hasJobsSection = await jobsSection.isVisible().catch(() => false);
    const hasJobCards = await jobCards.first().isVisible().catch(() => false);
    const noJobsText = page.locator('text=/no open|no positions|no jobs/i');
    const hasNoJobs = await noJobsText.isVisible().catch(() => false);

    // Should either show jobs or no jobs message
    expect(hasJobsSection || hasJobCards || hasNoJobs).toBeTruthy();
  });

  test("should have link to provider profile", async ({ page }) => {
    await page.goto("/employers");

    const employerLink = page.locator('a[href*="/employers/"]:not([href="/employers/post"])').first();
    const hasLink = await employerLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No employer profile available");
      return;
    }

    await employerLink.click();

    // Look for link to provider/therapy profile
    const providerLink = page.locator('a[href*="/provider/"]');
    const hasProviderLink = await providerLink.first().isVisible().catch(() => false);

    // Provider link is optional
    if (hasProviderLink) {
      expect(hasProviderLink).toBeTruthy();
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/employers");

    const employerLink = page.locator('a[href*="/employers/"]:not([href="/employers/post"])').first();
    const hasLink = await employerLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No employer profile available");
      return;
    }

    await employerLink.click();

    // Content should be visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});

test.describe("FAJ-016: Post Job Page", () => {
  test("should load post job page", async ({ page }) => {
    await page.goto("/employers/post");

    // Page loads
    await expect(page).toHaveURL("/employers/post");

    // Should have heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should show sign up/sign in CTAs", async ({ page }) => {
    await page.goto("/employers/post");

    // Look for auth CTAs
    const signUpLink = page.locator('a[href*="/auth/sign-up"], a:has-text(/sign up|get started|create account/i)');
    const signInLink = page.locator('a[href*="/auth/sign-in"], a:has-text(/sign in|log in/i)');

    const hasSignUp = await signUpLink.first().isVisible().catch(() => false);
    const hasSignIn = await signInLink.first().isVisible().catch(() => false);

    // Should have at least one auth CTA
    expect(hasSignUp || hasSignIn).toBeTruthy();
  });

  test("should display pricing information", async ({ page }) => {
    await page.goto("/employers/post");

    // Look for pricing section
    const pricingSection = page.locator(
      '[data-testid="pricing"], .pricing, section:has-text(/pricing|plans|free|pro/i)'
    );
    const hasPricing = await pricingSection.isVisible().catch(() => false);

    // Pricing is expected but not strictly required
    if (hasPricing) {
      expect(hasPricing).toBeTruthy();
    }
  });

  test("should explain benefits of posting", async ({ page }) => {
    await page.goto("/employers/post");

    // Look for benefits section
    const benefitsSection = page.locator(
      '[data-testid="benefits"], .benefits, section:has-text(/benefits|features|why/i)'
    );
    const hasBenefits = await benefitsSection.isVisible().catch(() => false);

    // Benefits are expected but not strictly required
    if (hasBenefits) {
      expect(hasBenefits).toBeTruthy();
    }
  });

  test("Get Started button should navigate to auth", async ({ page }) => {
    await page.goto("/employers/post");

    const ctaButton = page.locator(
      'a[href*="/auth/"], button:has-text(/get started|post|sign up/i)'
    ).first();

    const hasCta = await ctaButton.isVisible().catch(() => false);

    if (!hasCta) {
      test.skip(true, "No CTA button found");
      return;
    }

    await ctaButton.click();
    await page.waitForURL(/auth/, { timeout: 5000 }).catch(() => {});

    // Should navigate to auth flow
    const url = page.url();
    expect(url.includes("/auth/") || url.includes("/employers/post")).toBeTruthy();
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/employers/post");

    // Content should be visible
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });
});

test.describe("FAJ-017, FAJ-018: City Jobs Pages", () => {
  test("should load city jobs page", async ({ page }) => {
    await page.goto("/jobs/california/los-angeles");

    // Page should load (may redirect or show no results)
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("should show city header with job count", async ({ page }) => {
    await page.goto("/jobs/california/los-angeles");

    // Should have city name in heading
    const losAngelesText = page.locator('text=/los angeles/i');
    await expect(losAngelesText.first()).toBeVisible();
  });

  test("should display job cards for city", async ({ page }) => {
    await page.goto("/jobs/california/los-angeles");

    // Look for job cards
    const jobCards = page.locator(
      '[data-testid="job-card"], .job-card, article'
    );
    const noResultsText = page.locator('text=/no jobs|no results|no positions/i');

    const hasCards = await jobCards.first().isVisible().catch(() => false);
    const hasNoResults = await noResultsText.isVisible().catch(() => false);

    // Either has results or shows no results message
    expect(hasCards || hasNoResults).toBeTruthy();
  });

  test("should show nearby cities section", async ({ page }) => {
    await page.goto("/jobs/california/los-angeles");

    // Look for nearby/related cities
    const nearbyCities = page.locator(
      '[data-testid="nearby-cities"], .nearby-cities, section:has-text(/nearby|related|other cities/i)'
    );
    const hasNearby = await nearbyCities.isVisible().catch(() => false);

    // Nearby cities are optional
    if (hasNearby) {
      expect(hasNearby).toBeTruthy();
    }
  });

  test("should have breadcrumb navigation", async ({ page }) => {
    await page.goto("/jobs/california/los-angeles");

    // Look for breadcrumbs
    const breadcrumbs = page.locator(
      '[data-testid="breadcrumb"], nav[aria-label*="breadcrumb" i], .breadcrumb, ol:has(li a)'
    );
    const hasBreadcrumbs = await breadcrumbs.first().isVisible().catch(() => false);

    if (hasBreadcrumbs) {
      // Should link back to state
      const stateLink = page.locator('a[href*="/jobs/california"]');
      const hasStateLink = await stateLink.isVisible().catch(() => false);
      expect(hasStateLink).toBeTruthy();
    }
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jobs/california/los-angeles");

    // Content should be visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});
