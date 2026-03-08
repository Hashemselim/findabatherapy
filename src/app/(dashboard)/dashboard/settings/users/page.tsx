import { redirect } from "next/navigation";
import { AlertCircle, Users } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { WorkspaceUsersManager } from "@/components/dashboard/workspace-users-manager";
import { DashboardCallout, DashboardCard } from "@/components/dashboard/ui";
import { CardContent } from "@/components/ui/card";
import { getCurrentMembership, getUser } from "@/lib/supabase/server";
import { getWorkspaceUsers } from "@/lib/actions/workspace-users";

export default async function WorkspaceUsersPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    redirect("/auth/sign-in");
  }

  const result = await getWorkspaceUsers();
  if (!result.success || !result.data) {
    return (
      <div className="space-y-4">
        <DashboardPageHeader
          title="Users"
          description="Manage shared account users and available seats."
        />
        <DashboardCallout
          tone="danger"
          icon={AlertCircle}
          title="Unable to load workspace users"
          description={result.success ? "Please try again." : result.error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Users"
        description="Manage shared account access, invitations, and user seats."
      />

      {membership.role === "member" && (
        <DashboardCallout
          tone="default"
          icon={Users}
          title="Read-only access"
          description="Only owners and admins can manage workspace users. You can still see who has account access."
        />
      )}

      <WorkspaceUsersManager data={result.data} />

      <DashboardCard>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Billing for user seats is managed on the Plan & Billing page by the workspace owner.
        </CardContent>
      </DashboardCard>
    </div>
  );
}
