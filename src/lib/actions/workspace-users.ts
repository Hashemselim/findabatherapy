"use server";

import { revalidatePath } from "next/cache";

import { sendWorkspaceInvitationEmail } from "@/lib/email/workspace-invitations";
import { isConvexDataEnabled } from "@/lib/platform/config";
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

// ---------------------------------------------------------------------------
// Supabase-backed implementations
// ---------------------------------------------------------------------------

async function loadSupabaseHelpers() {
  const {
    createAdminClient,
    getCurrentMembership,
    getCurrentProfileId,
    getCurrentWorkspace,
    requireProfileRole,
  } = await import("@/lib/supabase/server");
  return {
    createAdminClient,
    getCurrentMembership,
    getCurrentProfileId,
    getCurrentWorkspace,
    requireProfileRole,
  };
}

async function expireStaleWorkspaceInvitations(profileId: string) {
  const { createAdminClient } = await loadSupabaseHelpers();
  const adminClient = await createAdminClient();
  await adminClient
    .from("profile_invitations")
    .update({ status: "expired" })
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

async function resolveEffectivePlanTier(
  profileId: string,
): Promise<"free" | "pro"> {
  const { createAdminClient } = await loadSupabaseHelpers();
  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("plan_tier, subscription_status, onboarding_completed_at")
    .eq("id", profileId)
    .single();

  const rawTier = profile?.plan_tier === "pro" ? "pro" : "free";
  if (!profile?.onboarding_completed_at) {
    return rawTier;
  }

  const active =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  return rawTier === "pro" && active ? "pro" : "free";
}

async function getWorkspaceSeatSummarySupabase(
  profileId?: string,
): Promise<ActionResult<WorkspaceSeatSummary>> {
  const { createAdminClient, getCurrentProfileId } =
    await loadSupabaseHelpers();
  const resolvedProfileId = profileId || (await getCurrentProfileId());
  if (!resolvedProfileId) {
    return { success: false, error: "Not authenticated" };
  }

  await expireStaleWorkspaceInvitations(resolvedProfileId);

  const adminClient = await createAdminClient();
  const planTier = await resolveEffectivePlanTier(resolvedProfileId);

  const [
    { count: activeMembers },
    { count: pendingInvitations },
    { data: addonRows },
  ] = await Promise.all([
    adminClient
      .from("profile_memberships")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", resolvedProfileId)
      .eq("status", "active"),
    adminClient
      .from("profile_invitations")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", resolvedProfileId)
      .eq("status", "pending"),
    adminClient
      .from("profile_addons")
      .select("quantity")
      .eq("profile_id", resolvedProfileId)
      .eq("addon_type", "extra_users")
      .eq("status", "active"),
  ]);

  const addOnSeats =
    planTier === "pro"
      ? (addonRows || []).reduce(
          (sum, row) => sum + (row.quantity || 0),
          0,
        )
      : 0;
  const maxSeats = 1 + addOnSeats;
  const pendingSeats = pendingInvitations || 0;
  const usedSeats = (activeMembers || 0) + pendingSeats;

  return {
    success: true,
    data: {
      planTier,
      maxSeats,
      usedSeats,
      pendingSeats,
      availableSeats: Math.max(0, maxSeats - usedSeats),
    },
  };
}

async function getWorkspaceUsersSupabase(): Promise<
  ActionResult<WorkspaceUsersPayload>
> {
  const { createAdminClient, getCurrentWorkspace } =
    await loadSupabaseHelpers();
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return { success: false, error: "Not authenticated" };
  }

  await expireStaleWorkspaceInvitations(workspace.membership.profile_id);

  const adminClient = await createAdminClient();
  const [membersResult, invitesResult, seatSummaryResult] = await Promise.all([
    adminClient
      .from("profile_memberships")
      .select("id, user_id, email, role, status, joined_at")
      .eq("profile_id", workspace.membership.profile_id)
      .order("created_at", { ascending: true }),
    adminClient
      .from("profile_invitations")
      .select("id, email, role, status, expires_at, created_at")
      .eq("profile_id", workspace.membership.profile_id)
      .in("status", ["pending", "expired", "revoked"])
      .order("created_at", { ascending: false }),
    getWorkspaceSeatSummarySupabase(workspace.membership.profile_id),
  ]);

  if (membersResult.error) {
    return { success: false, error: "Failed to load workspace users" };
  }

  if (invitesResult.error) {
    return { success: false, error: "Failed to load workspace invitations" };
  }

  if (!seatSummaryResult.success || !seatSummaryResult.data) {
    return { success: false, error: "Failed to load seat summary" };
  }

  const members: WorkspaceMemberRow[] = (membersResult.data || []).map(
    (row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      role: row.role as ProfileRole,
      status: row.status as "active" | "revoked",
      joinedAt: row.joined_at,
      isCurrentUser: row.user_id === workspace.membership.user_id,
    }),
  );

  const invitations: WorkspaceInvitationRow[] = (
    invitesResult.data || []
  ).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as ProfileRole,
    status: row.status as WorkspaceInvitationRow["status"],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));

  return {
    success: true,
    data: {
      workspaceName: String(workspace.profile.agency_name || "Workspace"),
      currentMembership: workspace.membership,
      members,
      invitations,
      seatSummary: seatSummaryResult.data,
    },
  };
}

async function inviteWorkspaceUserSupabase(
  email: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  const { createAdminClient, getCurrentWorkspace, requireProfileRole } =
    await loadSupabaseHelpers();
  const membership = await requireProfileRole("admin");
  const normalizedEmail = normalizeWorkspaceEmail(email);
  await expireStaleWorkspaceInvitations(membership.profile_id);

  const seatSummaryResult = await getWorkspaceSeatSummarySupabase(
    membership.profile_id,
  );
  if (!seatSummaryResult.success || !seatSummaryResult.data) {
    return { success: false, error: "Failed to validate seat availability" };
  }

  if (seatSummaryResult.data.availableSeats < 1) {
    return {
      success: false,
      error: "No available user seats. Add another seat before inviting.",
    };
  }

  const adminClient = await createAdminClient();

  const { data: existingMember } = await adminClient
    .from("profile_memberships")
    .select("id")
    .eq("profile_id", membership.profile_id)
    .eq("email", normalizedEmail)
    .eq("status", "active")
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: "That user is already a member of this workspace",
    };
  }

  const { data: existingInvite } = await adminClient
    .from("profile_invitations")
    .select("id")
    .eq("profile_id", membership.profile_id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return {
      success: false,
      error: "An invitation is already pending for that email",
    };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  const { data: invitation, error } = await adminClient
    .from("profile_invitations")
    .insert({
      profile_id: membership.profile_id,
      email: normalizedEmail,
      role,
      status: "pending",
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by_user_id: membership.user_id,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    return {
      success: false,
      error: error?.message || "Failed to create invitation",
    };
  }

  const workspace = await getCurrentWorkspace();
  const acceptUrl = buildBrandUrl(
    "goodaba",
    `/auth/accept-invite?token=${token}`,
  );
  const emailResult = await sendWorkspaceInvitationEmail({
    to: normalizedEmail,
    workspaceName: String(workspace?.profile.agency_name || "GoodABA"),
    inviterName: membership.email,
    role,
    acceptUrl,
    expiresAt,
  });

  if (!emailResult.success) {
    await adminClient
      .from("profile_invitations")
      .delete()
      .eq("id", invitation.id);
    return { success: false, error: emailResult.error };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

async function revokeWorkspaceInvitationSupabase(
  invitationId: string,
): Promise<ActionResult> {
  const { createAdminClient, requireProfileRole } =
    await loadSupabaseHelpers();
  const membership = await requireProfileRole("admin");
  await expireStaleWorkspaceInvitations(membership.profile_id);
  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from("profile_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("profile_id", membership.profile_id)
    .in("status", ["pending", "expired"]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

async function resendWorkspaceInvitationSupabase(
  invitationId: string,
): Promise<ActionResult> {
  const { createAdminClient, getCurrentWorkspace, requireProfileRole } =
    await loadSupabaseHelpers();
  const membership = await requireProfileRole("admin");
  await expireStaleWorkspaceInvitations(membership.profile_id);
  const adminClient = await createAdminClient();

  const { data: invitation, error } = await adminClient
    .from("profile_invitations")
    .select("id, email, role, status")
    .eq("id", invitationId)
    .eq("profile_id", membership.profile_id)
    .maybeSingle();

  if (error || !invitation) {
    return { success: false, error: "Invitation not found" };
  }

  if (invitation.status !== "pending" && invitation.status !== "expired") {
    return {
      success: false,
      error: "Only pending or expired invitations can be resent",
    };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  const { error: updateError } = await adminClient
    .from("profile_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .eq("id", invitationId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const workspace = await getCurrentWorkspace();
  const acceptUrl = buildBrandUrl(
    "goodaba",
    `/auth/accept-invite?token=${token}`,
  );

  const emailResult = await sendWorkspaceInvitationEmail({
    to: invitation.email,
    workspaceName: String(workspace?.profile.agency_name || "GoodABA"),
    inviterName: membership.email,
    role: invitation.role as Exclude<ProfileRole, "owner">,
    acceptUrl,
    expiresAt,
  });

  if (!emailResult.success) {
    return { success: false, error: emailResult.error };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

async function removeWorkspaceUserSupabase(
  membershipId: string,
): Promise<ActionResult> {
  const { createAdminClient, getCurrentMembership } =
    await loadSupabaseHelpers();
  const currentMembership = await getCurrentMembership();
  if (!currentMembership) {
    return { success: false, error: "Not authenticated" };
  }

  const adminClient = await createAdminClient();
  const { data: target, error } = await adminClient
    .from("profile_memberships")
    .select("id, user_id, role, profile_id")
    .eq("id", membershipId)
    .eq("profile_id", currentMembership.profile_id)
    .maybeSingle();

  if (error || !target) {
    return { success: false, error: "Workspace user not found" };
  }

  if (target.role === "owner") {
    return {
      success: false,
      error: "The workspace owner cannot be removed",
    };
  }

  if (target.user_id === currentMembership.user_id) {
    return {
      success: false,
      error: "You cannot remove yourself from the workspace",
    };
  }

  const canRemove =
    currentMembership.role === "owner" ||
    (currentMembership.role === "admin" && target.role === "member");

  if (!canRemove) {
    return {
      success: false,
      error: "You do not have permission to remove this user",
    };
  }

  const { error: updateError } = await adminClient
    .from("profile_memberships")
    .update({ status: "revoked" })
    .eq("id", membershipId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

async function updateWorkspaceUserRoleSupabase(
  membershipId: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  const { createAdminClient, requireProfileRole } =
    await loadSupabaseHelpers();
  const membership = await requireProfileRole("owner");
  const adminClient = await createAdminClient();

  const { data: target, error } = await adminClient
    .from("profile_memberships")
    .select("id, role, profile_id")
    .eq("id", membershipId)
    .eq("profile_id", membership.profile_id)
    .maybeSingle();

  if (error || !target) {
    return { success: false, error: "Workspace user not found" };
  }

  if (target.role === "owner") {
    return {
      success: false,
      error: "The workspace owner role cannot be changed",
    };
  }

  const { error: updateError } = await adminClient
    .from("profile_memberships")
    .update({ role })
    .eq("id", membershipId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Public API — routes to Convex or Supabase based on platform config
// ---------------------------------------------------------------------------

export async function getWorkspaceSeatSummary(
  profileId?: string,
): Promise<ActionResult<WorkspaceSeatSummary>> {
  if (isConvexDataEnabled()) {
    return getWorkspaceSeatSummaryConvex();
  }
  return getWorkspaceSeatSummarySupabase(profileId);
}

export async function getWorkspaceUsers(): Promise<
  ActionResult<WorkspaceUsersPayload>
> {
  if (isConvexDataEnabled()) {
    return getWorkspaceUsersConvex();
  }
  return getWorkspaceUsersSupabase();
}

export async function inviteWorkspaceUser(
  email: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    return inviteWorkspaceUserConvex(email, role);
  }
  return inviteWorkspaceUserSupabase(email, role);
}

export async function revokeWorkspaceInvitation(
  invitationId: string,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    return revokeWorkspaceInvitationConvex(invitationId);
  }
  return revokeWorkspaceInvitationSupabase(invitationId);
}

export async function resendWorkspaceInvitation(
  invitationId: string,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    return resendWorkspaceInvitationConvex(invitationId);
  }
  return resendWorkspaceInvitationSupabase(invitationId);
}

export async function removeWorkspaceUser(
  membershipId: string,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    return removeWorkspaceUserConvex(membershipId);
  }
  return removeWorkspaceUserSupabase(membershipId);
}

export async function updateWorkspaceUserRole(
  membershipId: string,
  role: Exclude<ProfileRole, "owner">,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    return updateWorkspaceUserRoleConvex(membershipId, role);
  }
  return updateWorkspaceUserRoleSupabase(membershipId, role);
}

export async function getInvitePreview(
  token: string,
): Promise<ActionResult<WorkspaceInviteDetails>> {
  if (isConvexDataEnabled()) {
    const { hashInvitationToken } = await import(
      "@/lib/workspace/invite-utils"
    );
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

  const { getWorkspaceInviteDetails } = await import(
    "@/lib/workspace/memberships"
  );
  const details = await getWorkspaceInviteDetails(token);
  if (!details) {
    return { success: false, error: "Invitation not found" };
  }

  return { success: true, data: details };
}
