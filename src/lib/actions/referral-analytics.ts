"use server";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
import { REFERRAL_SOURCE_OPTIONS } from "@/lib/validations/clients";

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

// Label lookup from REFERRAL_SOURCE_OPTIONS
const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  REFERRAL_SOURCE_OPTIONS.map((o) => [o.value, o.label])
);

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Get referral source analytics for the current user's clients
 */
export async function getReferralAnalytics(): Promise<ActionResult<ReferralAnalytics>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Fetch all clients with their referral source
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, referral_source")
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[REFERRAL] Failed to fetch clients:", error);
    return { success: false, error: "Failed to fetch referral data" };
  }

  const totalClients = clients?.length ?? 0;
  if (totalClients === 0) {
    return {
      success: true,
      data: {
        totalClients: 0,
        totalWithSource: 0,
        findabatherapyCount: 0,
        breakdown: [],
      },
    };
  }

  // Count by referral source
  const counts: Record<string, number> = {};
  let totalWithSource = 0;

  for (const client of clients) {
    const source = client.referral_source || "unknown";
    counts[source] = (counts[source] || 0) + 1;
    if (client.referral_source) {
      totalWithSource++;
    }
  }

  // Build breakdown sorted by count descending
  const breakdown: ReferralBreakdown[] = Object.entries(counts)
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source] || (source === "unknown" ? "Unknown" : source === "public_intake" ? "Intake Form (No Source)" : source),
      count,
      percentage: totalClients > 0 ? Math.round((count / totalClients) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    data: {
      totalClients,
      totalWithSource,
      findabatherapyCount: counts["findabatherapy"] || 0,
      breakdown,
    },
  };
}
