import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getReferralImportJobs, getReferralTemplates } from "@/lib/actions/referrals";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ReferralSettingsClient } from "@/components/dashboard/referrals/referral-settings-client";

export default async function ReferralSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const [templatesResult, importJobsResult] = await Promise.all([
    getReferralTemplates(),
    getReferralImportJobs(),
  ]);

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referral Settings"
        description="Manage outreach templates and review the health of your import pipeline."
      />

      <ReferralSettingsClient
        templates={templatesResult.success && templatesResult.data ? templatesResult.data : []}
        importJobs={importJobsResult.success && importJobsResult.data ? importJobsResult.data : []}
      />
    </div>
  );
}
