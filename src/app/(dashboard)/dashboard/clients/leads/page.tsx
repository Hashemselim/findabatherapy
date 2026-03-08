import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { getClients } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_LEADS } from "@/lib/demo/data";
import { ClientsList } from "@/components/dashboard/clients";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";

export const metadata = {
  title: "Leads | Dashboard",
  description: "Manage incoming leads from contact and intake forms",
};

export default async function LeadsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  // Fetch only leads: inquiry + intake_pending statuses (skip for free users)
  const result = isPreview ? null : await getClients({ status: ["inquiry", "intake_pending"] });

  if (!isPreview && result && !result.success) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Leads" description="Contacts and intake form submissions waiting to be reviewed." />
        <DashboardCard className="p-5 sm:p-6">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-medium text-muted-foreground">
                Failed to load leads
              </h2>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    );
  }

  const successData = result && result.success ? result.data : null;
  const leads = isPreview ? DEMO_LEADS : (successData?.clients || []);
  const leadCounts = isPreview
    ? {
        total: DEMO_LEADS.length,
        inquiry: DEMO_LEADS.filter((l) => l.status === "inquiry").length,
        intake_pending: DEMO_LEADS.filter((l) => l.status === "intake_pending").length,
        waitlist: 0, assessment: 0, active: 0, on_hold: 0, discharged: 0,
      }
    : (successData?.counts || {
        total: 0, inquiry: 0, intake_pending: 0, waitlist: 0,
        assessment: 0, active: 0, on_hold: 0, discharged: 0,
      });

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="These are example lead submissions. Go Live to start receiving real inquiries from your forms."
          variant="inline"
          triggerFeature="leads"
        />
      )}
      <DashboardPageHeader title="Leads" description="Contacts and intake form submissions waiting to be reviewed.">
        {isPreview ? (
          <LockedButton label="Add Lead" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/clients/new">
              <Plus className="h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        )}
      </DashboardPageHeader>
      <PreviewOverlay isPreview={isPreview}>
        <DashboardCard className="p-5 sm:p-6">
          <ClientsList
            initialClients={leads}
            initialCounts={leadCounts}
          />
        </DashboardCard>
      </PreviewOverlay>
    </div>
  );
}
