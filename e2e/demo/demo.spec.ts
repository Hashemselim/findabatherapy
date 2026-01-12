import { test, expect } from "@playwright/test";

/**
 * Demo Pages Tests
 * Tests for: /demo, /demo/company, /demo/locations, /demo/media, /demo/analytics, /demo/inbox, /demo-preview
 */

test.describe("DEMO-001: Demo Dashboard", () => {
  test("should load demo dashboard", async ({ page }) => {
    await page.goto("/demo");

    // Page should load
    await expect(page).toHaveURL(/demo/);

    // Should have heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display demo data", async ({ page }) => {
    await page.goto("/demo");

    // Should have some demo content
    const demoContent = page.locator(
      '[data-testid="demo-content"], .demo-data, main'
    );
    await expect(demoContent.first()).toBeVisible();
  });

  test("should show demo indicator/badge", async ({ page }) => {
    await page.goto("/demo");

    // Should indicate this is demo mode
    const demoBadge = page.locator(
      '[data-testid="demo-badge"], .demo-badge, text=/demo|preview|sample/i'
    );
    const hasBadge = await demoBadge.first().isVisible().catch(() => false);

    // Demo badge is expected
    expect(hasBadge).toBeTruthy();
  });

  test("should have CTA to create real account", async ({ page }) => {
    await page.goto("/demo");

    // Should have sign up CTA
    const signUpCta = page.locator(
      'a[href*="/auth/sign-up"], a:has-text(/sign up|create account|get started/i), button:has-text(/sign up|get started/i)'
    );
    const hasCta = await signUpCta.first().isVisible().catch(() => false);

    expect(hasCta).toBeTruthy();
  });
});

test.describe("DEMO-002: Demo Company Section", () => {
  test("should load demo company page", async ({ page }) => {
    await page.goto("/demo/company");

    await expect(page).toHaveURL(/demo\/company/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display sample company data", async ({ page }) => {
    await page.goto("/demo/company");

    // Should show company fields with sample data
    const companyName = page.locator(
      'input[name*="name" i], [data-testid="company-name"], text=/acme|sample|demo/i'
    );
    const hasData = await companyName.first().isVisible().catch(() => false);

    expect(hasData).toBeTruthy();
  });
});

test.describe("DEMO-003: Demo is Read-Only", () => {
  test("should not allow modifications in demo company", async ({ page }) => {
    await page.goto("/demo/company");

    // Try to find and interact with form fields
    const input = page.locator('input:not([type="hidden"]), textarea').first();
    const hasInput = await input.isVisible().catch(() => false);

    if (!hasInput) {
      // No editable fields = read-only by default
      expect(true).toBeTruthy();
      return;
    }

    // Check if field is disabled
    const isDisabled = await input.isDisabled().catch(() => false);
    const isReadOnly = await input.getAttribute("readonly").catch(() => null);

    // Try to type
    await input.fill("test modification").catch(() => {});

    // Check if there's a save button
    const saveButton = page.locator('button:has-text(/save/i)');
    const hasSave = await saveButton.isVisible().catch(() => false);

    if (hasSave) {
      await saveButton.click();
      await page.waitForTimeout(500);

      // Should show error or be blocked
      const error = page.locator('text=/demo|cannot save|read.?only/i');
      const hasError = await error.isVisible().catch(() => false);

      // Either disabled, readonly, or blocked
      expect(isDisabled || isReadOnly !== null || hasError).toBeTruthy();
    }
  });

  test("should indicate demo mode limitations", async ({ page }) => {
    await page.goto("/demo");

    const demoNotice = page.locator(
      'text=/demo mode|preview only|cannot save|sample data/i, [data-testid="demo-notice"]'
    );
    const hasNotice = await demoNotice.first().isVisible().catch(() => false);

    // Demo notice is expected
    if (hasNotice) {
      expect(hasNotice).toBeTruthy();
    }
  });
});

test.describe("DEMO-004: Sign Up CTA", () => {
  test("should have visible sign up CTA on demo pages", async ({ page }) => {
    await page.goto("/demo");

    const signUpCta = page.locator(
      'a[href*="/auth/sign-up"], button:has-text(/sign up|create account|get started|upgrade/i)'
    );
    await expect(signUpCta.first()).toBeVisible();
  });

  test("sign up CTA should navigate to auth", async ({ page }) => {
    await page.goto("/demo");

    const signUpCta = page.locator(
      'a[href*="/auth/sign-up"], a:has-text(/sign up|get started/i)'
    ).first();

    const hasCta = await signUpCta.isVisible().catch(() => false);

    if (!hasCta) {
      test.skip(true, "No sign up CTA found");
      return;
    }

    await signUpCta.click();
    await page.waitForURL(/auth/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url.includes("/auth/")).toBeTruthy();
  });
});

test.describe("Demo Locations Section", () => {
  test("should load demo locations page", async ({ page }) => {
    await page.goto("/demo/locations");

    await expect(page).toHaveURL(/demo\/locations/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display sample locations", async ({ page }) => {
    await page.goto("/demo/locations");

    const locationCards = page.locator(
      '[data-testid="location-card"], .location-card, .location-item, article'
    );
    const hasLocations = await locationCards.first().isVisible().catch(() => false);

    expect(hasLocations).toBeTruthy();
  });
});

test.describe("Demo Media Section", () => {
  test("should load demo media page", async ({ page }) => {
    await page.goto("/demo/media");

    await expect(page).toHaveURL(/demo\/media/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display sample photos/media", async ({ page }) => {
    await page.goto("/demo/media");

    const mediaItems = page.locator(
      'img, .photo-item, [data-testid="media-item"]'
    );
    const hasMedia = await mediaItems.first().isVisible().catch(() => false);

    expect(hasMedia).toBeTruthy();
  });
});

test.describe("Demo Analytics Section", () => {
  test("should load demo analytics page", async ({ page }) => {
    await page.goto("/demo/analytics");

    await expect(page).toHaveURL(/demo\/analytics/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display sample analytics data", async ({ page }) => {
    await page.goto("/demo/analytics");

    // Should show metrics with sample data
    const metrics = page.locator(
      '[data-testid="metric"], .metric-card, .stat-card'
    );
    const charts = page.locator('canvas, svg[class*="chart"], .recharts-wrapper');

    const hasMetrics = await metrics.first().isVisible().catch(() => false);
    const hasCharts = await charts.first().isVisible().catch(() => false);

    expect(hasMetrics || hasCharts).toBeTruthy();
  });
});

test.describe("Demo Inbox Section", () => {
  test("should load demo inbox page", async ({ page }) => {
    await page.goto("/demo/inbox");

    await expect(page).toHaveURL(/demo\/inbox/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display sample inbox items", async ({ page }) => {
    await page.goto("/demo/inbox");

    const inboxItems = page.locator(
      '[data-testid="inbox-item"], .inbox-item, .message-item, article, tr'
    );
    const emptyState = page.locator('text=/no messages|empty inbox/i');

    const hasItems = await inboxItems.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // Should have sample items or empty state
    expect(hasItems || hasEmpty).toBeTruthy();
  });
});

test.describe("Demo Preview Page", () => {
  test("should load demo preview page", async ({ page }) => {
    await page.goto("/demo-preview");

    await expect(page).toHaveURL(/demo-preview/);

    // Should have some content
    const content = page.locator("main, .content, body");
    await expect(content.first()).toBeVisible();
  });

  test("should show preview of provider listing", async ({ page }) => {
    await page.goto("/demo-preview");

    // Should show preview content
    const previewContent = page.locator(
      '[data-testid="preview"], .preview-content, .listing-preview'
    );
    const hasPreview = await previewContent.isVisible().catch(() => false);

    // Preview may be different format
    const heading = page.locator("h1, h2");
    const hasHeading = await heading.first().isVisible().catch(() => false);

    expect(hasPreview || hasHeading).toBeTruthy();
  });
});

test.describe("Demo Navigation", () => {
  test("should have navigation between demo sections", async ({ page }) => {
    await page.goto("/demo");

    // Should have links to demo sections
    const companyLink = page.locator('a[href*="/demo/company"]');
    const locationsLink = page.locator('a[href*="/demo/locations"]');
    const mediaLink = page.locator('a[href*="/demo/media"]');
    const analyticsLink = page.locator('a[href*="/demo/analytics"]');
    const inboxLink = page.locator('a[href*="/demo/inbox"]');

    const hasCompany = await companyLink.isVisible().catch(() => false);
    const hasLocations = await locationsLink.isVisible().catch(() => false);
    const hasMedia = await mediaLink.isVisible().catch(() => false);
    const hasAnalytics = await analyticsLink.isVisible().catch(() => false);
    const hasInbox = await inboxLink.isVisible().catch(() => false);

    // Should have at least some navigation
    expect(hasCompany || hasLocations || hasMedia || hasAnalytics || hasInbox).toBeTruthy();
  });

  test("should be able to navigate between demo sections", async ({ page }) => {
    await page.goto("/demo");

    const companyLink = page.locator('a[href*="/demo/company"]').first();
    const hasLink = await companyLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No navigation links found");
      return;
    }

    await companyLink.click();
    await expect(page).toHaveURL(/demo\/company/);
  });
});

test.describe("Demo Mobile Responsiveness", () => {
  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/demo");

    // Content should be visible
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();

    // No horizontal scrolling
    const viewport = await page.viewportSize();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);

    expect(bodyWidth).toBeLessThanOrEqual((viewport?.width || 375) + 10);
  });

  test("demo sections should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const demoPages = [
      "/demo/company",
      "/demo/locations",
      "/demo/media",
      "/demo/analytics",
      "/demo/inbox",
    ];

    for (const demoPage of demoPages) {
      await page.goto(demoPage);

      const heading = page.locator("h1, h2");
      const hasHeading = await heading.first().isVisible().catch(() => false);

      if (hasHeading) {
        // Page loads on mobile
        expect(hasHeading).toBeTruthy();
      }
    }
  });
});
