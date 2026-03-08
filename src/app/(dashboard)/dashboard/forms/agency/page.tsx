import Link from "next/link";
import { ArrowRight, ClipboardList, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getProviderBrochurePath } from "@/lib/utils/public-paths";

export default async function AgencyBrochurePage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("slug")
    .eq("profile_id", profile.id)
    .single();

  const listingSlug = listing?.slug ?? null;

  if (!listingSlug) {
    return <NoListingState />;
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Agency Brochure" description="Your shareable agency page for referral partners, doctors, and families." />

      <BrandedPageCard
        title="Branded Agency Page"
        sentence="Your shareable agency page for referral partners, doctors, and families."
        relativePath={getProviderBrochurePath(listingSlug)}
        iconName="agency"
        defaultExpanded
        howItWorks={[
          "Share your branded page link with referral sources, doctors, or schools.",
          "They see your full agency profile, services, and locations.",
          "Families can contact you or start intake directly from the page.",
        ]}
      />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Agency Brochure" description="Your shareable agency page for referral partners, doctors, and families." />
      <DashboardEmptyState
        icon={ClipboardList}
        title="Complete Onboarding First"
        description="Finish setting up your practice profile to access your branded forms."
        benefits={["Shareable link", "Custom branding", "Lead capture"]}
        action={(
          <Button asChild size="lg">
            <Link href="/dashboard/onboarding" className="gap-2">
              Continue Onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      />
    </div>
  );
}

function NoListingState() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Agency Brochure" description="Your shareable agency page for referral partners, doctors, and families." />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load form</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Please complete your company profile setup to access your branded forms.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/company">Go to Company Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
