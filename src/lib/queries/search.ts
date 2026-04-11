import { calculateDistance } from "@/lib/geo/distance";
import type { PlanTier } from "@/lib/plans/features";
import { queryConvexUnauthenticated } from "@/lib/platform/convex/server";

export interface SearchFilters {
  query?: string;
  state?: string;
  city?: string;
  serviceTypes?: string[];
  insurances?: string[];
  languages?: string[];
  agesServed?: { min?: number; max?: number };
  acceptingClients?: boolean;
  userLat?: number;
  userLng?: number;
  radiusMiles?: number;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: "relevance" | "name" | "newest" | "distance";
}

export interface SearchResultListing {
  id: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  serviceModes: string[];
  isAcceptingClients: boolean;
  logoUrl: string | null;
  profile: {
    agencyName: string;
    planTier: PlanTier;
  };
  primaryLocation: {
    city: string;
    state: string;
  } | null;
  attributes: {
    insurances?: string[];
    languages?: string[];
    ages_served?: { min?: number; max?: number };
  };
}

export interface SearchResult {
  listings: SearchResultListing[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export type ServiceType = "in_home" | "in_center" | "telehealth" | "school_based";

export interface SearchResultLocation {
  locationId: string;
  city: string;
  state: string;
  street: string | null;
  postalCode: string | null;
  serviceTypes: ServiceType[];
  insurances: string[];
  serviceRadiusMiles: number;
  isPrimary: boolean;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  listingId: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  isAcceptingClients: boolean;
  logoUrl: string | null;
  agencyName: string;
  planTier: PlanTier;
  otherLocationsCount: number;
  distanceMiles?: number;
  isFeatured: boolean;
  isWithinServiceRadius: boolean;
}

export interface LocationSearchResult {
  locations: SearchResultLocation[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GooglePlacesSearchResult {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  street: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  distanceMiles?: number;
  isPrePopulated: true;
}

export type SearchResultSection = "featured" | "nearby" | "other";

export type CombinedSearchResult =
  | (SearchResultLocation & { isPrePopulated: false; section: SearchResultSection })
  | (GooglePlacesSearchResult & { section: SearchResultSection });

export interface CombinedLocationSearchResult {
  results: CombinedSearchResult[];
  realListingsCount: number;
  googlePlacesCount: number;
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  featuredCount: number;
  nearbyCount: number;
  otherCount: number;
  radiusMiles: number;
}

function normalizeGooglePlacesDistance(
  listing: GooglePlacesSearchResult,
  filters: SearchFilters,
) {
  if (
    typeof filters.userLat !== "number" ||
    typeof filters.userLng !== "number" ||
    typeof listing.latitude !== "number" ||
    typeof listing.longitude !== "number"
  ) {
    return listing;
  }

  return {
    ...listing,
    distanceMiles: calculateDistance(
      { latitude: filters.userLat, longitude: filters.userLng },
      { latitude: listing.latitude, longitude: listing.longitude },
    ),
  };
}

export async function searchListings(
  filters: SearchFilters,
  options: SearchOptions = {},
): Promise<SearchResult> {
  return queryConvexUnauthenticated<SearchResult>("listings:searchProviders", {
    filters,
    options,
  });
}

export async function getListingsByState(
  state: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  return queryConvexUnauthenticated<SearchResult>("listings:getStateProviders", {
    state,
    options,
  });
}

export async function getFeaturedListings(
  limit = 6,
): Promise<SearchResultListing[]> {
  return queryConvexUnauthenticated<SearchResultListing[]>(
    "listings:getHomepageFeaturedProviders",
    { limit },
  );
}

export async function getHomepageFeaturedListings(
  limit = 3,
): Promise<SearchResultListing[]> {
  return queryConvexUnauthenticated<SearchResultListing[]>(
    "listings:getHomepageFeaturedProviders",
    { limit },
  );
}

export async function searchLocations(
  filters: SearchFilters,
  options: SearchOptions = {},
): Promise<LocationSearchResult> {
  return queryConvexUnauthenticated<LocationSearchResult>(
    "listings:searchProviderLocations",
    { filters, options },
  );
}

export async function searchGooglePlacesLocations(
  filters: SearchFilters,
  options: SearchOptions = {},
): Promise<{ listings: GooglePlacesSearchResult[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;
  const result = await queryConvexUnauthenticated<{
    listings: GooglePlacesSearchResult[];
    total: number;
  }>("listings:searchGooglePlacesListings", {
    state: filters.state,
    city:
      typeof filters.userLat === "number" && typeof filters.userLng === "number"
        ? undefined
        : filters.city,
    limit,
    offset,
  });

  const queryLower = filters.query?.trim().toLowerCase();
  const listings = result.listings
    .map((listing) => normalizeGooglePlacesDistance(listing, filters))
    .filter((listing) => {
      if (!queryLower) {
        return true;
      }

      return (
        listing.name.toLowerCase().includes(queryLower) ||
        listing.city.toLowerCase().includes(queryLower) ||
        listing.state.toLowerCase().includes(queryLower)
      );
    })
    .sort(
      (left, right) =>
        (left.distanceMiles ?? Number.POSITIVE_INFINITY) -
        (right.distanceMiles ?? Number.POSITIVE_INFINITY),
    );

  return {
    listings,
    total: result.total,
  };
}

export async function searchLocationsWithGooglePlaces(
  filters: SearchFilters,
  options: SearchOptions = {},
): Promise<CombinedLocationSearchResult> {
  return queryConvexUnauthenticated<CombinedLocationSearchResult>(
    "listings:searchProviderLocationsWithGooglePlaces",
    { filters, options },
  );
}
