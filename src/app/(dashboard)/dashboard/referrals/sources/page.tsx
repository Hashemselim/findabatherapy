import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getLocations } from "@/lib/actions/locations";
import { getReferralTemplates, listReferralSources } from "@/lib/actions/referrals";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { ReferralNetworkWorkspace } from "@/components/dashboard/referrals/referral-network-workspace";
import { PreviewBanner } from "@/components/ui/preview-banner";
import {
  DEMO_REFERRAL_LOCATIONS,
  DEMO_REFERRAL_NETWORK_SOURCES,
  DEMO_REFERRAL_TEMPLATES,
} from "@/lib/demo/feature-previews";

export default async function ReferralSourcesPage() {
  const user = await getCurrentUser();
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
        <DashboardCard className="border-amber-200/70 bg-amber-50/40 p-4 text-sm text-muted-foreground">
          Explore a sample referral workspace with example providers, stages, and contact channels. Outreach and discovery tools unlock on Pro.
        </DashboardCard>
        <ReferralNetworkWorkspace
          sources={DEMO_REFERRAL_NETWORK_SOURCES}
          templates={DEMO_REFERRAL_TEMPLATES}
          locations={DEMO_REFERRAL_LOCATIONS}
          previewMode
        />
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
