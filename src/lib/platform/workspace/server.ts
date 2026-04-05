import "server-only";

import {
  getCurrentMembership as getSupabaseCurrentMembership,
  getCurrentWorkspace as getSupabaseCurrentWorkspace,
  requireProfileRole,
  type WorkspaceProfile as SupabaseWorkspaceProfile,
} from "@/lib/supabase/server";
import { queryConvex } from "@/lib/platform/convex/server";
import { isConvexDataEnabled } from "@/lib/platform/config";
import type {
  PlatformCurrentWorkspace,
  PlatformMembership,
  WorkspaceRole,
} from "@/lib/platform/contracts";

export type { SupabaseWorkspaceProfile as WorkspaceProfile };

function mapMembership(
  membership: Awaited<ReturnType<typeof getSupabaseCurrentMembership>>,
): PlatformMembership | null {
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
}

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export async function getCurrentMembership(): Promise<PlatformMembership | null> {
  if (isConvexDataEnabled()) {
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
  }

  return mapMembership(await getSupabaseCurrentMembership());
}

export async function requireWorkspaceRole(
  minimumRole: WorkspaceRole,
): Promise<PlatformMembership> {
  if (isConvexDataEnabled()) {
    const membership = await getCurrentMembership();
    if (!membership || membership.status !== "active") {
      throw new Error("Not authenticated");
    }

    if (ROLE_ORDER[membership.role] < ROLE_ORDER[minimumRole]) {
      throw new Error("Insufficient permissions");
    }

    return membership;
  }

  const membership = await requireProfileRole(minimumRole);
  return mapMembership(membership) as PlatformMembership;
}

export async function getCurrentWorkspace(): Promise<PlatformCurrentWorkspace | null> {
  if (isConvexDataEnabled()) {
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
  }

  const workspace = await getSupabaseCurrentWorkspace();
  if (!workspace) {
    return null;
  }

  return {
    membership: mapMembership(workspace.membership) as PlatformMembership,
    workspace: {
      id: workspace.profile.id,
      slug: workspace.profile.slug ?? null,
      agencyName: workspace.profile.agency_name ?? null,
      contactEmail: workspace.profile.contact_email ?? null,
      planTier: workspace.profile.plan_tier ?? null,
      subscriptionStatus: workspace.profile.subscription_status ?? null,
      billingInterval: workspace.profile.billing_interval ?? null,
      onboardingCompletedAt: workspace.profile.onboarding_completed_at ?? null,
      primaryIntent: workspace.profile.primary_intent ?? null,
      stripeCustomerId: workspace.profile.stripe_customer_id ?? null,
      stripeSubscriptionId: workspace.profile.stripe_subscription_id ?? null,
    },
  };
}

/**
 * Platform-abstracted equivalent of `getProfile()` from `@/lib/supabase/server`.
 * Returns the workspace profile in the same shape that dashboard pages expect.
 */
export async function getProfile(): Promise<SupabaseWorkspaceProfile | null> {
  if (isConvexDataEnabled()) {
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
  }

  const { getProfile: getSupabaseProfile } = await import("@/lib/supabase/server");
  return getSupabaseProfile();
}

/**
 * Platform-abstracted equivalent of `getCurrentProfileId()` from `@/lib/supabase/server`.
 */
export async function getCurrentProfileId(): Promise<string | null> {
  if (isConvexDataEnabled()) {
    const workspace = await getCurrentWorkspace();
    return workspace?.workspace.id ?? null;
  }

  const { getCurrentProfileId: getSupabaseProfileId } = await import("@/lib/supabase/server");
  return getSupabaseProfileId();
}
