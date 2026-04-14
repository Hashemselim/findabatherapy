import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PreviewBanner, LockedButton } from "@/components/ui/preview-banner";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { getClients } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_CLIENTS, DEMO_CLIENT_COUNTS } from "@/lib/demo/data";
import { ClientsList } from "@/components/dashboard/clients";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Clients | Dashboard",
  description: "Manage your ABA therapy clients",
};

export default async function ClientsPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="This is a preview of your client list with example data. Go Live to manage real clients."
          variant="inline"
          triggerFeature="clients"
        />
      )}
      <DashboardPageHeader
        title="Clients"
        description={
          isPreview
            ? `${DEMO_CLIENT_COUNTS.total} clients total`
            : "Manage your ABA therapy clients"
        }
      >
        {isPreview ? (
          <LockedButton label="Add Client" />
        ) : (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/dashboard/clients/new">
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        )}
      </DashboardPageHeader>
      {isPreview ? (
        <DashboardCard className="p-5 sm:p-6">
          <ClientsList
            initialClients={DEMO_CLIENTS}
            initialCounts={DEMO_CLIENT_COUNTS}
            previewMode
          />
        </DashboardCard>
      ) : (
        <Suspense fallback={<ClientsContentFallback />}>
          <ClientsContent />
        </Suspense>
      )}
    </div>
  );
}

async function ClientsContent() {
  const result = await getClients();

  if (!result.success) {
    return (
      <DashboardCard className="p-5 sm:p-6">
        <DashboardEmptyState
          icon={Users}
          title="Failed to load clients"
          description="Please try refreshing the page."
        />
      </DashboardCard>
    );
  }

  const successData = result.data;
  const counts = successData?.counts || {
    total: 0,
    inquiry: 0,
    intake_pending: 0,
    waitlist: 0,
    assessment: 0,
    authorization: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
  };

  return (
    <DashboardCard className="p-5 sm:p-6">
      <ClientsList
        initialClients={successData?.clients || []}
        initialCounts={counts}
        previewMode={false}
      />
    </DashboardCard>
  );
}

function ClientsContentFallback() {
  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
