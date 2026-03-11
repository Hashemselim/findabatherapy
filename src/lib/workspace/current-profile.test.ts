import { describe, expect, it, vi } from "vitest";

import { resolveCurrentWorkspaceProfileId } from "@/lib/workspace/current-profile";

function createMembershipClient(result: {
  data: { profile_id: string } | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const statusEq = vi.fn(() => ({ maybeSingle }));
  const userEq = vi.fn(() => ({ eq: statusEq }));
  const select = vi.fn(() => ({ eq: userEq }));

  return {
    client: {
      from: vi.fn(() => ({ select })),
    },
    mocks: {
      maybeSingle,
      select,
      statusEq,
      userEq,
    },
  };
}

describe("resolveCurrentWorkspaceProfileId", () => {
  it("returns the active workspace profile id when membership exists", async () => {
    const { client, mocks } = createMembershipClient({
      data: { profile_id: "workspace-profile-id" },
      error: null,
    });

    await expect(
      resolveCurrentWorkspaceProfileId(client as never, "user-id")
    ).resolves.toBe("workspace-profile-id");

    expect(mocks.select).toHaveBeenCalledWith("profile_id");
    expect(mocks.userEq).toHaveBeenCalledWith("user_id", "user-id");
    expect(mocks.statusEq).toHaveBeenCalledWith("status", "active");
    expect(mocks.maybeSingle).toHaveBeenCalled();
  });

  it("falls back to the auth user id when no membership exists", async () => {
    const { client } = createMembershipClient({
      data: null,
      error: null,
    });

    await expect(
      resolveCurrentWorkspaceProfileId(client as never, "user-id")
    ).resolves.toBe("user-id");
  });

  it("falls back to the auth user id when membership lookup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createMembershipClient({
      data: null,
      error: { message: "boom" },
    });

    await expect(
      resolveCurrentWorkspaceProfileId(client as never, "user-id")
    ).resolves.toBe("user-id");

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
