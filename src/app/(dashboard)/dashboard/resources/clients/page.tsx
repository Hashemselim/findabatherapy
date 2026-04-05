import Link from "next/link";
import { ArrowRight, BookOpen, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SharePageHeaderActions } from "@/components/dashboard/share-page-header-actions";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { ClientResourcesShareCard } from "@/components/dashboard/resources/client-resources-share-card";
import { getListingSlug } from "@/lib/actions/listings";
import { getProfile } from "@/lib/platform/workspace/server";
import { getProviderResourcesPath } from "@/lib/utils/public-paths";

export default async function ClientResourcesPage() {
  const profile = await getProfile();

  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardPageHeader
          title="Client Resources"
          description="Share a branded parent education page with FAQ, glossary terms, and featured guides."
        />

        <DashboardEmptyState
          icon={BookOpen}
          title="Complete Onboarding First"
          description="Finish setting up your practice profile to access your branded client resources page."
          benefits={["Shareable link", "Custom branding", "Parent education"]}
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

  const listingSlug = await getListingSlug();
  const resourcesPath = listingSlug ? getProviderResourcesPath(listingSlug) : null;

  if (!listingSlug) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardPageHeader
          title="Client Resources"
          description="Share a branded parent education page with FAQ, glossary terms, and featured guides."
        />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Unable to load client resources</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Please complete your company profile setup to access your branded resources page.
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardPageHeader
        title="Client Resources"
        description="Share a branded parent education page with FAQ, glossary terms, and featured guides."
      >
        {resourcesPath && <SharePageHeaderActions relativePath={resourcesPath} />}
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

      <ClientResourcesShareCard listingSlug={listingSlug} showActions={false} />

    </div>
  );
}
