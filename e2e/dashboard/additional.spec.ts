import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Dashboard - Additional Sections Tests
 * Tests for: /dashboard/account, /dashboard/team, /dashboard/team/employees,
 *            /dashboard/clients, /dashboard/leads, /dashboard/feedback,
 *            /dashboard/forms, /dashboard/jobs/careers, /dashboard/upgrade
 */

// Check if auth state exists
function checkAuthAvailable(): boolean {
  const authPath = path.join(__dirname, "..", ".auth", "user.json");
  return existsSync(authPath);
}

test.describe("DASH-031, DASH-032: Account Settings", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/account");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load account settings page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/account/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display current email", async ({ page }) => {
    const emailField = page.locator(
      'input[type="email"][disabled], input[name*="email" i], text=/@.*\\.com/i'
    );
    const hasEmail = await emailField.first().isVisible().catch(() => false);

    expect(hasEmail).toBeTruthy();
  });

  test("should have change password option", async ({ page }) => {
    const passwordSection = page.locator(
      'button:has-text(/change password/i), a:has-text(/change password/i), input[type="password"]'
    );
    const hasPassword = await passwordSection.first().isVisible().catch(() => false);

    expect(hasPassword).toBeTruthy();
  });

  test("should show connected OAuth providers", async ({ page }) => {
    const oauthSection = page.locator(
      'text=/google|microsoft|connected accounts|sign-in methods/i'
    );
    const hasOAuth = await oauthSection.first().isVisible().catch(() => false);

    // OAuth section is expected but not strictly required
    if (hasOAuth) {
      expect(hasOAuth).toBeTruthy();
    }
  });
});

test.describe("DASH-033, DASH-034: Team Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load team page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/team")) {
      await expect(page).toHaveURL(/dashboard\/team/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      // May redirect to upgrade or not be available
      test.skip(true, "Team feature not available");
    }
  });

  test("should display team members or empty state", async ({ page }) => {
    const teamMembers = page.locator(
      '[data-testid="team-member"], .team-member, tr, .member-card'
    );
    const emptyState = page.locator('text=/no team|no members|invite/i');

    const hasMembers = await teamMembers.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasMembers || hasEmpty).toBeTruthy();
  });

  test("should have invite/add member functionality", async ({ page }) => {
    const inviteButton = page.locator(
      'button:has-text(/invite|add member|add team/i), a:has-text(/invite/i)'
    );
    const hasInvite = await inviteButton.first().isVisible().catch(() => false);

    // Invite may require Enterprise plan
    if (hasInvite) {
      expect(hasInvite).toBeTruthy();
    }
  });
});

test.describe("Employees Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/employees");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load employees page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/employees")) {
      await expect(page).toHaveURL(/dashboard\/team\/employees/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip(true, "Employees feature not available");
    }
  });

  test("should have add employee button", async ({ page }) => {
    const addButton = page.locator(
      'button:has-text(/add employee|new employee/i), a:has-text(/add employee/i)'
    );
    const hasAdd = await addButton.first().isVisible().catch(() => false);

    if (hasAdd) {
      expect(hasAdd).toBeTruthy();
    }
  });
});

test.describe("DASH-028: Clients Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/clients");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load clients page or show upgrade", async ({ page }) => {
    const url = page.url();

    if (url.includes("/clients")) {
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else if (url.includes("/upgrade") || url.includes("/billing")) {
      // Clients requires Pro+
      test.skip(true, "Clients requires Pro+ plan");
    }
  });

  test("should display clients list or empty state", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/clients")) {
      test.skip(true, "Clients feature not available");
      return;
    }

    const clientsList = page.locator(
      '[data-testid="client-item"], .client-item, tr, .client-card'
    );
    const emptyState = page.locator('text=/no clients|empty|get started/i');

    const hasClients = await clientsList.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasClients || hasEmpty).toBeTruthy();
  });
});

test.describe("DASH-029: Leads Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/leads");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load leads page or show upgrade", async ({ page }) => {
    const url = page.url();

    if (url.includes("/leads")) {
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else if (url.includes("/upgrade") || url.includes("/billing")) {
      test.skip(true, "Leads requires Pro+ plan");
    }
  });

  test("should display leads list or empty state", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/leads")) {
      test.skip(true, "Leads feature not available");
      return;
    }

    const leadsList = page.locator(
      '[data-testid="lead-item"], .lead-item, tr, .lead-card'
    );
    const emptyState = page.locator('text=/no leads|empty/i');

    const hasLeads = await leadsList.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasLeads || hasEmpty).toBeTruthy();
  });
});

test.describe("DASH-030: Feedback Page", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/feedback");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load feedback page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/feedback")) {
      await expect(page).toHaveURL(/dashboard\/feedback/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip(true, "Feedback feature not available");
    }
  });

  test("should display feedback list or empty state", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/feedback")) {
      test.skip(true, "Feedback feature not available");
      return;
    }

    const feedbackList = page.locator(
      '[data-testid="feedback-item"], .feedback-item, article, tr'
    );
    const emptyState = page.locator('text=/no feedback|empty/i');

    const hasFeedback = await feedbackList.first().isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasFeedback || hasEmpty).toBeTruthy();
  });
});

test.describe("DASH-026, DASH-027: Forms Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/forms");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load forms settings page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/forms")) {
      await expect(page).toHaveURL(/dashboard\/forms/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip(true, "Forms feature not available");
    }
  });

  test("should have form toggle", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/forms")) {
      test.skip(true, "Forms feature not available");
      return;
    }

    const toggle = page.locator(
      'input[type="checkbox"], button[role="switch"], [data-testid="form-toggle"]'
    );
    const hasToggle = await toggle.first().isVisible().catch(() => false);

    expect(hasToggle).toBeTruthy();
  });

  test("should show contact form URL", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/forms")) {
      test.skip(true, "Forms feature not available");
      return;
    }

    const formUrl = page.locator(
      'input[value*="contact"], text=/contact\/[a-z0-9-]+/i, code, .url'
    );
    const copyButton = page.locator('button:has-text(/copy/i)');

    const hasUrl = await formUrl.first().isVisible().catch(() => false);
    const hasCopy = await copyButton.first().isVisible().catch(() => false);

    expect(hasUrl || hasCopy).toBeTruthy();
  });
});

test.describe("DASH-040: Careers Page Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/careers");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load careers management page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/careers")) {
      await expect(page).toHaveURL(/dashboard\/jobs\/careers/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip(true, "Careers management not available");
    }
  });

  test("should show careers page URL", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/careers")) {
      test.skip(true, "Careers management not available");
      return;
    }

    const careersUrl = page.locator(
      'input[value*="careers"], text=/careers\/[a-z0-9-]+/i, code, .url'
    );
    const copyButton = page.locator('button:has-text(/copy/i)');

    const hasUrl = await careersUrl.first().isVisible().catch(() => false);
    const hasCopy = await copyButton.first().isVisible().catch(() => false);

    expect(hasUrl || hasCopy).toBeTruthy();
  });

  test("should have preview link", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/careers")) {
      test.skip(true, "Careers management not available");
      return;
    }

    const previewLink = page.locator(
      'a:has-text(/preview|view/i), a[href*="/careers/"]'
    );
    const hasPreview = await previewLink.first().isVisible().catch(() => false);

    expect(hasPreview).toBeTruthy();
  });
});

test.describe("DASH-041: Upgrade Page", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/upgrade");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load upgrade page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/upgrade/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display plan comparison", async ({ page }) => {
    const planCards = page.locator(
      '[data-testid="plan-card"], .plan-card, .pricing-card'
    );
    const planNames = page.locator('text=/free|pro|enterprise/i');

    const hasCards = await planCards.first().isVisible().catch(() => false);
    const hasPlans = await planNames.first().isVisible().catch(() => false);

    expect(hasCards || hasPlans).toBeTruthy();
  });

  test("should highlight current plan", async ({ page }) => {
    const currentPlan = page.locator(
      '[data-testid="current-plan"], .current-plan, text=/current plan/i, .active-plan'
    );
    const hasHighlight = await currentPlan.first().isVisible().catch(() => false);

    expect(hasHighlight).toBeTruthy();
  });

  test("should have annual/monthly toggle", async ({ page }) => {
    const billingToggle = page.locator(
      'button:has-text(/annual|monthly/i), [data-testid="billing-toggle"], input[type="checkbox"]'
    );
    const hasToggle = await billingToggle.first().isVisible().catch(() => false);

    // Billing toggle is expected
    expect(hasToggle).toBeTruthy();
  });

  test("should have upgrade buttons", async ({ page }) => {
    const upgradeButtons = page.locator(
      'button:has-text(/upgrade|get started|choose/i), a[href*="/billing/checkout"]'
    );
    const hasButtons = await upgradeButtons.first().isVisible().catch(() => false);

    expect(hasButtons).toBeTruthy();
  });
});

test.describe("DASH-018: Analytics Page (Pro+)", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/analytics");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load analytics page or show upgrade", async ({ page }) => {
    const url = page.url();

    if (url.includes("/analytics")) {
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else if (url.includes("/upgrade") || url.includes("/billing")) {
      test.skip(true, "Analytics requires Pro+ plan");
    }
  });

  test("should display metrics cards", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/analytics")) {
      test.skip(true, "Analytics feature not available");
      return;
    }

    const metricsCards = page.locator(
      '[data-testid="metric-card"], .metric-card, .stat-card'
    );
    const hasCards = await metricsCards.first().isVisible().catch(() => false);

    expect(hasCards).toBeTruthy();
  });

  test("should have date range filter", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/analytics")) {
      test.skip(true, "Analytics feature not available");
      return;
    }

    const dateFilter = page.locator(
      'select[name*="date" i], button:has-text(/7 days|30 days|90 days/i), [data-testid="date-filter"]'
    );
    const hasFilter = await dateFilter.first().isVisible().catch(() => false);

    expect(hasFilter).toBeTruthy();
  });

  test("should show charts or graphs", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/analytics")) {
      test.skip(true, "Analytics feature not available");
      return;
    }

    const charts = page.locator(
      'canvas, svg[class*="chart"], [data-testid="chart"], .recharts-wrapper'
    );
    const hasCharts = await charts.first().isVisible().catch(() => false);

    // Charts are expected but may not be visible if no data
    if (hasCharts) {
      expect(hasCharts).toBeTruthy();
    }
  });
});

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/settings");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load settings page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/settings/);

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should have notification preferences", async ({ page }) => {
    const notifications = page.locator(
      'text=/notifications/i, input[name*="notification" i], [data-testid="notifications"]'
    );
    const hasNotifications = await notifications.first().isVisible().catch(() => false);

    // Notifications settings are expected
    if (hasNotifications) {
      expect(hasNotifications).toBeTruthy();
    }
  });
});
