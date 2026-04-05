import { test, expect, type Page } from "@playwright/test";

import {
  AUTH_STATE_FILE,
  BASE_URL,
  loadSessionUser,
  provisionDashboardWorkspaceForUser,
  type ProvisionedWorkspace,
} from "../lib/convex-e2e";

test.describe.configure({ mode: "serial" });
test.use({ storageState: AUTH_STATE_FILE });
test.setTimeout(60000);

async function seedWorkspace(): Promise<ProvisionedWorkspace> {
  const user = loadSessionUser();
  return provisionDashboardWorkspaceForUser(user);
}

async function replaceField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await field.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
}

test.describe("Integration - Jobs Visibility", () => {
  test("published job appears in jobs search and on the public job page", async ({ page }) => {
    const seeded = await seedWorkspace();
    const jobSlug = `bcba-los-angeles-${seeded.slug}`;

    await page.goto(`${BASE_URL}/jobs/search?q=${encodeURIComponent("BCBA - Los Angeles")}`, {
      waitUntil: "domcontentloaded",
    });

    const jobLink = page.locator(`a[href="/job/${jobSlug}"]`).first();
    await expect(jobLink).toBeVisible({ timeout: 15000 });

    await page.goto(`${BASE_URL}/job/${jobSlug}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: "BCBA - Los Angeles", exact: true })).toBeVisible();
    await expect(page.getByText("E2E User", { exact: true }).first()).toBeVisible();
  });

  test("dashboard job edits are reflected on the public job page", async ({ page }) => {
    const seeded = await seedWorkspace();
    const jobSlug = `bcba-los-angeles-${seeded.slug}`;
    const unique = Date.now();
    const title = `Codex BCBA Integration ${unique}`;
    const description = [
      `Codex public jobs propagation test ${unique}.`,
      "This confirms dashboard job edits persist through Convex and render on the live public posting.",
      "Candidates should see this updated copy immediately on the job detail page.",
    ].join(" ");

    await page.goto(`${BASE_URL}/dashboard/jobs/${seeded.jobPostingId}/edit`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Edit Job", exact: true })).toBeVisible();

    await replaceField(page, "#title", title);
    await replaceField(page, "#description", description);
    await page.getByRole("button", { name: "Update & Publish", exact: true }).click();

    await expect(page).toHaveURL(
      new RegExp(`/dashboard/jobs/${seeded.jobPostingId}/?$`),
      { timeout: 15000 },
    );
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`${BASE_URL}/job/${jobSlug}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(description, { exact: true })).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`${BASE_URL}/jobs/search?q=${encodeURIComponent(title)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(`a[href="/job/${jobSlug}"]`).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
