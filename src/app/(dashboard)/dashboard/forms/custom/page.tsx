import Link from "next/link";
import { ArrowRight, ClipboardList, FileText } from "lucide-react";

import { FormsDashboard } from "@/components/dashboard/forms/forms-dashboard";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFormsDashboardData } from "@/lib/actions/forms";
import { getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/platform/workspace/server";

type FormsCustomPageProps = {
  searchParams: Promise<{ tab?: "forms" | "submissions" | "unassigned"; submissionId?: string }>;
};

export default async function FormsCustomPage({ searchParams }: FormsCustomPageProps) {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return <OnboardingGate />;
  }

  const listingSlug = await getListingSlug();
  if (!listingSlug) {
    return <NoListingState />;
  }

  const resolvedSearchParams = await searchParams;
  const result = await getFormsDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Forms"
          description="Create reusable forms, assign them to clients, and review submissions."
        />
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            {result.success ? "Unable to load forms right now." : result.error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormsDashboard
      data={result.data}
      initialTab={resolvedSearchParams.tab ?? "forms"}
      initialSubmissionId={resolvedSearchParams.submissionId ?? null}
    />
  );
}

function OnboardingGate() {
  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Forms"
        description="Create reusable provider forms, share branded links, and assign them as client tasks."
      />
      <DashboardEmptyState
        icon={ClipboardList}
        title="Complete onboarding first"
        description="Finish your practice setup before creating custom forms."
        benefits={["Branded public form pages", "Client task assignment", "Submission notifications"]}
        action={(
          <Button asChild size="lg">
            <Link href="/dashboard/onboarding" className="gap-2">
              Continue onboarding
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
        title="Forms"
        description="Create reusable provider forms, share branded links, and assign them as client tasks."
      />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Unable to load forms</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Complete your public listing setup to unlock branded forms and public links.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/company">Go to Company Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
