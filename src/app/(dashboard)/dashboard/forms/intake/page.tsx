import Link from "next/link";
import { ArrowRight, ClipboardList, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { ClientSharePageActions } from "@/components/dashboard/forms/client-share-page-actions";
import { IntakeFieldConfig } from "@/components/dashboard/intake/intake-field-config";
import { getClientsList } from "@/lib/actions/clients";
import { getClientIntakeEnabled, getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/platform/workspace/server";
import { getIntakeFieldsConfig } from "@/lib/actions/intake";

export default async function IntakeFormPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const listingSlug = await getListingSlug();
  const intakeEnabledResult = await getClientIntakeEnabled();
  const clientIntakeEnabled = intakeEnabledResult.success ? intakeEnabledResult.data ?? false : false;

  if (!listingSlug) {
    return <NoListingState />;
  }

  // Load field config for the config panel
  const fieldsConfig = await getIntakeFieldsConfig(profile.id);
  const clientsResult = await getClientsList();
  const clients = clientsResult.success ? (clientsResult.data ?? []) : [];
  const intakePath = `/intake/${listingSlug}/client`;

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Intake Form" description="Collect complete parent, child, and insurance details before the first call.">
        <ClientSharePageActions
          clients={clients}
          kind="intake"
          previewPath={intakePath}
          previewLabel="Preview Form"
          shareLabel="Create Link"
        />
      </DashboardPageHeader>

      <BrandedPageCard
        title="Client Intake Form"
        sentence={
          clientIntakeEnabled
            ? "Collect complete parent, child, and insurance details before the first call."
            : "Enable this when you are ready to collect full onboarding details up front."
        }
        relativePath={intakePath}
        iconName="intake"
        showActions={false}
        defaultExpanded
        howItWorks={[
          "Preview the branded intake form your families will see.",
          "Create a reusable generic link for new families, or generate a client-specific link when you want the submission tied to the right child automatically.",
          "Review the completed intake inside the client record and prioritize follow-up quickly.",
        ]}
      />

      <IntakeFieldConfig initialConfig={fieldsConfig} />
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Intake Form" description="Collect complete parent, child, and insurance details before the first call." />

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
      <DashboardPageHeader title="Intake Form" description="Collect complete parent, child, and insurance details before the first call." />
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
