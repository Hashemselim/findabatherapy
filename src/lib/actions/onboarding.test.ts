import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePath,
  getCurrentProfileId,
  getUser,
  createClient,
  createWorkspaceForUser,
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getCurrentProfileId: vi.fn(),
  getUser: vi.fn(),
  createClient: vi.fn(),
  createWorkspaceForUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/onboarding-preview", () => ({
  isDevOnboardingPreviewEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
  getCurrentProfileId,
  getUser,
}));

vi.mock("@/lib/workspace/memberships", () => ({
  createWorkspaceForUser,
}));

import { updateProfileBasics } from "@/lib/actions/onboarding";

function createProfilesClient(results: Array<{ data: Array<{ id: string }>; error: { message: string } | null }>) {
  const select = vi.fn();
  for (const result of results) {
    select.mockResolvedValueOnce(result);
  }

  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    expect(table).toBe("profiles");
    return { update };
  });

  return {
    client: { from },
    mocks: { from, update, eq, select },
  };
}

describe("updateProfileBasics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the existing profile without attempting an upsert", async () => {
    getCurrentProfileId.mockResolvedValue("profile-1");
    const { client, mocks } = createProfilesClient([
      { data: [{ id: "profile-1" }], error: null },
    ]);
    createClient.mockResolvedValue(client);

    await expect(
      updateProfileBasics({
        agencyName: "Hope Harbor ABA",
        contactEmail: "ari@hopeharboraba.com",
        contactPhone: "913-800-9330",
        website: "https://hopeharboraba.com",
      })
    ).resolves.toEqual({ success: true });

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_name: "Hope Harbor ABA",
        contact_email: "ari@hopeharboraba.com",
        contact_phone: "913-800-9330",
        website: "https://hopeharboraba.com",
      })
    );
    expect(mocks.eq).toHaveBeenCalledWith("id", "profile-1");
    expect(createWorkspaceForUser).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("repairs a missing workspace profile and retries the update", async () => {
    getCurrentProfileId.mockResolvedValue(null);
    getUser.mockResolvedValue({
      id: "user-1",
      email: "ari@hopeharboraba.com",
      user_metadata: {
        agency_name: "Hope Harbor ABA",
        selected_plan: "free",
        billing_interval: "month",
        selected_intent: "therapy",
      },
    });

    const { client, mocks } = createProfilesClient([
      { data: [], error: null },
      { data: [{ id: "user-1" }], error: null },
    ]);
    createClient.mockResolvedValue(client);

    await expect(
      updateProfileBasics({
        agencyName: "Hope Harbor ABA",
        contactEmail: "ari@hopeharboraba.com",
      })
    ).resolves.toEqual({ success: true });

    expect(createWorkspaceForUser).toHaveBeenCalledWith({
      userId: "user-1",
      email: "ari@hopeharboraba.com",
      agencyName: "Hope Harbor ABA",
      planTier: "free",
      billingInterval: "month",
      primaryIntent: "therapy",
    });
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "user-1");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
