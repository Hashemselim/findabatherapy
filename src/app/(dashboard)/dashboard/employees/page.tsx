import Link from "next/link";
import { ArrowRight, ClipboardList, Plus } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { TeamMembersList } from "@/components/dashboard/team/team-members-list";
import { getTeamPageData } from "@/components/dashboard/team/team-page-data";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { Card, CardContent } from "@/components/ui/card";

export default async function EmployeesPage() {
  const {
    onboardingComplete,
    isPreview,
    teamMembers,
    teamGated,
  } = await getTeamPageData();

  if (!onboardingComplete) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Employees"
          description="Manage team members, credentials, and internal records."
        />
        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Employees"
          description="Finish setting up your practice profile to unlock all dashboard features."
          tone="success"
          benefits={["Manage employees", "Track credentials", "Organize team records"]}
          action={(
            <Button asChild size="lg">
              <Link href="/dashboard/onboarding" className="gap-2">
                Continue Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="This is a preview of team management with example employees. Go Live to manage your real team."
          variant="inline"
          triggerFeature="employees"
        />
      )}

      <DashboardPageHeader
        title="Employees"
        description="Manage team members, credentials, and internal records."
      >
        <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
          <Link href="/dashboard/team/employees?new=1">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
      </DashboardPageHeader>

      <PreviewOverlay isPreview={isPreview}>
        {!isPreview && teamGated ? (
          <Card className="py-12 text-center">
            <CardContent>
              <p className="text-muted-foreground">Team management is not available.</p>
            </CardContent>
          </Card>
        ) : (
          <TeamMembersList initialMembers={teamMembers} />
        )}
      </PreviewOverlay>
    </div>
  );
}
