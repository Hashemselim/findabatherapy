import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <CardTitle>Job Limit Reached</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              You&apos;ve reached the maximum number of job postings for your plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-800">
              {effectivePlanTier === "free"
                ? "Preview accounts cannot post real jobs. Go Live to publish jobs on GoodABA Jobs."
                : `You&apos;ve used ${limits.count} of ${limits.limit} job postings. Add more capacity from billing to publish another one.`}
            </p>
            <Button asChild>
              <Link href="/dashboard/billing">
                {effectivePlanTier === "free" ? "Go Live" : "Manage Billing"}
              </Link>
            </Button>
          </CardContent>
        </Card>
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
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">New Job Posting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new job listing on GoodABA Jobs
          </p>
        </div>
      </div>

      <JobForm locations={locations} mode="create" />
    </div>
  );
}
