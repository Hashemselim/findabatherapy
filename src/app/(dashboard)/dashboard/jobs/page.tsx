import Link from "next/link";
import { Plus, ClipboardList, ArrowRight, Briefcase, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCallout, DashboardEmptyState } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { LockedButton } from "@/components/ui/preview-banner";
import { JobList } from "@/components/jobs/job-list";
import { getProfile } from "@/lib/platform/workspace/server";
import { getJobPostings, getJobCountAndLimit } from "@/lib/actions/jobs";
import { DEMO_JOBS } from "@/lib/demo/data";

export default async function JobsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Job Postings" description="Create and manage job listings to attract qualified ABA professionals." />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Onboarding to Post Jobs"
          description="Finish setting up your practice profile to start posting jobs."
          benefits={["Post job listings", "Receive applications", "Track candidates"]}
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

  // Determine effective plan tier
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectivePlanTier = (profile.plan_tier !== "free" && isActiveSubscription)
    ? profile.plan_tier
    : "free";
  const isPreview = effectivePlanTier === "free";

  // Fetch jobs and limits (skip for free users)
  let jobs = isPreview ? DEMO_JOBS : [];
  let limits = { count: isPreview ? DEMO_JOBS.length : 0, limit: isPreview ? 10 : 1, canCreate: !isPreview };

  if (!isPreview) {
    const [jobsResult, limitsResult] = await Promise.all([
      getJobPostings(),
      getJobCountAndLimit(),
    ]);
    jobs = jobsResult.success ? jobsResult.data || [] : [];
    limits = limitsResult.success && limitsResult.data ? limitsResult.data : { count: 0, limit: 1, canCreate: true };
  }

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="GoodABA Jobs is included with Pro. Go Live to post real jobs and recruit BCBAs and RBTs."
          variant="inline"
          triggerFeature="jobs"
        />
      )}

      {/* Page Header */}
      <DashboardPageHeader title="Job Postings" description="Create and manage job listings on GoodABA Jobs.">
        {isPreview ? (
          <LockedButton label="New Job" />
        ) : limits?.canCreate ? (
          <Button asChild className="w-full rounded-full sm:w-auto">
            <Link href="/dashboard/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Link>
          </Button>
        ) : null}
      </DashboardPageHeader>

      <PreviewOverlay isPreview={isPreview}>
      {/* Job Limit Info Card */}
      <DashboardCallout
        tone="info"
        icon={Briefcase}
        title={
          limits?.limit === 999
            ? `${limits?.count || 0} job posting${(limits?.count || 0) !== 1 ? "s" : ""}`
            : `${limits?.count || 0} of ${limits?.limit || 1} job posting${(limits?.limit || 1) !== 1 ? "s" : ""} used`
        }
        description={
          effectivePlanTier === "pro"
            ? `Pro plan includes up to ${limits?.limit || 10} job postings${(limits?.limit || 10) > 10 ? " with add-ons applied" : ""}`
            : "Preview mode includes demo jobs only. Go Live to publish real jobs."
        }
        action={!limits?.canCreate ? (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/dashboard/billing">
              <Sparkles className="mr-2 h-4 w-4" />
              {effectivePlanTier === "pro" ? "Add Capacity" : "Go Live"}
            </Link>
          </Button>
        ) : undefined}
      />
      </PreviewOverlay>

      {/* Jobs List */}
      <PreviewOverlay isPreview={isPreview} showLabel={false}>
      {!isPreview && jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No job postings yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first job posting to start attracting qualified ABA professionals.
            </p>
            {limits?.canCreate && (
              <Button asChild className="mt-6">
                <Link href="/dashboard/jobs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job Posting
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <JobList jobs={jobs} />
      )}
      </PreviewOverlay>
    </div>
  );
}
