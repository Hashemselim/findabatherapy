import { NextResponse } from "next/server";

import { isClerkAuthEnabled, isConvexDataEnabled } from "@/lib/platform/config";
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

function buildInviteErrorRedirect(params: {
  origin: string;
  token: string;
  email: string | null | undefined;
  message: string;
}) {
  const redirectUrl = new URL("/auth/sign-in", params.origin);
  redirectUrl.searchParams.set("invite", params.token);
  redirectUrl.searchParams.set("error", params.message);

  if (params.email) {
    redirectUrl.searchParams.set("email", params.email);
  }

  return redirectUrl.toString();
}

/**
 * Clerk-mode callback handler.
 * After Clerk sign-in/sign-up, handles workspace creation and invite acceptance via Convex.
 */
async function handleClerkCallback(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard/clients/pipeline";
  const inviteToken = searchParams.get("invite");
  const selectedPlan = searchParams.get("plan");
  const selectedInterval = searchParams.get("interval");
  const selectedIntent = normalizeSignupIntent(searchParams.get("intent"));

  const validPlans = ["free", "pro"];
  const planTier =
    selectedPlan && validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const billingInterval =
    selectedInterval === "annual" || selectedInterval === "year"
      ? "year"
      : "month";

  const { getCurrentUser } = await import("@/lib/platform/auth/server");
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }

  // Handle invite acceptance
  const { getWorkspaceInviteCookie, clearWorkspaceInviteCookie } = await import(
    "@/lib/workspace/invite-cookie"
  );
  const pendingInviteToken = inviteToken || (await getWorkspaceInviteCookie());

  if (pendingInviteToken && isConvexDataEnabled()) {
    try {
      const { hashInvitationToken } = await import(
        "@/lib/workspace/memberships"
      );
      const { mutateConvex } = await import(
        "@/lib/platform/convex/server"
      );
      const tokenHash = hashInvitationToken(pendingInviteToken);
      const result = await mutateConvex<{
        membership: { id: string };
        profile: { onboarding_completed_at: string | null };
      }>("workspaces:acceptWorkspaceInvitation", { tokenHash });

      await clearWorkspaceInviteCookie();

      if (!result?.profile?.onboarding_completed_at) {
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      return NextResponse.redirect(
        buildInviteErrorRedirect({
          origin,
          token: pendingInviteToken,
          email: user.email,
          message:
            error instanceof Error
              ? error.message
              : "Failed to accept workspace invitation",
        }),
      );
    }
  }

  // Check or create workspace in Convex
  if (isConvexDataEnabled()) {
    const { queryConvex, mutateConvex } = await import(
      "@/lib/platform/convex/server"
    );

    const workspace = await queryConvex<{
      profile: { onboarding_completed_at: string | null };
    } | null>("workspaces:getCurrentWorkspace");

    if (!workspace) {
      const agencyName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.email?.split("@")[0] || "My Agency";

      await mutateConvex("workspaces:createWorkspaceForCurrentUser", {
        email: user.email || "",
        agencyName,
        planTier,
        billingInterval,
        primaryIntent: selectedIntent,
      });

      await sendAdminNewSignupNotification({
        agencyName,
        email: user.email || "",
        planTier,
        billingInterval,
        signupMethod: "email",
      });

      return NextResponse.redirect(`${origin}/dashboard/onboarding`);
    }

    if (!workspace.profile.onboarding_completed_at) {
      return NextResponse.redirect(`${origin}/dashboard/onboarding`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Clerk mode without Convex - shouldn't happen in practice
  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Supabase-mode OAuth callback handler.
 * Exchanges the code for a session and creates a profile if needed.
 */
async function handleSupabaseCallback(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/clients/pipeline";
  const inviteToken = searchParams.get("invite");
  const selectedPlan = searchParams.get("plan");
  const selectedInterval = searchParams.get("interval");
  const selectedIntent = normalizeSignupIntent(searchParams.get("intent"));

  const validPlans = ["free", "pro"];
  const planTier =
    selectedPlan && validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const billingInterval =
    selectedInterval === "annual" || selectedInterval === "year"
      ? "year"
      : "month";

  if (code) {
    const { createClient, getWorkspaceInviteCookie } = await import(
      "@/lib/supabase/server"
    );
    const { resolveCurrentWorkspaceProfileId } = await import(
      "@/lib/workspace/current-profile"
    );
    const { acceptWorkspaceInvitation, createWorkspaceForUser } = await import(
      "@/lib/workspace/memberships"
    );

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
      );
    }

    if (data.user) {
      const pendingInviteToken =
        inviteToken || (await getWorkspaceInviteCookie());
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
            buildInviteErrorRedirect({
              origin,
              token: pendingInviteToken,
              email: data.user.email,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to accept workspace invitation",
            }),
          );
        }
      }

      const currentProfileId = await resolveCurrentWorkspaceProfileId(
        supabase,
        data.user.id,
      );
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

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed_at, primary_intent")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        const agencyName =
          data.user.user_metadata?.agency_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split("@")[0] ||
          "My Agency";

        const userPlan =
          data.user.user_metadata?.selected_plan || planTier;
        const userInterval =
          data.user.user_metadata?.billing_interval || billingInterval;
        const userIntent = normalizeSignupIntent(
          data.user.user_metadata?.selected_intent || selectedIntent,
        );

        await createWorkspaceForUser({
          userId: data.user.id,
          email: data.user.email!,
          agencyName,
          planTier: userPlan,
          billingInterval: userInterval,
          primaryIntent: userIntent,
        });

        const provider = data.user.app_metadata?.provider;
        const signupMethod =
          provider === "google"
            ? "google"
            : provider === "azure"
              ? "microsoft"
              : "email";
        await sendAdminNewSignupNotification({
          agencyName,
          email: data.user.email!,
          planTier: userPlan,
          billingInterval: userInterval,
          signupMethod,
        });

        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      if (!existingProfile.onboarding_completed_at) {
        if (!existingProfile.primary_intent) {
          await supabase
            .from("profiles")
            .update({ primary_intent: selectedIntent })
            .eq("id", data.user.id);
        }
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in`);
}

export async function GET(request: Request) {
  if (isClerkAuthEnabled()) {
    return handleClerkCallback(request);
  }
  return handleSupabaseCallback(request);
}
