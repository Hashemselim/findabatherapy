"use server";

import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";

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
  try {
    const result = await queryConvex<PaymentStatus>("billing:getPaymentStatus");
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex getPaymentStatus error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

/**
 * Check if the user has selected a paid plan (regardless of payment completion)
 */
export async function getSelectedPlanTier(): Promise<ActionResult<{ planTier: "free" | "pro" }>> {
  try {
    const result = await queryConvex<{ planTier: "free" | "pro" }>("billing:getSelectedPlanTierQuery");
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex getSelectedPlanTier error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

/**
 * Reset the user's plan to free
 */
export async function resetPlanToFree(): Promise<ActionResult> {
  try {
    await mutateConvex("billing:resetPlanToFree");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset plan";
    return { success: false, error: message };
  }
}
