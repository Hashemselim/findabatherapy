import Link from "next/link";
import { ArrowRight, ClipboardList, FileText, ShieldCheck } from "lucide-react";

import { BrandedPageCard } from "@/components/dashboard/branded-page-card";
import { DashboardCallout, DashboardEmptyState } from "@/components/dashboard/ui";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ClientSharePageActions } from "@/components/dashboard/forms/client-share-page-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClientsList } from "@/lib/actions/clients";
import { getProfile, createClient } from "@/lib/supabase/server";
import { getProviderDocumentUploadPath } from "@/lib/utils/public-paths";

export default async function DocumentUploadFormPage() {
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

  const documentUploadPath = getProviderDocumentUploadPath(listingSlug);
  const clientsResult = await getClientsList();
  const clients = clientsResult.data || [];

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Document Upload"
        description="Collect diagnosis reports, referrals, medical history, and other supporting files through a branded secure upload page."
      >
        <ClientSharePageActions clients={clients} kind="documents" shareLabel="Create Client Link" />
      </DashboardPageHeader>

      <BrandedPageCard
        title="Secure Document Upload Page"
        sentence="A branded upload page for supporting ABA intake documents, always shared with a client-specific secure link."
        relativePath={documentUploadPath}
        displayPath={`${documentUploadPath}?token=client-specific`}
        iconName="documents"
        showActions={false}
        defaultExpanded
        howItWorks={[
          "Choose a client on this page and generate a secure upload link.",
          "The family opens your branded page and uploads diagnosis reports, referrals, insurance cards, and medical history.",
          "Uploaded files attach directly to that client's record for your team to review.",
        ]}
      />

      <DashboardCallout
        tone="info"
        icon={ShieldCheck}
        title="Secure Client-Specific Sharing"
        description="This page creates a separate secure link for each child, so supporting files land on the correct record automatically."
        action={(
          <Button asChild size="sm">
            <Link href="/dashboard/clients" className="gap-2">
              Open Clients
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-4">
            <p className="text-sm font-medium text-foreground">Best for</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Diagnosis reports, referrals, insurance cards, medical records, authorizations, and treatment plans.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-4">
            <p className="text-sm font-medium text-foreground">Where staff shares it</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate the link from this page, or from each client&apos;s detail page under Documents.
            </p>
          </div>
        </div>
      </DashboardCallout>
    </div>
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Document Upload"
        description="Collect supporting files through a branded secure upload page."
      />
      <DashboardEmptyState
        icon={ClipboardList}
        title="Complete Onboarding First"
        description="Finish setting up your practice profile to access your branded forms."
        benefits={["Shareable secure links", "Branded family experience", "Client-linked documents"]}
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
        title="Document Upload"
        description="Collect supporting files through a branded secure upload page."
      />
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
