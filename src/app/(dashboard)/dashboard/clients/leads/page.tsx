import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getClients } from "@/lib/actions/clients";
import { ClientsList } from "@/components/dashboard/clients";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export const metadata = {
  title: "Leads | Dashboard",
  description: "Manage incoming leads from contact and intake forms",
};

export default async function LeadsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Fetch only leads: inquiry + intake_pending statuses
  const result = await getClients({ status: ["inquiry", "intake_pending"] });

  if (!result.success) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Leads" description="Contacts and intake form submissions waiting to be reviewed." />
        <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Leads" description="Contacts and intake form submissions waiting to be reviewed." />
      <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
        <ClientsList
          initialClients={result.data?.clients || []}
          initialCounts={result.data?.counts || {
            total: 0,
            inquiry: 0,
            intake_pending: 0,
            waitlist: 0,
            assessment: 0,
            active: 0,
            on_hold: 0,
            discharged: 0,
          }}
        />
      </div>
    </div>
  );
}
