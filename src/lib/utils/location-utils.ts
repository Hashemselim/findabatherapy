/**
 * Shared location utilities for therapy and jobs search
 * Consolidates state mappings, location extraction, and label formatting
 */

import { STATE_NAMES, STATE_SLUG_TO_ABBREV } from "@/lib/data/cities";

// Re-export for convenience
export { STATE_NAMES, STATE_SLUG_TO_ABBREV };

// =============================================================================
// STATE CONVERSION UTILITIES
// =============================================================================

/**
 * Get state code from slug or name
 * Handles: "new-jersey" -> "NJ", "New Jersey" -> "NJ"
 */
export function getStateCode(slugOrName: string): string | null {
  if (!slugOrName) return null;

  const normalized = slugOrName.trim();

  // Check if it's already a state code (2 letters)
  const upper = normalized.toUpperCase();
  if (upper.length === 2 && STATE_NAMES[upper]) {
    return upper;
  }

  // Check if it's a slug (e.g., "new-jersey")
  const slugLower = normalized.toLowerCase().replace(/\s+/g, "-");
  if (STATE_SLUG_TO_ABBREV[slugLower]) {
    return STATE_SLUG_TO_ABBREV[slugLower];
  }

  // Check if it's a full state name (case insensitive)
  for (const [abbrev, name] of Object.entries(STATE_NAMES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return abbrev;
    }
  }

  return null;
}

/**
 * Get state slug from code or name
 * Handles: "NJ" -> "new-jersey", "New Jersey" -> "new-jersey"
 */
export function getStateSlug(codeOrName: string): string | null {
  if (!codeOrName) return null;

  const normalized = codeOrName.trim();

  // Check if it's already a valid slug
  const slugLower = normalized.toLowerCase().replace(/\s+/g, "-");
  if (STATE_SLUG_TO_ABBREV[slugLower]) {
    return slugLower;
  }

  // Check if it's a state code (2 letters)
  const upper = normalized.toUpperCase();
  if (STATE_NAMES[upper]) {
    return STATE_NAMES[upper].toLowerCase().replace(/\s+/g, "-");
  }

  // Check if it's a full state name (case insensitive)
  for (const [, name] of Object.entries(STATE_NAMES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return name.toLowerCase().replace(/\s+/g, "-");
    }
  }

  return null;
}

/**
 * Get state name from code or slug
 * Handles: "NJ" -> "New Jersey", "new-jersey" -> "New Jersey"
 */
export function getStateName(codeOrSlug: string): string | null {
  if (!codeOrSlug) return null;

  const normalized = codeOrSlug.trim();

  // Check if it's a state code (2 letters)
  const upper = normalized.toUpperCase();
  if (STATE_NAMES[upper]) {
    return STATE_NAMES[upper];
  }

  // Check if it's a slug (e.g., "new-jersey")
  const slugLower = normalized.toLowerCase().replace(/\s+/g, "-");
  if (STATE_SLUG_TO_ABBREV[slugLower]) {
    return STATE_NAMES[STATE_SLUG_TO_ABBREV[slugLower]];
  }

  return null;
}

/**
 * Get both state name and abbreviation for a given state input
 * Handles: "New Jersey", "NJ", "new-jersey" -> { name: "New Jersey", abbrev: "NJ" }
 */
export function getStateForms(state: string): { name: string; abbrev: string } | null {
  if (!state) return null;

  const abbrev = getStateCode(state);
  if (!abbrev) return null;

  const name = STATE_NAMES[abbrev];
  return { name, abbrev };
}

// =============================================================================
// LOCATION EXTRACTION
// =============================================================================

/**
 * Database location format (uses latitude/longitude column names)
 */
export interface DbLocation {
  id?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * API location format (uses lat/lng for client consumption)
 */
export interface ApiLocation {
  id?: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Extract location from Supabase relation and transform to API format
 * Handles both array and single object cases from database queries
 *
 * @param rawLocation - Raw location data from Supabase (can be array, object, or null)
 * @returns Transformed location object or null
 */
export function extractDbLocation(
  rawLocation: DbLocation[] | DbLocation | null | undefined
): ApiLocation | null {
  if (!rawLocation) return null;

  const loc = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
  if (!loc) return null;

  return {
    id: loc.id,
    city: loc.city || "",
    state: loc.state || "",
    lat: loc.latitude ?? null,
    lng: loc.longitude ?? null,
  };
}

// =============================================================================
// LOCATION LABEL FORMATTING
// =============================================================================

/**
 * Format a location label from city and state
 * Returns: "City, State" or just state or empty string
 *
 * @example
 * formatLocationLabel("Edison", "NJ") // "Edison, NJ"
 * formatLocationLabel(undefined, "NJ") // "NJ"
 * formatLocationLabel() // ""
 */
export function formatLocationLabel(city?: string, state?: string): string {
  if (city && state) {
    return `${city}, ${state}`;
  }
  if (state) {
    return state;
  }
  if (city) {
    return city;
  }
  return "";
}

/**
 * Format distance for display
 * Re-exported from geo/distance for convenience
 */
export { formatDistance } from "@/lib/geo/distance";

// =============================================================================
// SEARCH RESULT SORTING
// =============================================================================

export type PlanTier = "free" | "pro" | "enterprise";

/**
 * Sortable search result interface
 * Both therapy and job search results should conform to this for sorting
 */
export interface SortableSearchResult {
  /** Whether this result is featured (optional - only therapy has this currently) */
  isFeatured?: boolean;
  /** Plan tier: free, pro, or enterprise */
  planTier: PlanTier;
  /** Distance in miles (undefined if no proximity search) */
  distanceMiles?: number;
}

/**
 * Sort search results by: Featured → Paid (equal priority) → Free → Distance
 *
 * This is the canonical sorting logic used by both therapy and job search.
 * Paid tiers (Enterprise and Pro) have EQUAL priority over free.
 * Within each tier, results are sorted by distance (closest first).
 *
 * @param results - Array of results to sort (mutates in place)
 * @returns The sorted array (same reference)
 */
export function sortSearchResultsByRelevance<T extends SortableSearchResult>(
  results: T[]
): T[] {
  return results.sort((a, b) => {
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
}
