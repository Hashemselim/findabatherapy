import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { AgreementPacketsManager } from "@/components/dashboard/forms/agreement-packets-manager";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/platform/workspace/server";
import { getAgreementDashboardData } from "@/lib/actions/agreements";

export default async function AgreementsPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const listingSlug = await getListingSlug();

  if (!listingSlug) {
    return <NoListingState />;
  }

  const result = await getAgreementDashboardData();
  if (!result.success || !result.data) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Agreement Form"
          description="Collect signed parent acknowledgements for policies, waivers, and agreements."
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Unable to load the agreement form.
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstPublishedPacket = result.data.packets.find((packet) => packet.latest_version_id);
  const previewPath = firstPublishedPacket
    ? `/agreements/${listingSlug}/${firstPublishedPacket.slug}`
    : "/";

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Agreement Form"
        description="Collect signed parent acknowledgements for policies, waivers, and agreements."
      />

      <BrandedPageCard
        title="Agreement Signing Page"
        sentence={
          firstPublishedPacket
            ? "Share one branded agreement page with all of your required documents and a single signature flow."
            : "Set up your agreement form, add documents, and then share the signing page."
        }
        relativePath={previewPath}
        iconName="intake"
        showActions={Boolean(firstPublishedPacket)}
        defaultExpanded
        howItWorks={[
          "Set the agreement form title and description.",
          "Upload one or more PDFs and give each one a title and description.",
          "Families review each document, check every acknowledgment box, and sign once at the bottom.",
        ]}
      />

      <AgreementPacketsManager
        packets={result.data.packets}
        submissions={result.data.submissions}
        clients={result.data.clients}
      />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Agreement Form"
        description="Collect signed parent acknowledgements for policies, waivers, and agreements."
      />

      <DashboardEmptyState
        icon={ClipboardCheck}
        title="Complete Onboarding First"
        description="Finish setting up your practice profile to access your branded forms."
        benefits={["Shareable link", "Custom branding", "Client-linked records"]}
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
      <DashboardPageHeader
        title="Agreement Form"
        description="Collect signed parent acknowledgements for policies, waivers, and agreements."
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load forms</h3>
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
