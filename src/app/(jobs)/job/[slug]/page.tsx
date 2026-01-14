import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  CheckCircle,
  Globe,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getPublishedJobBySlug } from "@/lib/queries/jobs";
import { POSITION_TYPES, EMPLOYMENT_TYPES, BENEFITS_OPTIONS } from "@/lib/validations/jobs";
import { generateJobPostingSchema, generateJobBreadcrumbSchema } from "@/lib/seo/job-schemas";
import { JsonLd } from "@/components/seo/json-ld";
import { jobsConfig } from "@/config/jobs";
import { ApplyButton } from "@/components/jobs/apply-button";
import { JobViewTracker } from "@/components/jobs/job-view-tracker";

interface JobPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);

  if (!job) {
    return {
      title: "Job Not Found | Find ABA Jobs",
    };
  }

  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
    ? "Remote"
    : "";

  const title = `${job.title} at ${job.provider.agencyName}${location ? ` - ${location}` : ""} | ${jobsConfig.name}`;
  const description = job.description?.slice(0, 160) ||
    `${positionLabel} position at ${job.provider.agencyName}. Apply now on Find ABA Jobs.`;

  // Build OG image URL with job details
  const ogTitle = `${job.title} at ${job.provider.agencyName}`;
  const ogSubtitle = location ? `${positionLabel} • ${location}` : positionLabel;
  const ogParams = new URLSearchParams({
    brand: "jobs",
    type: "job",
    title: ogTitle,
    subtitle: ogSubtitle,
  });
  if (job.provider.logoUrl) {
    ogParams.set("logo", job.provider.logoUrl);
  }
  const ogImageUrl = `https://www.findabajobs.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImageUrl],
    },
  };
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

function getTimeAgo(date: string): string {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default async function JobPage({ params }: JobPageProps) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;
  const employmentLabels = job.employmentTypes
    .map((v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v);
  const benefitLabels = job.benefits
    .map((v) => BENEFITS_OPTIONS.find((b) => b.value === v)?.label || v);

  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : null;

  const salary = formatSalary(job);

  return (
    <>
      <JsonLd
        data={[
          generateJobPostingSchema(job),
          generateJobBreadcrumbSchema(job),
        ]}
      />

      {/* Client-side view tracking - only fires for real users, not bots */}
      <JobViewTracker
        jobId={job.id}
        jobSlug={job.slug}
        profileId={job.provider.id}
        positionType={job.positionType}
        companyName={job.provider.agencyName}
      />

      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50/50">
        {/* Header */}
        <div className="border-b border-border/60 bg-white">
          <div className="container mx-auto px-4 py-6 sm:px-6">
            <Link
              href="/jobs/search"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header */}
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <Avatar className="h-16 w-16 border-2 border-border/60 sm:h-20 sm:w-20">
                      {job.provider.logoUrl ? (
                        <AvatarImage src={job.provider.logoUrl} alt={job.provider.agencyName} />
                      ) : null}
                      <AvatarFallback className="bg-emerald-50 text-xl font-semibold text-emerald-700">
                        {job.provider.agencyName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                          {job.title}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
                          <Link
                            href={`/employers/${job.provider.slug}`}
                            className="flex items-center gap-1 transition hover:text-emerald-600"
                          >
                            <Building2 className="h-4 w-4" />
                            {job.provider.agencyName}
                          </Link>
                          {job.provider.isVerified && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>

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
                          Posted {getTimeAgo(job.publishedAt)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
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
                        <div className="flex items-center gap-2 text-lg font-semibold text-emerald-600">
                          <DollarSign className="h-5 w-5" />
                          {salary}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                    <ApplyButton
                      jobId={job.id}
                      jobTitle={job.title}
                      providerName={job.provider.agencyName}
                      className="!h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none sm:px-12 rounded-md"
                    />
                    <Button variant="outline" className="!h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium rounded-md" asChild>
                      <Link
                        href={`/employers/${job.provider.slug}`}
                        className="gap-2"
                      >
                        View Company
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
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
                      <div className="whitespace-pre-wrap">{job.description}</div>
                    ) : (
                      <p className="text-muted-foreground">
                        No description provided. Contact the employer for more details.
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
                      <div className="whitespace-pre-wrap">{job.requirements}</div>
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
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
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
              {/* Apply Card */}
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold">Ready to apply?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Submit your application directly through our platform.
                  </p>
                  <ApplyButton
                    jobId={job.id}
                    jobTitle={job.title}
                    providerName={job.provider.agencyName}
                    className="mt-4 w-full !h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-md"
                  />
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">About the Company</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-border/60">
                      {job.provider.logoUrl ? (
                        <AvatarImage src={job.provider.logoUrl} alt={job.provider.agencyName} />
                      ) : null}
                      <AvatarFallback className="bg-emerald-50 font-semibold text-emerald-700">
                        {job.provider.agencyName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{job.provider.agencyName}</p>
                      {job.provider.isVerified && (
                        <Badge variant="secondary" className="mt-1 bg-emerald-100 text-emerald-700 text-xs">
                          Verified Employer
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/employers/${job.provider.slug}`}>
                      View Company Profile
                    </Link>
                  </Button>
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
                      <dd className="font-medium">{employmentLabels.join(", ")}</dd>
                    </div>
                    {location && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Location</dt>
                        <dd className="font-medium">{location}</dd>
                      </div>
                    )}
                    {job.remoteOption && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Remote</dt>
                        <dd className="font-medium text-blue-600">Available</dd>
                      </div>
                    )}
                    {salary && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Salary</dt>
                        <dd className="font-medium text-emerald-600">{salary}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Posted</dt>
                      <dd className="font-medium">{getTimeAgo(job.publishedAt)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
