import type {
  PositionType,
  EmploymentType,
  SearchPositionType,
  JobTherapySetting,
  JobScheduleType,
  JobAgeGroup,
} from "@/lib/validations/jobs";
import {
  SEARCH_POSITION_OPTIONS,
  POSITION_TYPES,
  JOB_THERAPY_SETTINGS,
  JOB_SCHEDULE_TYPES,
  JOB_AGE_GROUPS,
} from "@/lib/validations/jobs";

// =============================================================================
// JOB SEARCH FILTER TYPES
// =============================================================================

/**
 * URL-serializable job search filters (single-select for position)
 */
export interface JobUrlFilters {
  /** Single-select position type (uses SEARCH_POSITION_OPTIONS values) */
  position?: SearchPositionType;
  /** Single-select employment type */
  employment?: EmploymentType;
  /** Remote only filter */
  remote?: boolean;
  /** Posted within timeframe */
  postedWithin?: "24h" | "7d" | "30d";
  /** State filter (code or full name) */
  state?: string;
  /** City filter */
  city?: string;
  /** Latitude for proximity search */
  lat?: number;
  /** Longitude for proximity search */
  lng?: number;
  /** Search radius in miles */
  radius?: number;
  /** Multi-select therapy settings (in_home, in_center, school_based, telehealth) */
  therapySettings?: JobTherapySetting[];
  /** Multi-select schedule types (daytime, after_school, evening) */
  scheduleTypes?: JobScheduleType[];
  /** Multi-select age groups (early_intervention, preschool, school_age, teens, adults) */
  ageGroups?: JobAgeGroup[];
}

/**
 * Options for pagination and sorting
 */
export interface JobSearchOptions {
  page?: number;
  limit?: number;
  sort?: "relevance" | "date" | "salary" | "distance";
}

// =============================================================================
// FILTER PARSING
// =============================================================================

/**
 * Parse job search filters from URL search params
 * Handles both `role` (legacy) and `position` params, preferring `position`
 */
export function parseJobFiltersFromParams(
  searchParams: URLSearchParams
): JobUrlFilters {
  const filters: JobUrlFilters = {};

  // Position filter (single-select)
  // Handle both "position" and legacy "role" params
  const position = searchParams.get("position");
  const role = searchParams.get("role"); // Legacy param from homepage

  if (position && isValidSearchPosition(position)) {
    filters.position = position as SearchPositionType;
  } else if (role && isValidSearchPosition(role)) {
    // Convert legacy role param to position
    filters.position = role as SearchPositionType;
  }

  // Employment filter (single-select)
  const employment = searchParams.get("employment");
  if (employment && isValidEmploymentType(employment)) {
    filters.employment = employment as EmploymentType;
  }

  // Remote filter
  const remote = searchParams.get("remote");
  if (remote === "true") {
    filters.remote = true;
  }

  // Posted within filter
  const posted = searchParams.get("posted");
  if (posted === "24h" || posted === "7d" || posted === "30d") {
    filters.postedWithin = posted;
  }

  // Location filters
  const state = searchParams.get("state");
  if (state) filters.state = state;

  const city = searchParams.get("city");
  if (city) filters.city = city;

  // Proximity search params
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius");

  if (lat && lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      filters.lat = parsedLat;
      filters.lng = parsedLng;
    }
  }

  if (radius) {
    const parsedRadius = parseInt(radius, 10);
    if (!isNaN(parsedRadius) && parsedRadius > 0) {
      filters.radius = parsedRadius;
    }
  }

  // Multi-select filters (comma-separated)
  const settings = searchParams.get("settings");
  if (settings) {
    const settingsArray = settings.split(",").filter(isValidTherapySetting);
    if (settingsArray.length > 0) {
      filters.therapySettings = settingsArray;
    }
  }

  const schedule = searchParams.get("schedule");
  if (schedule) {
    const scheduleArray = schedule.split(",").filter(isValidScheduleType);
    if (scheduleArray.length > 0) {
      filters.scheduleTypes = scheduleArray;
    }
  }

  const ages = searchParams.get("ages");
  if (ages) {
    const agesArray = ages.split(",").filter(isValidAgeGroup);
    if (agesArray.length > 0) {
      filters.ageGroups = agesArray;
    }
  }

  return filters;
}

/**
 * Parse job search options from URL params
 */
export function parseJobOptionsFromParams(
  searchParams: URLSearchParams
): JobSearchOptions {
  const options: JobSearchOptions = {};

  const page = searchParams.get("page");
  if (page) options.page = parseInt(page, 10);

  const limit = searchParams.get("limit");
  if (limit) options.limit = parseInt(limit, 10);

  const sort = searchParams.get("sort");
  if (sort === "relevance" || sort === "date" || sort === "salary" || sort === "distance") {
    options.sort = sort;
  }

  return options;
}

// =============================================================================
// FILTER SERIALIZATION
// =============================================================================

/**
 * Serialize job filters to URL search params
 */
export function jobFiltersToSearchParams(
  filters: JobUrlFilters,
  options?: JobSearchOptions
): URLSearchParams {
  const params = new URLSearchParams();

  // Position (single-select)
  if (filters.position) {
    params.set("position", filters.position);
  }

  // Employment (single-select)
  if (filters.employment) {
    params.set("employment", filters.employment);
  }

  // Remote
  if (filters.remote === true) {
    params.set("remote", "true");
  }

  // Posted within
  if (filters.postedWithin) {
    params.set("posted", filters.postedWithin);
  }

  // Location
  if (filters.state) {
    params.set("state", filters.state);
  }
  if (filters.city) {
    params.set("city", filters.city);
  }

  // Proximity search
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.set("lat", String(filters.lat));
    params.set("lng", String(filters.lng));
  }
  if (filters.radius !== undefined) {
    params.set("radius", String(filters.radius));
  }

  // Multi-select filters (comma-separated)
  if (filters.therapySettings?.length) {
    params.set("settings", filters.therapySettings.join(","));
  }
  if (filters.scheduleTypes?.length) {
    params.set("schedule", filters.scheduleTypes.join(","));
  }
  if (filters.ageGroups?.length) {
    params.set("ages", filters.ageGroups.join(","));
  }

  // Options
  if (options?.page && options.page > 1) {
    params.set("page", String(options.page));
  }
  if (options?.limit && options.limit !== 20) {
    params.set("limit", String(options.limit));
  }
  if (options?.sort && options.sort !== "relevance") {
    params.set("sort", options.sort);
  }

  return params;
}

/**
 * Build job search URL with filters
 */
export function buildJobSearchUrl(
  filters: JobUrlFilters,
  options?: JobSearchOptions
): string {
  const params = jobFiltersToSearchParams(filters, options);
  const queryString = params.toString();
  return queryString ? `/jobs/search?${queryString}` : "/jobs/search";
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert SearchPositionType to PositionType array for database queries
 * Handles the rbt_bt -> [rbt, bt] expansion
 */
export function mapSearchPositionToDbTypes(
  searchPosition: SearchPositionType
): PositionType[] {
  if (searchPosition === "rbt_bt") {
    return ["rbt", "bt"];
  }
  return [searchPosition as PositionType];
}

/**
 * Get display label for a position type
 */
export function getPositionLabel(position: SearchPositionType): string {
  const option = SEARCH_POSITION_OPTIONS.find((opt) => opt.value === position);
  return option?.label || position;
}

/**
 * Get display label for a position type (database type)
 */
export function getDbPositionLabel(position: PositionType): string {
  const option = POSITION_TYPES.find((opt) => opt.value === position);
  return option?.label || position;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const validSearchPositions = new Set(
  SEARCH_POSITION_OPTIONS.map((opt) => opt.value)
);

const validEmploymentTypes = new Set([
  "full_time",
  "part_time",
  "contract",
  "per_diem",
  "internship",
]);

const validTherapySettings = new Set(
  JOB_THERAPY_SETTINGS.map((opt) => opt.value)
);

const validScheduleTypes = new Set(
  JOB_SCHEDULE_TYPES.map((opt) => opt.value)
);

const validAgeGroups = new Set(
  JOB_AGE_GROUPS.map((opt) => opt.value)
);

/**
 * Check if a string is a valid SearchPositionType
 */
export function isValidSearchPosition(value: string): value is SearchPositionType {
  return validSearchPositions.has(value as SearchPositionType);
}

/**
 * Check if a string is a valid EmploymentType
 */
export function isValidEmploymentType(value: string): value is EmploymentType {
  return validEmploymentTypes.has(value as EmploymentType);
}

/**
 * Check if a string is a valid JobTherapySetting
 */
export function isValidTherapySetting(value: string): value is JobTherapySetting {
  return validTherapySettings.has(value as JobTherapySetting);
}

/**
 * Check if a string is a valid JobScheduleType
 */
export function isValidScheduleType(value: string): value is JobScheduleType {
  return validScheduleTypes.has(value as JobScheduleType);
}

/**
 * Check if a string is a valid JobAgeGroup
 */
export function isValidAgeGroup(value: string): value is JobAgeGroup {
  return validAgeGroups.has(value as JobAgeGroup);
}

// =============================================================================
// ACTIVE FILTER DETECTION
// =============================================================================

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: JobUrlFilters): boolean {
  return !!(
    filters.position ||
    filters.employment ||
    filters.remote ||
    filters.postedWithin ||
    filters.state ||
    filters.city ||
    (filters.lat !== undefined && filters.lng !== undefined) ||
    (filters.therapySettings && filters.therapySettings.length > 0) ||
    (filters.scheduleTypes && filters.scheduleTypes.length > 0) ||
    (filters.ageGroups && filters.ageGroups.length > 0)
  );
}

/**
 * Count number of active filters
 */
export function countActiveFilters(filters: JobUrlFilters): number {
  let count = 0;
  if (filters.position) count++;
  if (filters.employment) count++;
  if (filters.remote) count++;
  if (filters.postedWithin) count++;
  if (filters.state) count++;
  if (filters.city) count++;
  if (filters.lat !== undefined && filters.lng !== undefined) count++;
  // Count each selected item in multi-select filters
  if (filters.therapySettings) count += filters.therapySettings.length;
  if (filters.scheduleTypes) count += filters.scheduleTypes.length;
  if (filters.ageGroups) count += filters.ageGroups.length;
  return count;
}

// =============================================================================
// FILTER REMOVAL
// =============================================================================

/**
 * Remove a specific filter and return new filters object
 */
export function removeFilter(
  filters: JobUrlFilters,
  key: keyof JobUrlFilters
): JobUrlFilters {
  const newFilters = { ...filters };

  switch (key) {
    case "position":
      delete newFilters.position;
      break;
    case "employment":
      delete newFilters.employment;
      break;
    case "remote":
      delete newFilters.remote;
      break;
    case "postedWithin":
      delete newFilters.postedWithin;
      break;
    case "state":
      delete newFilters.state;
      break;
    case "city":
      delete newFilters.city;
      break;
    case "lat":
    case "lng":
    case "radius":
      // Remove all proximity search params together
      delete newFilters.lat;
      delete newFilters.lng;
      delete newFilters.radius;
      break;
    case "therapySettings":
      delete newFilters.therapySettings;
      break;
    case "scheduleTypes":
      delete newFilters.scheduleTypes;
      break;
    case "ageGroups":
      delete newFilters.ageGroups;
      break;
  }

  return newFilters;
}

/**
 * Remove a specific value from an array filter
 */
export function removeArrayFilterValue(
  filters: JobUrlFilters,
  key: "therapySettings" | "scheduleTypes" | "ageGroups",
  value: string
): JobUrlFilters {
  const newFilters = { ...filters };
  const currentArray = newFilters[key];

  if (currentArray) {
    const newArray = currentArray.filter((v) => v !== value);
    if (newArray.length > 0) {
      // Type assertion needed because TypeScript doesn't narrow union types in this context
      (newFilters[key] as string[]) = newArray;
    } else {
      delete newFilters[key];
    }
  }

  return newFilters;
}

// =============================================================================
// POSTED WITHIN OPTIONS
// =============================================================================

export const POSTED_WITHIN_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

/**
 * Get display label for posted within filter
 */
export function getPostedWithinLabel(value: "24h" | "7d" | "30d"): string {
  const option = POSTED_WITHIN_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
}

// =============================================================================
// EMPLOYMENT TYPE OPTIONS (re-export for convenience)
// =============================================================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "per_diem", label: "Per Diem" },
  { value: "internship", label: "Internship" },
] as const;

/**
 * Get display label for employment type
 */
export function getEmploymentLabel(value: EmploymentType): string {
  const option = EMPLOYMENT_TYPE_OPTIONS.find((opt) => opt.value === value);
  return option?.label || value;
}

/**
 * Get display label for therapy setting
 */
export function getTherapySettingLabel(value: JobTherapySetting): string {
  const option = JOB_THERAPY_SETTINGS.find((opt) => opt.value === value);
  return option?.label || value;
}

/**
 * Get display label for schedule type
 */
export function getScheduleTypeLabel(value: JobScheduleType): string {
  const option = JOB_SCHEDULE_TYPES.find((opt) => opt.value === value);
  return option?.label || value;
}

/**
 * Get display label for age group
 */
export function getAgeGroupLabel(value: JobAgeGroup): string {
  const option = JOB_AGE_GROUPS.find((opt) => opt.value === value);
  return option?.label || value;
}
