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
const PREVIEW_DRAFT_KEY = "onboarding-preview-draft";

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

async function provisionOnboardingPreviewWorkspaceForUser(args: {
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
  return convex.mutation(api.seed.provisionE2EOnboardingPreviewWorkspace, {
    secret: E2E_SEED_SECRET,
    clerkUserId: args.clerkUserId,
    email: args.email,
    firstName: "Preview",
    lastName: "Regression",
  });
}

async function seedPreviewDraftCookie(page: Page, args: {
  agencyName: string;
  slug: string;
  email: string;
  brandColor?: string;
  city?: string;
  state?: string;
  website?: string;
}) {
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      agencyName: args.agencyName,
      brandColor: args.brandColor ?? "#0866FF",
      contactEmail: args.email,
      website: args.website ?? "https://www.goodaba.com",
      city: args.city ?? "Clark",
      state: args.state ?? "NJ",
      slug: args.slug,
    }),
  );

  await page.context().addCookies([
    {
      name: PREVIEW_DRAFT_KEY,
      value: cookieValue,
      url: "http://localhost:3002",
    },
  ]);
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

async function completeLocationStep(page: Page) {
  const addressInput = page.getByPlaceholder("Search for your address...");
  const hasAddressInput = await addressInput.isVisible().catch(() => false);

  if (hasAddressInput) {
    await fillStable(addressInput, "100 Walnut Ave");
    const suggestion = page.getByRole("button", { name: /100 walnut ave/i }).first();
    await expect(suggestion).toBeVisible({ timeout: 10000 });
    await suggestion.click();
    await expect(page.getByText(/coordinates verified/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("checkbox", { name: "Aetna" }).check();
    await page.getByRole("button", { name: /add location/i }).click();
  }

  const continueButton = page.getByRole("button", { name: /continue/i });
  await expect(continueButton).toBeEnabled({
    timeout: 30000,
  });
  await continueButton.click();
}

async function completeFreeOnboarding(page: Page) {
  const { slug } = await goToBrandedPreviewStep(page);

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/dashboard(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /choose your plan/i }).click();
  await page.waitForURL(/\/dashboard\/onboarding\/plan(?:$|\?)/, { timeout: 30000 });

  await page.getByRole("button", { name: /continue with free/i }).click();
  await page.waitForURL(/\/dashboard\/clients\/pipeline\?welcome=1/, { timeout: 30000 });

  return { slug };
}

async function goToBrandedPreviewStep(page: Page) {
  if (!clerkUserId || !currentEmail) {
    throw new Error("Shared Clerk test user is not initialized");
  }

  const previewWorkspace = await provisionOnboardingPreviewWorkspaceForUser({
    clerkUserId,
    email: currentEmail,
  });

  const draft = {
    agencyName: "Preview Regression",
    brandColor: "#0866FF",
    contactEmail: currentEmail,
    website: "https://www.goodaba.com",
    city: "Clark",
    state: "NJ",
    slug: previewWorkspace.slug,
  };
  await seedPreviewDraftCookie(page, {
    agencyName: draft.agencyName,
    slug: draft.slug,
    email: draft.contactEmail,
    brandColor: draft.brandColor,
    city: draft.city,
    state: draft.state,
    website: draft.website,
  });

  await page.goto("/dashboard/onboarding/branded-preview", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /your branded toolkit is ready/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/built for preview regression/i)).toBeVisible({
    timeout: 30000,
  });
  await page.evaluate(
    ({ key, payload }) => {
      window.sessionStorage.setItem(key, JSON.stringify(payload));
    },
    { key: PREVIEW_DRAFT_KEY, payload: draft },
  );

  return { slug: previewWorkspace.slug };
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

  const mobileNavToggle = page.getByRole("button", { name: /toggle navigation/i });
  if (await mobileNavToggle.isVisible().catch(() => false)) {
    await mobileNavToggle.click();
  }
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

  await expect.poll(async () => {
    const value = await page.evaluate((key) => window.sessionStorage.getItem(key), PREVIEW_DRAFT_KEY);
    return value;
  }).toBeNull();

  await expect.poll(async () => {
    const cookies = await page.context().cookies("http://localhost:3002");
    return cookies.some((cookie) => cookie.name === PREVIEW_DRAFT_KEY);
  }).toBe(false);
});

test("step 5 branded previews open live pages without errors", async ({ page }) => {
  test.setTimeout(180000);

  await goToBrandedPreviewStep(page);

  const previewTitles = [
    "Your Agency Brochure",
    "Contact Form",
    "Intake Form",
    "Parent Resources",
    "Careers Page",
    "Agreement Forms",
    "Social Media",
  ] as const;

  async function activatePreview(title: (typeof previewTitles)[number]) {
    for (let attempt = 0; attempt < previewTitles.length + 1; attempt += 1) {
      const trigger = page.getByLabel(`Open ${title} preview`);
      if (await trigger.isVisible().catch(() => false)) {
        return trigger;
      }
      await page.getByRole("button", { name: "Show next preview" }).click();
      await page.waitForTimeout(350);
    }
    throw new Error(`Unable to activate ${title}`);
  }

  for (const title of previewTitles) {
    const trigger = await activatePreview(title);
    await trigger.click();

    const previewFrame = page.frameLocator("iframe").first();
    await expect(page.locator("iframe").first()).toBeVisible({ timeout: 15000 });

    if (title === "Your Agency Brochure") {
      await expect(previewFrame.getByText(/this page is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    } else if (title === "Contact Form") {
      await expect(previewFrame.getByText(/this contact form is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    } else if (title === "Intake Form") {
      await expect(previewFrame.getByText(/this intake form is a preview/i)).toBeVisible({
        timeout: 30000,
      });
    } else if (title === "Parent Resources") {
      await expect(previewFrame.getByText(/this resources page is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    } else if (title === "Careers Page") {
      await expect(previewFrame.getByText(/this careers page is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    } else if (title === "Agreement Forms") {
      await expect(previewFrame.getByText(/this agreement page is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    } else {
      await expect(previewFrame.getByText(/this social toolkit is in preview mode/i)).toBeVisible({
        timeout: 30000,
      });
    }

    await expect(previewFrame.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(previewFrame.getByText(/^404$/)).toHaveCount(0);
    await expect(previewFrame.getByText(/this page could not be found/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Close preview" }).click();
    await expect(page.locator("iframe")).toHaveCount(0);
  }
});

test("step 5 direct load recovers branded preview from cookie state", async ({ page }) => {
  test.setTimeout(120000);

  if (!clerkUserId || !currentEmail) {
    throw new Error("Shared Clerk test user is not initialized");
  }

  const previewWorkspace = await provisionOnboardingPreviewWorkspaceForUser({
    clerkUserId,
    email: currentEmail,
  });

  await seedPreviewDraftCookie(page, {
    agencyName: "Preview Regression",
    slug: previewWorkspace.slug,
    email: currentEmail,
  });

  await page.goto("/dashboard/onboarding/branded-preview", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /your branded toolkit is ready/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/built for preview regression/i)).toBeVisible({
    timeout: 30000,
  });

  await page.getByLabel("Open Your Agency Brochure preview").click();
  await expect(page.locator("iframe").first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator("iframe").first()).toHaveAttribute(
    "src",
    new RegExp(`/p/${previewWorkspace.slug}$`),
  );
});
