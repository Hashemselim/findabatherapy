import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Globe,
  Heart,
  Home,
  Images,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { JobCard } from "@/components/jobs/job-card";
import { getJobsByProvider } from "@/lib/queries/jobs";
import { createAdminClient } from "@/lib/supabase/server";
import { generateJobsSiteOrganizationSchema } from "@/lib/seo/job-schemas";
import { getVideoEmbedUrl } from "@/lib/storage/config";
import { brandColors } from "@/config/brands";
import type { PlanTier } from "@/lib/plans/features";

interface EmployerPageProps {
  params: Promise<{ slug: string }>;
}

interface EmployerProfile {
  id: string;
  listingId: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  headline: string | null;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  planTier: PlanTier;
  isVerified: boolean;
  isPremium: boolean;
  serviceModes: string[];
  videoUrl: string | null;
  locations: {
    id: string;
    city: string;
    state: string;
    label: string | null;
    isPrimary: boolean;
  }[];
  specialties: string[];
  insurances: string[];
  photoUrls: string[];
}

// Service mode labels
const SERVICE_MODE_LABELS: Record<string, string> = {
  in_home: "In-Home Services",
  in_center: "Center-Based",
  telehealth: "Telehealth",
  school_based: "School-Based",
};

// Cache the employer fetch to dedupe between generateMetadata and page component
const getCachedEmployer = cache(async (slug: string) => {
  return getEmployerBySlug(slug);
});

async function getEmployerBySlug(slug: string): Promise<EmployerProfile | null> {
  const supabase = await createAdminClient();

  // Find the listing by slug
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      profile_id,
      slug,
      logo_url,
      headline,
      description,
      service_modes,
      video_url,
      profiles!inner (
        id,
        agency_name,
        website,
        contact_email,
        contact_phone,
        plan_tier,
        subscription_status
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError || !listing) {
    return null;
  }

  // Extract profile data
  const profile = listing.profiles as unknown as {
    id: string;
    agency_name: string;
    website: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    plan_tier: string;
    subscription_status: string | null;
  };

  // Determine subscription status
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;
  const isPremium = effectiveTier !== "free";

  // Fetch locations, attributes, and photos in parallel
  const [locationsResult, attrsResult, photosResult] = await Promise.all([
    // Get all locations (uses listing_id, not profile_id)
    supabase
      .from("locations")
      .select("id, city, state, label, is_primary, insurances")
      .eq("listing_id", listing.id)
      .order("is_primary", { ascending: false }),
    // Get clinical specialties from attributes
    supabase
      .from("listing_attribute_values")
      .select("attribute_key, value_json")
      .eq("listing_id", listing.id)
      .eq("attribute_key", "clinical_specialties")
      .single(),
    // Get photos (premium only)
    isPremium
      ? supabase
          .from("listing_photos")
          .select("url")
          .eq("listing_id", listing.id)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const locations = locationsResult.data || [];
  const specialties = (attrsResult.data?.value_json as string[]) || [];
  const photoUrls = photosResult.data?.map((p) => p.url) || [];

  // Get insurances from first location
  const insurances = locations[0]?.insurances || [];

  return {
    id: listing.profile_id,
    listingId: listing.id,
    slug: listing.slug,
    agencyName: profile.agency_name,
    logoUrl: listing.logo_url || null,
    headline: listing.headline || null,
    description: listing.description || null,
    website: profile.website,
    contactEmail: profile.contact_email,
    contactPhone: profile.contact_phone,
    planTier: effectiveTier,
    isVerified: isPremium,
    isPremium,
    serviceModes: listing.service_modes || [],
    videoUrl: listing.video_url,
    locations: locations.map((loc) => ({
      id: loc.id,
      city: loc.city,
      state: loc.state,
      label: loc.label,
      isPrimary: loc.is_primary,
    })),
    specialties,
    insurances,
    photoUrls,
  };
}

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

export async function generateMetadata({ params }: EmployerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const employer = await getCachedEmployer(slug);

  if (!employer) {
    return {
      title: "Employer Not Found | Find ABA Jobs",
    };
  }

  const primaryLocation = employer.locations.find((l) => l.isPrimary) || employer.locations[0];
  const locationStr = primaryLocation ? `${primaryLocation.city}, ${primaryLocation.state}` : "";

  const title = locationStr
    ? `${employer.agencyName} Careers | ABA Jobs in ${locationStr}`
    : `${employer.agencyName} Careers | Find ABA Jobs`;

  const description = employer.headline
    ? `Explore career opportunities at ${employer.agencyName}. ${employer.headline}`
    : `Browse BCBA, RBT, and behavior analyst positions at ${employer.agencyName}${locationStr ? ` in ${locationStr}` : ""}. View locations, learn about the company, and apply today.`;

  // Build OG image URL with employer details
  const ogTitle = `${employer.agencyName} - Careers`;
  const ogParams = new URLSearchParams({
    brand: "jobs",
    type: "employer",
    title: ogTitle,
    subtitle: locationStr || "View open positions and company info",
  });
  if (employer.logoUrl) {
    ogParams.set("logo", employer.logoUrl);
  }
  const ogImageUrl = `https://www.findabajobs.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
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
    alternates: {
      canonical: `/employers/${slug}`,
    },
  };
}

export default async function EmployerPage({ params }: EmployerPageProps) {
  const { slug } = await params;
  const [employer, jobs] = await Promise.all([
    getCachedEmployer(slug),
    getJobsByProvider(slug),
  ]);

  if (!employer) {
    notFound();
  }

  const primaryLocation = employer.locations.find((l) => l.isPrimary) || employer.locations[0];
  const orgSchema = generateJobsSiteOrganizationSchema();

  // Get video embed URL
  const videoEmbedUrl = employer.videoUrl ? getVideoEmbedUrl(employer.videoUrl) : null;

  // Build breadcrumb items
  const breadcrumbItems = [
    { label: "Employers", href: "/employers" },
    { label: employer.agencyName, href: `/employers/${employer.slug}` },
  ];

  return (
    <div className="pb-16">
      {/* JSON-LD Schema */}
      <JsonLd data={orgSchema} />

      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 py-6 sm:py-8"
          colors={{
            first: "255,255,255",
            second: "167,243,208",
            third: "94,234,212",
            fourth: "204,251,241",
            fifth: "153,246,228",
            sixth: "240,253,250",
          }}
        >
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={breadcrumbItems} className="mb-3" />

            <div className="rounded-3xl border border-border bg-white p-4 shadow-lg sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <ProviderLogo
                  name={employer.agencyName}
                  logoUrl={employer.logoUrl ?? undefined}
                  size="lg"
                  className="shrink-0"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {employer.isVerified && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700 transition-all duration-300 ease-premium hover:scale-[1.02] hover:bg-emerald-100 hover:shadow-[0_2px_8px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                      >
                        <BadgeCheck className="h-3 w-3" />
                        Verified Employer
                      </Badge>
                    )}
                    {jobs.length > 0 && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700 transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-[0_2px_8px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                      >
                        <Sparkles className="h-3 w-3" />
                        Hiring Now
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                    {employer.agencyName}
                  </h1>
                  {employer.headline && (
                    <p className="text-lg text-muted-foreground">{employer.headline}</p>
                  )}
                  {primaryLocation && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {primaryLocation.city}, {primaryLocation.state}
                      </span>
                      {employer.locations.length > 1 && (
                        <span className="text-muted-foreground/60">
                          +{employer.locations.length - 1} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BubbleBackground>
      </section>

      {/* Main Content */}
      <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 sm:px-6">
        {/* 1. Open Positions Card - PRIMARY SECTION */}
        <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <Briefcase className="h-4 w-4 text-emerald-600" />
              </div>
              Open Positions
              <span className="ml-auto text-lg font-normal text-muted-foreground">
                ({jobs.length})
              </span>
            </CardTitle>
            {jobs.length > 0 && (
              <CardDescription>
                Join {employer.agencyName} and make a difference in the lives of individuals with autism
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No open positions</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {employer.agencyName} doesn&apos;t have any open positions at the moment.
                  Check back later or browse other opportunities.
                </p>
                <Button asChild className="mt-6 rounded-full" variant="outline">
                  <Link href="/jobs/search">Browse All Jobs</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Contact Info Card */}
        {(employer.contactEmail || employer.contactPhone || employer.website) && (
          <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                  <Phone className="h-4 w-4 text-[#5788FF]" />
                </div>
                Contact {employer.agencyName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact info grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                {employer.contactEmail && (
                  <a
                    href={`mailto:${employer.contactEmail}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                      <Mail className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                      <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{employer.contactEmail}</p>
                    </div>
                  </a>
                )}
                {employer.contactPhone && (
                  <a
                    href={`tel:+1${employer.contactPhone.replace(/\D/g, "")}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                      <Phone className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{employer.contactPhone}</p>
                    </div>
                  </a>
                )}
                {employer.website && (
                  <a
                    href={employer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                    title={employer.website}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                      <Globe className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                      <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                        {employer.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </p>
                    </div>
                  </a>
                )}
              </div>
              {/* Action button */}
              {employer.website && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="outline" className="group flex-1 rounded-full text-base transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50">
                    <a href={employer.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:rotate-12" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. About Card */}
        {(employer.description || employer.serviceModes.length > 0) && (
          <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                About {employer.agencyName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Services */}
              {employer.serviceModes.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services Offered</p>
                  <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {employer.serviceModes.map((mode) => (
                      <li
                        key={mode}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.08] hover:text-foreground hover:shadow-[0_2px_8px_rgba(16,185,129,0.15)] active:scale-[0.98]"
                      >
                        {mode === "in_home" && <Home className="h-4 w-4 text-emerald-600" aria-hidden />}
                        {mode === "in_center" && <Building2 className="h-4 w-4 text-emerald-600" aria-hidden />}
                        {(mode !== "in_home" && mode !== "in_center") && <Stethoscope className="h-4 w-4 text-emerald-600" aria-hidden />}
                        {SERVICE_MODE_LABELS[mode] || mode}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Description */}
              {employer.description && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {employer.description}
                </p>
              )}

              {/* Specialties */}
              {employer.specialties.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Clinical Specialties
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {employer.specialties.map((specialty) => (
                      <Badge
                        key={specialty}
                        variant="outline"
                        className="rounded-full px-3 py-1.5 text-xs transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] hover:text-emerald-700"
                      >
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. Locations Card */}
        {employer.locations.length > 0 && (
          <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                Locations
              </CardTitle>
              <CardDescription>
                {employer.locations.length} office{employer.locations.length !== 1 ? "s" : ""} across the region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                {employer.locations.map((location) => (
                  <li
                    key={location.id}
                    className="flex items-center gap-3 p-3 transition-all duration-300 ease-premium hover:bg-blue-500/[0.04]"
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {location.city}, {location.state}
                    </span>
                    {location.label && (
                      <span className="text-xs text-muted-foreground">{location.label}</span>
                    )}
                    {location.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        Headquarters
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 5. Insurance Card */}
        {employer.insurances.length > 0 && (
          <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
                  <Shield className="h-4 w-4 text-violet-600" />
                </div>
                Insurance Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employer.insurances.map((insurance) => (
                  <Badge
                    key={insurance}
                    variant="outline"
                    className="rounded-full px-4 py-2 text-sm transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-violet-500/30 hover:bg-violet-500/[0.06] hover:text-violet-700 hover:shadow-[0_2px_8px_rgba(139,92,246,0.15)] active:scale-[0.98]"
                  >
                    {insurance}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 6. Photos & Video Card - Premium only */}
        {employer.isPremium && (employer.photoUrls.length > 0 || videoEmbedUrl) && (
          <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                  <Images className="h-4 w-4 text-amber-600" />
                </div>
                Photos & Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Embed */}
              {videoEmbedUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Video</p>
                  <div className="group relative aspect-video w-full overflow-hidden rounded-2xl border bg-black shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                    <iframe
                      src={videoEmbedUrl}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              {employer.photoUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Gallery</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {employer.photoUrls.map((url, index) => (
                      <div
                        key={url}
                        className="group relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-muted/40 shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] active:scale-[0.99]"
                      >
                        <Image
                          src={url}
                          alt={`${employer.agencyName} office${primaryLocation ? ` in ${primaryLocation.city}, ${primaryLocation.state}` : ""} - photo ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.05]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 7. View Therapy Profile Card */}
        <Card className="group relative overflow-hidden border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.03] via-white to-rose-500/[0.06] transition-all duration-500 ease-premium hover:border-rose-500/30 hover:shadow-[0_8px_30px_rgba(244,63,94,0.12)]">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-rose-500/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-rose-500/10 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <CardContent className="relative flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-premium group-hover:scale-[1.05]"
              style={{ backgroundColor: `${brandColors.therapy}20` }}
            >
              <Heart
                className="h-7 w-7 transition-transform duration-300 ease-bounce-sm group-hover:scale-110"
                style={{ color: brandColors.therapy }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xl font-semibold text-foreground">
                Looking for ABA therapy services?
              </p>
              <p className="text-muted-foreground">
                View {employer.agencyName}&apos;s therapy profile on Find a BA Therapy to learn about their services for families.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 rounded-full px-8 py-5 text-base font-semibold transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(244,63,94,0.2)] active:translate-y-0"
              style={{
                borderColor: `${brandColors.therapy}40`,
                color: brandColors.therapy,
              }}
            >
              <Link href={`/provider/${employer.slug}`}>
                <Heart className="mr-2 h-4 w-4" />
                View Therapy Profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 8. Browse More Jobs CTA */}
        <Card className="group relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-white to-emerald-500/[0.06] transition-all duration-500 ease-premium hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)]">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-emerald-500/10 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <CardContent className="relative flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-emerald-500/15">
              <Briefcase className="h-7 w-7 text-emerald-600 transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xl font-semibold text-foreground">
                Looking for more opportunities?
              </p>
              <p className="text-muted-foreground">
                Browse thousands of BCBA, RBT, and behavior analyst positions from top ABA providers.
              </p>
            </div>
            <Button
              asChild
              className="group/btn shrink-0 rounded-full bg-emerald-600 px-8 py-5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
            >
              <Link href="/jobs/search">
                Search All Jobs
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
