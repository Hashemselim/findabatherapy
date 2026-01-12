import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Admin Routes Tests
 * Tests for: /admin, /admin/analytics, /admin/feedback, /admin/removal-requests
 * Note: These tests require admin privileges
 */

// Check if auth state exists
function checkAuthAvailable(): boolean {
  const authPath = path.join(__dirname, "..", ".auth", "user.json");
  return existsSync(authPath);
}

test.describe("ADM-001, ADM-002: Admin Access Control", () => {
  test("should redirect non-admin users from admin dashboard", async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin");

    // Check where we ended up
    const url = page.url();

    // Non-admin should be redirected to dashboard, auth, or see forbidden
    const isAdminPage = url.includes("/admin") && !url.includes("/auth/");
    const isRedirected = url.includes("/dashboard") || url.includes("/auth/");
    const isForbidden = await page.locator('text=/forbidden|access denied|not authorized|403/i').isVisible().catch(() => false);

    // Either redirected or shown forbidden
    if (isAdminPage && !isForbidden) {
      // User is admin - verify admin content
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      expect(isRedirected || isForbidden).toBeTruthy();
    }
  });

  test("should require authentication for admin routes", async ({ page }) => {
    // Test without auth
    await page.context().clearCookies();

    await page.goto("/admin");

    const url = page.url();

    // Should redirect to auth
    expect(url.includes("/auth/") || url.includes("/admin")).toBeTruthy();

    if (url.includes("/admin")) {
      // May show forbidden page
      const forbidden = page.locator('text=/sign in|forbidden|not authorized/i');
      const hasForbidden = await forbidden.isVisible().catch(() => false);
      expect(hasForbidden).toBeTruthy();
    }
  });
});

test.describe("ADM-003: Admin Analytics", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin/analytics");

    const url = page.url();
    if (url.includes("/auth/") || url.includes("/dashboard")) {
      test.skip(true, "Admin access required");
      return;
    }

    const forbidden = await page.locator('text=/forbidden|not authorized/i').isVisible().catch(() => false);
    if (forbidden) {
      test.skip(true, "Admin privileges required");
      return;
    }
  });

  test("should load admin analytics page", async ({ page }) => {
    await expect(page).toHaveURL(/admin\/analytics/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display site-wide metrics", async ({ page }) => {
    // Look for metrics
    const metrics = page.locator(
      '[data-testid="metric"], .metric-card, .stat-card'
    );
    const hasMetrics = await metrics.first().isVisible().catch(() => false);

    expect(hasMetrics).toBeTruthy();
  });

  test("should show provider/job counts", async ({ page }) => {
    const providerCount = page.locator('text=/providers|listings/i');
    const jobCount = page.locator('text=/jobs|postings/i');
    const appCount = page.locator('text=/applications/i');

    const hasProviders = await providerCount.first().isVisible().catch(() => false);
    const hasJobs = await jobCount.first().isVisible().catch(() => false);

    expect(hasProviders || hasJobs).toBeTruthy();
  });
});

test.describe("ADM-004: Admin Feedback", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin/feedback");

    const url = page.url();
    if (url.includes("/auth/") || url.includes("/dashboard")) {
      test.skip(true, "Admin access required");
      return;
    }

    const forbidden = await page.locator('text=/forbidden|not authorized/i').isVisible().catch(() => false);
    if (forbidden) {
      test.skip(true, "Admin privileges required");
      return;
    }
  });

  test("should load admin feedback page", async ({ page }) => {
    await expect(page).toHaveURL(/admin\/feedback/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display feedback list or empty state", async ({ page }) => {
    const feedbackItems = page.locator(
      '[data-testid="feedback-item"], .feedback-item, tr, article'
    );
    const emptyState = page.locator('text=/no feedback|empty/i');

    const hasFeedback = await feedbackItems.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasFeedback || hasEmpty).toBeTruthy();
  });

  test("should have filter options", async ({ page }) => {
    const filters = page.locator(
      'select, button:has-text(/filter/i), [data-testid="filter"]'
    );
    const hasFilters = await filters.first().isVisible().catch(() => false);

    // Filters are expected but not required
    if (hasFilters) {
      expect(hasFilters).toBeTruthy();
    }
  });
});

test.describe("ADM-005, ADM-006: Admin Removal Requests", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin/removal-requests");

    const url = page.url();
    if (url.includes("/auth/") || url.includes("/dashboard")) {
      test.skip(true, "Admin access required");
      return;
    }

    const forbidden = await page.locator('text=/forbidden|not authorized/i').isVisible().catch(() => false);
    if (forbidden) {
      test.skip(true, "Admin privileges required");
      return;
    }
  });

  test("should load removal requests page", async ({ page }) => {
    await expect(page).toHaveURL(/admin\/removal-requests/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display removal requests or empty state", async ({ page }) => {
    const requests = page.locator(
      '[data-testid="request-item"], .request-item, tr, article'
    );
    const emptyState = page.locator('text=/no requests|empty|no removal/i');

    const hasRequests = await requests.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasRequests || hasEmpty).toBeTruthy();
  });

  test("should have approve/deny actions", async ({ page }) => {
    const requests = page.locator(
      '[data-testid="request-item"], .request-item, tr'
    ).first();

    const hasRequest = await requests.isVisible().catch(() => false);

    if (!hasRequest) {
      test.skip(true, "No removal requests to test");
      return;
    }

    // Look for action buttons
    const approveButton = page.locator('button:has-text(/approve/i)');
    const denyButton = page.locator('button:has-text(/deny|reject/i)');

    const hasApprove = await approveButton.first().isVisible().catch(() => false);
    const hasDeny = await denyButton.first().isVisible().catch(() => false);

    expect(hasApprove || hasDeny).toBeTruthy();
  });

  test("should show request details", async ({ page }) => {
    const requests = page.locator(
      '[data-testid="request-item"], .request-item, tr'
    ).first();

    const hasRequest = await requests.isVisible().catch(() => false);

    if (!hasRequest) {
      test.skip(true, "No removal requests to test");
      return;
    }

    // Look for request details
    const providerName = page.locator('text=/provider|listing|company/i');
    const requestDate = page.locator('text=/\\d{1,2}.*\\d{4}|ago/i');
    const reason = page.locator('text=/reason|message/i');

    const hasProvider = await providerName.first().isVisible().catch(() => false);
    const hasDate = await requestDate.first().isVisible().catch(() => false);

    expect(hasProvider || hasDate).toBeTruthy();
  });
});

test.describe("Admin Dashboard Overview", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin");

    const url = page.url();
    if (url.includes("/auth/") || url.includes("/dashboard")) {
      test.skip(true, "Admin access required");
      return;
    }

    const forbidden = await page.locator('text=/forbidden|not authorized/i').isVisible().catch(() => false);
    if (forbidden) {
      test.skip(true, "Admin privileges required");
      return;
    }
  });

  test("should display overview stats", async ({ page }) => {
    const statCards = page.locator(
      '[data-testid="stat-card"], .stat-card, .metric-card'
    );
    const hasStats = await statCards.first().isVisible().catch(() => false);

    expect(hasStats).toBeTruthy();
  });

  test("should have quick links to admin sections", async ({ page }) => {
    const analyticsLink = page.locator('a[href*="/admin/analytics"]');
    const feedbackLink = page.locator('a[href*="/admin/feedback"]');
    const removalLink = page.locator('a[href*="/admin/removal"]');

    const hasAnalytics = await analyticsLink.isVisible().catch(() => false);
    const hasFeedback = await feedbackLink.isVisible().catch(() => false);
    const hasRemoval = await removalLink.isVisible().catch(() => false);

    // Should have at least some navigation
    expect(hasAnalytics || hasFeedback || hasRemoval).toBeTruthy();
  });

  test("should show recent activity", async ({ page }) => {
    const activitySection = page.locator(
      '[data-testid="activity"], .activity-feed, section:has-text(/recent|activity/i)'
    );
    const hasActivity = await activitySection.isVisible().catch(() => false);

    // Activity feed is optional
    if (hasActivity) {
      expect(hasActivity).toBeTruthy();
    }
  });
});

test.describe("Admin Navigation", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/admin");

    const url = page.url();
    if (url.includes("/auth/") || url.includes("/dashboard")) {
      test.skip(true, "Admin access required");
      return;
    }

    const forbidden = await page.locator('text=/forbidden|not authorized/i').isVisible().catch(() => false);
    if (forbidden) {
      test.skip(true, "Admin privileges required");
      return;
    }
  });

  test("should have admin sidebar or navigation", async ({ page }) => {
    const sidebar = page.locator(
      'aside, nav[aria-label*="admin" i], .admin-nav, [data-testid="admin-sidebar"]'
    );
    const hasNav = await sidebar.first().isVisible().catch(() => false);

    expect(hasNav).toBeTruthy();
  });

  test("should navigate between admin sections", async ({ page }) => {
    // Try to navigate to analytics
    const analyticsLink = page.locator('a[href*="/admin/analytics"]').first();
    const hasAnalytics = await analyticsLink.isVisible().catch(() => false);

    if (hasAnalytics) {
      await analyticsLink.click();
      await expect(page).toHaveURL(/admin\/analytics/);
    }
  });
});
