import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getReferralTemplates, listReferralSources } from "@/lib/actions/referrals";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ReferralNetworkWorkspace } from "@/components/dashboard/referrals/referral-network-workspace";

export default async function ReferralSourcesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

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
