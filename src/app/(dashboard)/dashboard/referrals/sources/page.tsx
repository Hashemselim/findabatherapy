import { redirect } from "next/navigation";
import { Network } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getReferralTemplates, listReferralSources } from "@/lib/actions/referrals";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { ReferralNetworkWorkspace } from "@/components/dashboard/referrals/referral-network-workspace";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";

export default async function ReferralSourcesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  if (isPreview) {
    return (
      <div className="space-y-3">
        <PreviewBanner
          message="Referral Network is a Pro feature. Go Live to discover sources, manage outreach, and track follow-ups."
          variant="inline"
          triggerFeature="referrals"
        />
        <DashboardPageHeader
          title="Referral Network"
          description="Discover, enrich, and reach out to nearby referral sources."
        />
        <PreviewOverlay isPreview label="Preview">
          <DashboardEmptyState
            icon={Network}
            title="Referral Network Workspace"
            description="Build a referral pipeline with discovered sources, outreach templates, notes, and follow-up tracking."
            benefits={[
              "Discover nearby pediatricians and therapy partners",
              "Save contacts, notes, and next steps in one place",
              "Track outreach stages from new to active referrer",
              "Send individual or bulk referral emails from templates",
            ]}
          />
        </PreviewOverlay>
      </div>
    );
  }

  const [sourcesResult, templatesResult, locationsResult] = await Promise.all([
    listReferralSources(undefined, 1, 500),
    getReferralTemplates(),
    getLocations(),
  ]);

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referral Network"
        description="Discover, enrich, and reach out to nearby referral sources."
      />

      <ReferralNetworkWorkspace
        sources={sourcesResult.success && sourcesResult.data ? sourcesResult.data.sources : []}
        templates={templatesResult.success && templatesResult.data ? templatesResult.data : []}
        locations={
          locationsResult.success && locationsResult.data
            ? locationsResult.data.map((location) => ({
                id: location.id,
                label: location.label,
                city: location.city,
                state: location.state,
              }))
            : []
        }
      />
    </div>
  );
}
