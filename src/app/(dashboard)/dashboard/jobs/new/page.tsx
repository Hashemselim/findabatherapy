import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCallout } from "@/components/dashboard/ui";
import { JobForm } from "@/components/jobs/job-form";
import { getProfile } from "@/lib/supabase/server";
import { getJobCountAndLimit } from "@/lib/actions/jobs";
import { getLocations } from "@/lib/actions/locations";

export default async function NewJobPage() {
  const profile = await getProfile();

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_completed_at) {
    redirect("/dashboard/onboarding");
  }

  const [limitsResult, locationsResult] = await Promise.all([
    getJobCountAndLimit(),
    getLocations(),
  ]);

  const effectivePlanTier = profile.plan_tier !== "free" &&
    (profile.subscription_status === "active" || profile.subscription_status === "trialing")
    ? profile.plan_tier
    : "free";
  const limits = limitsResult.success && limitsResult.data
    ? limitsResult.data
    : { count: 0, limit: effectivePlanTier === "free" ? 0 : 10, canCreate: effectivePlanTier !== "free" };
  const locations = locationsResult.success && locationsResult.data
    ? locationsResult.data.map((loc) => ({
        id: loc.id,
        city: loc.city,
        state: loc.state,
        label: loc.label || undefined,
      }))
    : [];

  // If at limit, show upgrade prompt
  if (!limits?.canCreate) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <DashboardCallout
          title="Job Limit Reached"
          description={
            effectivePlanTier === "free"
              ? "Preview accounts cannot post real jobs. Go Live to publish jobs on FindABAJobs.org."
              : `You've used ${limits.count} of ${limits.limit} job postings. Add more capacity from billing to publish another one.`
          }
          icon={Sparkles}
          tone="warning"
          action={(
            <Button asChild>
              <Link href="/dashboard/billing">
                {effectivePlanTier === "free" ? "Go Live" : "Manage Billing"}
              </Link>
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <DashboardPageHeader
        title="New Job Posting"
        description="Create a new job listing on findabajobs.org"
      />

      <JobForm locations={locations} mode="create" />
    </div>
  );
}
