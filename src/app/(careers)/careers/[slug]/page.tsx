import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, Briefcase, BadgeCheck, Building2, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JsonLd } from "@/components/seo/json-ld";
import { CareersJobFilter } from "@/components/jobs/careers-job-filter";
import { getJobsByProvider } from "@/lib/queries/jobs";
import { createAdminClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/plans/features";

interface CareersPageProps {
  params: Promise<{ slug: string }>;
}

interface ProviderProfile {
  id: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  headline: string | null;
  description: string | null;
  website: string | null;
  planTier: PlanTier;
  isVerified: boolean;
  primaryLocation: {
    city: string;
    state: string;
  } | null;
  intakeFormSettings: {
    background_color: string;
    show_powered_by: boolean;
  };
}

async function getProviderBySlug(slug: string): Promise<ProviderProfile | null> {
  const supabase = await createAdminClient();

  // First get the listing by slug to find the profile
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      profile_id,
      slug,
      logo_url,
      headline,
      description
    `)
    .eq("slug", slug)
    .single();

  if (listingError || !listing) {
    return null;
  }

  // Get the profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      agency_name,
      website,
      plan_tier,
      subscription_status,
      intake_form_settings
    `)
    .eq("id", listing.profile_id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Get primary location
  const { data: locations } = await supabase
    .from("locations")
    .select("city, state")
    .eq("profile_id", profile.id)
    .eq("is_primary", true)
    .limit(1);

  const primaryLocation = locations && locations.length > 0 ? locations[0] : null;

  // Determine effective plan tier
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;
  const intakeFormSettings = (profile.intake_form_settings as
    | { background_color?: string; show_powered_by?: boolean }
    | null) || null;

  return {
    id: profile.id,
    slug: listing.slug,
    agencyName: profile.agency_name,
    logoUrl: listing.logo_url || null,
    headline: listing.headline || null,
    description: listing.description || null,
    website: profile.website,
    planTier: effectiveTier,
    isVerified: effectiveTier !== "free",
    primaryLocation,
    intakeFormSettings: {
      background_color: intakeFormSettings?.background_color || "#5788FF",
      show_powered_by: intakeFormSettings?.show_powered_by ?? true,
    },
  };
}

export async function generateMetadata({ params }: CareersPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return {
      title: "Careers - Provider Not Found",
    };
  }

  const title = `Careers at ${provider.agencyName}`;
  const description = provider.headline
    ? `Explore career opportunities at ${provider.agencyName}. ${provider.headline}`
    : `Browse open BCBA, RBT, and behavior analyst positions at ${provider.agencyName}. Apply today!`;

  // Build OG image URL with company details
  const ogParams = new URLSearchParams({
    brand: "jobs",
    type: "careers",
    title,
    subtitle: provider.primaryLocation
      ? `${provider.primaryLocation.city}, ${provider.primaryLocation.state}`
      : "View open positions",
  });
  if (provider.logoUrl) {
    ogParams.set("logo", provider.logoUrl);
  }
  const ogImageUrl = `https://www.findabajobs.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    // No canonical to main site - this is a standalone branded page
    robots: {
      index: false, // Don't index private branded pages
      follow: false,
    },
  };
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

export default async function BrandedCareersPage({ params }: CareersPageProps) {
  const { slug } = await params;
  const [provider, jobs] = await Promise.all([
    getProviderBySlug(slug),
    getJobsByProvider(slug),
  ]);

  if (!provider) {
    notFound();
  }

  const initials = provider.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const brandColor = provider.intakeFormSettings.background_color;
  const contrastColor = getContrastColor(brandColor);

  const effectiveHeadline = provider.headline;
  const effectiveCtaText = "Apply Now";

  // Generate JSON-LD for the employer
  const employerSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: provider.agencyName,
    description: provider.description || provider.headline,
    url: provider.website,
    logo: provider.logoUrl,
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}bb 100%)`,
      }}
    >
      <JsonLd data={employerSchema} />

      {/* Main Content Container */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* White Card Container */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          {/* Header Section */}
          <div
            className="px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(brandColor, 0.08) }}
          >
            {/* Logo */}
            <div className="mx-auto mb-6">
              <Avatar
                className="mx-auto h-20 w-20 border-4 shadow-lg sm:h-24 sm:w-24"
                style={{ borderColor: brandColor }}
              >
                {provider.logoUrl ? (
                  <AvatarImage src={provider.logoUrl} alt={provider.agencyName} />
                ) : null}
                <AvatarFallback
                  className="text-xl font-bold sm:text-2xl"
                  style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Company Name & Verified Badge */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Careers at {provider.agencyName}
              </h1>

              {provider.isVerified && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: getLighterShade(brandColor, 0.15),
                    color: brandColor,
                  }}
                >
                  <BadgeCheck className="h-4 w-4" />
                  Verified Employer
                </span>
              )}

              {/* Custom Headline or Company Headline */}
              {effectiveHeadline && (
                <p className="mx-auto max-w-lg text-base text-muted-foreground sm:text-lg">
                  {effectiveHeadline}
                </p>
              )}

              {/* Location */}
              {provider.primaryLocation && (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {provider.primaryLocation.city}, {provider.primaryLocation.state}
                  </span>
                </div>
              )}

              {/* Website Link */}
              {provider.website && (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    style={{
                      borderColor: brandColor,
                      color: "#111827",
                    }}
                  >
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Jobs Section */}
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="mb-6 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
              >
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                Open Positions
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  ({jobs.length})
                </span>
              </h2>
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border/60 py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No open positions</h3>
                <p className="mt-2 mx-auto max-w-sm text-sm text-muted-foreground">
                  {provider.agencyName} doesn&apos;t have any open positions at the moment.
                  Check back later for new opportunities.
                </p>
              </div>
            ) : (
              <CareersJobFilter
                jobs={jobs}
                brandColor={brandColor}
                providerSlug={slug}
                ctaText={effectiveCtaText}
              />
            )}
          </div>

          {/* About Section */}
          {provider.description && (
            <div className="border-t border-border/60 px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">
                  About {provider.agencyName}
                </h3>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {provider.description}
              </p>
            </div>
          )}

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
                <span className="text-sm font-medium text-foreground">
                  {provider.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {provider.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {provider.intakeFormSettings.show_powered_by ? (
          <div className="mt-6 text-center">
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
          </div>
        ) : (
          <div className="mt-6 text-center">
            <a
              href="https://findabatherapy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by Find ABA Therapy
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
