import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/platform/auth/server";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";

export async function GET() {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);
  const profile = workspace
    ? {
        id: workspace.workspace.id,
        agency_name: workspace.workspace.agencyName ?? "",
        contact_email: workspace.workspace.contactEmail ?? "",
        plan_tier:
          workspace.workspace.planTier === "pro" ? "pro" : "free",
        has_featured_addon: false,
        stripe_customer_id: workspace.workspace.stripeCustomerId ?? null,
        stripe_subscription_id: workspace.workspace.stripeSubscriptionId ?? null,
        onboarding_completed_at: workspace.workspace.onboardingCompletedAt ?? null,
        created_at: "",
        updated_at: "",
      }
    : null;

  return NextResponse.json({
    user,
    profile,
    isAuthenticated: Boolean(user),
  });
}
