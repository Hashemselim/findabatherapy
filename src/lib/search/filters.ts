import type { SearchFilters, SearchOptions } from "@/lib/queries/search";

/**
 * Parse search filters from URL search params
 */
export function parseFiltersFromParams(
  searchParams: URLSearchParams
): SearchFilters {
  const filters: SearchFilters = {};

  // Text query
  const query = searchParams.get("q");
  if (query) filters.query = query;

  // Location
  const state = searchParams.get("state");
  if (state) filters.state = state;

  const city = searchParams.get("city");
  if (city) filters.city = city;

  // Service modes (comma-separated)
  const serviceModes = searchParams.get("services");
  if (serviceModes) {
    filters.serviceModes = serviceModes.split(",").filter(Boolean);
  }

  // Insurances (comma-separated)
  const insurances = searchParams.get("insurance");
  if (insurances) {
    filters.insurances = insurances.split(",").filter(Boolean);
  }

  // Languages (comma-separated)
  const languages = searchParams.get("languages");
  if (languages) {
    filters.languages = languages.split(",").filter(Boolean);
  }

  // Ages served
  const minAge = searchParams.get("minAge");
  const maxAge = searchParams.get("maxAge");
  if (minAge || maxAge) {
    filters.agesServed = {};
    if (minAge) filters.agesServed.min = parseInt(minAge, 10);
    if (maxAge) filters.agesServed.max = parseInt(maxAge, 10);
  }

  // Accepting clients
  const accepting = searchParams.get("accepting");
  if (accepting === "true") filters.acceptingClients = true;
  if (accepting === "false") filters.acceptingClients = false;

  // Proximity search
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");

  if (lat && lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      filters.userLat = parsedLat;
      filters.userLng = parsedLng;
    }
  }

  if (radius) {
    const parsedRadius = parseInt(radius, 10);
    if (!isNaN(parsedRadius) && parsedRadius > 0) {
      filters.radiusMiles = parsedRadius;
    }
  }

  return filters;
}

/**
 * Parse search options from URL search params
 */
export function parseOptionsFromParams(
  searchParams: URLSearchParams
): SearchOptions {
  const options: SearchOptions = {};

  // Page
  const page = searchParams.get("page");
  if (page) options.page = parseInt(page, 10);

  // Limit
  const limit = searchParams.get("limit");
  if (limit) options.limit = parseInt(limit, 10);

  // Sort
  const sortBy = searchParams.get("sort");
  if (sortBy === "name" || sortBy === "newest" || sortBy === "relevance" || sortBy === "distance") {
    options.sortBy = sortBy;
  }

  return options;
}

/**
 * Serialize filters to URL search params
 */
export function filtersToSearchParams(
  filters: SearchFilters,
  options?: SearchOptions
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.state) params.set("state", filters.state);
  if (filters.city) params.set("city", filters.city);

  if (filters.serviceModes?.length) {
    params.set("services", filters.serviceModes.join(","));
  }

  if (filters.insurances?.length) {
    params.set("insurance", filters.insurances.join(","));
  }

  if (filters.languages?.length) {
    params.set("languages", filters.languages.join(","));
  }

  if (filters.agesServed?.min !== undefined) {
    params.set("minAge", String(filters.agesServed.min));
  }
  if (filters.agesServed?.max !== undefined) {
    params.set("maxAge", String(filters.agesServed.max));
  }

  if (filters.acceptingClients !== undefined) {
    params.set("accepting", String(filters.acceptingClients));
  }

  // Proximity search
  if (filters.userLat !== undefined && filters.userLng !== undefined) {
    params.set("lat", String(filters.userLat));
    params.set("lng", String(filters.userLng));
  }
  if (filters.radiusMiles !== undefined) {
    params.set("radius", String(filters.radiusMiles));
  }

  // Options
  if (options?.page && options.page > 1) {
    params.set("page", String(options.page));
  }
  if (options?.limit && options.limit !== 20) {
    params.set("limit", String(options.limit));
  }
  if (options?.sortBy && options.sortBy !== "relevance") {
    params.set("sort", options.sortBy);
  }

  return params;
}

/**
 * Build search URL with filters
 */
export function buildSearchUrl(
  filters: SearchFilters,
  options?: SearchOptions
): string {
  const params = filtersToSearchParams(filters, options);
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

/**
 * Common service modes
 */
export const SERVICE_MODES = [
  { value: "in_home", label: "In-Home" },
  { value: "in_center", label: "Center-Based" },
  { value: "telehealth", label: "Telehealth" },
  { value: "school_based", label: "School-Based" },
] as const;

/**
 * Common insurance options
 */
export const COMMON_INSURANCES = [
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Tricare",
  "UnitedHealthcare",
  "Private Pay",
] as const;

/**
 * Common language options
 */
export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Arabic",
  "French",
  "Russian",
  "Portuguese",
  "ASL",
] as const;

/**
 * Sort options
 */
export const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "distance", label: "Nearest" },
  { value: "name", label: "Name (A-Z)" },
  { value: "newest", label: "Newest" },
] as const;

/**
 * Distance radius options for proximity search
 */
export const DISTANCE_RADIUS_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
] as const;
