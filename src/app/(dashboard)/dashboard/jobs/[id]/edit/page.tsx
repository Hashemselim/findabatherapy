import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/jobs/job-form";
import { getProfile } from "@/lib/supabase/server";
import { getJobPosting } from "@/lib/actions/jobs";
import { getLocations } from "@/lib/actions/locations";

interface JobEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobEditPage({ params }: JobEditPageProps) {
  const { id } = await params;
  const profile = await getProfile();

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_completed_at) {
    redirect("/dashboard/onboarding");
  }

  const [jobResult, locationsResult] = await Promise.all([
    getJobPosting(id),
    getLocations(),
  ]);

  if (!jobResult.success || !jobResult.data) {
    notFound();
  }

  const job = jobResult.data;
  const locations = locationsResult.success && locationsResult.data
    ? locationsResult.data.map((loc) => ({
        id: loc.id,
        city: loc.city,
        state: loc.state,
        label: loc.label || undefined,
      }))
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/jobs/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Edit Job</h1>
            <p className="mt-1 text-sm text-muted-foreground">{job.title}</p>
          </div>
        </div>

        {job.status === "published" && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/job/${job.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live
            </Link>
          </Button>
        )}
      </div>

      <JobForm locations={locations} initialData={job} mode="edit" />
    </div>
  );
}
