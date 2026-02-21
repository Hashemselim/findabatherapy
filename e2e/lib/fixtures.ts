import { test as baseTest } from "@playwright/test";
import { getAdminClient, signInViaAPI, type TestUser } from "./auth-helper";

/**
 * Extended Playwright fixtures with auto-cleanup test users.
 *
 * Each fixture creates a disposable user, signs in via API (~50ms),
 * sets the storage state, and deletes the user in teardown.
 *
 * Because `auth.users → profiles → everything` uses ON DELETE CASCADE,
 * deleting the auth user automatically wipes all data. Zero schema knowledge.
 */
export const test = baseTest.extend<{
  /** Fresh user — NOT onboarded (hits /dashboard/onboarding) */
  freshUser: TestUser;
  /** Onboarded user — free plan */
  onboardedUser: TestUser;
  /** Onboarded user — pro plan */
  proUser: TestUser;
}>({
  freshUser: async ({ browser }, use) => {
    const user = await createTestUser("fresh", {
      planTier: "free",
      onboarded: false,
    });

    const storageState = await signInViaAPI(user.email, user.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    // Attach page to the test via a modified user object
    await use({ ...user, _page: page } as TestUser);

    // Teardown: delete user (CASCADE wipes everything)
    await context.close();
    const admin = getAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  },

  onboardedUser: async ({ browser }, use) => {
    const user = await createTestUser("onboarded", {
      planTier: "free",
      onboarded: true,
    });

    const storageState = await signInViaAPI(user.email, user.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    await use({ ...user, _page: page } as TestUser);

    await context.close();
    const admin = getAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  },

  proUser: async ({ browser }, use) => {
    const user = await createTestUser("pro", {
      planTier: "pro",
      onboarded: true,
    });

    const storageState = await signInViaAPI(user.email, user.password);
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();

    await use({ ...user, _page: page } as TestUser);

    await context.close();
    const admin = getAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  },
});

export { expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CreateOptions {
  planTier: "free" | "pro" | "enterprise";
  onboarded: boolean;
}

let counter = 0;

async function createTestUser(
  prefix: string,
  opts: CreateOptions
): Promise<TestUser> {
  const admin = getAdminClient();
  const uniqueId = `${Date.now()}-${++counter}`;
  const email = `e2e-${prefix}-${uniqueId}@test.findabatherapy.com`;
  const password = `TestPass-${uniqueId}!`;

  // Create auth user
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      agency_name: `E2E ${prefix} Agency`,
      selected_plan: opts.planTier,
      billing_interval: "month",
      selected_intent: "both",
    },
  });

  if (createError || !data.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  // Create profile — only 2 fields matter
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    agency_name: `E2E ${prefix} Agency`,
    contact_email: email,
    plan_tier: opts.planTier,
    billing_interval: "month",
    primary_intent: "both",
    onboarding_completed_at: opts.onboarded ? new Date().toISOString() : null,
  });

  if (profileError) {
    // Clean up auth user if profile fails
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  return { id: data.user.id, email, password };
}
