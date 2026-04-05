import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/platform/auth/server";
import { getReferralSourceDetail, getReferralTemplates } from "@/lib/actions/referrals";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ReferralSourceDetailClient } from "@/components/dashboard/referrals/referral-source-detail-client";

export default async function ReferralSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  if ((await getCurrentPlanTier()) === "free") {
    redirect("/dashboard/referrals/sources");
  }

  const { id } = await params;

  const [detailResult, templatesResult] = await Promise.all([
    getReferralSourceDetail(id),
    getReferralTemplates(),
  ]);

  if (!detailResult.success || !detailResult.data) {
    notFound();
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Referral Source"
        description="Track contacts, tasks, notes, and touchpoints for this relationship."
      />

      <ReferralSourceDetailClient
        source={detailResult.data}
        templates={templatesResult.success && templatesResult.data ? templatesResult.data : []}
      />
    </div>
  );
}
