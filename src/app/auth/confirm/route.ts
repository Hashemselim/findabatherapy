import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  createClient,
  getCurrentProfileId,
  getWorkspaceInviteCookie,
} from "@/lib/supabase/server";
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
        } catch (inviteError) {
          return NextResponse.redirect(
            `${origin}/auth/sign-in?error=${encodeURIComponent(inviteError instanceof Error ? inviteError.message : "Invitation could not be accepted")}`
          );
        }
      }

      const currentProfileId = (await getCurrentProfileId()) || data.user.id;
      if (currentProfileId !== data.user.id) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed_at")
        .eq("id", data.user.id)
        .single();

      // Create profile if it doesn't exist (for email signups)
      if (!existingProfile) {
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

        await createWorkspaceForUser({
          userId: data.user.id,
          email: data.user.email!,
          agencyName,
          planTier: selectedPlan,
          billingInterval,
          primaryIntent: selectedIntent,
        });

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
