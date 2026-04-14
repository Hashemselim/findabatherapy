import "server-only";

import { cache } from "react";
import { queryConvex } from "@/lib/platform/convex/server";
import type {
  PlatformCurrentWorkspace,
  PlatformMembership,
  WorkspaceRole,
} from "@/lib/platform/contracts";

export type WorkspaceProfile = {
  id: string;
  agency_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  full_name?: string | null;
  website?: string | null;
  plan_tier?: string | null;
  subscription_status?: string | null;
  billing_interval?: string | null;
  onboarding_completed_at?: string | null;
  intake_form_settings?: Record<string, unknown> | null;
  primary_intent?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  is_admin?: boolean | null;
  has_featured_addon?: boolean | null;
  email?: string | null;
  slug?: string | null;
  listings?: unknown;
  drip_email_step?: number | null;
  drip_email_last_sent?: string | null;
  created_at?: string;
  updated_at?: string;
};

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

const getCurrentMembershipCached = cache(async (): Promise<PlatformMembership | null> => {
  const membership = await queryConvex<{
    id: string;
    profile_id: string;
    user_id: string;
    email: string;
    role: WorkspaceRole;
    status: "active" | "revoked";
    invited_by_user_id: string | null;
    joined_at: string | null;
  } | null>("workspaces:getCurrentMembership");

  if (!membership) {
    return null;
  }

  return {
    id: membership.id,
    workspaceId: membership.profile_id,
    userId: membership.user_id,
    email: membership.email,
    role: membership.role,
    status: membership.status,
    invitedByUserId: membership.invited_by_user_id,
    joinedAt: membership.joined_at,
  };
});

export async function getCurrentMembership(): Promise<PlatformMembership | null> {
  return getCurrentMembershipCached();
}

export async function requireWorkspaceRole(
  minimumRole: WorkspaceRole,
): Promise<PlatformMembership> {
  const membership = await getCurrentMembership();
  if (!membership || membership.status !== "active") {
    throw new Error("Not authenticated");
  }

  if (ROLE_ORDER[membership.role] < ROLE_ORDER[minimumRole]) {
    throw new Error("Insufficient permissions");
  }

  return membership;
}

const getCurrentWorkspaceCached = cache(async (): Promise<PlatformCurrentWorkspace | null> => {
  const workspace = await queryConvex<{
    membership: {
      id: string;
      profile_id: string;
      user_id: string;
      email: string;
      role: WorkspaceRole;
      status: "active" | "revoked";
      invited_by_user_id: string | null;
      joined_at: string | null;
    };
    profile: {
      id: string;
      slug: string | null;
      agency_name: string | null;
      contact_email: string | null;
      plan_tier: string | null;
      subscription_status: string | null;
      billing_interval: string | null;
      onboarding_completed_at: string | null;
      primary_intent: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
    };
  } | null>("workspaces:getCurrentWorkspace");

  if (!workspace) {
    return null;
  }

  return {
    membership: {
      id: workspace.membership.id,
      workspaceId: workspace.membership.profile_id,
      userId: workspace.membership.user_id,
      email: workspace.membership.email,
      role: workspace.membership.role,
      status: workspace.membership.status,
      invitedByUserId: workspace.membership.invited_by_user_id,
      joinedAt: workspace.membership.joined_at,
    },
    workspace: {
      id: workspace.profile.id,
      slug: workspace.profile.slug,
      agencyName: workspace.profile.agency_name,
      contactEmail: workspace.profile.contact_email,
      planTier: workspace.profile.plan_tier,
      subscriptionStatus: workspace.profile.subscription_status,
      billingInterval: workspace.profile.billing_interval,
      onboardingCompletedAt: workspace.profile.onboarding_completed_at,
      primaryIntent: workspace.profile.primary_intent,
      stripeCustomerId: workspace.profile.stripe_customer_id,
      stripeSubscriptionId: workspace.profile.stripe_subscription_id,
    },
  };
});

export async function getCurrentWorkspace(): Promise<PlatformCurrentWorkspace | null> {
  return getCurrentWorkspaceCached();
}

const getProfileCached = cache(async (): Promise<WorkspaceProfile | null> => {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return null;
  }

  return {
    id: workspace.workspace.id,
    agency_name: workspace.workspace.agencyName,
    contact_email: workspace.workspace.contactEmail,
    plan_tier: workspace.workspace.planTier,
    subscription_status: workspace.workspace.subscriptionStatus,
    billing_interval: workspace.workspace.billingInterval,
    onboarding_completed_at: workspace.workspace.onboardingCompletedAt,
    primary_intent: workspace.workspace.primaryIntent,
    stripe_customer_id: workspace.workspace.stripeCustomerId,
    stripe_subscription_id: workspace.workspace.stripeSubscriptionId,
  };
});

export async function getProfile(): Promise<WorkspaceProfile | null> {
  return getProfileCached();
}

export async function getCurrentProfileId(): Promise<string | null> {
  const workspace = await getCurrentWorkspace();
  return workspace?.workspace.id ?? null;
}
