import { test, expect } from "@playwright/test";

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

test.describe("Integration - Listing Visibility", () => {
  test("published listing appears on the live public profile", async ({ page }) => {
    const seeded = await seedWorkspace();

    await page.goto(`${BASE_URL}/provider/${seeded.slug}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: "E2E User", exact: true })).toBeVisible();
    await expect(
      page.getByText("Evidence-based ABA care for families and a supportive workplace for clinicians.").first(),
    ).toBeVisible();
  });

  test("dashboard listing edits are reflected on the public provider page and search", async ({ page }) => {
    const seeded = await seedWorkspace();
    const unique = Date.now();
    const headline = `Codex integration headline ${unique} for ABA families`;
    const description = [
      `Codex integration description ${unique}.`,
      "This verifies that dashboard listing edits persist through Convex and render publicly.",
      "Families should see this exact text on the live provider page.",
    ].join(" ");

    await page.goto(`${BASE_URL}/dashboard/company`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Company Details", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^edit$/i }).first().click();
    await expect(page.locator("#headline")).toBeVisible();

    await page.locator("#headline").fill(headline);
    await page.locator("#description").fill(description);
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText("Changes saved successfully")).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`${BASE_URL}/provider/${seeded.slug}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText(headline, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(description, { exact: true })).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`${BASE_URL}/search?query=${encodeURIComponent(headline)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(`a[href^="/provider/${seeded.slug}"]`).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
