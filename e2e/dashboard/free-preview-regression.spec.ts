import { test, expect, type Locator, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";

import {
  createClerkTestUser,
  deleteClerkTestUser,
  signInViaClerkUI,
} from "../lib/auth-helper";
import { api } from "../../convex/_generated/api";

test.use({ storageState: { cookies: [], origins: [] } });

const E2E_SEED_SECRET = process.env.CONVEX_SEED_IMPORT_SECRET;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const authUserFile = path.join(__dirname, "..", ".auth", "user-meta.json");

let clerkUserId: string | null = null;
let shouldDeleteClerkUser = false;
let currentEmail: string | null = null;

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
    firstName: "Preview",
    lastName: "Regression",
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
    firstName: "Preview",
    lastName: "Regression",
  });
}

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

async function stubPlacesApi(page: Page) {
  await page.route("**/api/places/autocomplete", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            placeId: "mock-clark",
            description: "100 Walnut Ave, Clark, NJ 07066, USA",
            mainText: "100 Walnut Ave",
            secondaryText: "Clark, NJ 07066, USA",
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
        placeId: "mock-clark",
        formattedAddress: "100 Walnut Ave, Clark, NJ 07066, USA",
        streetAddress: "100 Walnut Ave",
        city: "Clark",
        state: "NJ",
        postalCode: "07066",
        latitude: 40.629911,
        longitude: -74.3033502,
      }),
    });
  });
}

async function completeFreeOnboarding(page: Page) {
  const unique = Date.now();
  const agencyName = `Codex Preview ${unique}`;
  const slug = `codex-preview-${unique}`;

  await page.goto("/dashboard/onboarding", { waitUntil: "domcontentloaded" });
  const beginSetupButton = page.getByRole("button", { name: /begin setup|starting/i });
  await expect(beginSetupButton).toBeVisible({ timeout: 30000 });
  await beginSetupButton.click();
  await page.waitForURL(/\/dashboard\/onboarding\/details(?:$|\?)/, { timeout: 30000 });

  await fillStable(page.locator("#agencyName"), agencyName);
  await fillStable(page.locator("#contactEmail"), `preview-${unique}@test.findabatherapy.com`);
  await fillStable(
    page.locator("#description"),
    "We provide collaborative ABA therapy with family-centered care, clear communication, and practical support for day-to-day progress.",
  );
  await fillStable(page.locator("#website"), "https://preview.example.com");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/location(?:$|\?)/, { timeout: 30000 });

  await fillStable(page.getByPlaceholder("Search for your address..."), "100 Walnut Ave");
  await page.getByRole("button", { name: /100 walnut ave/i }).click();
  await page.getByRole("checkbox", { name: "Aetna" }).check();
  await page.getByRole("button", { name: /add location/i }).click();
  await expect(page.getByText(/1 location added|location added/i).first()).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/services(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/branded-preview(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/dashboard(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /choose your plan/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/plan(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /continue with free/i }).click();
  await page.waitForURL(/\/dashboard\/clients\/pipeline\?welcome=1/, { timeout: 30000 });

  return { slug };
}

test.beforeEach(async ({ page }) => {
  const sharedUser = readSharedAuthUser();
  let email: string;
  let password: string;

  if (sharedUser) {
    clerkUserId = sharedUser.clerkUserId;
    email = sharedUser.email;
    password = sharedUser.password;
    shouldDeleteClerkUser = false;
  } else {
    const timestamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    email = `e2e-free-preview+${timestamp}@test.findabatherapy.com`;
    password = `TestPass123!${timestamp}`;
    const user = await createClerkTestUser(email, password);
    clerkUserId = user.id;
    shouldDeleteClerkUser = true;
  }

  currentEmail = email;

  await resetOnboardingWorkspaceForUser({
    clerkUserId,
    email,
  });

  await stubPlacesApi(page);
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

test("free onboarding unlocks preview dashboard and mobile navigation", async ({ page }) => {
  test.setTimeout(180000);

  const { slug } = await completeFreeOnboarding(page);

  await expect(
    page.getByText(/preview of your client pipeline\. go live to manage real clients/i),
  ).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: /toggle navigation/i }).click();
  await page.getByRole("button", { name: "Company" }).click();

  const companyProfileLink = page.getByRole("link", { name: /company profile/i });
  await expect(companyProfileLink).toBeVisible();
  await companyProfileLink.click();
  await page.waitForURL(/\/dashboard\/settings\/profile(?:$|\?)/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: /company details/i })).toBeVisible();

  await page.goto("/dashboard/clients", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/preview of your client list with example data/i)).toBeVisible({
    timeout: 30000,
  });

  await page.goto(`/p/${slug}`, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText(/this page is in preview mode\. activate your account to go live\./i),
  ).toBeVisible({ timeout: 30000 });

  await page.goto(`/provider/${slug}/resources`, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText(
      /this parent resources page is in preview mode\. activate your account to go live\./i,
    ),
  ).toBeVisible({ timeout: 30000 });
});
