import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getProfile } from "@/lib/supabase/server";
import { getApplications, type ApplicationSummary } from "@/lib/actions/applications";
import { getJobPostings, type JobPostingSummary } from "@/lib/actions/jobs";
import { getTeamMembers } from "@/lib/actions/team";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_EMPLOYEES } from "@/lib/demo/data";
import { ApplicationsInbox } from "@/components/dashboard/jobs";
import { TeamMembersList } from "@/components/dashboard/team/team-members-list";


export default async function EmployeesPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Employees" description="Manage job applicants and team members." />
        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Employees"
          description="Finish setting up your practice profile to unlock all dashboard features."
          tone="success"
          benefits={["View applicants", "Track hiring", "Manage team"]}
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

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  // Fetch applications, jobs, and team members in parallel (skip for free users)
  let applications: ApplicationSummary[] = [];
  let newCount = 0;
  let jobs: JobPostingSummary[] = [];
  let teamMembers = isPreview ? DEMO_EMPLOYEES : [];
  let teamGated = false;

  if (!isPreview) {
    const [applicationsResult, jobsResult, teamResult] = await Promise.all([
      getApplications(),
      getJobPostings(),
      getTeamMembers(),
    ]);
    applications = applicationsResult.success ? applicationsResult.data?.applications || [] : [];
    newCount = applicationsResult.success ? applicationsResult.data?.newCount || 0 : 0;
    jobs = jobsResult.success ? jobsResult.data || [] : [];
    teamMembers = teamResult.success ? teamResult.data || [] : [];
    teamGated = !teamResult.success;
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

      {/* Page Header */}
      <DashboardPageHeader title="Employees" description="Manage job applicants and team members.">
        <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
          <Link href="/dashboard/jobs">
            View Job Postings
          </Link>
        </Button>
      </DashboardPageHeader>

      {/* Tabs for Applicants and Team */}
        <PreviewOverlay isPreview={isPreview}>
      <Tabs defaultValue={isPreview ? "team" : "applicants"} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="inline-flex min-h-11 w-fit items-center rounded-xl border border-border/60 bg-card p-1 shadow-xs">
          <TabsTrigger
            value="applicants"
            className="flex h-9 items-center rounded-lg border border-transparent px-4 text-xs font-medium leading-none text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            Applicants
            {newCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex h-9 items-center rounded-lg border border-transparent px-4 text-xs font-medium leading-none text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
          >
            Team
            {teamMembers.length > 0 && (
              <DashboardStatusBadge tone="info" className="h-5 min-w-5 justify-center px-1.5 py-0 text-[10px]">
                {teamMembers.length}
              </DashboardStatusBadge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applicants" className="flex min-h-0 flex-1 flex-col mt-4">
          <Suspense
            fallback={
              <div className="flex min-h-0 flex-1 gap-4">
                <Card className="w-[350px] shrink-0 animate-pulse lg:block hidden">
                  <CardContent className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 rounded bg-muted" />
                          <div className="h-3 w-1/2 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="flex-1 animate-pulse">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-5 w-40 rounded bg-muted" />
                        <div className="h-4 w-32 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-20 rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            }
          >
            <ApplicationsInbox
              initialApplications={applications}
              initialNewCount={newCount}
              jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          {!isPreview && teamGated ? (
            <Card className="py-12 text-center">
              <CardContent>
                <p className="text-muted-foreground">Team management is not available.</p>
              </CardContent>
            </Card>
          ) : (
            <TeamMembersList initialMembers={teamMembers} />
          )}
        </TabsContent>
      </Tabs>
      </PreviewOverlay>
    </div>
  );
}
