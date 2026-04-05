"use server";

import { isConvexDataEnabled } from "@/lib/platform/config";

import {
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
  type SearchResultListing,
  type LocationSearchResult,
  type CombinedLocationSearchResult,
} from "@/lib/queries/search";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Search for providers with filters
 */
export async function searchProviders(
  filters: SearchFilters,
  options?: SearchOptions
): Promise<ActionResult<SearchResult>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<SearchResult>("listings:searchProviders", { filters, options });
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to search providers" };
    }
  }

  try {
    const { searchListings } = await import("@/lib/queries/search");
    const result = await searchListings(filters, options);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to search providers" };
  }
}

/**
 * Get providers in a specific state
 */
export async function getStateProviders(
  state: string,
  options?: SearchOptions
): Promise<ActionResult<SearchResult>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<SearchResult>("listings:getStateProviders", { state, options });
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to get providers" };
    }
  }

  try {
    const { getListingsByState } = await import("@/lib/queries/search");
    const result = await getListingsByState(state, options);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to get providers" };
  }
}

/**
 * Get featured providers for homepage
 */
export async function getHomepageFeaturedProviders(
  limit?: number
): Promise<ActionResult<SearchResultListing[]>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<SearchResultListing[]>("listings:getHomepageFeaturedProviders", { limit });
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to get featured providers" };
    }
  }

  try {
    const { getFeaturedListings } = await import("@/lib/queries/search");
    const result = await getFeaturedListings(limit);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to get featured providers" };
  }
}

/**
 * Get provider count by state for state pages
 */
export async function getProviderCountByState(): Promise<
  ActionResult<Record<string, number>>
> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<Record<string, number>>("listings:getProviderCountByState", {});
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to get provider counts" };
    }
  }

  try {
    return {
      success: true,
      data: {},
    };
  } catch {
    return { success: false, error: "Failed to get provider counts" };
  }
}

/**
 * Search for locations with filters - returns one result per location
 * This is the new location-based search for the updated UI
 */
export async function searchProviderLocations(
  filters: SearchFilters,
  options?: SearchOptions
): Promise<ActionResult<LocationSearchResult>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<LocationSearchResult>("listings:searchProviderLocations", { filters, options });
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to search locations" };
    }
  }

  try {
    const { searchLocations } = await import("@/lib/queries/search");
    const result = await searchLocations(filters, options);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to search locations" };
  }
}

/**
 * Search for locations with Google Places - returns combined results
 * Real listings appear first, followed by pre-populated Google Places listings
 */
export async function searchProviderLocationsWithGooglePlaces(
  filters: SearchFilters,
  options?: SearchOptions
): Promise<ActionResult<CombinedLocationSearchResult>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<CombinedLocationSearchResult>("listings:searchProviderLocationsWithGooglePlaces", { filters, options });
      return { success: true, data: result };
    } catch {
      return { success: false, error: "Failed to search locations" };
    }
  }

  try {
    const { searchLocationsWithGooglePlaces } = await import("@/lib/queries/search");
    const result = await searchLocationsWithGooglePlaces(filters, options);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to search locations" };
  }
}
