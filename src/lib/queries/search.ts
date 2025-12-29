import { createClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/plans/features";
import { calculateDistance } from "@/lib/geo/distance";
import { STATE_NAMES, STATE_SLUG_TO_ABBREV } from "@/lib/data/cities";

/**
 * Get both state name and abbreviation for a given state input
 * Handles: "New Jersey", "NJ", "new-jersey" -> ["New Jersey", "NJ"]
 */
function getStateForms(state: string): { name: string; abbrev: string } | null {
  if (!state) return null;

  const normalized = state.trim();

  // Check if it's an abbreviation (2 letters)
  const upper = normalized.toUpperCase();
  if (upper.length === 2 && STATE_NAMES[upper]) {
    return { name: STATE_NAMES[upper], abbrev: upper };
  }

  // Check if it's a slug (e.g., "new-jersey")
  const slugLower = normalized.toLowerCase().replace(/\s+/g, "-");
  if (STATE_SLUG_TO_ABBREV[slugLower]) {
    const abbrev = STATE_SLUG_TO_ABBREV[slugLower];
    return { name: STATE_NAMES[abbrev], abbrev };
  }

  // Check if it's a full state name (case insensitive)
  for (const [abbrev, name] of Object.entries(STATE_NAMES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return { name, abbrev };
    }
  }

  // Not found - return the input as-is for both (fallback)
  return null;
}

export interface SearchFilters {
  query?: string;
  state?: string;
  city?: string;
  serviceModes?: string[];
  insurances?: string[];
  languages?: string[];
  agesServed?: { min?: number; max?: number };
  acceptingClients?: boolean;
  // Proximity search
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

// New location-based search result types
export type LocationServiceMode = "center_based" | "in_home" | "both";

export interface SearchResultLocation {
  // Location-specific data
  locationId: string;
  city: string;
  state: string;
  street: string | null;
  postalCode: string | null;
  serviceMode: LocationServiceMode;
  insurances: string[];
  serviceRadiusMiles: number;
  isPrimary: boolean;
  latitude: number | null;
  longitude: number | null;

  // Google Business integration (for paid accounts that linked their profile)
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;

  // Parent listing data
  listingId: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  isAcceptingClients: boolean;
  logoUrl: string | null;

  // Profile data
  agencyName: string;
  planTier: PlanTier;

  // Aggregated data
  otherLocationsCount: number;

  // Distance (populated when proximity search is used)
  distanceMiles?: number;

  // Featured status (per-location featured subscription)
  isFeatured: boolean;

  // Whether user is within this location's service radius (for in-home services)
  isWithinServiceRadius: boolean;
}

export interface LocationSearchResult {
  locations: SearchResultLocation[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Search for published listings with filters
 */
export async function searchListings(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const supabase = await createClient();

  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;
  const sortBy = options.sortBy || "relevance";

  // Base query for published listings
  let query = supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      headline,
      summary,
      service_modes,
      is_accepting_clients,
      logo_url,
      created_at,
      profiles!inner (
        agency_name,
        plan_tier
      ),
      locations!inner (
        city,
        state,
        is_primary
      ),
      listing_attribute_values (
        attribute_key,
        value_json
      )
    `,
      { count: "exact" }
    )
    .eq("status", "published");

  // Apply state filter - match both full name and abbreviation for flexibility
  if (filters.state) {
    const stateForms = getStateForms(filters.state);
    if (stateForms) {
      // Match either the full state name OR the abbreviation
      query = query.or(`state.eq.${stateForms.name},state.eq.${stateForms.abbrev}`, { referencedTable: "locations" });
    } else {
      query = query.eq("locations.state", filters.state);
    }
  }

  // Apply city filter
  if (filters.city) {
    query = query.ilike("locations.city", `%${filters.city}%`);
  }

  // Apply accepting clients filter
  if (filters.acceptingClients !== undefined) {
    query = query.eq("is_accepting_clients", filters.acceptingClients);
  }

  // Apply service modes filter
  if (filters.serviceModes && filters.serviceModes.length > 0) {
    query = query.overlaps("service_modes", filters.serviceModes);
  }

  // Apply sorting
  switch (sortBy) {
    case "name":
      // Note: Sorting by related table requires raw SQL or post-processing
      query = query.order("created_at", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "relevance":
    default:
      // Priority: Enterprise > Pro > Free, then by created_at
      // This needs to be done via raw SQL or post-processing
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return {
      listings: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  // Transform results
  const listings: SearchResultListing[] = (data || []).map((listing) => {
    const profile = listing.profiles as unknown as {
      agency_name: string;
      plan_tier: string;
    };

    const locations = listing.locations as unknown as Array<{
      city: string;
      state: string;
      is_primary: boolean;
    }>;

    const primaryLocation = locations.find((l) => l.is_primary) || locations[0];

    const attributes = listing.listing_attribute_values as unknown as Array<{
      attribute_key: string;
      value_json: unknown;
    }>;

    // Build attributes object
    const attributesObj: SearchResultListing["attributes"] = {};
    for (const attr of attributes || []) {
      if (attr.attribute_key === "insurances") {
        attributesObj.insurances = attr.value_json as string[];
      } else if (attr.attribute_key === "languages") {
        attributesObj.languages = attr.value_json as string[];
      } else if (attr.attribute_key === "ages_served") {
        attributesObj.ages_served = attr.value_json as { min?: number; max?: number };
      }
    }

    return {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url,
      profile: {
        agencyName: profile.agency_name,
        planTier: profile.plan_tier as PlanTier,
      },
      primaryLocation: primaryLocation
        ? { city: primaryLocation.city, state: primaryLocation.state }
        : null,
      attributes: attributesObj,
    };
  });

  // Sort by plan tier priority (Enterprise > Pro > Free)
  const tierPriority: Record<PlanTier, number> = {
    enterprise: 3,
    pro: 2,
    free: 1,
  };

  listings.sort((a, b) => {
    const priorityDiff = tierPriority[b.profile.planTier] - tierPriority[a.profile.planTier];
    if (priorityDiff !== 0) return priorityDiff;
    return 0; // Keep original order for same tier
  });

  // Apply text filters client-side (for query and complex filters)
  let filteredListings = listings;

  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    filteredListings = filteredListings.filter(
      (l) =>
        l.profile.agencyName.toLowerCase().includes(queryLower) ||
        l.headline?.toLowerCase().includes(queryLower) ||
        l.summary?.toLowerCase().includes(queryLower)
    );
  }

  if (filters.insurances && filters.insurances.length > 0) {
    filteredListings = filteredListings.filter((l) =>
      filters.insurances!.some((ins) => l.attributes.insurances?.includes(ins))
    );
  }

  if (filters.languages && filters.languages.length > 0) {
    filteredListings = filteredListings.filter((l) =>
      filters.languages!.some((lang) => l.attributes.languages?.includes(lang))
    );
  }

  const total = count || filteredListings.length;
  const totalPages = Math.ceil(total / limit);

  return {
    listings: filteredListings,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Get listings for a specific state
 */
export async function getListingsByState(
  state: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  return searchListings({ state }, options);
}

/**
 * Get featured listings for homepage (Enterprise and Pro)
 */
export async function getFeaturedListings(limit: number = 6): Promise<SearchResultListing[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      headline,
      summary,
      service_modes,
      is_accepting_clients,
      logo_url,
      profiles!inner (
        agency_name,
        plan_tier
      ),
      locations!inner (
        city,
        state,
        is_primary
      )
    `
    )
    .eq("status", "published")
    .in("profiles.plan_tier", ["enterprise", "pro"])
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((listing) => {
    const profile = listing.profiles as unknown as {
      agency_name: string;
      plan_tier: string;
    };

    const locations = listing.locations as unknown as Array<{
      city: string;
      state: string;
      is_primary: boolean;
    }>;

    const primaryLocation = locations.find((l) => l.is_primary) || locations[0];

    return {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url,
      profile: {
        agencyName: profile.agency_name,
        planTier: profile.plan_tier as PlanTier,
      },
      primaryLocation: primaryLocation
        ? { city: primaryLocation.city, state: primaryLocation.state }
        : null,
      attributes: {},
    };
  });
}

/**
 * Get Enterprise-only listings for homepage featured section
 * Returns one card per company (not per location)
 */
export async function getHomepageFeaturedListings(limit: number = 3): Promise<SearchResultListing[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      headline,
      summary,
      service_modes,
      is_accepting_clients,
      logo_url,
      profiles!inner (
        agency_name,
        plan_tier
      ),
      locations (
        city,
        state,
        is_primary
      )
    `
    )
    .eq("status", "published")
    .eq("profiles.plan_tier", "enterprise")
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Deduplicate by listing ID (in case query returns duplicates)
  const seenIds = new Set<string>();
  const uniqueListings = data.filter((listing) => {
    if (seenIds.has(listing.id)) return false;
    seenIds.add(listing.id);
    return true;
  });

  return uniqueListings.map((listing) => {
    const profile = listing.profiles as unknown as {
      agency_name: string;
      plan_tier: string;
    };

    const locations = (listing.locations || []) as unknown as Array<{
      city: string;
      state: string;
      is_primary: boolean;
    }>;

    const primaryLocation = locations.find((l) => l.is_primary) || locations[0];

    return {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url,
      profile: {
        agencyName: profile.agency_name,
        planTier: profile.plan_tier as PlanTier,
      },
      primaryLocation: primaryLocation
        ? { city: primaryLocation.city, state: primaryLocation.state }
        : null,
      attributes: {},
    };
  });
}

/**
 * Search for locations with filters - returns one result per location
 * This is the new location-based search that shows each location as a separate result
 */
export async function searchLocations(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<LocationSearchResult> {
  const supabase = await createClient();

  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  // Check if proximity search is requested
  const hasProximitySearch =
    filters.userLat !== undefined &&
    filters.userLng !== undefined;

  // Query locations directly with joined listing data
  let query = supabase
    .from("locations")
    .select(
      `
      id,
      city,
      state,
      street,
      postal_code,
      latitude,
      longitude,
      service_mode,
      insurances,
      service_radius_miles,
      is_primary,
      is_featured,
      listing_id,
      google_place_id,
      google_rating,
      google_rating_count,
      listings!inner (
        id,
        slug,
        headline,
        summary,
        is_accepting_clients,
        logo_url,
        status,
        profiles!inner (
          agency_name,
          plan_tier
        )
      )
    `,
      { count: "exact" }
    )
    .eq("listings.status", "published");

  // Note: We no longer filter by radius/bounding box - we show all providers in state
  // and sort by distance instead. This ensures rural areas always have results.

  // Apply state filter - match both full name and abbreviation for flexibility
  // This handles data that may use "NJ" or "New Jersey" inconsistently
  if (filters.state) {
    const stateForms = getStateForms(filters.state);
    if (stateForms) {
      // Match either the full state name OR the abbreviation
      query = query.or(`state.eq.${stateForms.name},state.eq.${stateForms.abbrev}`);
    } else {
      // Fallback: exact match if state not recognized
      query = query.eq("state", filters.state);
    }
  }

  // NOTE: We intentionally do NOT filter by city for state-wide search
  // The city is only used for display purposes (showing "near Edison, NJ")
  // All providers in the state are shown and sorted by distance
  // This ensures users see results even if there are no providers in their exact city

  // Apply service mode filter - now on location
  if (filters.serviceModes && filters.serviceModes.length > 0) {
    // Map old service modes to new location service_mode
    const locationModes: string[] = [];
    if (filters.serviceModes.includes("in_home")) {
      locationModes.push("in_home", "both");
    }
    if (filters.serviceModes.includes("in_center")) {
      locationModes.push("center_based", "both");
    }
    if (locationModes.length > 0) {
      query = query.in("service_mode", Array.from(new Set(locationModes)));
    }
  }

  // Apply insurance filter - now on location
  if (filters.insurances && filters.insurances.length > 0) {
    query = query.overlaps("insurances", filters.insurances);
  }

  // Apply accepting clients filter
  if (filters.acceptingClients !== undefined) {
    query = query.eq("listings.is_accepting_clients", filters.acceptingClients);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return {
      locations: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    };
  }

  // We need to get location counts per listing for the "other locations" indicator
  // First, get unique listing IDs
  const listingIds = Array.from(new Set((data || []).map((loc) => loc.listing_id)));

  // Get location counts per listing
  const locationCounts: Record<string, number> = {};
  if (listingIds.length > 0) {
    const { data: countData } = await supabase
      .from("locations")
      .select("listing_id")
      .in("listing_id", listingIds);

    if (countData) {
      for (const loc of countData) {
        locationCounts[loc.listing_id] = (locationCounts[loc.listing_id] || 0) + 1;
      }
    }
  }

  // Transform results
  const locations: SearchResultLocation[] = (data || []).map((location) => {
    const listing = location.listings as unknown as {
      id: string;
      slug: string;
      headline: string | null;
      summary: string | null;
      is_accepting_clients: boolean;
      logo_url: string | null;
      profiles: {
        agency_name: string;
        plan_tier: string;
      };
    };

    const totalLocations = locationCounts[location.listing_id] || 1;
    const serviceRadiusMiles = location.service_radius_miles || 25;
    const serviceMode = (location.service_mode as LocationServiceMode) || "both";

    // Calculate distance if proximity search is active
    let distanceMiles: number | undefined;
    if (
      hasProximitySearch &&
      location.latitude != null &&
      location.longitude != null
    ) {
      distanceMiles = calculateDistance(
        { latitude: filters.userLat!, longitude: filters.userLng! },
        { latitude: location.latitude, longitude: location.longitude }
      );
    }

    // Determine if user is within this location's service radius
    // For center-based only, always true (they have a physical location)
    // For in-home or both, check if user is within provider's service radius
    const isWithinServiceRadius =
      serviceMode === "center_based" ||
      (distanceMiles !== undefined && distanceMiles <= serviceRadiusMiles);

    return {
      locationId: location.id,
      city: location.city,
      state: location.state,
      street: location.street,
      postalCode: location.postal_code,
      latitude: location.latitude,
      longitude: location.longitude,
      serviceMode,
      insurances: (location.insurances as string[]) || [],
      serviceRadiusMiles,
      isPrimary: location.is_primary,
      googlePlaceId: location.google_place_id,
      googleRating: location.google_rating,
      googleRatingCount: location.google_rating_count,
      listingId: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      summary: listing.summary,
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url,
      agencyName: listing.profiles.agency_name,
      planTier: listing.profiles.plan_tier as PlanTier,
      otherLocationsCount: totalLocations - 1,
      distanceMiles,
      isFeatured: location.is_featured || false,
      isWithinServiceRadius,
    };
  });

  // No radius filtering - we show all providers in state and sort by distance
  // This ensures rural areas always have results

  // Sort results by: Featured → Paid (Enterprise/Pro equal) → Free → Distance
  locations.sort((a, b) => {
    // 1. Featured locations first (per-location is_featured flag)
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;

    // 2. Paid tiers (Enterprise OR Pro) vs Free
    // Enterprise and Pro have EQUAL priority
    const aIsPaid = a.planTier !== "free";
    const bIsPaid = b.planTier !== "free";
    if (aIsPaid && !bIsPaid) return -1;
    if (!aIsPaid && bIsPaid) return 1;

    // 3. Sort by distance (closest first)
    const distA = a.distanceMiles ?? Infinity;
    const distB = b.distanceMiles ?? Infinity;
    return distA - distB;
  });

  // Apply text filter client-side
  let filteredLocations = locations;

  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    filteredLocations = filteredLocations.filter(
      (l) =>
        l.agencyName.toLowerCase().includes(queryLower) ||
        l.headline?.toLowerCase().includes(queryLower) ||
        l.summary?.toLowerCase().includes(queryLower) ||
        l.city.toLowerCase().includes(queryLower)
    );
  }

  const total = count || filteredLocations.length;
  const totalPages = Math.ceil(total / limit);

  return {
    locations: filteredLocations,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Pre-populated Google Places listing result type
 */
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
  isPrePopulated: true; // Always true for Google Places listings
}

/**
 * Combined search result that can be either a real location or a Google Places listing
 */
export type CombinedSearchResult =
  | (SearchResultLocation & { isPrePopulated: false })
  | GooglePlacesSearchResult;

export interface CombinedLocationSearchResult {
  results: CombinedSearchResult[];
  realListingsCount: number;
  googlePlacesCount: number;
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Search for Google Places listings only
 */
export async function searchGooglePlacesLocations(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<{ listings: GooglePlacesSearchResult[]; total: number }> {
  const supabase = await createClient();

  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("google_places_listings")
    .select("*", { count: "exact" })
    .eq("status", "active");

  // Apply state filter
  if (filters.state) {
    const stateForms = getStateForms(filters.state);
    if (stateForms) {
      query = query.or(`state.eq.${stateForms.name},state.eq.${stateForms.abbrev}`);
    } else {
      query = query.eq("state", filters.state);
    }
  }

  // Apply city filter (loose match)
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  // Order by rating (best first) then name
  query = query
    .order("google_rating", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { listings: [], total: 0 };
  }

  // Transform and calculate distances if proximity search
  const hasProximitySearch =
    filters.userLat !== undefined && filters.userLng !== undefined;

  const listings: GooglePlacesSearchResult[] = (data || []).map((gp) => {
    let distanceMiles: number | undefined;
    if (
      hasProximitySearch &&
      gp.latitude != null &&
      gp.longitude != null
    ) {
      distanceMiles = calculateDistance(
        { latitude: filters.userLat!, longitude: filters.userLng! },
        { latitude: gp.latitude, longitude: gp.longitude }
      );
    }

    return {
      id: gp.id,
      slug: gp.slug,
      name: gp.name,
      city: gp.city,
      state: gp.state,
      street: gp.street,
      postalCode: gp.postal_code,
      latitude: gp.latitude,
      longitude: gp.longitude,
      phone: gp.phone,
      website: gp.website,
      googleRating: gp.google_rating,
      googleRatingCount: gp.google_rating_count,
      distanceMiles,
      isPrePopulated: true as const,
    };
  });

  // Apply text filter client-side
  let filteredListings = listings;
  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    filteredListings = filteredListings.filter(
      (l) =>
        l.name.toLowerCase().includes(queryLower) ||
        l.city.toLowerCase().includes(queryLower)
    );
  }

  // Sort by distance if available
  if (hasProximitySearch) {
    filteredListings.sort((a, b) => {
      const distA = a.distanceMiles ?? Infinity;
      const distB = b.distanceMiles ?? Infinity;
      return distA - distB;
    });
  }

  return {
    listings: filteredListings,
    total: count || filteredListings.length,
  };
}

/**
 * Combined search that returns both real listings and Google Places listings
 * Real listings always appear first, followed by Google Places listings
 */
export async function searchLocationsWithGooglePlaces(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<CombinedLocationSearchResult> {
  const page = options.page || 1;
  const limit = options.limit || 20;

  // Fetch real listings first
  const realResults = await searchLocations(filters, { ...options, limit });

  // Calculate how many Google Places listings to fetch
  // On first page, try to fill remaining slots with Google Places
  // On subsequent pages, only show Google Places if we've exhausted real listings
  const realCount = realResults.locations.length;
  const remainingSlots = limit - realCount;

  let googlePlacesResults: GooglePlacesSearchResult[] = [];
  let googlePlacesTotal = 0;

  // Only fetch Google Places if we have room or are past the real listings
  if (remainingSlots > 0 || realResults.total <= (page - 1) * limit) {
    // Calculate offset for Google Places
    // If real listings fill the page, Google Places starts after all real listings are shown
    const realPages = Math.ceil(realResults.total / limit);
    const gpPage = page > realPages ? page - realPages : 1;
    const gpLimit = page > realPages ? limit : remainingSlots;

    if (gpLimit > 0) {
      const gpResults = await searchGooglePlacesLocations(filters, {
        page: gpPage,
        limit: gpLimit,
      });
      googlePlacesResults = gpResults.listings;
      googlePlacesTotal = gpResults.total;
    }
  }

  // Combine results - real listings first, then Google Places
  const combinedResults: CombinedSearchResult[] = [
    ...realResults.locations.map((loc) => ({
      ...loc,
      isPrePopulated: false as const,
    })),
    ...googlePlacesResults,
  ];

  const totalCombined = realResults.total + googlePlacesTotal;
  const totalPages = Math.ceil(totalCombined / limit);

  return {
    results: combinedResults,
    realListingsCount: realResults.total,
    googlePlacesCount: googlePlacesTotal,
    total: totalCombined,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}
