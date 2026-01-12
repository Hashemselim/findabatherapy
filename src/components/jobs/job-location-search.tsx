"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Navigation, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import { useLocationState, type LocationState } from "@/hooks/use-location-state";
import { cn } from "@/lib/utils";
import { SERVICE_RADIUS_OPTIONS } from "@/lib/geo/config";

interface JobLocationSearchProps {
  /** Whether to show as a compact input (for header search) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show radius selector when location is set */
  showRadiusSelector?: boolean;
  /** Callback when location changes (for controlled usage) */
  onLocationChange?: (location: LocationState | null) => void;
  /** Initial location value (for controlled usage) */
  initialLocation?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    radius?: number;
  };
}

export function JobLocationSearch({
  compact = false,
  className,
  placeholder = "City, state, or zip...",
  showRadiusSelector = true,
  onLocationChange,
  initialLocation,
}: JobLocationSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse location from URL or initial props
  const urlLat = searchParams.get("lat");
  const urlLng = searchParams.get("lng");
  const urlRadius = searchParams.get("radius");
  const urlCity = searchParams.get("city");
  const urlState = searchParams.get("state");

  const effectiveInitialLocation =
    initialLocation?.lat !== undefined && initialLocation?.lng !== undefined
      ? {
          lat: initialLocation.lat,
          lng: initialLocation.lng,
          city: initialLocation.city,
          state: initialLocation.state,
          radius: initialLocation.radius,
        }
      : urlLat && urlLng
        ? {
            lat: parseFloat(urlLat),
            lng: parseFloat(urlLng),
            city: urlCity || undefined,
            state: urlState || undefined,
            radius: urlRadius ? parseInt(urlRadius, 10) : undefined,
          }
        : undefined;

  // Update URL with location params
  // NOTE: We don't set a default radius - shows all jobs in state, sorted by distance
  // This matches therapy search behavior. User can explicitly set radius if desired.
  const updateUrl = useCallback(
    (loc: LocationState | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (loc) {
        params.set("lat", loc.lat.toString());
        params.set("lng", loc.lng.toString());
        // Only preserve radius if it was already in URL (user explicitly set it)
        const currentUrlRadius = searchParams.get("radius");
        if (currentUrlRadius) {
          params.set("radius", loc.radius.toString());
        } else {
          params.delete("radius");
        }
        if (loc.city) params.set("city", loc.city);
        else params.delete("city");
        if (loc.state) params.set("state", loc.state);
        else params.delete("state");
      } else {
        params.delete("lat");
        params.delete("lng");
        params.delete("radius");
        params.delete("city");
        params.delete("state");
      }
      params.delete("page"); // Reset pagination

      router.push(`/jobs/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Handle location change - either callback or URL update
  const handleLocationChange = useCallback(
    (loc: LocationState | null) => {
      if (onLocationChange) {
        onLocationChange(loc);
      } else {
        updateUrl(loc);
      }
    },
    [onLocationChange, updateUrl]
  );

  // Use the shared location state hook
  const {
    location,
    hasLocation,
    locationLabel,
    radius,
    setLocationFromPlace,
    requestGeolocation,
    setRadius,
    clearLocation,
    isGeolocating,
    isReverseGeocoding,
    error,
  } = useLocationState({
    initialLocation: effectiveInitialLocation,
    onLocationChange: handleLocationChange,
  });

  // Local state for address input
  const [addressInput, setAddressInput] = useState("");
  const [hasUnvalidatedLocation, setHasUnvalidatedLocation] = useState(false);

  // Sync with URL params when they change (for browser back/forward)
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    // If URL has no location but we have one, clear it
    if (!lat && !lng && hasLocation) {
      clearLocation();
    }
  }, [searchParams, hasLocation, clearLocation]);

  // Handle place selection
  const handlePlaceSelect = useCallback(
    (place: PlaceDetails) => {
      setLocationFromPlace(place);
      setAddressInput("");
    },
    [setLocationFromPlace]
  );

  // Handle radius change
  const handleRadiusChange = useCallback(
    (newRadius: string) => {
      setRadius(parseInt(newRadius, 10));
    },
    [setRadius]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    clearLocation();
    setAddressInput("");
  }, [clearLocation]);

  // Compact mode - single input that shows pill when location set
  if (compact) {
    return (
      <div className={cn("relative", className)}>
        {hasLocation ? (
          <button
            type="button"
            onClick={handleClear}
            className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-white py-2.5 pl-10 pr-4 text-left text-sm"
          >
            <MapPin className="absolute left-3 h-5 w-5 text-emerald-600" />
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700"
            >
              {locationLabel}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          </button>
        ) : (
          <PlacesAutocomplete
            value={addressInput}
            onChange={setAddressInput}
            onPlaceSelect={handlePlaceSelect}
            onUnvalidatedInput={setHasUnvalidatedLocation}
            placeholder={placeholder}
            showIcon={true}
            inputClassName="rounded-lg border-border/60 py-2.5 pl-10 pr-4 text-sm"
          />
        )}
      </div>
    );
  }

  // Full mode - with use my location button and radius selector
  return (
    <div className={cn("space-y-3", className)}>
      {hasLocation ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate text-sm font-medium text-emerald-700">
                {locationLabel || "Location set"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 shrink-0 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Near Me Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={requestGeolocation}
            disabled={isGeolocating || isReverseGeocoding}
          >
            {isGeolocating || isReverseGeocoding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {isReverseGeocoding
              ? "Finding your location..."
              : "Use my location"}
          </Button>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Address Input with Autocomplete */}
          <PlacesAutocomplete
            value={addressInput}
            onChange={setAddressInput}
            onPlaceSelect={handlePlaceSelect}
            onUnvalidatedInput={setHasUnvalidatedLocation}
            placeholder={placeholder}
            showIcon={true}
            inputClassName="h-9 text-base md:text-sm"
          />
          <p
            className={cn(
              "text-xs",
              hasUnvalidatedLocation
                ? "font-medium text-amber-600"
                : "text-muted-foreground"
            )}
          >
            {hasUnvalidatedLocation
              ? "Please select a location from the suggestions"
              : "Select a location from the suggestions"}
          </p>
        </>
      )}

      {/* Distance Radius - show when location is set */}
      {hasLocation && showRadiusSelector && (
        <div className="space-y-2">
          <label className="text-xs font-medium">Distance</label>
          <Select
            value={radius.toString()}
            onValueChange={handleRadiusChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  Within {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/**
 * Inline location search for header/forms - just the input with autocomplete
 */
interface InlineJobLocationSearchProps {
  className?: string;
  placeholder?: string;
  /** Called when a location is selected */
  onLocationSelect?: (location: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    formattedAddress: string;
  }) => void;
}

export function InlineJobLocationSearch({
  className,
  placeholder = "City, state, or zip...",
  onLocationSelect,
}: InlineJobLocationSearchProps) {
  const [value, setValue] = useState("");

  const handlePlaceSelect = useCallback(
    (place: PlaceDetails) => {
      const label =
        place.city && place.state
          ? `${place.city}, ${place.state}`
          : place.formattedAddress;
      setValue(label);

      if (onLocationSelect) {
        onLocationSelect({
          lat: place.latitude,
          lng: place.longitude,
          city: place.city,
          state: place.state,
          formattedAddress: label,
        });
      }
    },
    [onLocationSelect]
  );

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <PlacesAutocomplete
        value={value}
        onChange={setValue}
        onPlaceSelect={handlePlaceSelect}
        placeholder={placeholder}
        showIcon={false}
        inputClassName="w-full rounded-lg border border-border/60 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
}
