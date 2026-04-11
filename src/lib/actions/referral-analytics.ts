"use server";

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface ReferralBreakdown {
  source: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ReferralAnalytics {
  totalClients: number;
  totalWithSource: number;
  findabatherapyCount: number;
  breakdown: ReferralBreakdown[];
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Get referral source analytics for the current user's clients
 */
export async function getReferralAnalytics(): Promise<ActionResult<ReferralAnalytics>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const result = await queryConvex<ReferralAnalytics>("referrals:getReferralAnalytics", {});
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Failed to fetch referral data" };
  }
}
