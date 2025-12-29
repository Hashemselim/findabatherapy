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
 * - stripe_subscription_id is not null (payment has been completed)
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
    .select("plan_tier, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { success: false, error: "Profile not found" };
  }

  const planTier = profile.plan_tier as "free" | "pro" | "enterprise";
  const isPaidPlan = planTier === "pro" || planTier === "enterprise";
  const hasSubscription = !!profile.stripe_subscription_id;

  // User is "paid" only if they have a paid plan AND have completed payment
  const isPaid = isPaidPlan && hasSubscription;

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
