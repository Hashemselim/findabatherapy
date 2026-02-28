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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApplyButton } from "@/components/jobs/apply-button";
import { getProviderWebsiteData } from "@/lib/actions/provider-website";
import { getPublishedJobBySlug } from "@/lib/queries/jobs";
import {
  POSITION_TYPES,
  EMPLOYMENT_TYPES,
  BENEFITS_OPTIONS,
} from "@/lib/validations/jobs";

type JobDetailPageProps = {
  params: Promise<{ slug: string; jobSlug: string }>;
};

export const revalidate = 300;

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

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { slug, jobSlug } = await params;
  const [providerResult, job] = await Promise.all([
    getProviderWebsiteData(slug),
    getPublishedJobBySlug(jobSlug),
  ]);

  if (!providerResult.success || !job) {
    return { title: "Job Not Found" };
  }

  if (job.provider.slug !== slug) {
    return { title: "Job Not Found" };
  }

  const positionLabel =
    POSITION_TYPES.find((p) => p.value === job.positionType)?.label ||
    job.positionType;
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
      ? "Remote"
      : "";

  return {
    title: `${job.title}${location ? ` - ${location}` : ""}`,
    description:
      job.description?.slice(0, 160) ||
      `${positionLabel} position at ${providerResult.data.profile.agencyName}. Apply now!`,
  };
}

export default async function WebsiteJobDetailPage({
  params,
}: JobDetailPageProps) {
  const { slug, jobSlug } = await params;
  const [providerResult, job] = await Promise.all([
    getProviderWebsiteData(slug),
    getPublishedJobBySlug(jobSlug),
  ]);

  if (!providerResult.success || !job) {
    notFound();
  }

  if (job.provider.slug !== slug) {
    notFound();
  }

  const provider = providerResult.data;
  const brandColor = provider.profile.intakeFormSettings.background_color;

  const positionLabel =
    POSITION_TYPES.find((p) => p.value === job.positionType)?.label ||
    job.positionType;
  const employmentLabels = job.employmentTypes.map(
    (v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v
  );
  const benefitLabels = job.benefits.map(
    (v) => BENEFITS_OPTIONS.find((b) => b.value === v)?.label || v
  );

  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : null;
  const salary = formatSalary(job);

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <Link
          href={`/site/${slug}/careers`}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: brandColor }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all positions
        </Link>

        {/* Job Header Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div
            className="px-6 py-6 sm:px-8"
            style={{
              background: `linear-gradient(135deg, ${brandColor}12, ${brandColor}06)`,
            }}
          >
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {job.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {provider.profile.agencyName}
              </span>
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              )}
              {job.remoteOption && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Globe className="h-4 w-4" />
                  Remote Available
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Posted {getTimeAgo(job.publishedAt)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                className="border-0"
                style={{
                  backgroundColor: `${brandColor}15`,
                  color: brandColor,
                }}
              >
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
              <div
                className="mt-4 flex items-center gap-2 text-lg font-semibold"
                style={{ color: brandColor }}
              >
                <DollarSign className="h-5 w-5" />
                {salary}
              </div>
            )}
          </div>

          <Separator />

          <div className="px-6 py-4 sm:px-8">
            <ApplyButton
              jobId={job.id}
              jobTitle={job.title}
              providerName={provider.profile.agencyName}
              className="rounded-xl px-8 py-3 text-base font-semibold"
              style={{
                backgroundColor: brandColor,
                color: "#FFFFFF",
              }}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Description */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Job Description
              </h2>
              {job.description ? (
                <div className="whitespace-pre-wrap leading-relaxed text-gray-600">
                  {job.description}
                </div>
              ) : (
                <p className="text-gray-500">
                  No description provided. Contact the employer for more
                  details.
                </p>
              )}
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Requirements
                </h2>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-600">
                  {job.requirements}
                </div>
              </div>
            )}

            {/* Benefits */}
            {benefitLabels.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  Benefits
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {benefitLabels.map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 text-sm text-gray-700"
                    >
                      <CheckCircle
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: brandColor }}
                      />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card
              className="border"
              style={{
                borderColor: `${brandColor}30`,
                backgroundColor: `${brandColor}05`,
              }}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ready to apply?
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Submit your application directly to{" "}
                  {provider.profile.agencyName}.
                </p>
                <ApplyButton
                  jobId={job.id}
                  jobTitle={job.title}
                  providerName={provider.profile.agencyName}
                  className="mt-4 w-full rounded-xl py-3 font-semibold"
                  style={{
                    backgroundColor: brandColor,
                    color: "#FFFFFF",
                  }}
                />
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
                    <dt className="text-gray-500">Position Type</dt>
                    <dd className="font-medium text-gray-900">
                      {positionLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Employment</dt>
                    <dd className="font-medium text-gray-900">
                      {employmentLabels.join(", ")}
                    </dd>
                  </div>
                  {location && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Location</dt>
                      <dd className="font-medium text-gray-900">{location}</dd>
                    </div>
                  )}
                  {job.remoteOption && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Remote</dt>
                      <dd className="font-medium text-blue-600">Available</dd>
                    </div>
                  )}
                  {salary && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Salary</dt>
                      <dd className="font-medium" style={{ color: brandColor }}>
                        {salary}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Posted</dt>
                    <dd className="font-medium text-gray-900">
                      {getTimeAgo(job.publishedAt)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
