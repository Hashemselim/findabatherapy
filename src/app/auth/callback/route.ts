import { NextResponse } from "next/server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendAdminNewSignupNotification } from "@/lib/email/notifications";

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
 * OAuth callback handler.
 * This route handles the redirect from OAuth providers after authentication.
 * It exchanges the code for a session and creates a profile if needed.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/clients/pipeline";
  const selectedPlan = searchParams.get("plan");
  const selectedInterval = searchParams.get("interval");
  const selectedIntent = normalizeSignupIntent(searchParams.get("intent"));

  // Validate plan tier and billing interval
  // Normalize to "month"/"year" to match Stripe's convention
  const validPlans = ["free", "pro", "enterprise"];
  const planTier = selectedPlan && validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const billingInterval = selectedInterval === "annual" || selectedInterval === "year" ? "year" : "month";

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data.user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed_at, primary_intent")
        .eq("id", data.user.id)
        .single();

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const adminClient = await createAdminClient();

        // Get user metadata for agency name
        const agencyName =
          data.user.user_metadata?.agency_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split("@")[0] ||
          "My Agency";

        // Get plan and interval from user metadata (email signup) or URL param (OAuth)
        const userPlan = data.user.user_metadata?.selected_plan || planTier;
        const userInterval = data.user.user_metadata?.billing_interval || billingInterval;
        const userIntent = normalizeSignupIntent(
          data.user.user_metadata?.selected_intent || selectedIntent
        );

        const { error: profileError } = await adminClient
          .from("profiles")
          .insert({
            id: data.user.id,
            agency_name: agencyName,
            contact_email: data.user.email!,
            plan_tier: userPlan,
            billing_interval: userInterval,
            primary_intent: userIntent,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Send admin notification for new signup
        // Determine signup method from OAuth provider
        const provider = data.user.app_metadata?.provider;
        const signupMethod = provider === "google" ? "google" : provider === "azure" ? "microsoft" : "email";
        await sendAdminNewSignupNotification({
          agencyName,
          email: data.user.email!,
          planTier: userPlan,
          billingInterval: userInterval,
          signupMethod,
        });

        // For paid plans selected from pricing page, redirect to payment first
        if (userPlan === "pro" || userPlan === "enterprise") {
          return NextResponse.redirect(
            `${origin}/dashboard/billing/checkout?plan=${userPlan}&interval=${userInterval}&return_to=onboarding`
          );
        }

        // Free plan - go straight to onboarding
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      // Existing user without completed onboarding
      if (!existingProfile.onboarding_completed_at) {
        if (!existingProfile.primary_intent) {
          await supabase
            .from("profiles")
            .update({ primary_intent: selectedIntent })
            .eq("id", data.user.id);
        }
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      // Existing user with completed onboarding - redirect to next or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or error, redirect to sign-in
  return NextResponse.redirect(`${origin}/auth/sign-in`);
}
