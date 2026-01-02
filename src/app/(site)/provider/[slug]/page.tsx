import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ChevronRight, Mail, MapPin, BadgeCheck, Phone, Globe, Building2, Home, Star } from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { ContactForm } from "@/components/provider/contact-form";
import { DirectionsButton } from "@/components/provider/directions-button";
import { GoogleRatingCard } from "@/components/provider/google-rating-card";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { getListingBySlug } from "@/lib/actions/listings";
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
  const isPremium = listing.profile.planTier !== "free";

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

  return {
    title,
    description,
    alternates: {
      canonical: `/provider/${listing.slug}`,
    },
    openGraph: {
      title: listing.profile.agencyName,
      description: listing.description || description,
      images: listing.logoUrl ? [listing.logoUrl] : undefined,
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
  const isPremium = listing.profile.planTier !== "free";

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
                      <Badge variant="outline" className="gap-1 border-[#5788FF] text-[#5788FF]">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {listing.isAcceptingClients && (
                      <Badge variant="outline" className="border-[#FEE720] bg-[#FFF5C2] text-[#333333]">
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

        return (
          <div className="mx-auto mt-10 max-w-5xl space-y-6 px-4 sm:px-6">
            {/* Contact Info Card - shown for all providers */}
            <Card className="border border-border/80">
              <CardHeader>
                <CardTitle>Contact {listing.profile.agencyName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* Website URL display */}
                  {contactWebsite && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate text-sm" title={contactWebsite}>
                        {contactWebsite.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </span>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                    {contactWebsite && (
                      <Button asChild variant="outline" className="rounded-full text-base">
                        <a href={contactWebsite} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-2 h-4 w-4" />
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {contactFormEnabled && (
                      <Button asChild className="rounded-full text-base">
                        <a href="#contact-form">
                          <Mail className="mr-2 h-4 w-4" />
                          Contact Now
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locations Card */}
            {listing.locations.length > 0 && (() => {
              // Separate current location from other locations
              const currentLocation = highlightedLocationId
                ? listing.locations.find(loc => loc.id === highlightedLocationId)
                : listing.locations[0]; // Default to first location if none highlighted
              const otherLocations = listing.locations.filter(loc => loc.id !== currentLocation?.id);

              // Helper function to render a location item
              const renderLocationItem = (location: typeof listing.locations[0], isCurrentLocation: boolean) => {
                const serviceMode = (location as { serviceMode?: string }).serviceMode;
                const locationInsurances = (location as { insurances?: string[] }).insurances || [];

                return (
                  <li
                    key={location.id}
                    id={`location-${location.id}`}
                    className={`rounded-xl border p-4 transition-all ${
                      isCurrentLocation
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/60 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {location.city}, {location.state}
                          </span>
                          {location.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                          {serviceMode && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              {serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                              {serviceMode === "in_home" && <Home className="h-3 w-3" />}
                              {serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                              {LOCATION_SERVICE_MODE_LABELS[serviceMode] || serviceMode}
                            </Badge>
                          )}
                        </div>

                        {/* Address for center-based */}
                        {location.street && (
                          <p className="text-sm text-muted-foreground">
                            {location.street}
                            {location.postalCode && `, ${location.postalCode}`}
                          </p>
                        )}

                        {/* Get Directions button for center-based locations */}
                        {(serviceMode === "center_based" || serviceMode === "both") && (
                          <DirectionsButton
                            latitude={(location as { latitude?: number }).latitude || null}
                            longitude={(location as { longitude?: number }).longitude || null}
                            address={[location.street, location.city, location.state, location.postalCode].filter(Boolean).join(", ")}
                            className="mt-2"
                          />
                        )}

                        {/* Service radius for in-home */}
                        {(serviceMode === "in_home" || serviceMode === "both") && (
                          <p className="text-xs text-muted-foreground">
                            Service radius: {(location as { serviceRadiusMiles?: number }).serviceRadiusMiles || 25} miles
                          </p>
                        )}

                        {/* Location-specific insurances */}
                        {locationInsurances.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-medium text-muted-foreground">Insurance Accepted:</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {locationInsurances.slice(0, 5).map((ins) => (
                                <Badge key={ins} variant="outline" className="text-xs font-normal">
                                  {ins}
                                </Badge>
                              ))}
                              {locationInsurances.length > 5 && (
                                <span className="text-xs text-muted-foreground">
                                  +{locationInsurances.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              };

              return (
                <Card className="border border-border/80">
                  <CardHeader>
                    <CardTitle>Locations</CardTitle>
                    <CardDescription>
                      {listing.locations.length} service {listing.locations.length === 1 ? "location" : "locations"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Location Section */}
                    {currentLocation && (
                      <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                          {highlightedLocationId ? "You're Viewing This Location" : "Primary Location"}
                        </h4>
                        <ul>
                          {renderLocationItem(currentLocation, true)}
                        </ul>
                      </div>
                    )}

                    {/* Other Locations Section - Compact Links */}
                    {otherLocations.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                          Other Locations ({otherLocations.length})
                        </h4>
                        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-muted/30">
                          {otherLocations.map((location) => {
                            const serviceMode = (location as { serviceMode?: string }).serviceMode;
                            return (
                              <li key={location.id}>
                                <Link
                                  href={`/provider/${listing.slug}?location=${location.id}`}
                                  className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                                >
                                  <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                  <span className="flex-1 text-sm font-medium">
                                    {location.city}, {location.state}
                                  </span>
                                  {serviceMode && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      {serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                                      {serviceMode === "in_home" && <Home className="h-3 w-3" />}
                                      {serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                                      {LOCATION_SERVICE_MODE_LABELS[serviceMode] || serviceMode}
                                    </Badge>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Google Rating Card - Premium only */}
            {isPremium && (() => {
              // Find the first location with Google rating data
              // Prefer the highlighted location if it has a rating
              const highlightedLoc = highlightedLocationId
                ? listing.locations.find(loc => loc.id === highlightedLocationId)
                : null;

              const locationWithRating = highlightedLoc && (highlightedLoc as { googleRating?: number | null }).googleRating
                ? highlightedLoc
                : listing.locations.find(loc => (loc as { googleRating?: number | null }).googleRating);

              if (!locationWithRating) return null;

              const googleRating = (locationWithRating as { googleRating?: number | null }).googleRating;
              const googleRatingCount = (locationWithRating as { googleRatingCount?: number | null }).googleRatingCount;
              const googlePlaceId = (locationWithRating as { googlePlaceId?: string | null }).googlePlaceId;

              if (!googleRating || !googlePlaceId) return null;

              const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;

              return (
                <GoogleRatingCard
                  rating={googleRating}
                  reviewCount={googleRatingCount}
                  googleMapsUrl={googleMapsUrl}
                />
              );
            })()}

            {/* Services Card */}
            {listing.serviceModes.length > 0 && (
              <Card className="border border-border/80">
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {listing.serviceModes.map((mode) => (
                      <li
                        key={mode}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2"
                      >
                        <CheckCircle className="h-4 w-4 text-primary" aria-hidden />
                        {serviceModeLabels[mode] || mode}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Insurances Card */}
            {insurances.length > 0 && (
              <Card className="border border-border/80">
                <CardHeader>
                  <CardTitle>Insurance Accepted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {insurances.map((insurance) => (
                      <Badge key={insurance} variant="outline" className="rounded-full px-4 py-2 text-sm">
                        {insurance}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About Card - Premium only */}
            {isPremium && listing.description && (
              <Card className="border border-border/80">
                <CardHeader>
                  <CardTitle>About {listing.profile.agencyName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p className="whitespace-pre-wrap">{listing.description}</p>

                  {/* Additional Details */}
                  <div className="grid gap-4 pt-4 md:grid-cols-2">
                    {agesServed && (agesServed.min !== undefined || agesServed.max !== undefined) && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ages Served</p>
                        <p className="mt-1 font-medium text-foreground">
                          {agesServed.min ?? 0} - {agesServed.max ?? 18} years
                        </p>
                      </div>
                    )}

                    {languages.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</p>
                        <p className="mt-1 font-medium text-foreground">{languages.join(", ")}</p>
                      </div>
                    )}

                    {diagnoses.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnoses</p>
                        <p className="mt-1 font-medium text-foreground">{diagnoses.join(", ")}</p>
                      </div>
                    )}

                    {clinicalSpecialties.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specialties</p>
                        <p className="mt-1 font-medium text-foreground">{clinicalSpecialties.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photos and Video Card - Premium only */}
            {isPremium && (photoUrls.length > 0 || videoEmbedUrl) && (
              <Card className="border border-border/80">
                <CardHeader>
                  <CardTitle>Photos & Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Video Embed */}
                  {videoEmbedUrl && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Video</p>
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black">
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
                            className="relative aspect-video overflow-hidden rounded-2xl bg-muted/40"
                          >
                            <Image
                              src={url}
                              alt={`${listing.profile.agencyName} photo ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Form - Premium providers with contact form enabled */}
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
