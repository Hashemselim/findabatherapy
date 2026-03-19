import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { getUser } from "@/lib/supabase/server";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getAllCommunications } from "@/lib/actions/communications";
import { DEMO_COMMUNICATIONS } from "@/lib/demo/data";
import { CommunicationsPageClient } from "@/components/dashboard/clients/communications-page-client";

export default async function CommunicationsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  // Use demo data for free users, real data for pro
  let communications = DEMO_COMMUNICATIONS;
  let total = DEMO_COMMUNICATIONS.length;

  if (!isPreview) {
    const result = await getAllCommunications(undefined, 1, 50);
    communications = result.success && result.data ? result.data.communications : [];
    total = result.success && result.data ? result.data.total : 0;
  }

  const sentCount = communications.filter((c) => c.status === "sent").length;
  const failedCount = communications.filter((c) => c.status === "failed").length;

  return (
    <div className="space-y-3">
      <DashboardTracker section="communications" />

      {isPreview && (
        <PreviewBanner
          message="This is a preview of client communications. Go Live to send real emails and track history."
          variant="inline"
          triggerFeature="communications"
        />
      )}

      {/* Header */}
      <DashboardPageHeader
        title="Communications"
        description="Track sent email history and manage your reusable communication templates."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/clients">
            View Clients
          </Link>
        </Button>
      </DashboardPageHeader>

      {/* Summary Cards */}
      <CommunicationsPageClient
        communications={communications}
        total={total}
        sentCount={sentCount}
        failedCount={failedCount}
        isPreview={isPreview}
      />
    </div>
  );
}
