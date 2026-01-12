import { PropsWithChildren } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { type CompanyProfile } from "@/components/dashboard/dashboard-sidebar";
import { getListing } from "@/lib/actions/listings";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  let isOnboardingComplete = false;
  let providerSlug: string | null = null;
  let companyProfile: CompanyProfile | undefined;

  try {
    const [profile, listingResult] = await Promise.all([
      getProfile(),
      getListing(),
    ]);
    isOnboardingComplete = !!profile?.onboarding_completed_at;

    // Build company profile for sidebar and get slug from listing
    if (listingResult.success && listingResult.data) {
      providerSlug = listingResult.data.slug;
      companyProfile = {
        name: listingResult.data.profile.agencyName,
        logoUrl: listingResult.data.logoUrl,
        planTier: listingResult.data.profile.planTier as "free" | "pro" | "enterprise",
        subscriptionStatus: listingResult.data.profile.subscriptionStatus,
      };
    }
  } catch {
    // If fetch fails (e.g., during redirect from external payment), continue with defaults
  }

  return (
    <DashboardShell
      isOnboardingComplete={isOnboardingComplete}
      providerSlug={providerSlug}
      companyProfile={companyProfile}
    >
      {children}
    </DashboardShell>
  );
}
