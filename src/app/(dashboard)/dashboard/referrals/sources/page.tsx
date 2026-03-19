import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getLocations } from "@/lib/actions/locations";
import { getReferralTemplates, listReferralSources } from "@/lib/actions/referrals";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ReferralSourcesPageClient } from "@/components/dashboard/referrals/referral-sources-page-client";

export default async function ReferralSourcesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const [sourcesResult, templatesResult, locationsResult] = await Promise.all([
    listReferralSources(undefined, 1, 200),
    getReferralTemplates(),
    getLocations(),
  ]);

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referral Sources"
        description="Discover nearby doctors and partner offices, enrich them, and send outreach."
      />

      <ReferralSourcesPageClient
        initialSources={sourcesResult.success && sourcesResult.data ? sourcesResult.data.sources : []}
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
