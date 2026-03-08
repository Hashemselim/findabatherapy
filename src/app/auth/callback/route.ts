import { NextResponse } from "next/server";

import {
  createClient,
  getCurrentProfileId,
  getWorkspaceInviteCookie,
} from "@/lib/supabase/server";
import { sendAdminNewSignupNotification } from "@/lib/email/notifications";
import {
  acceptWorkspaceInvitation,
  createWorkspaceForUser,
} from "@/lib/workspace/memberships";

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
  const validPlans = ["free", "pro"];
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
      const pendingInviteToken = await getWorkspaceInviteCookie();
      if (pendingInviteToken) {
        try {
          const result = await acceptWorkspaceInvitation({
            token: pendingInviteToken,
            user: data.user,
          });

          const { data: invitedProfile } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", result.profileId)
            .single();

          if (!invitedProfile?.onboarding_completed_at) {
            return NextResponse.redirect(`${origin}/dashboard/onboarding`);
          }

          return NextResponse.redirect(`${origin}${next}`);
        } catch (error) {
          return NextResponse.redirect(
            `${origin}/auth/sign-in?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to accept workspace invitation")}`
          );
        }
      }

      const currentProfileId = (await getCurrentProfileId()) || data.user.id;
      if (currentProfileId !== data.user.id) {
        const { data: invitedWorkspace } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", currentProfileId)
          .single();

        if (!invitedWorkspace?.onboarding_completed_at) {
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed_at, primary_intent")
        .eq("id", data.user.id)
        .single();

      // Create profile if it doesn't exist
      if (!existingProfile) {
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

        await createWorkspaceForUser({
          userId: data.user.id,
          email: data.user.email!,
          agencyName,
          planTier: userPlan,
          billingInterval: userInterval,
          primaryIntent: userIntent,
        });

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
