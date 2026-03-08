import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ApplicationsInbox } from "@/components/dashboard/jobs";
import { getTeamPageData } from "@/components/dashboard/team/team-page-data";
import { DashboardEmptyState } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";

export default async function ApplicantsPage() {
  const {
    onboardingComplete,
    isPreview,
    applications,
    newApplicantCount,
    jobs,
  } = await getTeamPageData();

  if (!onboardingComplete) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Applicants"
          description="Review job applicants and move candidates through your hiring process."
        />
        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Access Applicants"
          description="Finish setting up your practice profile to unlock hiring and applicant tracking."
          tone="success"
          benefits={["Review applicants", "Track hiring stages", "Coordinate interviews"]}
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
          message="Applicant tracking is included with Pro. Go Live to review real job applications."
          variant="inline"
          triggerFeature="jobs"
        />
      )}

      <DashboardPageHeader
        title="Applicants"
        description="Review candidates, update statuses, and move hiring forward."
      >
        <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
          <Link href="/dashboard/team/jobs">
            View Jobs
          </Link>
        </Button>
      </DashboardPageHeader>

      <PreviewOverlay isPreview={isPreview}>
        <ApplicationsInbox
          initialApplications={applications}
          initialNewCount={newApplicantCount}
          jobs={jobs.map((job) => ({ id: job.id, title: job.title }))}
        />
      </PreviewOverlay>
    </div>
  );
}
