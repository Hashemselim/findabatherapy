import { PropsWithChildren } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  let isOnboardingComplete = false;
  let providerSlug: string | null = null;

  try {
    const [profile, slug] = await Promise.all([
      getProfile(),
      getListingSlug(),
    ]);
    isOnboardingComplete = !!profile?.onboarding_completed_at;
    providerSlug = slug;
  } catch {
    // If fetch fails (e.g., during redirect from external payment), continue with defaults
  }

  return (
    <DashboardShell isOnboardingComplete={isOnboardingComplete} providerSlug={providerSlug}>
      {children}
    </DashboardShell>
  );
}
