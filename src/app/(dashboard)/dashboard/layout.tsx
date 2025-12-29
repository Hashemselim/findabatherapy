import { PropsWithChildren } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getProfile } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  let isOnboardingComplete = false;

  try {
    const profile = await getProfile();
    isOnboardingComplete = !!profile?.onboarding_completed_at;
  } catch {
    // If profile fetch fails (e.g., during redirect from external payment), continue with default
  }

  return (
    <DashboardShell isOnboardingComplete={isOnboardingComplete}>
      {children}
    </DashboardShell>
  );
}
