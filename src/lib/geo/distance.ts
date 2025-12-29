import type { Coordinates } from "./config";

/**
 * Earth's radius in miles
 */
const EARTH_RADIUS_MILES = 3958.8;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMiles: number
): boolean {
  return calculateDistance(center, point) <= radiusMiles;
}

/**
 * Calculate the bounding box for a given center and radius
 * Useful for initial database filtering before exact distance calculation
 */
export function getBoundingBox(
  center: Coordinates,
  radiusMiles: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // Approximate degrees per mile at equator
  const latDelta = radiusMiles / 69.0;
  // Longitude varies by latitude
  const lngDelta = radiusMiles / (69.0 * Math.cos(toRadians(center.latitude)));

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return "< 0.1 mi";
  }
  if (miles < 1) {
    return `${miles.toFixed(1)} mi`;
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

/**
 * Sort locations by distance from a point
 */
export function sortByDistance<T extends { coordinates?: Coordinates }>(
  items: T[],
  fromPoint: Coordinates
): Array<T & { distance: number }> {
  return items
    .filter((item) => item.coordinates)
    .map((item) => ({
      ...item,
      distance: calculateDistance(fromPoint, item.coordinates!),
    }))
    .sort((a, b) => a.distance - b.distance);
}
