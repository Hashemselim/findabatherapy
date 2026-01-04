"use server";

import { createClient, getUser } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface PaymentStatus {
  isPaid: boolean;
  planTier: "free" | "pro" | "enterprise";
  hasSubscription: boolean;
}

/**
 * Get payment status for the current user
 *
 * "Paid" means:
 * - plan_tier is 'pro' or 'enterprise' AND
 * - subscription_status is 'active' or 'trialing'
 *
 * This is used to determine if premium features should be unlocked
 */
export async function getPaymentStatus(): Promise<ActionResult<PaymentStatus>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_subscription_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { success: false, error: "Profile not found" };
  }

  const planTier = profile.plan_tier as "free" | "pro" | "enterprise";
  const isPaidPlan = planTier === "pro" || planTier === "enterprise";
  const hasSubscription = !!profile.stripe_subscription_id;
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";

  // User is "paid" only if they have a paid plan AND an active subscription
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
 * Used to determine intent during onboarding
 */
export async function getSelectedPlanTier(): Promise<ActionResult<{ planTier: "free" | "pro" | "enterprise" }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { success: false, error: "Profile not found" };
  }

  return {
    success: true,
    data: {
      planTier: profile.plan_tier as "free" | "pro" | "enterprise",
    },
  };
}

/**
 * Reset the user's plan to free
 *
 * Called when user cancels/backs out of Stripe checkout during onboarding.
 * Only resets if user doesn't have an active subscription (edge case protection).
 */
export async function resetPlanToFree(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // First check if they have an active subscription (edge case protection)
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  // Don't reset if they have an active subscription
  if (
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing"
  ) {
    return { success: true }; // No-op, they're actually paid
  }

  // Reset plan to free
  const { error } = await supabase
    .from("profiles")
    .update({ plan_tier: "free" })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
