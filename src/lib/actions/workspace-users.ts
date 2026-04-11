"use server";

import { revalidatePath } from "next/cache";

import { sendWorkspaceInvitationEmail } from "@/lib/email/workspace-invitations";
import {
  createInvitationToken,
  hashInvitationToken,
  normalizeWorkspaceEmail,
  type WorkspaceInviteDetails,
} from "@/lib/workspace/invite-utils";
import { buildBrandUrl } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

type ProfileRole = "owner" | "admin" | "member";

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  email: string;
  role: ProfileRole;
  status: "active" | "revoked";
  joinedAt: string | null;
  isCurrentUser: boolean;
}

export interface WorkspaceInvitationRow {
  id: string;
  email: string;
  role: ProfileRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceSeatSummary {
  planTier: "free" | "pro";
  maxSeats: number;
  usedSeats: number;
  pendingSeats: number;
  availableSeats: number;
}

export interface WorkspaceUsersPayload {
  workspaceName: string;
  currentMembership: {
    id: string;
    profile_id: string;
    user_id: string;
    email: string;
    role: ProfileRole;
    status: "active" | "revoked";
    invited_by_user_id: string | null;
    joined_at: string | null;
  };
  members: WorkspaceMemberRow[];
  invitations: WorkspaceInvitationRow[];
  seatSummary: WorkspaceSeatSummary;
}

// ---------------------------------------------------------------------------
// Convex-backed implementations
// ---------------------------------------------------------------------------

async function getWorkspaceSeatSummaryConvex(): Promise<
  ActionResult<WorkspaceSeatSummary>
> {
  const { queryConvex } = await import("@/lib/platform/convex/server");
  try {
    const data = await queryConvex<WorkspaceSeatSummary>(
      "workspaces:getWorkspaceSeatSummary",
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load seat summary",
    };
  }
}

async function getWorkspaceUsersConvex(): Promise<
  ActionResult<WorkspaceUsersPayload>
> {
  const { queryConvex } = await import("@/lib/platform/convex/server");
  try {
    const data = await queryConvex<WorkspaceUsersPayload>(
      "workspaces:getWorkspaceUsersManagement",
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load workspace users",
    };
  }
}

async function inviteWorkspaceUserConvex(
  email: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  const { mutateConvex } = await import("@/lib/platform/convex/server");

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  try {
    const result = await mutateConvex<{
      invitationId: string;
      workspaceName: string;
      inviterEmail: string;
    }>("workspaces:inviteWorkspaceUser", {
      email: normalizeWorkspaceEmail(email),
      role,
      tokenHash,
      expiresAt,
    });

    const acceptUrl = buildBrandUrl(
      "goodaba",
      `/auth/accept-invite?token=${token}`,
    );
    const emailResult = await sendWorkspaceInvitationEmail({
      to: normalizeWorkspaceEmail(email),
      workspaceName: result.workspaceName,
      inviterName: result.inviterEmail,
      role,
      acceptUrl,
      expiresAt,
    });

    if (!emailResult.success) {
      await mutateConvex("workspaces:revokeWorkspaceInvitation", {
        invitationId: result.invitationId,
      });
      return { success: false, error: emailResult.error };
    }

    revalidatePath("/dashboard/settings/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create invitation",
    };
  }
}

async function revokeWorkspaceInvitationConvex(
  invitationId: string,
): Promise<ActionResult> {
  const { mutateConvex } = await import("@/lib/platform/convex/server");
  try {
    await mutateConvex("workspaces:revokeWorkspaceInvitation", {
      invitationId,
    });
    revalidatePath("/dashboard/settings/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke invitation",
    };
  }
}

async function resendWorkspaceInvitationConvex(
  invitationId: string,
): Promise<ActionResult> {
  const { mutateConvex } = await import("@/lib/platform/convex/server");

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  try {
    const result = await mutateConvex<{
      invitationId: string;
      email: string;
      role: Exclude<ProfileRole, "owner">;
      workspaceName: string;
      inviterEmail: string;
    }>("workspaces:resendWorkspaceInvitation", {
      invitationId,
      tokenHash,
      expiresAt,
    });

    const acceptUrl = buildBrandUrl(
      "goodaba",
      `/auth/accept-invite?token=${token}`,
    );
    const emailResult = await sendWorkspaceInvitationEmail({
      to: result.email,
      workspaceName: result.workspaceName,
      inviterName: result.inviterEmail,
      role: result.role,
      acceptUrl,
      expiresAt,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error };
    }

    revalidatePath("/dashboard/settings/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}

async function removeWorkspaceUserConvex(
  membershipId: string,
): Promise<ActionResult> {
  const { mutateConvex } = await import("@/lib/platform/convex/server");
  try {
    await mutateConvex("workspaces:removeWorkspaceUser", { membershipId });
    revalidatePath("/dashboard/settings/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove user",
    };
  }
}

async function updateWorkspaceUserRoleConvex(
  membershipId: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  const { mutateConvex } = await import("@/lib/platform/convex/server");
  try {
    await mutateConvex("workspaces:updateWorkspaceUserRole", {
      membershipId,
      role,
    });
    revalidatePath("/dashboard/settings/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update user role",
    };
  }
}

export async function getWorkspaceSeatSummary(
  profileId?: string,
): Promise<ActionResult<WorkspaceSeatSummary>> {
  void profileId;
  return getWorkspaceSeatSummaryConvex();
}

export async function getWorkspaceUsers(): Promise<
  ActionResult<WorkspaceUsersPayload>
> {
  return getWorkspaceUsersConvex();
}

export async function inviteWorkspaceUser(
  email: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  return inviteWorkspaceUserConvex(email, role);
}

export async function revokeWorkspaceInvitation(
  invitationId: string,
): Promise<ActionResult> {
  return revokeWorkspaceInvitationConvex(invitationId);
}

export async function resendWorkspaceInvitation(
  invitationId: string,
): Promise<ActionResult> {
  return resendWorkspaceInvitationConvex(invitationId);
}

export async function removeWorkspaceUser(
  membershipId: string,
): Promise<ActionResult> {
  return removeWorkspaceUserConvex(membershipId);
}

export async function updateWorkspaceUserRole(
  membershipId: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  return updateWorkspaceUserRoleConvex(membershipId, role);
}

export async function getInvitePreview(
  token: string,
): Promise<ActionResult<WorkspaceInviteDetails>> {
  const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
  const tokenHash = hashInvitationToken(token);
  try {
    const details = await queryConvexUnauthenticated<WorkspaceInviteDetails | null>(
      "workspaces:getInvitationDetails",
      { tokenHash },
    );
    if (!details) {
      return { success: false, error: "Invitation not found" };
    }
    return { success: true, data: details };
  } catch {
    return { success: false, error: "Failed to load invitation" };
  }
}
