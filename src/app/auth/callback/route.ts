import { NextResponse } from "next/server";

import { isConvexDataEnabled } from "@/lib/platform/config";
import { sendAdminNewSignupNotification } from "@/lib/email/notifications";

type SignupIntent = "therapy" | "jobs" | "both";

type FamilyPortalEntry = {
  slug: string;
  clientId: string;
};

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
  const redirectUrl = new URL("/auth/accept-invite", params.origin);
  redirectUrl.searchParams.set("token", params.token);
  redirectUrl.searchParams.set("error", params.message);

  if (params.email) {
    redirectUrl.searchParams.set("email", params.email);
  }

  return redirectUrl.toString();
}

function buildFamilyPortalRedirect(origin: string, entry: FamilyPortalEntry) {
  const url = new URL(`/portal/${entry.slug}`, origin);
  url.searchParams.set("client", entry.clientId);
  return url.toString();
}

async function resolveFamilyPortalRedirect(params: {
  origin: string;
  portalSlug?: string | null;
  portalToken?: string | null;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
}) {
  const { mutateConvex, queryConvex } = await import("@/lib/platform/convex/server");

  if (params.portalSlug && params.portalToken) {
    const claimed = await mutateConvex<{ clientId: string; slug: string }>(
      "clientPortal:claimGuardianInviteForCurrentUser",
      {
        slug: params.portalSlug,
        token: params.portalToken,
        authenticatedClerkUserId: params.currentUserId ?? null,
        authenticatedEmail: params.currentUserEmail ?? null,
      },
    );
    return buildFamilyPortalRedirect(params.origin, claimed);
  }

  if (params.portalSlug) {
    const targets = await queryConvex<{ entries: FamilyPortalEntry[] }>(
      "clientPortal:listAuthenticatedPortalTargets",
      { slug: params.portalSlug },
    );

    if (targets.entries.length === 1) {
      return buildFamilyPortalRedirect(params.origin, {
        slug: params.portalSlug,
        clientId: targets.entries[0].clientId,
      });
    }

    return `${params.origin}/portal/${params.portalSlug}`;
  }

  const entries = await queryConvex<FamilyPortalEntry[]>(
    "clientPortal:listAuthenticatedPortalHome",
    {},
  );

  if (entries.length === 1) {
    return buildFamilyPortalRedirect(params.origin, entries[0]);
  }

  return `${params.origin}/portal`;
}

/**
 * Clerk-mode callback handler.
 * After Clerk sign-in/sign-up, handles workspace creation and invite acceptance via Convex.
 */
async function handleClerkCallback(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard/clients/pipeline";
  const inviteToken = searchParams.get("invite");
  const authMode = searchParams.get("auth_mode");
  const portalSlug = searchParams.get("portal_slug");
  const portalToken = searchParams.get("portal_token");
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

  const { auth: clerkAuth, currentUser } = await import("@clerk/nextjs/server");
  const authState = await clerkAuth();
  if (!authState.userId) {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }
  const clerkUser = await currentUser();
  const user = {
    id: authState.userId,
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    firstName: clerkUser?.firstName ?? null,
    lastName: clerkUser?.lastName ?? null,
  };

  if (isConvexDataEnabled() && (authMode === "family" || portalSlug || next.startsWith("/portal"))) {
    try {
      const destination = await resolveFamilyPortalRedirect({
        origin,
        portalSlug,
        portalToken,
        currentUserId: user.id,
        currentUserEmail: user.email,
      });
      return NextResponse.redirect(destination);
    } catch (error) {
      if (portalSlug) {
        const destination = new URL(`/portal/${portalSlug}/sign-in`, origin);
        if (portalToken) {
          destination.searchParams.set("token", portalToken);
        }
        destination.searchParams.set(
          "error",
          error instanceof Error ? error.message : "Failed to open the family portal",
        );
        return NextResponse.redirect(destination);
      }

      return NextResponse.redirect(`${origin}/portal`);
    }
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
      }>("workspaces:acceptWorkspaceInvitation", {
        tokenHash,
        invitedEmail: user.email ?? undefined,
      });

      await clearWorkspaceInviteCookie();

      if (!result?.profile?.onboarding_completed_at) {
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      console.error("Failed to accept Clerk workspace invitation", error);
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
      const familyPortals = await queryConvex<FamilyPortalEntry[]>(
        "clientPortal:listAuthenticatedPortalHome",
        {},
      ).catch(() => []);

      if (familyPortals.length > 0) {
        if (familyPortals.length === 1) {
          return NextResponse.redirect(buildFamilyPortalRedirect(origin, familyPortals[0]));
        }
        return NextResponse.redirect(`${origin}/portal`);
      }
    }

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

export async function GET(request: Request) {
  return handleClerkCallback(request);
}
