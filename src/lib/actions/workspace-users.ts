"use server";

import { revalidatePath } from "next/cache";

import { sendWorkspaceInvitationEmail } from "@/lib/email/workspace-invitations";
import {
  createAdminClient,
  getCurrentMembership,
  getCurrentProfileId,
  getCurrentWorkspace,
  requireProfileRole,
  type CurrentMembership,
  type ProfileRole,
} from "@/lib/supabase/server";
import {
  createInvitationToken,
  getWorkspaceInviteDetails,
  hashInvitationToken,
  normalizeWorkspaceEmail,
  type WorkspaceInviteDetails,
} from "@/lib/workspace/memberships";
import { buildBrandUrl } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
  currentMembership: CurrentMembership;
  members: WorkspaceMemberRow[];
  invitations: WorkspaceInvitationRow[];
  seatSummary: WorkspaceSeatSummary;
}

async function expireStaleWorkspaceInvitations(profileId: string) {
  const adminClient = await createAdminClient();
  await adminClient
    .from("profile_invitations")
    .update({ status: "expired" })
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

async function resolveEffectivePlanTier(profileId: string): Promise<"free" | "pro"> {
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

export async function getWorkspaceSeatSummary(
  profileId?: string
): Promise<ActionResult<WorkspaceSeatSummary>> {
  const resolvedProfileId = profileId || (await getCurrentProfileId());
  if (!resolvedProfileId) {
    return { success: false, error: "Not authenticated" };
  }

  await expireStaleWorkspaceInvitations(resolvedProfileId);

  const adminClient = await createAdminClient();
  const planTier = await resolveEffectivePlanTier(resolvedProfileId);

  const [{ count: activeMembers }, { count: pendingInvitations }, { data: addonRows }] =
    await Promise.all([
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
      ? (addonRows || []).reduce((sum, row) => sum + (row.quantity || 0), 0)
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

export async function getWorkspaceUsers(): Promise<ActionResult<WorkspaceUsersPayload>> {
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
    getWorkspaceSeatSummary(workspace.membership.profile_id),
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

  const members: WorkspaceMemberRow[] = (membersResult.data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: row.role as ProfileRole,
    status: row.status as "active" | "revoked",
    joinedAt: row.joined_at,
    isCurrentUser: row.user_id === workspace.membership.user_id,
  }));

  const invitations: WorkspaceInvitationRow[] = (invitesResult.data || []).map((row) => ({
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

export async function inviteWorkspaceUser(
  email: string,
  role: Exclude<ProfileRole, "owner">
): Promise<ActionResult> {
  const membership = await requireProfileRole("admin");
  const normalizedEmail = normalizeWorkspaceEmail(email);
  await expireStaleWorkspaceInvitations(membership.profile_id);

  const seatSummaryResult = await getWorkspaceSeatSummary(membership.profile_id);
  if (!seatSummaryResult.success || !seatSummaryResult.data) {
    return { success: false, error: "Failed to validate seat availability" };
  }

  if (seatSummaryResult.data.availableSeats < 1) {
    return { success: false, error: "No available user seats. Add another seat before inviting." };
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
    return { success: false, error: "That user is already a member of this workspace" };
  }

  const { data: existingInvite } = await adminClient
    .from("profile_invitations")
    .select("id")
    .eq("profile_id", membership.profile_id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { success: false, error: "An invitation is already pending for that email" };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

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
    return { success: false, error: error?.message || "Failed to create invitation" };
  }

  const workspace = await getCurrentWorkspace();
  const acceptUrl = buildBrandUrl("goodaba", `/auth/accept-invite?token=${token}`);
  const emailResult = await sendWorkspaceInvitationEmail({
    to: normalizedEmail,
    workspaceName: String(workspace?.profile.agency_name || "GoodABA"),
    inviterName: membership.email,
    role,
    acceptUrl,
    expiresAt,
  });

  if (!emailResult.success) {
    await adminClient.from("profile_invitations").delete().eq("id", invitation.id);
    return { success: false, error: emailResult.error };
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}

export async function revokeWorkspaceInvitation(invitationId: string): Promise<ActionResult> {
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

export async function resendWorkspaceInvitation(invitationId: string): Promise<ActionResult> {
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
    return { success: false, error: "Only pending or expired invitations can be resent" };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

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
  const acceptUrl = buildBrandUrl("goodaba", `/auth/accept-invite?token=${token}`);

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

export async function removeWorkspaceUser(membershipId: string): Promise<ActionResult> {
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
    return { success: false, error: "The workspace owner cannot be removed" };
  }

  if (target.user_id === currentMembership.user_id) {
    return { success: false, error: "You cannot remove yourself from the workspace" };
  }

  const canRemove =
    currentMembership.role === "owner" ||
    (currentMembership.role === "admin" && target.role === "member");

  if (!canRemove) {
    return { success: false, error: "You do not have permission to remove this user" };
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

export async function updateWorkspaceUserRole(
  membershipId: string,
  role: Exclude<ProfileRole, "owner">
): Promise<ActionResult> {
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
    return { success: false, error: "The workspace owner role cannot be changed" };
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

export async function getInvitePreview(token: string): Promise<ActionResult<WorkspaceInviteDetails>> {
  const details = await getWorkspaceInviteDetails(token);
  if (!details) {
    return { success: false, error: "Invitation not found" };
  }

  return { success: true, data: details };
}
