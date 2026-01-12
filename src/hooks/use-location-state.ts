"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGeolocation } from "./use-geolocation";
import type { PlaceDetails } from "./use-places-autocomplete";
import { formatLocationLabel } from "@/lib/utils/location-utils";
import { DEFAULT_SEARCH_RADIUS } from "@/lib/geo/config";

// =============================================================================
// TYPES
// =============================================================================

export interface LocationState {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  radius: number;
  label: string;
}

export interface UseLocationStateOptions {
  /**
   * Initial location (e.g., from URL params)
   */
  initialLocation?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    radius?: number;
  };
  /**
   * Default radius when no radius is provided
   */
  defaultRadius?: number;
  /**
   * Callback when location changes
   */
  onLocationChange?: (location: LocationState | null) => void;
}

export interface UseLocationStateReturn {
  // State
  location: LocationState | null;
  hasLocation: boolean;
  locationLabel: string | null;
  radius: number;

  // Actions
  setLocationFromPlace: (place: PlaceDetails) => void;
  requestGeolocation: () => void;
  setRadius: (radius: number) => void;
  clearLocation: () => void;

  // Loading states
  isGeolocating: boolean;
  isReverseGeocoding: boolean;
  error: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Shared hook for managing location state across therapy and jobs search
 *
 * Consolidates:
 * - Place selection handling
 * - Browser geolocation with reverse geocoding
 * - Location label computation
 * - Radius management
 *
 * @example
 * // Basic usage
 * const { location, setLocationFromPlace, requestGeolocation, clearLocation } = useLocationState();
 *
 * // With initial location (e.g., from URL params)
 * const { location } = useLocationState({
 *   initialLocation: { lat: 40.5, lng: -74.3, city: "Edison", state: "NJ" }
 * });
 *
 * // With callback for URL sync
 * const { location } = useLocationState({
 *   onLocationChange: (loc) => updateUrlParams(loc)
 * });
 */
export function useLocationState(
  options: UseLocationStateOptions = {}
): UseLocationStateReturn {
  const {
    initialLocation,
    defaultRadius = DEFAULT_SEARCH_RADIUS,
    onLocationChange,
  } = options;

  // Initialize from initial location if provided
  const initialState: LocationState | null = initialLocation
    ? {
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        city: initialLocation.city,
        state: initialLocation.state,
        radius: initialLocation.radius ?? defaultRadius,
        label: formatLocationLabel(initialLocation.city, initialLocation.state) || "Location set",
      }
    : null;

  // State
  const [location, setLocation] = useState<LocationState | null>(initialState);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already processed geolocation to prevent duplicate processing
  const processedGeolocationRef = useRef(false);

  // Geolocation hook
  const geolocation = useGeolocation();

  // Derived state
  const hasLocation = location !== null;
  const locationLabel = location?.label ?? null;
  const radius = location?.radius ?? defaultRadius;

  // Helper to update location and notify
  const updateLocation = useCallback(
    (newLocation: LocationState | null) => {
      setLocation(newLocation);
      onLocationChange?.(newLocation);
    },
    [onLocationChange]
  );

  // Handle place selection from PlacesAutocomplete
  const setLocationFromPlace = useCallback(
    (place: PlaceDetails) => {
      const label =
        place.city && place.state
          ? formatLocationLabel(place.city, place.state)
          : place.formattedAddress || "Location set";

      const newLocation: LocationState = {
        lat: place.latitude,
        lng: place.longitude,
        city: place.city,
        state: place.state,
        radius: location?.radius ?? defaultRadius,
        label,
      };

      updateLocation(newLocation);
      setError(null);
    },
    [location?.radius, defaultRadius, updateLocation]
  );

  // Request browser geolocation
  const requestGeolocation = useCallback(() => {
    processedGeolocationRef.current = false;
    setError(null);
    geolocation.requestLocation();
  }, [geolocation]);

  // Process geolocation result with reverse geocoding
  useEffect(() => {
    // Only process if we have new geolocation data and haven't processed it yet
    if (
      geolocation.latitude &&
      geolocation.longitude &&
      !hasLocation &&
      !processedGeolocationRef.current &&
      !isReverseGeocoding
    ) {
      processedGeolocationRef.current = true;
      setIsReverseGeocoding(true);

      // Do reverse geocoding to get city/state
      fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: geolocation.latitude,
          longitude: geolocation.longitude,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const label =
            data.city && data.state
              ? formatLocationLabel(data.city, data.state)
              : "Current location";

          const newLocation: LocationState = {
            lat: geolocation.latitude!,
            lng: geolocation.longitude!,
            city: data.city || undefined,
            state: data.state || undefined,
            radius: defaultRadius,
            label,
          };

          updateLocation(newLocation);
        })
        .catch(() => {
          // Fallback: use location without city/state
          const newLocation: LocationState = {
            lat: geolocation.latitude!,
            lng: geolocation.longitude!,
            radius: defaultRadius,
            label: "Current location",
          };

          updateLocation(newLocation);
        })
        .finally(() => {
          setIsReverseGeocoding(false);
        });
    }
  }, [
    geolocation.latitude,
    geolocation.longitude,
    hasLocation,
    isReverseGeocoding,
    defaultRadius,
    updateLocation,
  ]);

  // Propagate geolocation errors
  useEffect(() => {
    if (geolocation.error) {
      setError(geolocation.error);
    }
  }, [geolocation.error]);

  // Set radius
  const setRadius = useCallback(
    (newRadius: number) => {
      if (location) {
        updateLocation({
          ...location,
          radius: newRadius,
        });
      }
    },
    [location, updateLocation]
  );

  // Clear location
  const clearLocation = useCallback(() => {
    updateLocation(null);
    setError(null);
    processedGeolocationRef.current = false;
    geolocation.clearLocation();
  }, [updateLocation, geolocation]);

  return {
    // State
    location,
    hasLocation,
    locationLabel,
    radius,

    // Actions
    setLocationFromPlace,
    requestGeolocation,
    setRadius,
    clearLocation,

    // Loading states
    isGeolocating: geolocation.loading,
    isReverseGeocoding,
    error,
  };
}
