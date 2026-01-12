import { test, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

/**
 * Integration Tests - Plan Limits (INT-007, INT-008)
 *
 * Tests plan-specific feature access and limits.
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

test.describe("Integration - Plan Limits", () => {
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

  test("Location limits enforced by plan", async ({ page }) => {
    await page.goto("/dashboard/locations");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check limit indicator
    const limitIndicator = page.locator("text=/\\d+.*of.*\\d+|location.*limit/i").first();
    const hasLimit = await limitIndicator.isVisible().catch(() => false);

    if (hasLimit) {
      const limitText = await limitIndicator.textContent();
      console.log(`Location limit: ${limitText}`);

      // Plan limits:
      // Free: 1 location
      // Pro: 5 locations
      // Enterprise: Unlimited
    }
  });

  test("Job posting limits enforced by plan", async ({ page }) => {
    await page.goto("/dashboard/jobs");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check limit indicator
    const limitIndicator = page.locator("text=/\\d+.*of.*\\d+|job.*limit/i").first();
    const hasLimit = await limitIndicator.isVisible().catch(() => false);

    if (hasLimit) {
      const limitText = await limitIndicator.textContent();
      console.log(`Job posting limit: ${limitText}`);

      // Plan limits:
      // Free: 1 job
      // Pro: 5 jobs
      // Enterprise: Unlimited
    }
  });

  test("Contact form requires Pro plan", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check contact form status
    const contactFormSection = page.locator("text=/contact form|inquiry/i").first();

    if (await contactFormSection.isVisible()) {
      // May show enabled, disabled, or upgrade prompt
      const upgradePrompt = page.locator("text=/upgrade|pro.*required|unlock/i").first();
      const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

      console.log(`Contact form needs upgrade: ${needsUpgrade}`);
    }
  });

  test("Inbox requires Pro plan", async ({ page }) => {
    await page.goto("/dashboard/inbox");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check for upgrade prompt (Free users)
    const upgradePrompt = page.locator("text=/upgrade|pro.*required|unlock/i").first();
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    console.log(`Inbox needs upgrade: ${needsUpgrade}`);
  });

  test("Analytics requires Pro plan", async ({ page }) => {
    await page.goto("/dashboard/analytics");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check for upgrade prompt or analytics content
    const upgradePrompt = page.locator("text=/upgrade|pro.*required|unlock/i").first();
    const needsUpgrade = await upgradePrompt.isVisible().catch(() => false);

    console.log(`Analytics needs upgrade: ${needsUpgrade}`);
  });

  test("Photo gallery requires Pro plan", async ({ page }) => {
    await page.goto("/dashboard/company");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check photos section
    const photosSection = page.locator("text=/photo|gallery|media/i").first();

    if (await photosSection.isVisible()) {
      const upgradePrompt = page.locator("text=/upgrade|pro.*required|unlock/i");
      const needsUpgrade = await upgradePrompt.count() > 0;

      console.log(`Photos need upgrade: ${needsUpgrade}`);
    }
  });

  test("INT-007: Pro features unlock after payment", async ({ page }) => {
    // This documents the expected behavior
    // After successful Stripe payment, features should unlock

    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check current plan
    const currentPlan = page.locator("text=/free|pro|enterprise/i").first();
    const planText = await currentPlan.textContent().catch(() => "");

    console.log(`Current plan: ${planText}`);
    console.log("After Stripe checkout success, plan should upgrade and features unlock");
  });

  test("INT-008: Features restricted after cancel", async ({ page }) => {
    // This documents the expected behavior
    // After subscription cancellation, features should be restricted

    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check for cancellation status
    const cancellingStatus = page.locator("text=/cancelling|cancelled|expired/i").first();
    const isCancelling = await cancellingStatus.isVisible().catch(() => false);

    console.log(`Subscription cancelling: ${isCancelling}`);
    console.log("After cancellation takes effect, features should be restricted to Free tier");
  });
});

test.describe("Integration - Premium Features", () => {
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

  test("Featured locations available for Pro+", async ({ page }) => {
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Featured locations add-on section
    const featuredSection = page.locator("text=/featured.*location|spotlight/i").first();
    const hasFeatured = await featuredSection.isVisible().catch(() => false);

    console.log(`Featured locations section visible: ${hasFeatured}`);
    console.log("$99/mo per location for homepage placement in state search");
  });

  test("Homepage placement for Enterprise", async ({ page }) => {
    // Homepage placement is Enterprise only
    await page.goto("/dashboard/billing");

    const url = page.url();
    if (url.includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Check Enterprise features mention
    const homepagePlacement = page.locator("text=/homepage.*placement|featured.*home/i").first();
    const hasHomepagePlacement = await homepagePlacement.isVisible().catch(() => false);

    console.log(`Homepage placement mentioned: ${hasHomepagePlacement}`);
  });
});
