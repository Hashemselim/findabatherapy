import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getClients } from "@/lib/actions/clients";
import { ClientsList } from "@/components/dashboard/clients";

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
    );
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contacts and intake form submissions waiting to be reviewed.
        </p>
      </div>

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
  );
}
