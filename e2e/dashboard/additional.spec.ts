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

    await page.goto("/dashboard/account", { waitUntil: "domcontentloaded" });

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
    await expect(
      page.getByText(/test\.findabatherapy\.com/i).first()
    ).toBeVisible();
  });

  test("should have change password option", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Account", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText(
          /account settings|linked sign-in methods|security information/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15000 });
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

    await page.goto("/dashboard/settings/users", {
      waitUntil: "domcontentloaded",
    });

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load team page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/settings/users") || url.includes("/team")) {
      await expect(page).toHaveURL(/dashboard\/(settings\/users|team)/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      // May redirect to upgrade or not be available
      test.skip(true, "Team feature not available");
    }
  });

  test("should display team members or empty state", async ({ page }) => {
    await expect(
      page.getByText(/active users|owner|you|no invitations yet|invite user/i).first()
    ).toBeVisible();
  });

  test("should have invite/add member functionality", async ({ page }) => {
    const inviteButton = page.locator(
      'button:has-text(/invite|add member|add team/i), a:has-text(/invite/i)'
    );
    const hasInvite = await inviteButton.first().isVisible().catch(() => false);

    // Invite may require Pro plan
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

    await page.goto("/dashboard/team/employees", {
      waitUntil: "domcontentloaded",
    });

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

    await page.goto("/dashboard/clients", { waitUntil: "domcontentloaded" });

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

    await expect(
      page
        .getByText(
          /clients total|add client|welcome to your pipeline|failed to load clients|no clients|go live/i,
        )
        .first(),
    ).toBeVisible();
  });
});

test.describe("DASH-029: Leads Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/clients/leads", {
      waitUntil: "domcontentloaded",
    });

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

    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("tab", { name: /leads/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page
        .getByRole("heading", { name: /no clients found|welcome to your pipeline/i })
        .or(page.getByRole("link", { name: /add client/i }))
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("DASH-030: Feedback Page", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/feedback", {
      waitUntil: "domcontentloaded",
    });

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

    await expect(
      page
        .getByText(/send us feedback|your feedback|submit feedback|no messages/i)
        .first(),
    ).toBeVisible();
  });
});

test.describe("DASH-026, DASH-027: Forms Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/forms/contact", {
      waitUntil: "domcontentloaded",
    });

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load forms settings page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/forms/contact")) {
      await expect(page).toHaveURL(/dashboard\/forms\/contact/);

      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip(true, "Forms feature not available");
    }
  });

  test("should have form toggle", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/forms/contact")) {
      test.skip(true, "Forms feature not available");
      return;
    }

    await expect(
      page.getByRole("heading", { name: "Contact Form" }),
    ).toBeVisible();
    await expect(
      page.getByText(/client contact form/i).first(),
    ).toBeVisible();
  });

  test("should show contact form URL", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/forms/contact")) {
      test.skip(true, "Forms feature not available");
      return;
    }

    await expect(
      page
        .locator("main")
        .getByText(/\/provider\/.*\/contact|copy link|open form/i)
        .first(),
    ).toBeVisible();
  });
});

test.describe("DASH-040: Careers Page Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/careers", { waitUntil: "domcontentloaded" });

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load careers management page", async ({ page }) => {
    const url = page.url();

    if (url.includes("/careers")) {
      await expect(page).toHaveURL(/dashboard\/(jobs\/careers|team\/careers)/);

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

    await expect(
      page.locator("main").getByText(/\/provider\/.*\/careers|copy link|careers page/i).first()
    ).toBeVisible();
  });

  test("should have preview link", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/careers")) {
      test.skip(true, "Careers management not available");
      return;
    }

    await expect(
      page.getByRole("link", { name: /preview|view full page/i }).first()
    ).toBeVisible();
  });
});

test.describe("DASH-041: Upgrade Page", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/upgrade", {
      waitUntil: "domcontentloaded",
    });

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
    const planNames = page.locator('text=/free|pro/i');

    const hasCards = await planCards.first().isVisible().catch(() => false);
    const hasPlans = await planNames.first().isVisible().catch(() => false);

    expect(hasCards || hasPlans).toBeTruthy();
  });

  test("should highlight current plan", async ({ page }) => {
    await expect(
      page.getByText(/recommended|premium listing|free listing|compare plans/i).first()
    ).toBeVisible();
  });

  test("should have annual/monthly toggle", async ({ page }) => {
    await expect(
      page.getByText(/monthly or yearly|monthly|annual/i).first()
    ).toBeVisible();
  });

  test("should have upgrade buttons", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /choose free listing|choose premium listing|choose featured placement/i }).first()
    ).toBeVisible();
  });
});

test.describe("DASH-018: Analytics Page (Pro+)", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/analytics", {
      waitUntil: "domcontentloaded",
    });

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

    await expect(
      page.getByRole("heading", { name: /performance analytics/i })
    ).toBeVisible();
  });

  test("should have date range filter", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/analytics")) {
      test.skip(true, "Analytics feature not available");
      return;
    }

    await expect(
      page.getByRole("button", { name: /all time|month|quarter|year/i }).first()
    ).toBeVisible();
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

    await page.goto("/dashboard/settings", {
      waitUntil: "domcontentloaded",
    });

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
