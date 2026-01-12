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
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ApplyButton } from "@/components/jobs/apply-button";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedJobBySlug } from "@/lib/queries/jobs";
import { createAdminClient } from "@/lib/supabase/server";
import { POSITION_TYPES, EMPLOYMENT_TYPES, BENEFITS_OPTIONS } from "@/lib/validations/jobs";
import { generateJobPostingSchema } from "@/lib/seo/job-schemas";
import type { PlanTier } from "@/lib/plans/features";

interface BrandedJobPageProps {
  params: Promise<{ slug: string; jobSlug: string }>;
}

interface ProviderProfile {
  id: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  website: string | null;
  planTier: PlanTier;
  isVerified: boolean;
  careersBrandColor: string;
  careersCtaText: string;
}

async function getProviderBySlug(slug: string): Promise<ProviderProfile | null> {
  const supabase = await createAdminClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      profile_id,
      slug,
      logo_url,
      careers_brand_color,
      careers_cta_text
    `)
    .eq("slug", slug)
    .single();

  if (listingError || !listing) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      agency_name,
      website,
      plan_tier,
      subscription_status
    `)
    .eq("id", listing.profile_id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

  return {
    id: profile.id,
    slug: listing.slug,
    agencyName: profile.agency_name,
    logoUrl: listing.logo_url || null,
    website: profile.website,
    planTier: effectiveTier,
    isVerified: effectiveTier !== "free",
    careersBrandColor: listing.careers_brand_color || "#10B981",
    careersCtaText: listing.careers_cta_text || "Apply Now",
  };
}

export async function generateMetadata({ params }: BrandedJobPageProps): Promise<Metadata> {
  const { slug, jobSlug } = await params;
  const [provider, job] = await Promise.all([
    getProviderBySlug(slug),
    getPublishedJobBySlug(jobSlug),
  ]);

  if (!provider || !job) {
    return {
      title: "Job Not Found",
    };
  }

  if (job.provider.slug !== slug) {
    return {
      title: "Job Not Found",
    };
  }

  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
    ? "Remote"
    : "";

  const title = `${job.title}${location ? ` - ${location}` : ""} | ${provider.agencyName} Careers`;
  const description = job.description?.slice(0, 160) ||
    `${positionLabel} position at ${provider.agencyName}. Apply now!`;

  return {
    title,
    description,
    openGraph: {
      title: job.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: job.title,
      description,
    },
    robots: {
      index: false,
      follow: false,
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

// Helper to calculate contrasting text color
function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export default async function BrandedJobPage({ params }: BrandedJobPageProps) {
  const { slug, jobSlug } = await params;
  const [provider, job] = await Promise.all([
    getProviderBySlug(slug),
    getPublishedJobBySlug(jobSlug),
  ]);

  if (!provider || !job) {
    notFound();
  }

  if (job.provider.slug !== slug) {
    notFound();
  }

  // Free tier gets default emerald color, Pro+ gets custom color
  const isFreeUser = provider.planTier === "free";
  const brandColor = isFreeUser ? "#10B981" : provider.careersBrandColor;
  const contrastColor = getContrastColor(brandColor);

  // Free tier gets default CTA, Pro+ gets custom
  const effectiveCtaText = isFreeUser ? "Apply Now" : provider.careersCtaText;

  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;
  const employmentLabels = job.employmentTypes
    .map((v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v);
  const benefitLabels = job.benefits
    .map((v) => BENEFITS_OPTIONS.find((b) => b.value === v)?.label || v);

  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : null;

  const salary = formatSalary(job);

  const initials = provider.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}bb 100%)`,
      }}
    >
      <JsonLd data={generateJobPostingSchema(job)} />

      {/* Main Content Container */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* White Card Container */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          {/* Header with back navigation */}
          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.08) }}
          >
            <Link
              href={`/careers/${slug}`}
              className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: brandColor }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all positions
            </Link>
          </div>

          {/* Job Header */}
          <div className="px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <Avatar
                className="h-16 w-16 border-2 sm:h-20 sm:w-20"
                style={{ borderColor: brandColor }}
              >
                {provider.logoUrl ? (
                  <AvatarImage src={provider.logoUrl} alt={provider.agencyName} />
                ) : null}
                <AvatarFallback
                  className="text-xl font-semibold"
                  style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                    {job.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {provider.agencyName}
                    </span>
                    {provider.isVerified && (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                      >
                        <BadgeCheck className="mr-1 h-3 w-3" />
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
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: getLighterShade(brandColor, 0.12), color: brandColor }}
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
                  <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: brandColor }}>
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
                providerName={provider.agencyName}
                className="!h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium flex-1 sm:flex-none sm:px-12 rounded-md"
                style={{
                  backgroundColor: brandColor,
                  color: contrastColor,
                }}
              />
              {provider.website && (
                <Button variant="outline" className="!h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium rounded-md" asChild>
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    Visit Website
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Content Grid */}
          <div className="border-t border-border/60 px-6 py-8 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Job Description */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Job Description</h2>
                  <div className="prose prose-slate max-w-none">
                    {job.description ? (
                      <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.description}</div>
                    ) : (
                      <p className="text-muted-foreground">
                        No description provided. Contact the employer for more details.
                      </p>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                {job.requirements && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Requirements</h2>
                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{job.requirements}</div>
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {benefitLabels.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Benefits</h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {benefitLabels.map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle className="h-4 w-4" style={{ color: brandColor }} />
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
                  style={{ borderColor: `${brandColor}40`, backgroundColor: getLighterShade(brandColor, 0.05) }}
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold">Ready to apply?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Submit your application directly to {provider.agencyName}.
                    </p>
                    <ApplyButton
                      jobId={job.id}
                      jobTitle={job.title}
                      providerName={provider.agencyName}
                      className="mt-4 w-full !h-14 !text-lg !font-semibold sm:!h-10 sm:!text-sm sm:!font-medium rounded-md"
                      style={{
                        backgroundColor: brandColor,
                        color: contrastColor,
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
                          <dd className="font-medium" style={{ color: brandColor }}>{salary}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Posted</dt>
                        <dd className="font-medium">{getTimeAgo(job.publishedAt)}</dd>
                      </div>
                    </dl>
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
                        {provider.logoUrl ? (
                          <AvatarImage src={provider.logoUrl} alt={provider.agencyName} />
                        ) : null}
                        <AvatarFallback
                          className="font-semibold"
                          style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{provider.agencyName}</p>
                        {provider.isVerified && (
                          <Badge
                            variant="secondary"
                            className="mt-1 text-xs"
                            style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                          >
                            Verified Employer
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        asChild
                        style={{ borderColor: brandColor, color: brandColor }}
                      >
                        <Link href={`/careers/${slug}`}>
                          View All Positions
                        </Link>
                      </Button>
                      {provider.website && (
                        <Button variant="ghost" className="w-full" asChild>
                          <a href={provider.website} target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Company Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-border/60">
                  {provider.logoUrl ? (
                    <AvatarImage src={provider.logoUrl} alt={provider.agencyName} />
                  ) : null}
                  <AvatarFallback
                    className="text-[10px] font-semibold"
                    style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/careers/${slug}`}
                  className="text-sm font-medium text-foreground transition-colors"
                >
                  {provider.agencyName} Careers
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {provider.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Powered by badge - prominent for free tier, subtle for Pro+ */}
        <div className="mt-6 text-center">
          {isFreeUser ? (
            // Free tier: prominent white badge with more visibility
            <a
              href="https://findabatherapy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: brandColor }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Powered by Find ABA Therapy
            </a>
          ) : (
            // Pro+ tier: subtle transparent badge
            <a
              href="https://findabatherapy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by Find ABA Therapy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
