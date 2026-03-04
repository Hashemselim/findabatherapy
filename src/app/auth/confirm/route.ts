import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

type SignupIntent = "therapy" | "jobs" | "both";

function normalizeSignupIntent(value: string | null | undefined): SignupIntent {
  if (value === "therapy" || value === "jobs" || value === "both") {
    return value;
  }
  if (value === "context_jobs" || value === "jobs_only") {
    return "jobs";
  }
  return "both";
}

/**
 * Email confirmation handler.
 * This route handles email verification links sent during signup.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (error) {
      console.error("Email confirmation error:", error);
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data.user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed_at")
        .eq("id", data.user.id)
        .single();

      // Create profile if it doesn't exist (for email signups)
      if (!existingProfile) {
        const adminClient = await createAdminClient();

        const agencyName =
          data.user.user_metadata?.agency_name ||
          data.user.email?.split("@")[0] ||
          "My Agency";
        const selectedPlan = data.user.user_metadata?.selected_plan === "pro" ? "pro" : "free";
        const billingInterval =
          data.user.user_metadata?.billing_interval === "annual" ||
          data.user.user_metadata?.billing_interval === "year"
            ? "year"
            : "month";
        const selectedIntent = normalizeSignupIntent(data.user.user_metadata?.selected_intent);

        const { error: profileError } = await adminClient
          .from("profiles")
          .insert({
            id: data.user.id,
            agency_name: agencyName,
            contact_email: data.user.email!,
            plan_tier: selectedPlan,
            billing_interval: billingInterval,
            primary_intent: selectedIntent,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // New user - redirect to onboarding
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      // Existing user without completed onboarding
      if (!existingProfile.onboarding_completed_at) {
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      // Redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If verification failed, show error
  return NextResponse.redirect(
    `${origin}/auth/sign-in?error=Email+verification+failed`
  );
}
