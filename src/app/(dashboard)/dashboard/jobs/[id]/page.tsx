import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  CheckCircle,
  Globe,
  Users,
  Building2,
  CalendarDays,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { getProfile } from "@/lib/supabase/server";
import { getJobPosting } from "@/lib/actions/jobs";
import {
  POSITION_TYPES,
  EMPLOYMENT_TYPES,
  BENEFITS_OPTIONS,
  JOB_THERAPY_SETTINGS,
  JOB_SCHEDULE_TYPES,
  JOB_AGE_GROUPS,
} from "@/lib/validations/jobs";

interface JobViewPageProps {
  params: Promise<{ id: string }>;
}

function formatSalary(job: {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: "hourly" | "annual" | null;
}): string | null {
  if (!job.salaryMin) return null;

  const formatNumber = (n: number) => {
    if (job.salaryType === "annual") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);
  };

  const suffix = job.salaryType === "hourly" ? "/hour" : "/year";

  if (job.salaryMax && job.salaryMax > job.salaryMin) {
    return `${formatNumber(job.salaryMin)} - ${formatNumber(job.salaryMax)}${suffix}`;
  }

  return `${formatNumber(job.salaryMin)}${suffix}`;
}

export default async function JobViewPage({ params }: JobViewPageProps) {
  const { id } = await params;
  const profile = await getProfile();

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_completed_at) {
    redirect("/dashboard/onboarding");
  }

  const jobResult = await getJobPosting(id);

  if (!jobResult.success || !jobResult.data) {
    notFound();
  }

  const job = jobResult.data;
  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;
  const employmentLabels = job.employmentTypes
    .map((v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v);
  const benefitLabels = (job.benefits || [])
    .map((v) => BENEFITS_OPTIONS.find((b) => b.value === v)?.label || v);
  const therapySettingLabels = (job.therapySettings || [])
    .map((v) => JOB_THERAPY_SETTINGS.find((s) => s.value === v)?.label || v);
  const scheduleTypeLabels = (job.scheduleTypes || [])
    .map((v) => JOB_SCHEDULE_TYPES.find((s) => s.value === v)?.label || v);
  const ageGroupLabels = (job.ageGroups || [])
    .map((v) => JOB_AGE_GROUPS.find((a) => a.value === v)?.label || v);

  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : null;

  const salary = formatSalary(job);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="mt-1">
            <Link href="/dashboard/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{job.title}</h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {positionLabel} {location && `in ${location}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.status === "published" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/job/${job.slug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/dashboard/jobs/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Job
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {location && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </span>
                )}
                {job.remoteOption && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Globe className="h-4 w-4" />
                    Remote Available
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {job.publishedAt
                    ? `Published ${formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true })}`
                    : `Created ${formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}`}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {job.applicationCount} application{job.applicationCount !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-[#5788FF]/10 text-[#5788FF]">
                  <Briefcase className="mr-1 h-3 w-3" />
                  {positionLabel}
                </Badge>
                {employmentLabels.map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>

              {salary && (
                <div className="mt-4 flex items-center gap-2 text-lg font-semibold text-[#5788FF]">
                  <DollarSign className="h-5 w-5" />
                  {salary}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                {job.description ? (
                  <div className="whitespace-pre-wrap text-foreground">{job.description}</div>
                ) : (
                  <p className="text-muted-foreground italic">
                    No description provided yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-foreground">{job.requirements}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {benefitLabels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {benefitLabels.map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-[#5788FF]" />
                      {label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className={job.status === "published" ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${job.status === "published" ? "bg-green-100" : "bg-amber-100"}`}>
                  {job.status === "published" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Pencil className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${job.status === "published" ? "text-green-900" : "text-amber-900"}`}>
                    {job.status === "published" ? "Live on Job Board" : "Draft"}
                  </p>
                  <p className={`text-sm ${job.status === "published" ? "text-green-700" : "text-amber-700"}`}>
                    {job.status === "published"
                      ? "Candidates can view and apply"
                      : "Not visible to candidates"}
                  </p>
                </div>
              </div>
              {job.status === "draft" && (
                <Button asChild className="mt-4 w-full">
                  <Link href={`/dashboard/jobs/${id}/edit`}>
                    Finish & Publish
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Job Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Position Type</dt>
                  <dd className="font-medium">{positionLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Employment</dt>
                  <dd className="font-medium text-right">{employmentLabels.join(", ") || "Not specified"}</dd>
                </div>
                {location && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="font-medium">{location}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Remote</dt>
                  <dd className={`font-medium ${job.remoteOption ? "text-blue-600" : ""}`}>
                    {job.remoteOption ? "Available" : "No"}
                  </dd>
                </div>
                {salary && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Salary</dt>
                    <dd className="font-medium text-[#5788FF]">{salary}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Applications</dt>
                  <dd className="font-medium">{job.applicationCount}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </dd>
                </div>
                {job.publishedAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Published</dt>
                    <dd className="font-medium">
                      {formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true })}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Job Attributes */}
          {(therapySettingLabels.length > 0 || scheduleTypeLabels.length > 0 || ageGroupLabels.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {therapySettingLabels.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Work Settings
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {therapySettingLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleTypeLabels.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Schedule
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {scheduleTypeLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {ageGroupLabels.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Age Groups
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ageGroupLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
