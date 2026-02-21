import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AgencyPageDescription } from "@/components/branded/agency-page-description";
import { AgencyPageLocations } from "@/components/branded/agency-page-locations";
import { AgencyPageServices } from "@/components/branded/agency-page-services";
import { AgencyPageInsurance } from "@/components/branded/agency-page-insurance";
import { AgencyPageGallery } from "@/components/branded/agency-page-gallery";
import { AgencyPageCta } from "@/components/branded/agency-page-cta";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { getListingBySlug } from "@/lib/actions/listings";

// Cache the listing fetch to dedupe between generateMetadata and page component
const getCachedListing = cache(async (slug: string) => {
  return getListingBySlug(slug);
});

type BrandedPageParams = {
  slug: string;
};

type BrandedPageProps = {
  params: Promise<BrandedPageParams>;
  searchParams: Promise<{ ref?: string }>;
};

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

// Helper to create a lighter shade of the brand color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

// Helper to calculate contrasting text color
function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export async function generateMetadata({
  params,
}: BrandedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCachedListing(slug);

  if (!result.success || !result.data) {
    return {};
  }

  const listing = result.data;
  const primaryLocation =
    listing.locations.find((l) => l.isPrimary) || listing.locations[0];
  const locationStr = primaryLocation
    ? `${primaryLocation.city}, ${primaryLocation.state}`
    : "";

  const title = `${listing.profile.agencyName} | ABA Therapy Services`;
  const description = listing.headline
    ? listing.headline
    : `${listing.profile.agencyName} provides ABA therapy services${locationStr ? ` in ${locationStr}` : ""}. ${listing.isAcceptingClients ? "Now accepting new clients." : ""}`;

  // Build OG image URL
  const ogParams = new URLSearchParams({
    brand: "therapy",
    type: "provider",
    title: listing.profile.agencyName,
    subtitle: locationStr || "ABA Therapy Services",
  });
  if (listing.logoUrl) {
    ogParams.set("logo", listing.logoUrl);
  }
  const ogImageUrl = `https://www.findabatherapy.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    // noindex — branded page should not compete with directory listing in search engines
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: listing.profile.agencyName,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: listing.profile.agencyName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: listing.profile.agencyName,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BrandedAgencyPage({ params, searchParams }: BrandedPageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const result = await getCachedListing(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const listing = result.data;

  // Brand color from intake form settings
  const brandColor = listing.profile.intakeFormSettings.background_color;
  const contrastColor = getContrastColor(brandColor);
  const { show_powered_by } = listing.profile.intakeFormSettings;

  // Premium features require both a paid plan AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPremium =
    listing.profile.planTier !== "free" && isActiveSubscription;

  // Contact form toggle
  const contactFormEnabled =
    isPremium && listing.attributes.contact_form_enabled !== false;

  // Parse attributes
  const insurances = (listing.attributes.insurances as string[]) || [];
  const languages = (listing.attributes.languages as string[]) || [];
  const diagnoses = (listing.attributes.diagnoses as string[]) || [];
  const clinicalSpecialties =
    (listing.attributes.clinical_specialties as string[]) || [];
  const agesServed = listing.attributes.ages_served as
    | { min?: number; max?: number }
    | undefined;

  // Photo URLs and video
  const photoUrls = listing.photoUrls || [];

  // Primary location for context
  const primaryLocation =
    listing.locations.find((l) => l.isPrimary) || listing.locations[0];

  // Generate initials for avatar fallback
  const initials = listing.profile.agencyName
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
      {/* Analytics tracking */}
      <ViewTracker
        listingId={listing.id}
        listingSlug={listing.slug}
        listingName={listing.profile.agencyName}
        city={primaryLocation?.city}
        state={primaryLocation?.state}
        planTier={listing.profile.planTier}
      />

      {/* Main Content Container */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* White Card Container */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          {/* Branded Header Section */}
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
                {listing.logoUrl ? (
                  <AvatarImage src={listing.logoUrl} alt={listing.profile.agencyName} />
                ) : null}
                <AvatarFallback
                  className="text-xl font-bold sm:text-2xl"
                  style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Company Name & Headline */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {listing.profile.agencyName}
              </h1>

              {/* Divider */}
              <div
                className="mx-auto h-0.5 w-12 rounded-full"
                style={{ backgroundColor: getLighterShade(brandColor, 0.3) }}
              />

              <p className="mx-auto max-w-lg text-base text-muted-foreground sm:text-lg">
                {listing.headline || "Compassionate ABA Therapy for Your Family"}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {isPremium && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: getLighterShade(brandColor, 0.15),
                      color: brandColor,
                    }}
                  >
                    Verified Provider
                  </span>
                )}
                {listing.isAcceptingClients && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: getLighterShade(brandColor, 0.15),
                      color: brandColor,
                    }}
                  >
                    Accepting New Clients
                  </span>
                )}
              </div>

              {/* Website Link */}
              {listing.profile.website && (
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
                      href={listing.profile.website}
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

          {/* Content Sections */}
          <div className="space-y-12 px-6 py-8 sm:px-8 sm:py-10">
            {/* Description */}
            <AgencyPageDescription description={listing.description} />

            {/* Locations */}
            <AgencyPageLocations
              locations={listing.locations}
              agencyPhone={listing.profile.contactPhone}
              agencyWebsite={listing.profile.website}
              brandColor={brandColor}
            />

            {/* Services & Specialties */}
            <AgencyPageServices
              agesServed={agesServed}
              languages={languages}
              diagnoses={diagnoses}
              clinicalSpecialties={clinicalSpecialties}
              serviceModes={listing.serviceModes}
              brandColor={brandColor}
            />

            {/* Insurance */}
            <AgencyPageInsurance insurances={insurances} brandColor={brandColor} />

            {/* Photo Gallery & Video (all tiers — photos are free now) */}
            <AgencyPageGallery
              photoUrls={photoUrls}
              videoUrl={listing.videoUrl}
              agencyName={listing.profile.agencyName}
              primaryCity={primaryLocation?.city}
              primaryState={primaryLocation?.state}
            />

            {/* CTA Section */}
            <AgencyPageCta
              slug={listing.slug}
              agencyName={listing.profile.agencyName}
              isPremium={isPremium}
              contactFormEnabled={contactFormEnabled}
              contactEmail={listing.profile.contactEmail}
              contactPhone={listing.profile.contactPhone}
              referralSource={ref}
              brandColor={brandColor}
            />
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 sm:px-8"
            style={{ backgroundColor: getLighterShade(brandColor, 0.05) }}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-border/60">
                  {listing.logoUrl ? (
                    <AvatarImage src={listing.logoUrl} alt={listing.profile.agencyName} />
                  ) : null}
                  <AvatarFallback
                    className="text-[10px] font-semibold"
                    style={{ backgroundColor: getLighterShade(brandColor, 0.15), color: brandColor }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {listing.profile.agencyName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {listing.profile.agencyName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Powered by badge */}
        {show_powered_by ? (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ color: brandColor }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Powered by Find ABA Therapy
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
              style={{ color: contrastColor }}
            >
              Powered by Find ABA Therapy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
