import Link from "next/link";
import { Plus, ClipboardList, ArrowRight, CheckCircle2, Briefcase, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { JobList } from "@/components/jobs/job-list";
import { getProfile } from "@/lib/supabase/server";
import { getJobPostings, getJobCountAndLimit } from "@/lib/actions/jobs";

export default async function JobsPage() {
  const profile = await getProfile();

  // If onboarding is not complete, show the gate message
  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Job Postings" description="Create and manage job listings to attract qualified ABA professionals." />

        <Card className="overflow-hidden border-slate-200">
          <BubbleBackground
            interactive={false}
            size="default"
            className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <CardContent className="flex flex-col items-center py-12 px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>

              <p className="text-xl font-semibold text-slate-900">
                Complete Onboarding to Post Jobs
              </p>

              <p className="mt-3 max-w-md text-sm text-slate-600">
                Finish setting up your practice profile to start posting jobs.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {["Post job listings", "Receive applications", "Track candidates"].map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5788FF]" />
                    {benefit}
                  </span>
                ))}
              </div>

              <Button asChild size="lg" className="mt-8">
                <Link href="/dashboard/onboarding" className="gap-2">
                  Continue Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </BubbleBackground>
        </Card>
      </div>
    );
  }

  // Fetch jobs and limits
  const [jobsResult, limitsResult] = await Promise.all([
    getJobPostings(),
    getJobCountAndLimit(),
  ]);

  const jobs = jobsResult.success ? jobsResult.data || [] : [];
  const limits = limitsResult.success ? limitsResult.data : { count: 0, limit: 1, canCreate: true };

  // Determine effective plan tier
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectivePlanTier = (profile.plan_tier !== "free" && isActiveSubscription)
    ? profile.plan_tier
    : "free";

  return (
    <div className="space-y-3">
      {/* Page Header */}
      <DashboardPageHeader title="Job Postings" description="Create and manage job listings on findabajobs.org.">
        {limits?.canCreate && (
          <Button asChild className="w-full rounded-full sm:w-auto">
            <Link href="/dashboard/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      {/* Job Limit Info Card */}
      <Card className="border-[#5788FF]/30 bg-[#5788FF]/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-[#5788FF]" />
            <div>
              <p className="font-medium text-foreground">
                {limits?.limit === 999
                  ? `${limits?.count || 0} job posting${(limits?.count || 0) !== 1 ? "s" : ""}`
                  : `${limits?.count || 0} of ${limits?.limit || 1} job posting${(limits?.limit || 1) !== 1 ? "s" : ""} used`}
              </p>
              <p className="text-sm text-muted-foreground">
                {effectivePlanTier === "enterprise"
                  ? "Enterprise plan includes unlimited job postings"
                  : effectivePlanTier === "pro"
                    ? "Pro plan includes up to 5 job postings"
                    : "Free plan includes 1 job posting"}
              </p>
            </div>
          </div>
          {!limits?.canCreate && effectivePlanTier !== "enterprise" && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/dashboard/billing">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Jobs List */}
      {jobs.length === 0 ? (
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

      {/* Upgrade CTA for Free Users */}
      {effectivePlanTier === "free" && jobs.length > 0 && (
        <Card className="border-[#FEE720] bg-gradient-to-r from-[#FFF5C2]/50 to-[#FFF5C2]/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 fill-[#5788FF] text-[#5788FF]" />
              <CardTitle className="text-lg">Need to post more jobs?</CardTitle>
            </div>
            <CardDescription>
              Upgrade to Pro to post up to 5 jobs, or Enterprise for unlimited postings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/dashboard/billing">
                View Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
