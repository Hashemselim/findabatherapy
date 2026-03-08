import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import {
  clearWorkspaceInviteCookie,
  createAdminClient,
  type CurrentMembership,
  type ProfileRole,
} from "@/lib/supabase/server";

export type SignupIntent = "therapy" | "jobs" | "both";

export interface WorkspaceInviteDetails {
  id: string;
  profileId: string;
  agencyName: string;
  invitedEmail: string;
  role: ProfileRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  inviterName: string | null;
}

export class WorkspaceInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceInviteError";
  }
}

export function normalizeWorkspaceEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken() {
  return randomBytes(24).toString("hex");
}

async function ensureOwnerMembership(
  profileId: string,
  userId: string,
  email: string
) {
  const adminClient = await createAdminClient();
  const normalizedEmail = normalizeWorkspaceEmail(email);

  const { data: existing } = await adminClient
    .from("profile_memberships")
    .select("id")
    .eq("profile_id", profileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await adminClient
    .from("profile_memberships")
    .insert({
      profile_id: profileId,
      user_id: userId,
      email: normalizedEmail,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create owner membership");
  }

  return data.id;
}

export async function createWorkspaceForUser(params: {
  userId: string;
  email: string;
  agencyName: string;
  planTier: string;
  billingInterval: string;
  primaryIntent: SignupIntent;
}) {
  const adminClient = await createAdminClient();
  const normalizedEmail = normalizeWorkspaceEmail(params.email);

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await adminClient.from("profiles").insert({
      id: params.userId,
      agency_name: params.agencyName,
      contact_email: normalizedEmail,
      plan_tier: params.planTier,
      billing_interval: params.billingInterval,
      primary_intent: params.primaryIntent,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  await ensureOwnerMembership(params.userId, params.userId, normalizedEmail);
  return params.userId;
}

export async function getWorkspaceInviteDetails(
  token: string
): Promise<WorkspaceInviteDetails | null> {
  const adminClient = await createAdminClient();
  const tokenHash = hashInvitationToken(token);

  const { data, error } = await adminClient
    .from("profile_invitations")
    .select(`
      id,
      profile_id,
      email,
      role,
      status,
      expires_at,
      profiles!inner(agency_name)
    `)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const agency = data.profiles as unknown as { agency_name: string };
  const expired =
    data.status === "pending" &&
    data.expires_at &&
    new Date(data.expires_at).getTime() < Date.now();

  return {
    id: data.id,
    profileId: data.profile_id,
    agencyName: agency.agency_name,
    invitedEmail: data.email,
    role: data.role as ProfileRole,
    status: expired ? "expired" : (data.status as WorkspaceInviteDetails["status"]),
    expiresAt: data.expires_at,
    inviterName: null,
  };
}

export async function acceptWorkspaceInvitation(params: {
  token: string;
  user: User;
}): Promise<{ profileId: string; membership: CurrentMembership }> {
  const details = await getWorkspaceInviteDetails(params.token);
  if (!details) {
    throw new WorkspaceInviteError("Invitation not found");
  }

  if (details.status === "revoked") {
    throw new WorkspaceInviteError("This invitation has been revoked");
  }

  if (details.status === "expired") {
    throw new WorkspaceInviteError("This invitation has expired");
  }

  if (details.status === "accepted") {
    throw new WorkspaceInviteError("This invitation has already been accepted");
  }

  const normalizedEmail = normalizeWorkspaceEmail(params.user.email || "");
  if (!normalizedEmail || normalizedEmail !== normalizeWorkspaceEmail(details.invitedEmail)) {
    throw new WorkspaceInviteError("This invitation must be accepted with the invited email address");
  }

  const adminClient = await createAdminClient();

  const { data: activeMembership } = await adminClient
    .from("profile_memberships")
    .select("*")
    .eq("user_id", params.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (activeMembership && activeMembership.profile_id !== details.profileId) {
    throw new WorkspaceInviteError("This user already belongs to another workspace");
  }

  if (activeMembership && activeMembership.profile_id === details.profileId) {
    await adminClient
      .from("profile_invitations")
      .update({
        status: "accepted",
        accepted_by_user_id: params.user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", details.id);

    await clearWorkspaceInviteCookie();
    return {
      profileId: details.profileId,
      membership: activeMembership as CurrentMembership,
    };
  }

  const { data: existingMembership } = await adminClient
    .from("profile_memberships")
    .select("*")
    .eq("profile_id", details.profileId)
    .eq("user_id", params.user.id)
    .maybeSingle();

  if (existingMembership) {
    const { data: reactivatedMembership, error: reactivationError } = await adminClient
      .from("profile_memberships")
      .update({
        email: normalizedEmail,
        role: details.role,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.id)
      .select("*")
      .single();

    if (reactivationError || !reactivatedMembership) {
      throw new WorkspaceInviteError(reactivationError?.message || "Failed to reactivate workspace membership");
    }

    await adminClient
      .from("profile_invitations")
      .update({
        status: "accepted",
        accepted_by_user_id: params.user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", details.id);

    await clearWorkspaceInviteCookie();

    return {
      profileId: details.profileId,
      membership: reactivatedMembership as CurrentMembership,
    };
  }

  const { data: membership, error: membershipError } = await adminClient
    .from("profile_memberships")
    .insert({
      profile_id: details.profileId,
      user_id: params.user.id,
      email: normalizedEmail,
      role: details.role,
      status: "active",
      invited_by_user_id: null,
      joined_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (membershipError || !membership) {
    throw new WorkspaceInviteError(membershipError?.message || "Failed to create workspace membership");
  }

  await adminClient
    .from("profile_invitations")
    .update({
      status: "accepted",
      accepted_by_user_id: params.user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", details.id);

  await clearWorkspaceInviteCookie();

  return {
    profileId: details.profileId,
    membership: membership as CurrentMembership,
  };
}
