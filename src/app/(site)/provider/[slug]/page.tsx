import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ChevronRight, Mail, MapPin, BadgeCheck, Phone, Globe, Building2, Home, Star, Stethoscope, Shield, Navigation, Images, Users, Sparkles } from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { ContactForm } from "@/components/provider/contact-form";
import { DirectionsButton } from "@/components/provider/directions-button";
import { GoogleRatingCard } from "@/components/provider/google-rating-card";
import { GoogleReviewsGallery, type GoogleReviewDisplay } from "@/components/provider/google-reviews-gallery";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { getListingBySlug } from "@/lib/actions/listings";
import { getSelectedGoogleReviews } from "@/lib/actions/google-business";
import { getStateSlug } from "@/lib/data/cities";
import { getVideoEmbedUrl } from "@/lib/storage/config";
import { generateHealthcareBusinessSchema } from "@/lib/seo/schemas";

// Cache the listing fetch to dedupe between generateMetadata and page component
const getCachedListing = cache(async (slug: string) => {
  return getListingBySlug(slug);
});

type ProviderPageParams = {
  slug: string;
};

type ProviderPageSearchParams = {
  location?: string;
};

type ProviderPageProps = {
  params: Promise<ProviderPageParams>;
  searchParams: Promise<ProviderPageSearchParams>;
};

// Service mode labels for location display
const LOCATION_SERVICE_MODE_LABELS: Record<string, string> = {
  center_based: "Center-Based",
  in_home: "In-Home",
  both: "Center & In-Home",
};

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCachedListing(slug);

  if (!result.success || !result.data) {
    return {};
  }

  const listing = result.data;
  const primaryLocation = listing.locations.find((l) => l.isPrimary) || listing.locations[0];
  const insurances = (listing.attributes.insurances as string[]) || [];
  // Premium features require both a paid plan AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPremium = listing.profile.planTier !== "free" && isActiveSubscription;

  // Build SEO-optimized title: "Agency | ABA Therapy in City, State"
  const locationStr = primaryLocation ? `${primaryLocation.city}, ${primaryLocation.state}` : "";
  const title = locationStr
    ? `${listing.profile.agencyName} | ABA Therapy in ${locationStr}`
    : `${listing.profile.agencyName} | ABA Therapy Provider`;

  // Build SEO-optimized description with keywords
  const serviceModeLabels: Record<string, string> = {
    in_home: "in-home",
    in_center: "center-based",
    telehealth: "telehealth",
    school_based: "school-based",
  };
  const serviceTypes = listing.serviceModes.map((m) => serviceModeLabels[m] || m).slice(0, 2);
  const serviceStr = serviceTypes.length > 0 ? serviceTypes.join(" & ") + " " : "";
  const insuranceStr = insurances.length > 0 ? ` Insurance: ${insurances.slice(0, 3).join(", ")}.` : "";
  const acceptingStr = listing.isAcceptingClients ? " Accepting new clients." : "";
  const verifiedStr = isPremium ? " ✓ Verified Provider." : "";

  const description = listing.headline
    ? listing.headline
    : `${listing.profile.agencyName} offers ${serviceStr}ABA therapy${locationStr ? ` in ${locationStr}` : ""}.${acceptingStr}${insuranceStr}${verifiedStr}`;

  // Build OG image URL with provider details
  const ogTitle = listing.profile.agencyName;
  const ogParams = new URLSearchParams({
    brand: "therapy",
    type: "provider",
    title: ogTitle,
    subtitle: locationStr || "ABA Therapy Provider",
  });
  if (listing.logoUrl) {
    ogParams.set("logo", listing.logoUrl);
  }
  const ogImageUrl = `https://www.findabatherapy.org/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/provider/${listing.slug}`,
    },
    openGraph: {
      title: ogTitle,
      description: listing.description || description,
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
      description: listing.description || description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProviderPage({ params, searchParams }: ProviderPageProps) {
  const { slug } = await params;
  const { location: highlightedLocationId } = await searchParams;
  const result = await getCachedListing(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const listing = result.data;
  // Premium features require both a paid plan AND an active subscription
  const isActiveSubscription =
    listing.profile.subscriptionStatus === "active" ||
    listing.profile.subscriptionStatus === "trialing";
  const isPremium = listing.profile.planTier !== "free" && isActiveSubscription;

  // Contact form is only available for premium plans with the toggle enabled
  const contactFormEnabled = isPremium && (listing.attributes.contact_form_enabled !== false);

  // Photo URLs are now included in getListingBySlug response
  const photoUrls = listing.photoUrls || [];

  // Get video embed URL
  const videoEmbedUrl = listing.videoUrl ? getVideoEmbedUrl(listing.videoUrl) : null;

  // Parse attributes
  const insurances = (listing.attributes.insurances as string[]) || [];
  const languages = (listing.attributes.languages as string[]) || [];
  const diagnoses = (listing.attributes.diagnoses as string[]) || [];
  const clinicalSpecialties = (listing.attributes.clinical_specialties as string[]) || [];
  const agesServed = listing.attributes.ages_served as { min?: number; max?: number } | undefined;

  // Service mode labels
  const serviceModeLabels: Record<string, string> = {
    in_home: "In-Home Services",
    in_center: "Center-Based",
    telehealth: "Telehealth",
    school_based: "School-Based",
  };

  // Get primary location for schema
  const primaryLocation = listing.locations.find((l) => l.isPrimary) || listing.locations[0];

  // Find location with Google rating for display
  const highlightedLoc = highlightedLocationId
    ? listing.locations.find(loc => loc.id === highlightedLocationId)
    : null;
  const locationWithRating = highlightedLoc && (highlightedLoc as { googleRating?: number | null }).googleRating
    ? highlightedLoc
    : listing.locations.find(loc => (loc as { googleRating?: number | null }).googleRating);

  // Fetch Google reviews if available
  let googleReviews: GoogleReviewDisplay[] = [];
  if (isPremium && locationWithRating) {
    const showGoogleReviews = (locationWithRating as { showGoogleReviews?: boolean }).showGoogleReviews;
    if (showGoogleReviews) {
      const fetchedReviews = await getSelectedGoogleReviews(locationWithRating.id);
      googleReviews = fetchedReviews.map(r => ({
        id: r.id,
        authorName: r.authorName,
        authorPhotoUrl: r.authorPhotoUrl,
        rating: r.rating,
        text: r.text,
        relativeTimeDescription: r.relativeTimeDescription,
      }));
    }
  }

  // Generate HealthcareBusiness schema (enhanced LocalBusiness for medical providers)
  const businessSchema = generateHealthcareBusinessSchema({
    name: listing.profile.agencyName,
    slug: listing.slug,
    description: listing.description || undefined,
    headline: listing.headline || undefined,
    logoUrl: listing.logoUrl || undefined,
    city: primaryLocation?.city,
    state: primaryLocation?.state,
    street: primaryLocation?.street || undefined,
    postalCode: primaryLocation?.postalCode || undefined,
    phone: listing.profile.contactPhone || undefined,
    email: listing.profile.contactEmail,
    website: listing.profile.website || undefined,
    serviceModes: listing.serviceModes,
    insurances,
    isAcceptingClients: listing.isAcceptingClients,
  });

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (primaryLocation?.state) {
    const stateSlug = getStateSlug(primaryLocation.state);
    if (stateSlug) {
      breadcrumbItems.push({ label: primaryLocation.state, href: `/${stateSlug}` });
    }
  }
  breadcrumbItems.push({
    label: listing.profile.agencyName,
    href: `/provider/${listing.slug}`,
  });

  return (
    <div className="pb-16">
      {/* JSON-LD Schema */}
      <JsonLd data={businessSchema} />

      {/* Analytics tracking */}
      <ViewTracker
        listingId={listing.id}
        listingSlug={listing.slug}
        listingName={listing.profile.agencyName}
        locationId={highlightedLocationId}
        city={primaryLocation?.city}
        state={primaryLocation?.state}
        planTier={listing.profile.planTier}
      />

      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-6 sm:py-8"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={breadcrumbItems} className="mb-3" />

            <div className="rounded-3xl border border-border bg-white p-4 shadow-lg sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <ProviderLogo
                  name={listing.profile.agencyName}
                  logoUrl={listing.logoUrl ?? undefined}
                  size="lg"
                  className="shrink-0"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPremium && (
                      <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-50 text-emerald-700 transition-all duration-300 ease-premium hover:scale-[1.02] hover:bg-emerald-100 hover:shadow-[0_2px_8px_rgba(16,185,129,0.2)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {listing.isAcceptingClients && (
                      <Badge variant="outline" className="gap-1 border-primary/50 bg-primary/20 text-foreground transition-all duration-300 ease-premium hover:scale-[1.02] hover:shadow-[0_2px_8px_rgba(254,231,32,0.3)] active:scale-[0.98]">
                        <Sparkles className="h-3 w-3 text-amber-600" />
                        Accepting New Clients
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight">{listing.profile.agencyName}</h1>
                  {listing.headline && (
                    <p className="text-lg text-muted-foreground">{listing.headline}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BubbleBackground>
      </section>

      {(() => {
        // Determine which location's contact info to show
        const currentLocation = highlightedLocationId
          ? listing.locations.find(loc => loc.id === highlightedLocationId)
          : listing.locations[0];
        const otherLocations = listing.locations.filter(loc => loc.id !== currentLocation?.id);

        // Use location-specific contact info if useCompanyContact is false
        const useLocationContact = currentLocation && currentLocation.useCompanyContact === false;
        const contactEmail = useLocationContact && currentLocation.contactEmail
          ? currentLocation.contactEmail
          : listing.profile.contactEmail;
        const contactPhone = useLocationContact && currentLocation.contactPhone
          ? currentLocation.contactPhone
          : listing.profile.contactPhone;
        const contactWebsite = useLocationContact && currentLocation.contactWebsite
          ? currentLocation.contactWebsite
          : listing.profile.website;

        // Current location details
        const currentServiceMode = currentLocation ? (currentLocation as { serviceMode?: string }).serviceMode : undefined;
        const currentLocationInsurances = currentLocation ? ((currentLocation as { insurances?: string[] }).insurances || []) : [];

        return (
          <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 sm:px-6">
            {/* 1. Contact Info Card */}
            <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                    <Phone className="h-4 w-4 text-[#5788FF]" />
                  </div>
                  Contact {listing.profile.agencyName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact info grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <a
                    href={`mailto:${contactEmail}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                      <Mail className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                      <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{contactEmail}</p>
                    </div>
                  </a>
                  {contactPhone && (
                    <a
                      href={`tel:+1${contactPhone.replace(/\D/g, "")}`}
                      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                        <Phone className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{contactPhone}</p>
                      </div>
                    </a>
                  )}
                  {contactWebsite && (
                    <a
                      href={contactWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
                      title={contactWebsite}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                        <Globe className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-[1.1]" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                        <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                          {contactWebsite.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </p>
                      </div>
                    </a>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {contactWebsite && (
                    <Button asChild variant="outline" className="group flex-1 rounded-full text-base transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50">
                      <a href={contactWebsite} target="_blank" rel="noopener noreferrer">
                        <Globe className="mr-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:rotate-12" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                  {contactFormEnabled && (
                    <Button asChild className="group flex-1 rounded-full text-base transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)] focus-visible:ring-2 focus-visible:ring-primary/50">
                      <a href="#contact-form">
                        <Mail className="mr-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
                        Send Message
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Current Location - Prominent standalone section */}
            {currentLocation && (
              <div
                id={`location-${currentLocation.id}`}
                className="rounded-2xl border border-[#5788FF]/20 bg-[#5788FF]/[0.03] p-5 transition-all duration-500 ease-premium hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.05] hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                    <Navigation className="h-4 w-4 text-[#5788FF]" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {highlightedLocationId ? "Viewing This Location" : "Location"}
                  </h3>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-semibold text-foreground">
                        {currentLocation.city}, {currentLocation.state}
                      </span>
                      {currentLocation.isPrimary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                      {currentServiceMode && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          {currentServiceMode === "center_based" && <Building2 className="h-3 w-3" />}
                          {currentServiceMode === "in_home" && <Home className="h-3 w-3" />}
                          {currentServiceMode === "both" && <CheckCircle className="h-3 w-3" />}
                          {LOCATION_SERVICE_MODE_LABELS[currentServiceMode] || currentServiceMode}
                        </Badge>
                      )}
                    </div>
                    {currentLocation.street && (
                      <p className="text-sm text-muted-foreground">
                        {currentLocation.street}
                        {currentLocation.postalCode && `, ${currentLocation.postalCode}`}
                      </p>
                    )}
                    {(currentServiceMode === "in_home" || currentServiceMode === "both") && (
                      <p className="text-xs text-muted-foreground">
                        Service radius: {(currentLocation as { serviceRadiusMiles?: number }).serviceRadiusMiles || 25} miles
                      </p>
                    )}
                    {currentLocationInsurances.length > 0 && (
                      <div className="pt-1">
                        <div className="flex flex-wrap gap-1">
                          {currentLocationInsurances.slice(0, 4).map((ins) => (
                            <Badge key={ins} variant="outline" className="text-xs font-normal">
                              {ins}
                            </Badge>
                          ))}
                          {currentLocationInsurances.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{currentLocationInsurances.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {(currentServiceMode === "center_based" || currentServiceMode === "both") && (
                    <DirectionsButton
                      latitude={(currentLocation as { latitude?: number }).latitude || null}
                      longitude={(currentLocation as { longitude?: number }).longitude || null}
                      address={[currentLocation.street, currentLocation.city, currentLocation.state, currentLocation.postalCode].filter(Boolean).join(", ")}
                      className="shrink-0"
                    />
                  )}
                </div>
              </div>
            )}

            {/* 3. Google Rating Card and Reviews - Premium only */}
            {isPremium && locationWithRating && (() => {
              const googleRating = (locationWithRating as { googleRating?: number | null }).googleRating;
              const googleRatingCount = (locationWithRating as { googleRatingCount?: number | null }).googleRatingCount;
              const googlePlaceId = (locationWithRating as { googlePlaceId?: string | null }).googlePlaceId;

              if (!googleRating || !googlePlaceId) return null;

              // Use the Maps URLs API format which works on both desktop and mobile
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.profile.agencyName)}&query_place_id=${googlePlaceId}`;

              return (
                <>
                  <GoogleRatingCard
                    rating={googleRating}
                    reviewCount={googleRatingCount}
                    googleMapsUrl={googleMapsUrl}
                  />
                  {googleReviews.length > 0 && (
                    <GoogleReviewsGallery
                      reviews={googleReviews}
                      googleMapsUrl={googleMapsUrl}
                    />
                  )}
                </>
              );
            })()}

            {/* 4. About Card - Premium only, now includes Services */}
            {isPremium && listing.description && (
              <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    About {listing.profile.agencyName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Services integrated into About */}
                  {listing.serviceModes.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services Offered</p>
                      <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {listing.serviceModes.map((mode) => (
                          <li
                            key={mode}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.08] hover:text-foreground hover:shadow-[0_2px_8px_rgba(16,185,129,0.15)] active:scale-[0.98]"
                          >
                            <Stethoscope className="h-4 w-4 text-emerald-600" aria-hidden />
                            {serviceModeLabels[mode] || mode}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Description */}
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>

                  {/* Additional Details */}
                  {(agesServed || languages.length > 0 || diagnoses.length > 0 || clinicalSpecialties.length > 0) && (
                    <div className="grid gap-4 pt-2 md:grid-cols-2">
                      {agesServed && (agesServed.min !== undefined || agesServed.max !== undefined) && (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:border-[#5788FF]/20 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_2px_12px_rgba(87,136,255,0.08)]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ages Served</p>
                          <p className="mt-1 font-medium text-foreground">
                            {agesServed.min ?? 0} - {agesServed.max ?? 18} years
                          </p>
                        </div>
                      )}

                      {languages.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:border-[#5788FF]/20 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_2px_12px_rgba(87,136,255,0.08)]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</p>
                          <p className="mt-1 font-medium text-foreground">{languages.join(", ")}</p>
                        </div>
                      )}

                      {diagnoses.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:border-[#5788FF]/20 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_2px_12px_rgba(87,136,255,0.08)]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnoses</p>
                          <p className="mt-1 font-medium text-foreground">{diagnoses.join(", ")}</p>
                        </div>
                      )}

                      {clinicalSpecialties.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-premium hover:border-[#5788FF]/20 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_2px_12px_rgba(87,136,255,0.08)]">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialties</p>
                          <p className="mt-1 font-medium text-foreground">{clinicalSpecialties.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 4b. Services Card - Only for free tier (non-premium don't have About) */}
            {!isPremium && listing.serviceModes.length > 0 && (
              <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                    </div>
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {listing.serviceModes.map((mode) => (
                      <li
                        key={mode}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.08] hover:text-foreground hover:shadow-[0_2px_8px_rgba(16,185,129,0.15)] active:scale-[0.98]"
                      >
                        <Stethoscope className="h-4 w-4 text-emerald-600" aria-hidden />
                        {serviceModeLabels[mode] || mode}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 5. Insurance Card */}
            {insurances.length > 0 && (
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
                    {insurances.map((insurance) => (
                      <Badge key={insurance} variant="outline" className="rounded-full px-4 py-2 text-sm transition-all duration-300 ease-premium hover:scale-[1.03] hover:border-violet-500/30 hover:bg-violet-500/[0.06] hover:text-violet-700 hover:shadow-[0_2px_8px_rgba(139,92,246,0.15)] active:scale-[0.98]">
                        {insurance}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 6. Other Locations Card - Only if multiple locations */}
            {otherLocations.length > 0 && (
              <Card className="border border-border/80 transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                      <MapPin className="h-4 w-4 text-[#5788FF]" />
                    </div>
                    Other Locations
                  </CardTitle>
                  <CardDescription>
                    {otherLocations.length} additional service {otherLocations.length === 1 ? "location" : "locations"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                    {otherLocations.map((location) => {
                      const serviceMode = (location as { serviceMode?: string }).serviceMode;
                      return (
                        <li key={location.id}>
                          <Link
                            href={`/provider/${listing.slug}?location=${location.id}`}
                            className="group flex items-center gap-3 p-3 transition-all duration-300 ease-premium hover:bg-[#5788FF]/[0.04] hover:pl-4 active:bg-[#5788FF]/[0.08] focus-visible:outline-none focus-visible:bg-[#5788FF]/[0.06]"
                          >
                            <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-all duration-300 ease-premium group-hover:text-[#5788FF] group-hover:scale-110" />
                            <span className="flex-1 text-sm font-medium transition-colors duration-300 group-hover:text-[#5788FF]">
                              {location.city}, {location.state}
                            </span>
                            {serviceMode && (
                              <Badge variant="outline" className="gap-1 text-xs transition-all duration-300 ease-premium group-hover:border-[#5788FF]/30 group-hover:bg-[#5788FF]/10">
                                {serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                                {serviceMode === "in_home" && <Home className="h-3 w-3" />}
                                {serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                                {LOCATION_SERVICE_MODE_LABELS[serviceMode] || serviceMode}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-300 ease-bounce-sm group-hover:translate-x-1 group-hover:text-[#5788FF]" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 7. Photos and Video Card - Premium only */}
            {isPremium && (photoUrls.length > 0 || videoEmbedUrl) && (
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
                  {photoUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Gallery</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {photoUrls.map((url, index) => (
                          <div
                            key={url}
                            className="group relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-muted/40 shadow-sm transition-all duration-500 ease-premium hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] active:scale-[0.99]"
                          >
                            <Image
                              src={url}
                              alt={`${listing.profile.agencyName} ABA therapy center${primaryLocation ? ` in ${primaryLocation.city}, ${primaryLocation.state}` : ""} - photo ${index + 1}`}
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

            {/* 8. Contact Form - Premium providers with contact form enabled */}
            {contactFormEnabled && (
              <div id="contact-form" className="scroll-mt-6">
                <ContactForm
                  listingId={listing.id}
                  providerName={listing.profile.agencyName}
                  locationId={highlightedLocationId}
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
