import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { PreviewBanner, LockedButton } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getUser } from "@/lib/supabase/server";
import { getClients } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_CLIENTS, DEMO_CLIENT_COUNTS } from "@/lib/demo/data";
import { ClientsList } from "@/components/dashboard/clients";

export const metadata = {
  title: "Clients | Dashboard",
  description: "Manage your ABA therapy clients",
};

export default async function ClientsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  // Fetch initial clients data (skip for free users — use demo)
  const result = isPreview ? null : await getClients();

  if (!isPreview && result && !result.success) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Clients" />
        <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-medium text-muted-foreground">
                Failed to load clients
              </h2>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const successData = result && result.success ? result.data : null;
  const clients = isPreview ? DEMO_CLIENTS : (successData?.clients || []);
  const counts = isPreview ? DEMO_CLIENT_COUNTS : (successData?.counts || {
    total: 0,
    inquiry: 0,
    intake_pending: 0,
    waitlist: 0,
    assessment: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
  });
  const totalClients = counts.total ?? 0;

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
        description={`${totalClients} ${totalClients === 1 ? "client" : "clients"} total`}
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
      <PreviewOverlay isPreview={isPreview}>
        <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
          <ClientsList
            initialClients={clients}
            initialCounts={counts}
          />
        </div>
      </PreviewOverlay>
    </div>
  );
}
