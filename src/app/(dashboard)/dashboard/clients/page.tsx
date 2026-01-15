import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getClients } from "@/lib/actions/clients";
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

  // Fetch initial clients data
  const result = await getClients();

  if (!result.success) {
    return (
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
    );
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
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
