"use client";

import Link from "next/link";
import { MapPin, CheckCircle, BadgeCheck, Building2, Home, Navigation, Star, AlertCircle, ExternalLink, Globe, Video, GraduationCap, ShieldQuestion } from "lucide-react";

import { ProviderLogo } from "@/components/provider/provider-logo";
import { Badge } from "@/components/ui/badge";
import { FeaturedBadge } from "@/components/ui/featured-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchResultListing, SearchResultLocation, GooglePlacesSearchResult, CombinedSearchResult } from "@/lib/queries/search";
import { trackSearchResultClick } from "@/hooks/use-track-view";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo/distance";

// Legacy listing-based results interface
interface ListingSearchResultsProps {
  listings: SearchResultListing[];
  searchQuery?: string;
  className?: string;
}

// New location-based results interface
interface LocationSearchResultsProps {
  locations: SearchResultLocation[];
  searchQuery?: string;
  className?: string;
}

// Combined results interface (real + Google Places)
interface CombinedSearchResultsProps {
  results: CombinedSearchResult[];
  searchQuery?: string;
  className?: string;
  radiusMiles?: number;
  hasProximitySearch?: boolean; // Whether user provided coordinates
}

// Union type for all result types
type SearchResultsProps = ListingSearchResultsProps | LocationSearchResultsProps | CombinedSearchResultsProps;

function isLocationResults(props: SearchResultsProps): props is LocationSearchResultsProps {
  return "locations" in props;
}

function isCombinedResults(props: SearchResultsProps): props is CombinedSearchResultsProps {
  return "results" in props;
}

export function SearchResults(props: SearchResultsProps) {
  const { searchQuery, className } = props;

  // Handle combined results (real + Google Places)
  if (isCombinedResults(props)) {
    const { results, radiusMiles = 25, hasProximitySearch = false } = props;

    if (results.length === 0) {
      return (
        <div className={cn("py-12 text-center", className)}>
          <p className="text-lg font-medium text-foreground">No providers found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters or search in a different location
          </p>
        </div>
      );
    }

    // Group results by section
    const featured = results.filter((r) => r.section === "featured");
    const nearby = results.filter((r) => r.section === "nearby");
    const other = results.filter((r) => r.section === "other");

    // Helper to render a result card
    const renderResultCard = (result: CombinedSearchResult, index: number) => {
      if (result.isPrePopulated) {
        return (
          <GooglePlacesResultCard
            key={result.id}
            listing={result}
            position={index + 1}
            searchQuery={searchQuery}
          />
        );
      } else {
        return (
          <LocationResultCard
            key={`${result.listingId}-${result.locationId}`}
            location={result}
            position={index + 1}
            searchQuery={searchQuery}
          />
        );
      }
    };

    // Calculate starting positions for each section
    let currentPosition = 0;

    // When no proximity search (no user coordinates), don't show distance-based section headers
    // All non-featured results go into "nearby" section without the distance header
    const showDistanceSections = hasProximitySearch;

    return (
      <div className={cn("flex flex-col gap-8", className)}>
        {/* Featured Section - always show if present */}
        {featured.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#FEE720]/50 bg-[#FFF5C2]/30">
                <Star className="h-3.5 w-3.5 fill-[#5788FF] text-[#5788FF]" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Featured Providers</h2>
            </div>
            <div className="flex flex-col gap-4">
              {featured.map((result, idx) => {
                const position = currentPosition + idx;
                return renderResultCard(result, position);
              })}
            </div>
            {(() => { currentPosition += featured.length; return null; })()}
          </section>
        )}

        {/* Nearby Section */}
        {nearby.length > 0 && (
          <section>
            {/* Only show distance header when we have proximity search */}
            {showDistanceSections && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5788FF]/10">
                  <Navigation className="h-5 w-5 text-[#5788FF]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Providers within {radiusMiles} miles
                </h2>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {nearby.map((result, idx) => {
                const position = currentPosition + idx;
                return renderResultCard(result, position);
              })}
            </div>
            {(() => { currentPosition += nearby.length; return null; })()}
          </section>
        )}

        {/* Other Section - only show when we have proximity search (distance matters) */}
        {showDistanceSections && other.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-muted-foreground">
                Other providers more than {radiusMiles} miles away
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {other.map((result, idx) => {
                const position = currentPosition + idx;
                return renderResultCard(result, position);
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (isLocationResults(props)) {
    // New location-based results
    const { locations } = props;

    if (locations.length === 0) {
      return (
        <div className={cn("py-12 text-center", className)}>
          <p className="text-lg font-medium text-foreground">No providers found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters or search in a different location
          </p>
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-6", className)}>
        {locations.map((location, index) => (
          <LocationResultCard
            key={`${location.listingId}-${location.locationId}`}
            location={location}
            position={index + 1}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    );
  }

  // Legacy listing-based results
  const { listings } = props;

  if (listings.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-lg font-medium text-foreground">No providers found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your filters or search in a different location
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {listings.map((listing, index) => (
        <SearchResultCard
          key={listing.id}
          listing={listing}
          position={index + 1}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

// New location-based result card
interface LocationResultCardProps {
  location: SearchResultLocation;
  position: number;
  searchQuery?: string;
}

function LocationResultCard({ location, position, searchQuery }: LocationResultCardProps) {
  const isPremium = location.planTier !== "free";
  const hasInHomeService = location.serviceTypes?.includes("in_home");
  const hasCenterService = location.serviceTypes?.includes("in_center") || location.serviceTypes?.includes("school_based");

  // Build location display based on service types
  const displayAddress =
    hasInHomeService && !hasCenterService
      ? `Serves ${location.city} area`
      : location.street
        ? `${location.street}, ${location.city}, ${location.state}`
        : `${location.city}, ${location.state}`;

  const handleClick = () => {
    trackSearchResultClick(
      location.listingId,
      position,
      searchQuery,
      location.locationId,
      location.agencyName,
      location.isFeatured
    );
  };

  return (
    <Link
      href={`/provider/${location.slug}?location=${location.locationId}`}
      onClick={handleClick}
      className="group"
    >
      <Card
        className={cn(
          "border-border/60 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)] active:translate-y-0 active:shadow-none",
          location.isFeatured && "border-[#FEE720]/50 bg-[#FFF5C2]/30 hover:border-[#FEE720] hover:shadow-[0_8px_30px_rgba(254,231,32,0.15)]",
          !location.isFeatured && isPremium && "border-[#5788FF]/20 hover:border-[#5788FF]/40",
          !location.isFeatured && !isPremium && "hover:border-[#5788FF]/30"
        )}
      >
        <CardContent className="flex gap-4 p-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <ProviderLogo
              name={location.agencyName}
              logoUrl={location.logoUrl ?? undefined}
              size="md"
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                {location.agencyName}
              </h3>
              {/* Verified badge - shown for paid tiers */}
              {isPremium && (
                <Badge variant="outline" className="gap-1 border-[#5788FF] text-[#5788FF] transition-all duration-300 ease-premium group-hover:scale-[1.02] group-hover:bg-[#5788FF]/5">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {/* Google rating badge - shown for paid accounts that linked their Google Business */}
              {isPremium && location.googleRating && (
                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {location.googleRating.toFixed(1)}
                  {location.googleRatingCount && (
                    <span className="text-amber-600/70">({location.googleRatingCount})</span>
                  )}
                </Badge>
              )}
              {location.isAcceptingClients && (
                <Badge variant="secondary" className="text-xs">
                  Accepting Clients
                </Badge>
              )}
            </div>

            {/* Location */}
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {displayAddress}
              {location.otherLocationsCount > 0 && (
                <span className="ml-2 text-xs text-[#5788FF]">
                  +{location.otherLocationsCount} other location{location.otherLocationsCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Distance - handle service mode and coverage */}
            {location.distanceMiles !== undefined && (
              <div className={cn(
                "mt-1 flex items-center gap-1 text-sm font-medium",
                location.isWithinServiceRadius ? "text-[#5788FF]" : "text-muted-foreground"
              )}>
                <Navigation className="h-3.5 w-3.5" />
                <span>{formatDistance(location.distanceMiles)} away</span>
                {/* Show warning for in-home services outside coverage area */}
                {hasInHomeService && !location.isWithinServiceRadius && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    may not serve your area
                  </span>
                )}
              </div>
            )}

            {/* Headline */}
            {location.headline && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {location.headline}
              </p>
            )}

            {/* Service type badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Center-based indicator */}
              {location.serviceTypes?.includes("in_center") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  Center-Based
                </span>
              )}
              {/* In-home indicator */}
              {location.serviceTypes?.includes("in_home") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
                  <Home className="h-3 w-3" />
                  In-Home ({location.serviceRadiusMiles} mi)
                </span>
              )}
              {/* Telehealth indicator */}
              {location.serviceTypes?.includes("telehealth") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#5788FF]/10 px-2.5 py-0.5 text-xs text-[#5788FF]">
                  <Video className="h-3 w-3" />
                  Telehealth
                </span>
              )}
              {/* School-based indicator */}
              {location.serviceTypes?.includes("school_based") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700">
                  <GraduationCap className="h-3 w-3" />
                  School-Based
                </span>
              )}
            </div>

            {/* Insurances */}
            {location.insurances && location.insurances.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">Insurance:</span>{" "}
                {location.insurances.slice(0, 3).join(", ")}
                {location.insurances.length > 3 &&
                  ` +${location.insurances.length - 3} more`}
              </p>
            )}
          </div>

          {/* Featured badge on right side for desktop */}
          {location.isFeatured && (
            <div className="hidden flex-shrink-0 sm:block">
              <FeaturedBadge withHover />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Legacy listing-based result card (kept for backward compatibility)
interface SearchResultCardProps {
  listing: SearchResultListing;
  position: number;
  searchQuery?: string;
}

function SearchResultCard({ listing, position, searchQuery }: SearchResultCardProps) {
  const isPremium = listing.profile.planTier !== "free";

  const handleClick = () => {
    trackSearchResultClick(listing.id, position, searchQuery);
  };

  return (
    <Link href={`/provider/${listing.slug}`} onClick={handleClick} className="group">
      <Card
        className={cn(
          "border-border/60 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)] active:translate-y-0 active:shadow-none",
          isPremium && "border-[#5788FF]/20 hover:border-[#5788FF]/40",
          !isPremium && "hover:border-[#5788FF]/30"
        )}
      >
        <CardContent className="flex gap-4 p-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <ProviderLogo
              name={listing.profile.agencyName}
              logoUrl={listing.logoUrl ?? undefined}
              size="md"
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                {listing.profile.agencyName}
              </h3>
              {isPremium && (
                <Badge variant="outline" className="gap-1 border-[#5788FF] text-[#5788FF] transition-all duration-300 ease-premium group-hover:scale-[1.02] group-hover:bg-[#5788FF]/5">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {listing.isAcceptingClients && (
                <Badge variant="secondary" className="text-xs">
                  Accepting Clients
                </Badge>
              )}
            </div>

            {/* Location */}
            {listing.primaryLocation && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {listing.primaryLocation.city}, {listing.primaryLocation.state}
              </div>
            )}

            {/* Headline */}
            {listing.headline && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {listing.headline}
              </p>
            )}

            {/* Service modes */}
            {listing.serviceModes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.serviceModes.slice(0, 3).map((mode) => (
                  <span
                    key={mode}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {mode}
                  </span>
                ))}
                {listing.serviceModes.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{listing.serviceModes.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Insurances */}
            {listing.attributes.insurances &&
              listing.attributes.insurances.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Insurance:</span>{" "}
                  {listing.attributes.insurances.slice(0, 3).join(", ")}
                  {listing.attributes.insurances.length > 3 &&
                    ` +${listing.attributes.insurances.length - 3} more`}
                </p>
              )}
          </div>

          {/* Plan Badge */}
          {listing.profile.planTier === "enterprise" && (
            <div className="hidden flex-shrink-0 sm:block">
              <FeaturedBadge withHover />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface SearchResultsSkeletonProps {
  count?: number;
}

export function SearchResultsSkeleton({ count = 5 }: SearchResultsSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="flex gap-4 p-4">
            <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-1/3 rounded bg-muted" />
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Google Places (pre-populated) result card
interface GooglePlacesResultCardProps {
  listing: GooglePlacesSearchResult;
  position: number;
  searchQuery?: string;
}

function GooglePlacesResultCard({ listing, position, searchQuery }: GooglePlacesResultCardProps) {
  // Build display address
  const displayAddress = listing.street
    ? `${listing.street}, ${listing.city}, ${listing.state}`
    : `${listing.city}, ${listing.state}`;

  return (
    <Link href={`/provider/p/${listing.slug}?ref=findabatherapy`} className="group">
      <Card className="border-dashed border-muted-foreground/30 transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-[#5788FF]/40 hover:shadow-[0_8px_30px_rgba(87,136,255,0.08)] active:translate-y-0 active:shadow-none">
        <CardContent className="flex gap-4 p-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <ProviderLogo
              name={listing.name}
              size="md"
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                {listing.name}
              </h3>
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground transition-all duration-300 ease-premium group-hover:border-[#5788FF]/30 group-hover:text-[#5788FF]">
                Directory
              </Badge>
              {listing.googleRating && (
                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {listing.googleRating}
                </Badge>
              )}
            </div>

            {/* Location */}
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {displayAddress}
            </div>

            {/* Distance */}
            {listing.distanceMiles !== undefined && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Navigation className="h-3.5 w-3.5" />
                <span>{formatDistance(listing.distanceMiles)} away</span>
              </div>
            )}

            {/* Info badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {listing.website && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  Website Available
                </span>
              )}
              {/* Insurance not listed notice - subtle amber styling to draw attention without alarm */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/50 px-2.5 py-0.5 text-xs text-amber-700/80 transition-colors duration-200 group-hover:border-amber-300/70 group-hover:bg-amber-50">
                <ShieldQuestion className="h-3 w-3 text-amber-500/70" />
                <span>Insurance not listed</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                Contact via external site
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
