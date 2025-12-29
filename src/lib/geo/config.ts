/**
 * Geocoding configuration
 *
 * Supports multiple geocoding providers:
 * - Google Maps Geocoding API (recommended for accuracy)
 * - Mapbox Geocoding API
 * - OpenCage Geocoding API (budget option)
 */

export type GeoProvider = "google" | "mapbox" | "opencage";

export interface GeoConfig {
  provider: GeoProvider;
  apiKey: string;
}

/**
 * Get geocoding configuration from environment
 */
export function getGeoConfig(): GeoConfig | null {
  // Check for Google Maps first (recommended)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return {
      provider: "google",
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    };
  }

  // Fallback to Mapbox
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    return {
      provider: "mapbox",
      apiKey: process.env.MAPBOX_ACCESS_TOKEN,
    };
  }

  // Fallback to OpenCage
  if (process.env.OPENCAGE_API_KEY) {
    return {
      provider: "opencage",
      apiKey: process.env.OPENCAGE_API_KEY,
    };
  }

  return null;
}

/**
 * Default search radius in miles
 */
export const DEFAULT_SEARCH_RADIUS = 25;

/**
 * Maximum search radius in miles
 */
export const MAX_SEARCH_RADIUS = 100;

/**
 * Service radius options for providers
 */
export const SERVICE_RADIUS_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
] as const;

/**
 * Geocoding result interface
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Coordinates interface
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
