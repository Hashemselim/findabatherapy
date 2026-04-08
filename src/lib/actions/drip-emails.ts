"use server";

/**
 * Drip email server actions
 *
 * Handles sending the 5-email nurture series for free users.
 * Designed to be called from a cron job or edge function.
 */

import { isConvexDataEnabled } from "@/lib/platform/config";
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
  if (isConvexDataEnabled()) {
    // Drip emails will be handled differently in Convex mode
    // (e.g., via Convex scheduled functions)
    console.log("[drip] Convex mode: drip emails handled by Convex scheduled functions");
    return { success: true, data: { sent: 0, errors: 0 } };
  }

  const client = await getResendClient();
  if (!client) {
    console.log("[drip] Resend not configured, skipping drip emails");
    return { success: true, data: { sent: 0, errors: 0 } };
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  // Fetch free users who haven't completed the drip sequence
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, agency_name, drip_email_step, drip_email_last_sent, created_at")
    .eq("plan_tier", "free")
    .lt("drip_email_step", DRIP_TOTAL_STEPS)
    .not("email", "is", null);

  if (error) {
    console.error("[drip] Error fetching profiles:", error);
    return { success: false, error: error.message };
  }

  if (!profiles || profiles.length === 0) {
    return { success: true, data: { sent: 0, errors: 0 } };
  }

  const now = new Date();
  let sent = 0;
  let errors = 0;

  for (const profile of profiles) {
    const currentStep = profile.drip_email_step ?? 0;
    const nextStep = DRIP_SEQUENCE[currentStep];

    if (!nextStep) continue;

    // Check if enough days have passed since signup
    const signupDate = new Date(profile.created_at);
    const daysSinceSignup = Math.floor(
      (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup < nextStep.dayOffset) continue;

    // Prevent duplicate sends: at least 20 hours since last drip
    if (profile.drip_email_last_sent) {
      const lastSent = new Date(profile.drip_email_last_sent);
      const hoursSinceLastSend = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSend < 20) continue;
    }

    // Generate the email
    const agencyName = profile.agency_name || "there";
    const template = nextStep.getTemplate(agencyName);

    try {
      await client.emails.send({
        from: getFormattedFromEmail("goodaba"),
        to: profile.email!,
        subject: template.subject,
        html: template.html,
      });

      // Update the profile drip state
      await supabase
        .from("profiles")
        .update({
          drip_email_step: nextStep.step,
          drip_email_last_sent: now.toISOString(),
        })
        .eq("id", profile.id);

      sent++;
    } catch (err) {
      console.error(`[drip] Error sending email to ${profile.email}:`, err);
      errors++;
    }
  }

  console.log(`[drip] Processed: ${sent} sent, ${errors} errors`);
  return { success: true, data: { sent, errors } };
}

/**
 * Stop drip emails for a user (e.g., when they upgrade to Pro).
 * Sets drip_email_step to the max so no more emails are sent.
 */
export async function stopDripForUser(profileId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
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

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ drip_email_step: DRIP_TOTAL_STEPS })
    .eq("id", profileId);

  if (error) {
    console.error("[drip] Error stopping drip for user:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
