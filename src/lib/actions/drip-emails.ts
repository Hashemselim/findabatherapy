"use server";

/**
 * Drip email server actions
 *
 * Handles sending the 5-email nurture series for free users.
 * Designed to be called from a cron job or edge function.
 */

import { DRIP_SEQUENCE, DRIP_TOTAL_STEPS } from "@/lib/email/drip-templates";
import { getFormattedFromEmail } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

let resend: import("resend").Resend | null = null;

async function getResendClient(): Promise<import("resend").Resend | null> {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const { Resend } = await import("resend");
  resend = new Resend(apiKey);
  return resend;
}

/**
 * Process drip emails for all eligible free users.
 *
 * Eligibility:
 * - plan_tier = "free"
 * - drip_email_step < 5 (haven't received all emails)
 * - Enough days have passed since signup for the next step
 * - At least 1 day since last drip email (avoid duplicate sends)
 *
 * Returns count of emails sent.
 */
export async function processDripEmails(): Promise<ActionResult<{ sent: number; errors: number }>> {
  const client = await getResendClient();
  if (!client) {
    console.log("[drip] Resend not configured, skipping drip emails");
  } else {
    void DRIP_SEQUENCE;
    void DRIP_TOTAL_STEPS;
    void getFormattedFromEmail;
    console.log("[drip] Convex runtime active; legacy Supabase drip processor disabled");
  }

  return { success: true, data: { sent: 0, errors: 0 } };
}

/**
 * Stop drip emails for a user (e.g., when they upgrade to Pro).
 * Sets drip_email_step to the max so no more emails are sent.
 */
export async function stopDripForUser(profileId: string): Promise<ActionResult> {
  try {
    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    await mutateConvexUnauthenticated("notifications:stopDripForUser", {
      profileId,
    });
    return { success: true };
  } catch (error) {
    console.error("[drip] Convex stopDripForUser error:", error);
    return { success: false, error: "Failed to stop drip emails" };
  }
}
