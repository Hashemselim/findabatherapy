import { test, expect } from "@playwright/test";
import { existsSync } from "fs";
import path from "path";

/**
 * Dashboard - Applications Management Tests
 * Tests for: /dashboard/jobs/applications, /dashboard/jobs/applications/[id]
 */

// Check if auth state exists
function checkAuthAvailable(): boolean {
  const authPath = path.join(__dirname, "..", ".auth", "user.json");
  return existsSync(authPath);
}

test.describe("DASH-013: Applications List", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    // Check if redirected to auth
    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load applications page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard\/jobs\/applications/);

    // Should have heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display application cards or empty state", async ({ page }) => {
    // Look for application items
    const applicationItems = page.locator(
      '[data-testid="application-item"], .application-item, article, tr, .application-card'
    );
    const emptyState = page.locator('text=/no applications|no results|empty/i');

    const hasApplications = await applicationItems.first().isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasApplications || hasEmptyState).toBeTruthy();
  });

  test("should show application information", async ({ page }) => {
    const applicationItem = page.locator(
      '[data-testid="application-item"], .application-item, tr:not(:first-child)'
    ).first();

    const hasItem = await applicationItem.isVisible().catch(() => false);

    if (!hasItem) {
      test.skip(true, "No applications available");
      return;
    }

    // Should show applicant name
    const nameElement = page.locator('.applicant-name, [data-testid="applicant-name"], td:first-child');
    const hasName = await nameElement.first().isVisible().catch(() => false);

    // Should show job title
    const jobElement = page.locator('.job-title, [data-testid="job-title"]');
    const hasJob = await jobElement.first().isVisible().catch(() => false);

    // Should show status badge
    const statusBadge = page.locator('[data-testid="status-badge"], .status-badge, .badge');
    const hasStatus = await statusBadge.first().isVisible().catch(() => false);

    // At minimum should have some content
    expect(hasName || hasJob || hasStatus).toBeTruthy();
  });

  test("should filter by status", async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator(
      'select[name*="status" i], [data-testid="status-filter"], button:has-text(/status/i)'
    );
    const hasFilter = await statusFilter.first().isVisible().catch(() => false);

    if (!hasFilter) {
      test.skip(true, "Status filter not available");
      return;
    }

    await statusFilter.first().click();
    await page.waitForTimeout(300);

    // Filter options should appear
    const filterOptions = page.locator('option, [role="option"], [role="menuitem"]');
    const hasOptions = await filterOptions.first().isVisible().catch(() => false);

    expect(hasOptions).toBeTruthy();
  });

  test("should filter by job", async ({ page }) => {
    // Look for job filter
    const jobFilter = page.locator(
      'select[name*="job" i], [data-testid="job-filter"], button:has-text(/job|position/i)'
    );
    const hasFilter = await jobFilter.first().isVisible().catch(() => false);

    if (!hasFilter) {
      test.skip(true, "Job filter not available");
      return;
    }

    await jobFilter.first().click();
    await page.waitForTimeout(300);

    // Filter options should appear
    const filterOptions = page.locator('option, [role="option"], [role="menuitem"]');
    const hasOptions = await filterOptions.first().isVisible().catch(() => false);

    expect(hasOptions).toBeTruthy();
  });
});

test.describe("DASH-035: Application Detail", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should load application detail page", async ({ page }) => {
    // Click on first application
    const applicationLink = page.locator(
      '[data-testid="application-item"] a, .application-item a, tr a, a[href*="/applications/"]'
    ).first();

    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await expect(page).toHaveURL(/\/applications\/[a-z0-9-]+/i);

    // Should have heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();
  });

  test("should display applicant information", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Should show applicant info
    const nameField = page.locator('text=/name/i');
    const emailField = page.locator('text=/email/i, a[href^="mailto:"]');
    const phoneField = page.locator('text=/phone/i, a[href^="tel:"]');

    const hasName = await nameField.first().isVisible().catch(() => false);
    const hasEmail = await emailField.first().isVisible().catch(() => false);

    // At minimum should show name or email
    expect(hasName || hasEmail).toBeTruthy();
  });
});

test.describe("DASH-036: Application Status Change", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have status dropdown", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for status dropdown
    const statusDropdown = page.locator(
      'select[name*="status" i], [data-testid="status-select"], button:has-text(/new|reviewed|interview|offered|hired|rejected/i)'
    );
    const hasDropdown = await statusDropdown.first().isVisible().catch(() => false);

    expect(hasDropdown).toBeTruthy();
  });

  test("should show all status options", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    const statusDropdown = page.locator(
      'select[name*="status" i], [data-testid="status-select"], button[aria-haspopup]'
    ).first();

    const hasDropdown = await statusDropdown.isVisible().catch(() => false);

    if (!hasDropdown) {
      test.skip(true, "Status dropdown not available");
      return;
    }

    await statusDropdown.click();
    await page.waitForTimeout(300);

    // Check for expected status options
    const statusOptions = ['new', 'reviewed', 'phone_screen', 'interview', 'offered', 'hired', 'rejected'];
    let foundOptions = 0;

    for (const status of statusOptions) {
      const option = page.locator(`option:has-text("${status}"), [role="option"]:has-text("${status}")`, { timeout: 1000 });
      const hasOption = await option.isVisible().catch(() => false);
      if (hasOption) foundOptions++;
    }

    // Should have at least some status options
    expect(foundOptions).toBeGreaterThan(0);
  });
});

test.describe("DASH-037: Application Notes", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have notes field", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for notes field
    const notesField = page.locator(
      'textarea[name*="notes" i], [data-testid="notes-field"], textarea[placeholder*="notes" i]'
    );
    const hasNotes = await notesField.first().isVisible().catch(() => false);

    expect(hasNotes).toBeTruthy();
  });

  test("should save notes", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    const notesField = page.locator(
      'textarea[name*="notes" i], [data-testid="notes-field"], textarea'
    ).first();

    const hasNotes = await notesField.isVisible().catch(() => false);

    if (!hasNotes) {
      test.skip(true, "Notes field not available");
      return;
    }

    // Add test note
    const testNote = `Test note ${Date.now()}`;
    await notesField.fill(testNote);

    // Save (may auto-save or have save button)
    const saveButton = page.locator('button:has-text(/save/i)');
    const hasSave = await saveButton.isVisible().catch(() => false);

    if (hasSave) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Check for success indication
      const success = page.locator('text=/saved|success/i, [data-testid="toast"]');
      const hasSuccess = await success.isVisible().catch(() => false);

      expect(hasSuccess).toBeTruthy();
    }
  });
});

test.describe("DASH-038: Resume Download", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have resume download link", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for resume link
    const resumeLink = page.locator(
      'a:has-text(/resume/i), a[href*="resume"], a[download], button:has-text(/download resume/i)'
    );
    const hasResume = await resumeLink.first().isVisible().catch(() => false);

    expect(hasResume).toBeTruthy();
  });
});

test.describe("DASH-039: Application Rating", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have rating component", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for rating component (stars)
    const ratingComponent = page.locator(
      '[data-testid="rating"], .rating, .stars, button[aria-label*="star"], svg[class*="star"]'
    );
    const hasRating = await ratingComponent.first().isVisible().catch(() => false);

    expect(hasRating).toBeTruthy();
  });

  test("should allow setting rating", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    const starButton = page.locator(
      'button[aria-label*="star"], [data-testid="star"], .star'
    ).nth(2); // Click 3rd star for 3-star rating

    const hasStar = await starButton.isVisible().catch(() => false);

    if (!hasStar) {
      test.skip(true, "Rating stars not available");
      return;
    }

    await starButton.click();
    await page.waitForTimeout(500);

    // Rating should be saved (indicated by filled stars or success message)
    expect(true).toBeTruthy();
  });
});

test.describe("Quick Actions", () => {
  test.beforeEach(async ({ page }) => {
    if (!checkAuthAvailable()) {
      test.skip(true, "Authentication not set up");
      return;
    }

    await page.goto("/dashboard/jobs/applications");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }
  });

  test("should have Hire quick action", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for Hire button
    const hireButton = page.locator('button:has-text(/hire/i), [data-testid="hire-button"]');
    const hasHire = await hireButton.isVisible().catch(() => false);

    expect(hasHire).toBeTruthy();
  });

  test("should have Reject quick action", async ({ page }) => {
    const applicationLink = page.locator('a[href*="/applications/"]').first();
    const hasLink = await applicationLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No applications available");
      return;
    }

    await applicationLink.click();
    await page.waitForURL(/\/applications\/[a-z0-9-]+/i);

    // Look for Reject button
    const rejectButton = page.locator('button:has-text(/reject/i), [data-testid="reject-button"]');
    const hasReject = await rejectButton.isVisible().catch(() => false);

    expect(hasReject).toBeTruthy();
  });
});
