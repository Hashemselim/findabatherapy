import { test, expect, type Locator } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

import {
  AUTH_PROVIDER,
  createClerkTestUser,
  deleteClerkTestUser,
  signInViaClerkUI,
} from "../lib/auth-helper";
import { api } from "../../convex/_generated/api";

/**
 * Full Onboarding Flow - End-to-End Tests
 *
 * These tests walk through the onboarding flow for visual verification.
 * Run with: npx playwright test e2e/dashboard/full-onboarding-flow.spec.ts --project=chromium --trace on
 */

test.use({ storageState: { cookies: [], origins: [] } });

let clerkUserId: string | null = null;
let shouldDeleteClerkUser = false;
let currentEmail: string | null = null;

const authUserFile = path.join(__dirname, "..", ".auth", "user-meta.json");
const E2E_SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

function readSharedAuthUser():
  | {
      clerkUserId: string;
      email: string;
      password: string;
    }
  | null {
  if (!fs.existsSync(authUserFile)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(authUserFile, "utf8")) as Partial<{
      clerkUserId: string;
      email: string;
      password: string;
    }>;
    if (parsed.clerkUserId && parsed.email && parsed.password) {
      return {
        clerkUserId: parsed.clerkUserId,
        email: parsed.email,
        password: parsed.password,
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function resetOnboardingWorkspaceForUser(args: {
  clerkUserId: string;
  email: string;
}) {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for onboarding E2E setup");
  }

  if (!E2E_SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for onboarding E2E setup");
  }

  const convex = new ConvexHttpClient(CONVEX_URL);
  return convex.mutation(api.seed.resetE2EOnboardingWorkspace, {
    secret: E2E_SEED_SECRET,
    clerkUserId: args.clerkUserId,
    email: args.email,
    firstName: "E2E",
    lastName: "User",
  });
}

async function provisionDashboardWorkspaceForUser(args: {
  clerkUserId: string;
  email: string;
}) {
  if (!CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for onboarding E2E setup");
  }

  if (!E2E_SEED_SECRET) {
    throw new Error("CONVEX_SEED_IMPORT_SECRET is required for onboarding E2E setup");
  }

  const convex = new ConvexHttpClient(CONVEX_URL);
  return convex.mutation(api.seed.provisionE2EDashboardWorkspace, {
    secret: E2E_SEED_SECRET,
    clerkUserId: args.clerkUserId,
    email: args.email,
    firstName: "E2E",
    lastName: "User",
  });
}

test.beforeEach(async ({ page }) => {
  let email: string;
  let password: string;

  const sharedUser = AUTH_PROVIDER === "clerk" ? readSharedAuthUser() : null;
  if (sharedUser) {
    clerkUserId = sharedUser.clerkUserId;
    email = sharedUser.email;
    password = sharedUser.password;
    shouldDeleteClerkUser = false;
  } else {
    const timestamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    email = `e2e-onboarding+${timestamp}@test.findabatherapy.com`;
    password = `TestPass123!${timestamp}`;
    const user = await createClerkTestUser(email, password);
    clerkUserId = user.id;
    shouldDeleteClerkUser = true;
  }

  if (!clerkUserId) {
    throw new Error("Clerk onboarding test user was not initialized");
  }

  currentEmail = email;

  await resetOnboardingWorkspaceForUser({
    clerkUserId,
    email,
  });

  await page.route("**/api/places/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            placeId: "mock-los-angeles",
            description: "123 Demo Ave, Los Angeles, CA 90001, USA",
            mainText: "123 Demo Ave",
            secondaryText: "Los Angeles, CA 90001, USA",
          },
        ],
      }),
    });
  });

  await page.route("**/api/places/details", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        placeId: "mock-los-angeles",
        formattedAddress: "123 Demo Ave, Los Angeles, CA 90001, USA",
        streetAddress: "123 Demo Ave",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90001",
        latitude: 34.0522,
        longitude: -118.2437,
      }),
    });
  });

  await signInViaClerkUI(page, email, password);
});

test.afterEach(async () => {
  if (clerkUserId && shouldDeleteClerkUser) {
    await deleteClerkTestUser(clerkUserId);
  }
  if (clerkUserId && currentEmail && !shouldDeleteClerkUser) {
    await provisionDashboardWorkspaceForUser({
      clerkUserId,
      email: currentEmail,
    });
  }
  clerkUserId = null;
  shouldDeleteClerkUser = false;
  currentEmail = null;
});

async function fillStable(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await locator.fill(value);
    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
    if ((await locator.inputValue()) === value) {
      await new Promise((resolve) => {
        setTimeout(resolve, 350);
      });
      if ((await locator.inputValue()) === value) {
        return;
      }
    }
  }

  await expect(locator).toHaveValue(value);
}

async function gotoOnboardingPage(
  page: import("@playwright/test").Page,
  path: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
}

test("Complete onboarding flow reaches plan selection", async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Welcome Page
    console.log("Step 1: Welcome page");
    await page.goto("/dashboard/onboarding", { waitUntil: "domcontentloaded" });

    if (page.url().includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    // Verify welcome page - Get Started button must be visible
    await expect(page.getByText(/welcome/i).first()).toBeVisible();
    await expect(page.getByText(/client growth/i).first()).toBeVisible();
    await expect(page.getByText(/hiring/i).first()).toBeVisible();
    const getStartedButton = page.getByRole("button", { name: /begin setup|starting/i });
    await expect(getStartedButton).toBeVisible();
    await page.screenshot({ path: "test-results/flow-1-welcome.png", fullPage: true });

    await Promise.all([
      page.waitForURL(/\/dashboard\/onboarding\/details(?:$|\?)/, {
        timeout: 30000,
      }),
      getStartedButton.click(),
    ]);
    await expect(page.getByText(/tell us about your agency/i)).toBeVisible({ timeout: 30000 });

    // Step 2: Company Details
    console.log("Step 2: Company details");
    const unique = Date.now();
    const agencyNameInput = page.locator("#agencyName");
    const contactEmailInput = page.locator("#contactEmail");
    const descriptionInput = page.locator("#description");

    await fillStable(agencyNameInput, `Codex ABA ${unique}`);
    await expect(agencyNameInput).toHaveValue(`Codex ABA ${unique}`);

    await fillStable(
      contactEmailInput,
      `codex-${unique}@test.findabatherapy.com`,
    );
    await expect(contactEmailInput).toHaveValue(
      `codex-${unique}@test.findabatherapy.com`,
    );

    // Fill About textarea (min 50 chars)
    await fillStable(
      descriptionInput,
      "We provide quality ABA therapy services for children and families in a collaborative, evidence-based care model.",
    );
    await expect(descriptionInput).toHaveValue(
      "We provide quality ABA therapy services for children and families in a collaborative, evidence-based care model.",
    );

    await page.screenshot({ path: "test-results/flow-2-details.png", fullPage: true });

    await page.getByRole("button", { name: /continue/i }).click();
    await expect
      .poll(() => page.url(), { timeout: 30000 })
      .toMatch(/\/dashboard\/onboarding\/location(?:$|\?)/);

    // Step 3: Location
    console.log("Step 3: Location");
    await expect(page.getByText(/where do you serve families/i).first()).toBeVisible({ timeout: 30000 });

    const addressInput = page.getByPlaceholder("Search for your address...");
    await fillStable(addressInput, "123 Demo Ave");
    await page.getByRole("button", { name: /123 demo ave/i }).click();
    await page.getByRole("checkbox", { name: "Aetna" }).check();
    await page.getByRole("button", { name: /add location/i }).click();
    await expect(page.getByText(/1 location added|location added/i).first()).toBeVisible({
      timeout: 30000,
    });

    await page.screenshot({ path: "test-results/flow-3-autocomplete.png", fullPage: true });
    await page.screenshot({ path: "test-results/flow-3-after-select.png", fullPage: true });

    await page.screenshot({ path: "test-results/flow-3-location.png", fullPage: true });

    // Scroll to Continue button and click
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await page.waitForURL(/\/dashboard\/onboarding\/services(?:$|\?)/, { timeout: 15000 });

    // Step 4: Premium Features
    console.log("Step 4: Services");
    await expect(page.getByRole("main").getByText(/what care do you provide|services offered/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-4-enhanced.png", fullPage: true });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/dashboard\/onboarding\/branded-preview(?:$|\?)/, { timeout: 15000 });

    // Step 5: Branded preview
    console.log("Step 5: Branded preview");
    await expect(page.getByText(/your branded pages are taking shape/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-5-review.png", fullPage: true });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/dashboard\/onboarding\/dashboard(?:$|\?)/, { timeout: 15000 });

    // Step 6: Dashboard preview
    console.log("Step 6: Dashboard preview");
    await expect(page.getByText(/your command center/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/flow-6-success.png", fullPage: true });

    await page.getByRole("button", { name: /choose your plan/i }).click();
    await page.waitForURL(/\/dashboard\/onboarding\/plan(?:$|\?)/, { timeout: 15000 });

    await expect(page.getByText(/loading plan options/i)).not.toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByRole("heading", { name: /choose how/i }).first(),
    ).toBeVisible({ timeout: 30000 });
    console.log("Full onboarding flow reached plan selection successfully!");
});

test("Onboarding pages load correctly", async ({ page }) => {
    test.setTimeout(120000);
    await gotoOnboardingPage(page, "/dashboard/onboarding");

    if (page.url().includes("/auth/")) {
      test.skip(true, "Authentication required");
      return;
    }

    const pages = [
      { path: "/dashboard/onboarding", text: /welcome/i },
      { path: "/dashboard/onboarding/details", text: /tell us about your agency/i },
      { path: "/dashboard/onboarding/location", text: /where do you serve families/i },
      { path: "/dashboard/onboarding/services", text: /what care do you provide|services offered/i },
      { path: "/dashboard/onboarding/branded-preview", text: /your branded pages are taking shape/i },
      { path: "/dashboard/onboarding/dashboard", text: /your command center/i },
      { path: "/dashboard/onboarding/plan", text: /choose how/i },
    ];

    for (const { path, text } of pages) {
      await gotoOnboardingPage(page, path);
      const content =
        path === "/dashboard/onboarding/plan"
          ? page.getByRole("heading", { name: /choose how/i }).first()
          : page.getByText(text).first();
      await expect(content).toBeVisible({ timeout: 15000 });
    }

    console.log("All onboarding pages load correctly!");
});
