import "server-only";

import { mutateConvex, queryConvexUnauthenticated } from "@/lib/platform/convex/server";

// Re-export pure utilities so existing callers continue to work
export {
  normalizeWorkspaceEmail,
  hashInvitationToken,
  createInvitationToken,
  WorkspaceInviteError,
  type SignupIntent,
  type WorkspaceInviteDetails,
} from "@/lib/workspace/invite-utils";

import {
  normalizeWorkspaceEmail,
  hashInvitationToken,
  type SignupIntent,
  type WorkspaceInviteDetails,
} from "@/lib/workspace/invite-utils";

export type ProfileRole = "owner" | "admin" | "member";

export interface CurrentMembership {
  id: string;
  profile_id: string;
  user_id: string;
  email: string;
  role: ProfileRole;
  status: "active" | "revoked";
  invited_by_user_id: string | null;
  joined_at: string | null;
}

export async function createWorkspaceForUser(params: {
  userId: string;
  email: string;
  agencyName: string;
  planTier: string;
  billingInterval: string;
  primaryIntent: SignupIntent;
}) {
  await mutateConvex("workspaces:createWorkspaceForCurrentUser", {
    email: normalizeWorkspaceEmail(params.email),
    agencyName: params.agencyName,
    planTier: params.planTier,
    billingInterval: params.billingInterval,
    primaryIntent: params.primaryIntent,
    legacySourceId: params.userId,
  });

  return params.userId;
}

export async function getWorkspaceInviteDetails(
  token: string
): Promise<WorkspaceInviteDetails | null> {
  try {
    const tokenHash = hashInvitationToken(token);
    const result = await queryConvexUnauthenticated<WorkspaceInviteDetails | null>(
      "workspaces:getInvitationDetails",
      { tokenHash },
    );
    if (!result) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

export async function acceptWorkspaceInvitation(params: {
  token: string;
  user?: {
    email?: string | null;
  };
}): Promise<{ profileId: string; membership: CurrentMembership }> {
  const tokenHash = hashInvitationToken(params.token);
  const result = await mutateConvex<{
    membership: {
      id: string;
      email?: string | null;
      role: ProfileRole;
      status?: string | null;
      joinedAt?: string | null;
    };
    profile: {
      id: string;
    };
    user: {
      id: string;
    };
  }>("workspaces:acceptWorkspaceInvitation", {
    tokenHash,
    invitedEmail: params.user?.email
      ? normalizeWorkspaceEmail(params.user.email)
      : undefined,
  });

  return {
    profileId: result.profile.id,
    membership: {
      id: result.membership.id,
      profile_id: result.profile.id,
      user_id: result.user.id,
      email: result.membership.email ?? "",
      role: result.membership.role,
      status: result.membership.status === "revoked" ? "revoked" : "active",
      invited_by_user_id: null,
      joined_at: result.membership.joinedAt ?? null,
    },
  };
}
