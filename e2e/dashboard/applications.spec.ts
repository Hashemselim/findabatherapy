import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Dashboard - Applications Management Tests
 * Tests for: /dashboard/team/applicants, /dashboard/team/applicants/[id]
 */

// Check if auth state exists
function checkAuthAvailable(): boolean {
  const authPath = path.join(__dirname, "..", ".auth", "user.json");
  return existsSync(authPath);
}

async function openFirstApplication(page: import("@playwright/test").Page) {
  const main = page.getByRole("main");
  const applicationLinks = main.locator('a[href*="/dashboard/team/applicants/"]');
  const emptyState = main.getByText(
    /no applications|no applicants|no results|go live/i,
  );

  await Promise.race([
    applicationLinks
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined),
    emptyState
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => undefined),
  ]);

  const applicationLink = applicationLinks.first();
  const hasLink = await applicationLink.isVisible().catch(() => false);

  if (!hasLink) {
    test.skip(true, "No applications available");
    return false;
  }

  await applicationLink.click();
  await page.waitForURL(/\/team\/applicants\/[a-z0-9]+/i);
  return true;
}

test.describe("DASH-013: Applications List", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    // Check if redirected to auth
    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load applications page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/team\/applicants/);

    // Should have heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display application cards or empty state", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Applicants" })).toBeVisible();

    const applicantRows = page
      .getByRole("main")
      .locator('a[href*="/dashboard/team/applicants/"]');
    const emptyState = page
      .getByRole("main")
      .getByText(/no applications|no applicants|no results|go live/i);

    expect(
      (await applicantRows.first().isVisible().catch(() => false)) ||
        (await emptyState.first().isVisible().catch(() => false)),
    ).toBeTruthy();
  });

  test("should show application information", async ({ page }) => {
    const applicationLink = page
      .getByRole("main")
      .locator('a[href*="/dashboard/team/applicants/"]')
      .first();

    const hasItem = await applicationLink.isVisible().catch(() => false);
    if (!hasItem) {
      test.skip(true, "No applications available");
      return;
    }

    await expect(applicationLink).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Job" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  });

  test("should filter by status", async ({ page }) => {
    await page.getByRole("button", { name: /^Reviewed\b/i }).click();
    await expect(
      page.getByRole("cell", { name: /^RBT - Pasadena$/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByText(/^reviewed$/i).first(),
    ).toBeVisible();
  });

  test("should filter by job", async ({ page }) => {
    const jobFilter = page.getByRole("combobox").first();
    await expect(jobFilter).toBeVisible();
    await jobFilter.click();
    await page.getByRole("option", { name: "RBT - Pasadena" }).click();
    await expect(
      page.getByRole("cell", { name: /^RBT - Pasadena$/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: /^BCBA - Los Angeles$/i }).first(),
    ).toHaveCount(0);
  });
});

test.describe("DASH-035: Application Detail", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load application detail page", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await expect(page).toHaveURL(/\/team\/applicants\/[a-z0-9]+/i);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to applicants/i })).toBeVisible();
  });

  test("should display applicant information", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("link").filter({ hasText: /@/ }).first()).toBeVisible();
    await expect(page.getByText(/applied today|applied position|source:/i).first()).toBeVisible();
  });
});

test.describe("DASH-036: Application Status Change", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have status dropdown", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await expect(page.getByText("Status:")).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("should show all status options", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await page.getByRole("combobox").first().click();

    // Check for expected status options
    const statusOptions = [
      "New",
      "Reviewed",
      "Phone Screen",
      "Interview",
      "Offered",
      "Hired",
      "Rejected",
    ];

    for (const status of statusOptions) {
      await expect(page.getByRole("option", { name: status })).toBeVisible();
    }
  });
});

test.describe("DASH-037: Application Notes", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have notes field", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await page.getByRole("button", { name: /notes/i }).click();
    await expect(page.getByRole("dialog", { name: /internal notes/i })).toBeVisible();
    await expect(
      page.getByPlaceholder(/add notes about this applicant/i),
    ).toBeVisible();
  });

  test("should save notes", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await page.getByRole("button", { name: /notes/i }).click();
    const notesField = page.getByPlaceholder(/add notes about this applicant/i);
    const testNote = `Test note ${Date.now()}`;
    await notesField.fill(testNote);

    await page.getByRole("button", { name: /save notes/i }).click();
    await expect(page.getByText(testNote)).toBeVisible();
  });
});

test.describe("DASH-038: Resume Download", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have resume download link", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    const resumeButton = page.getByRole("button", { name: /resume/i }).first();
    const noResumeCopy = page.getByText(/no resume was provided/i);

    expect(
      (await resumeButton.isVisible().catch(() => false)) ||
        (await noResumeCopy.isVisible().catch(() => false)),
    ).toBeTruthy();
  });
});

test.describe("DASH-039: Application Rating", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have rating component", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await expect(page.getByRole("button", { name: /rate 1 stars/i })).toBeVisible();
  });

  test("should allow setting rating", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    const ratingButton = page.getByRole("button", { name: /rate 3 stars/i });
    await expect(ratingButton).toBeEnabled({ timeout: 15000 });
    await ratingButton.click();
    await expect(page.getByText(/rated 3\/5/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Quick Actions", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/team/applicants");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have Hire quick action", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await page.getByRole("combobox").first().click();
    await expect(page.getByRole("option", { name: "Hired" })).toBeVisible();
  });

  test("should have Reject quick action", async ({ page }) => {
    if (!(await openFirstApplication(page))) {
      return;
    }

    await page.getByRole("combobox").first().click();
    await expect(page.getByRole("option", { name: "Rejected" })).toBeVisible();
  });
});
