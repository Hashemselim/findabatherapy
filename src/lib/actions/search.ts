"use server";

import {
  searchListings,
  searchLocations,
  searchLocationsWithGooglePlaces,
  getListingsByState,
  getFeaturedListings,
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
  try {
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
  try {
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
  try {
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
  try {
    // This would ideally be a database aggregation
    // For now, we'll return a placeholder
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
  try {
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
  try {
    const result = await searchLocationsWithGooglePlaces(filters, options);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to search locations" };
  }
}
