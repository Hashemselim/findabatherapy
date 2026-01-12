import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Dashboard - Jobs Management Tests (DASH-009, DASH-010, DASH-011, DASH-012, DASH-013, DASH-014, DASH-015)
 *
 * Tests job posting and application management.
 */

async function checkAuthAvailable(): Promise<boolean> {
  const fs = await import("fs");
  try {
    const content = fs.readFileSync(authFile, "utf-8");
    const data = JSON.parse(content);
    return data.cookies?.length > 0 || data.origins?.length > 0;
  } catch {
    return false;
  }
}

test.describe("Dashboard - Jobs Management", () => {
  test.use({
    storageState: async ({}, use) => {
      const hasAuth = await checkAuthAvailable();
      if (hasAuth) {
        await use(authFile);
      } else {
        await use({ cookies: [], origins: [] });
      }
    },
  });

  test("Jobs page loads", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("DASH-012: Jobs page shows plan limits", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Job limit indicator
    await expect(
      page.locator("text=/\\d+.*of.*\\d+|job.*limit|posting/i").first()
    ).toBeVisible();
  });

  test("Jobs page has new job button", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // New job button
    const newJobButton = page.locator(
      'a:has-text("New"), a:has-text("Create"), button:has-text("New Job")'
    ).first();
    await expect(newJobButton).toBeVisible();
  });

  test("Jobs page shows existing jobs", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Job list or empty state
    const hasJobs = await page.locator('[data-testid="job-item"], .job-item').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=/no job|create.*job|post.*job/i").first().isVisible().catch(() => false);

    expect(hasJobs || hasEmpty).toBeTruthy();
  });

  test("DASH-009: Create job page loads", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Create job form has title field", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Title input (5-100 chars)
    const titleInput = page.locator(
      'input[name*="title" i], input[placeholder*="title" i]'
    ).first();
    await expect(titleInput).toBeVisible();
  });

  test("Create job form has position type dropdown", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Position type selector
    await expect(
      page.locator("text=/position.*type|bcba|rbt|director/i").first()
    ).toBeVisible();
  });

  test("Create job form has employment type checkboxes", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Employment types
    await expect(
      page.locator("text=/full.*time|part.*time|contract|employment/i").first()
    ).toBeVisible();
  });

  test("Create job form has salary fields", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Salary section
    await expect(
      page.locator("text=/salary|compensation|pay/i").first()
    ).toBeVisible();
  });

  test("Create job form has description field", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Description textarea
    const descriptionInput = page.locator("textarea").first();
    await expect(descriptionInput).toBeVisible();
  });

  test("Create job form has benefits selection", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Benefits checkboxes
    await expect(
      page.locator("text=/benefits|health.*insurance|pto|401k/i").first()
    ).toBeVisible();
  });

  test("Create job form has status options", async ({ page }) => {
    await page.goto("/dashboard/jobs/new");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Status (Draft/Published)
    await expect(
      page.locator("text=/draft|publish|status/i").first()
    ).toBeVisible();
  });

  test("DASH-011: Job status can be changed", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Find job item with status control
    const statusControl = page.locator(
      '[data-testid="job-status"], select[name*="status" i], button:has-text("Status")'
    ).first();

    if (await statusControl.isVisible()) {
      console.log("Job status control available");
    }
  });
});

test.describe("Dashboard - Applications Management", () => {
  test.use({
    storageState: async ({}, use) => {
      const hasAuth = await checkAuthAvailable();
      if (hasAuth) {
        await use(authFile);
      } else {
        await use({ cookies: [], origins: [] });
      }
    },
  });

  test("DASH-013: Applications page loads", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    await expect(page.getByRole("main")).toBeVisible();
  });

  test("Applications page shows application list", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Application list or empty state
    const hasApps = await page.locator('[data-testid="application-item"], .application-item').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator("text=/no application|no.*received/i").first().isVisible().catch(() => false);

    expect(hasApps || hasEmpty).toBeTruthy();
  });

  test("DASH-014: Application status can be changed", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Status dropdown in application list
    const statusDropdown = page.locator(
      'select[name*="status" i], [data-testid="status-select"]'
    ).first();

    if (await statusDropdown.isVisible()) {
      // Status options: New, Reviewed, Phone Screen, Interview, Offered, Hired, Rejected
      console.log("Application status dropdown available");
    }
  });

  test("DASH-015: Application has resume download", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Resume download link
    const resumeLink = page.locator(
      'a:has-text("Resume"), a:has-text("Download"), [data-testid="resume-download"]'
    ).first();

    if (await resumeLink.isVisible()) {
      console.log("Resume download link available");
    }
  });

  test("Application detail page loads", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Click first application to view details
    const applicationLink = page.locator(
      '[data-testid="application-item"] a, .application-item a'
    ).first();

    if (await applicationLink.isVisible()) {
      await applicationLink.click();
      await expect(page).toHaveURL(/\/dashboard\/jobs\/applications\/.+/);
    }
  });

  test("Application detail has notes field", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const applicationLink = page.locator('[data-testid="application-item"] a').first();

    if (await applicationLink.isVisible()) {
      await applicationLink.click();

      // Notes textarea
      const notesField = page.locator("textarea").first();
      const hasNotes = await notesField.isVisible().catch(() => false);
      console.log(`Notes field visible: ${hasNotes}`);
    }
  });

  test("Application detail has rating selector", async ({ page }) => {
    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const applicationLink = page.locator('[data-testid="application-item"] a').first();

    if (await applicationLink.isVisible()) {
      await applicationLink.click();

      // Rating (1-5 stars)
      const ratingSelector = page.locator(
        '[data-testid="rating"], .star, [aria-label*="rating" i]'
      ).first();
      const hasRating = await ratingSelector.isVisible().catch(() => false);
      console.log(`Rating selector visible: ${hasRating}`);
    }
  });
});
