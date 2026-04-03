"use server";

import { isConvexDataEnabled } from "@/lib/platform/config";
import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";
import { createClient, getCurrentProfileId, requireProfileRole } from "@/lib/supabase/server";
import { toUserFacingSupabaseError } from "@/lib/supabase/user-facing-errors";
import { getWorkspaceSeatSummary } from "@/lib/actions/workspace-users";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface PaymentStatus {
  isPaid: boolean;
  planTier: "free" | "pro";
  hasSubscription: boolean;
}

/**
 * Get payment status for the current user
 */
export async function getPaymentStatus(): Promise<ActionResult<PaymentStatus>> {
  if (isConvexDataEnabled()) {
    try {
      const result = await queryConvex<PaymentStatus>("billing:getPaymentStatus");
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex getPaymentStatus error:", error);
      return { success: false, error: "Not authenticated" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_subscription_id, subscription_status")
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    return { success: false, error: "Profile not found" };
  }

  const planTier = profile.plan_tier as "free" | "pro";
  const isPaidPlan = planTier === "pro";
  const hasSubscription = !!profile.stripe_subscription_id;
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";

  const isPaid = isPaidPlan && isActiveSubscription;

  return {
    success: true,
    data: {
      isPaid,
      planTier,
      hasSubscription,
    },
  };
}

/**
 * Check if the user has selected a paid plan (regardless of payment completion)
 */
export async function getSelectedPlanTier(): Promise<ActionResult<{ planTier: "free" | "pro" }>> {
  if (isConvexDataEnabled()) {
    try {
      const result = await queryConvex<{ planTier: "free" | "pro" }>("billing:getSelectedPlanTierQuery");
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex getSelectedPlanTier error:", error);
      return { success: false, error: "Not authenticated" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    return { success: false, error: "Profile not found" };
  }

  return {
    success: true,
    data: {
      planTier: profile.plan_tier as "free" | "pro",
    },
  };
}

/**
 * Reset the user's plan to free
 */
export async function resetPlanToFree(): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("billing:resetPlanToFree");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset plan";
      return { success: false, error: message };
    }
  }

  const membership = await requireProfileRole("owner").catch(() => null);
  if (!membership) {
    return { success: false, error: "Not authenticated" };
  }

  const seatSummaryResult = await getWorkspaceSeatSummary(membership.profile_id);
  if (!seatSummaryResult.success || !seatSummaryResult.data) {
    return { success: false, error: "Failed to validate seat usage" };
  }

  if (seatSummaryResult.data.usedSeats > 1) {
    return {
      success: false,
      error: "Reduce workspace users and pending invitations to one seat before resetting to Free.",
    };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", membership.profile_id)
    .single();

  if (
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing"
  ) {
    return { success: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ plan_tier: "free" })
    .eq("id", membership.profile_id);

  if (error) {
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "BILLING:resetPlanToFree",
        error,
        fallback: "We could not reset the plan to Free. Please try again.",
      }),
    };
  }

  return { success: true };
}
