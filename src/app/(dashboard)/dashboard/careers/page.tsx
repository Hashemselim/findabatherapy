import Link from "next/link";
import { ArrowRight, ClipboardList, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SharePageHeaderActions } from "@/components/dashboard/share-page-header-actions";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { CareersPageShareCard } from "@/components/dashboard/jobs/careers-page-share-card";
import { getProfile } from "@/lib/platform/workspace/server";
import { getListingSlug } from "@/lib/actions/listings";
import { getJobsByProvider } from "@/lib/queries/jobs";
import { getProviderCareersPath } from "@/lib/utils/public-paths";

export default async function CareersPageDashboard() {
  const [profile, listingSlug] = await Promise.all([
    getProfile(),
    getListingSlug(),
  ]);

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Careers Page" description="Share a branded careers page with job seekers." />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding First"
          description="Finish setting up your practice profile to access your branded careers page."
          benefits={["Shareable link", "Custom branding", "All jobs in one place"]}
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

  // If no listing slug, something went wrong
  if (!listingSlug) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Careers Page" description="Share a branded careers page with job seekers." />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load careers page</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Please complete your company profile setup to access your branded careers page.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/company">
                Go to Company Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = await getJobsByProvider(listingSlug);
  const careersPath = getProviderCareersPath(listingSlug);

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Careers Page" description="Share a branded careers page that showcases all your open positions.">
        <SharePageHeaderActions relativePath={careersPath} />
      </DashboardPageHeader>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Branding is now managed in one place for all branded pages.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/branding">Manage Branding</Link>
          </Button>
        </CardContent>
      </Card>

      <CareersPageShareCard
        listingSlug={listingSlug}
        companyName={profile.agency_name || "Your Practice"}
        jobCount={jobs.length}
        showActions={false}
      />
    </div>
  );
}
