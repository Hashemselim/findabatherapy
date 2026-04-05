import Link from "next/link";
import { ArrowRight, ClipboardList, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SharePageHeaderActions } from "@/components/dashboard/share-page-header-actions";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/platform/workspace/server";
import { getProviderContactPath } from "@/lib/utils/public-paths";

export default async function ContactFormPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const listingSlug = await getListingSlug();

  if (!listingSlug) {
    return <NoListingState />;
  }

  const contactPath = getProviderContactPath(listingSlug);

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Contact Form" description="Capture new family inquiries with a fast, low-friction first step.">
        <SharePageHeaderActions relativePath={contactPath} />
      </DashboardPageHeader>

      <BrandedPageCard
        title="Client Contact Form"
        sentence="Capture new family inquiries with a fast, low-friction first step."
        relativePath={contactPath}
        iconName="contact"
        showActions={false}
        defaultExpanded
        howItWorks={[
          "A family opens your contact page and enters basic details.",
          "The inquiry is sent to your dashboard inbox and email notifications.",
          "Your team follows up and guides the family to next steps.",
        ]}
      />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Contact Form" description="Capture new family inquiries with a fast, low-friction first step." />
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
      <DashboardPageHeader title="Contact Form" description="Capture new family inquiries with a fast, low-friction first step." />
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
