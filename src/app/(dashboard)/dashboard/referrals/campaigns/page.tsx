import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getReferralCampaigns, getReferralTemplates } from "@/lib/actions/referrals";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ReferralCampaignsClient } from "@/components/dashboard/referrals/referral-campaigns-client";

export default async function ReferralCampaignsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  if ((await getCurrentPlanTier()) === "free") {
    redirect("/dashboard/referrals/sources");
  }

  const [campaignsResult, templatesResult] = await Promise.all([
    getReferralCampaigns(),
    getReferralTemplates(),
  ]);

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referral Campaigns"
        description="Review bulk outreach history and the template library behind it."
      />

      <ReferralCampaignsClient
        campaigns={campaignsResult.success && campaignsResult.data ? campaignsResult.data : []}
        templates={templatesResult.success && templatesResult.data ? templatesResult.data : []}
      />
    </div>
  );
}
