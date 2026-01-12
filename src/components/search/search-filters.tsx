"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, MapPin, Loader2, Navigation } from "lucide-react";
import { useDebouncedCallback } from "@/hooks/use-debounce";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FilterSection,
  FilterCheckboxGroup,
} from "@/components/filters";
import {
  SERVICE_MODES,
  COMMON_INSURANCES,
  COMMON_LANGUAGES,
  DISTANCE_RADIUS_OPTIONS,
  parseFiltersFromParams,
  filtersToSearchParams,
} from "@/lib/search/filters";
import type { SearchFilters } from "@/lib/queries/search";
import { cn } from "@/lib/utils";
import { useLocationState, type LocationState } from "@/hooks/use-location-state";

interface SearchFiltersProps {
  className?: string;
}

export function SearchFilters({ className }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilters = parseFiltersFromParams(searchParams);

  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);
  // Track if there's unvalidated location text (typed but not selected from dropdown)
  const [hasUnvalidatedLocation, setHasUnvalidatedLocation] = useState(false);

  // Sync local filters state when URL params change (e.g., from HomeSearchCard navigation)
  // We use a serialized version of searchParams as the dependency to avoid unnecessary re-renders
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const newFilters = parseFiltersFromParams(searchParams);
    setFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  const activeFilterCount = countActiveFilters(currentFilters);

  // Track if this is the initial mount to prevent auto-apply on page load
  const isInitialMount = useRef(true);

  // Debounced auto-apply for desktop sidebar
  const debouncedApply = useDebouncedCallback(() => {
    const params = filtersToSearchParams(filters);
    router.push(`/search?${params.toString()}`);
  }, 300);

  // Auto-apply filters on desktop when filters change (not on mobile sheet)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only auto-apply when sheet is closed (desktop mode)
    // Don't auto-apply if there's unvalidated location text
    if (!isOpen && !hasUnvalidatedLocation) {
      debouncedApply();
    }
  }, [filters, isOpen, debouncedApply, hasUnvalidatedLocation]);

  const handleFilterChange = (
    key: keyof SearchFilters,
    value: SearchFilters[keyof SearchFilters]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayToggle = (
    key: "serviceTypes" | "insurances" | "languages",
    value: string
  ) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleLocationUpdate = (lat: number | undefined, lng: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      userLat: lat,
      userLng: lng,
    }));
  };

  const applyFilters = () => {
    const params = filtersToSearchParams(filters);
    router.push(`/search?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const newFilters: SearchFilters = { query: currentFilters.query };
    setFilters(newFilters);
    const params = filtersToSearchParams(newFilters);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className={className}>
      {/* Mobile Filter Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 lg:hidden">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow down your search results
            </SheetDescription>
          </SheetHeader>
          {/* Scrollable filter content */}
          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4">
            <FilterContent
              filters={filters}
              onFilterChange={handleFilterChange}
              onArrayToggle={handleArrayToggle}
              onLocationUpdate={handleLocationUpdate}
              onUnvalidatedLocationChange={setHasUnvalidatedLocation}
              hasUnvalidatedLocation={hasUnvalidatedLocation}
            />
          </div>
          {/* Sticky footer with Apply button */}
          <div className="sticky bottom-0 border-t bg-background pt-4 pb-2">
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1 border border-[#FEE720] bg-[#FEE720] font-semibold text-[#333333] transition-all duration-300 ease-premium hover:bg-[#FFF5C2]">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} className="text-muted-foreground hover:text-[#5788FF] hover:border-[#5788FF]/50">
                Clear
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - filters auto-apply with debounce */}
      <div className="hidden lg:block">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5788FF]/10">
              <Filter className="h-5 w-5 text-[#5788FF]" />
            </div>
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-[#5788FF]">
              Clear all
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <FilterContent
            filters={filters}
            onFilterChange={handleFilterChange}
            onArrayToggle={handleArrayToggle}
            onLocationUpdate={handleLocationUpdate}
            onUnvalidatedLocationChange={setHasUnvalidatedLocation}
            hasUnvalidatedLocation={hasUnvalidatedLocation}
          />
        </div>
      </div>
    </div>
  );
}

interface FilterContentProps {
  filters: SearchFilters;
  onFilterChange: (
    key: keyof SearchFilters,
    value: SearchFilters[keyof SearchFilters]
  ) => void;
  onArrayToggle: (
    key: "serviceTypes" | "insurances" | "languages",
    value: string
  ) => void;
  onLocationUpdate: (lat: number | undefined, lng: number | undefined) => void;
  /** Called when location input has unvalidated text (typed but not selected from dropdown) */
  onUnvalidatedLocationChange?: (hasUnvalidated: boolean) => void;
  /** Whether there is currently unvalidated location text */
  hasUnvalidatedLocation?: boolean;
}

function FilterContent({
  filters,
  onFilterChange,
  onArrayToggle,
  onLocationUpdate,
  onUnvalidatedLocationChange,
  hasUnvalidatedLocation,
}: FilterContentProps) {
  const [addressInput, setAddressInput] = useState("");

  // Determine if we have location from parent filters
  const hasLocationFromFilters = filters.userLat !== undefined && filters.userLng !== undefined;

  // Compute initial location from filters for the hook
  const initialLocation = hasLocationFromFilters
    ? {
        lat: filters.userLat!,
        lng: filters.userLng!,
        city: filters.city,
        state: filters.state,
        radius: filters.radiusMiles,
      }
    : undefined;

  // Handle location changes from the hook - sync to parent filter state
  const handleLocationChange = useCallback(
    (loc: LocationState | null) => {
      if (loc) {
        onLocationUpdate(loc.lat, loc.lng);
        if (loc.city) onFilterChange("city", loc.city);
        if (loc.state) onFilterChange("state", loc.state);
        if (!filters.radiusMiles) {
          onFilterChange("radiusMiles", loc.radius);
        }
      } else {
        onLocationUpdate(undefined, undefined);
        onFilterChange("radiusMiles", undefined);
        onFilterChange("city", undefined);
        onFilterChange("state", undefined);
      }
    },
    [onLocationUpdate, onFilterChange, filters.radiusMiles]
  );

  // Use the shared location state hook
  const {
    hasLocation,
    locationLabel,
    setLocationFromPlace,
    requestGeolocation,
    clearLocation: hookClearLocation,
    isGeolocating,
    isReverseGeocoding,
    error,
  } = useLocationState({
    initialLocation,
    onLocationChange: handleLocationChange,
  });

  // Handle place selection
  const handlePlaceSelect = useCallback(
    (place: PlaceDetails) => {
      setLocationFromPlace(place);
      setAddressInput("");
    },
    [setLocationFromPlace]
  );

  // Handle clear
  const clearLocation = useCallback(() => {
    hookClearLocation();
    setAddressInput("");
  }, [hookClearLocation]);

  // Create simple option arrays from string arrays for FilterCheckboxGroup
  const insuranceOptions = COMMON_INSURANCES.map((ins) => ({ value: ins, label: ins }));
  const languageOptions = COMMON_LANGUAGES.map((lang) => ({ value: lang, label: lang }));

  return (
    <>
      {/* Location / Proximity Search */}
      <FilterSection title="Location" defaultOpen accentColor="blue">
        <div className="space-y-3">
          {hasLocation ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 truncate">
                    {locationLabel || "Location set"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLocation}
                  className="h-6 px-2 text-xs shrink-0"
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
                {isReverseGeocoding ? "Finding your location..." : "Use my location"}
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
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Address Input with Autocomplete */}
              <PlacesAutocomplete
                value={addressInput}
                onChange={setAddressInput}
                onPlaceSelect={handlePlaceSelect}
                onUnvalidatedInput={onUnvalidatedLocationChange}
                placeholder="City, State or ZIP"
                showIcon={true}
                inputClassName="h-9 text-base md:text-sm"
              />
              <p className={cn(
                "text-xs",
                hasUnvalidatedLocation
                  ? "text-amber-600 font-medium"
                  : "text-muted-foreground"
              )}>
                {hasUnvalidatedLocation
                  ? "Please select a location from the suggestions"
                  : "Select a location from the suggestions"}
              </p>
            </>
          )}

          {/* Distance Radius - show when location is set */}
          {hasLocation && (
            <div className="space-y-2">
              <Label className="text-xs">Distance</Label>
              <Select
                value={filters.radiusMiles?.toString() || "25"}
                onValueChange={(value) =>
                  onFilterChange("radiusMiles", parseInt(value))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      Within {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FilterSection>

      {/* Accepting Clients */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="accepting"
          checked={filters.acceptingClients === true}
          onCheckedChange={(checked) =>
            onFilterChange("acceptingClients", checked ? true : undefined)
          }
        />
        <Label htmlFor="accepting" className="text-sm font-normal">
          Accepting new clients
        </Label>
      </div>

      {/* Service Types */}
      <FilterSection title="Service Type" defaultOpen accentColor="blue">
        <FilterCheckboxGroup
          options={SERVICE_MODES}
          selected={filters.serviceTypes || []}
          onChange={(value) => onArrayToggle("serviceTypes", value)}
        />
      </FilterSection>

      {/* Insurance */}
      <FilterSection title="Insurance Accepted" accentColor="blue">
        <FilterCheckboxGroup
          options={insuranceOptions}
          selected={filters.insurances || []}
          onChange={(value) => onArrayToggle("insurances", value)}
          maxHeight="12rem"
        />
      </FilterSection>

      {/* Languages */}
      <FilterSection title="Languages Spoken" accentColor="blue">
        <FilterCheckboxGroup
          options={languageOptions}
          selected={filters.languages || []}
          onChange={(value) => onArrayToggle("languages", value)}
          maxHeight="12rem"
        />
      </FilterSection>
    </>
  );
}

function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.serviceTypes?.length) count += filters.serviceTypes.length;
  if (filters.insurances?.length) count += filters.insurances.length;
  if (filters.languages?.length) count += filters.languages.length;
  if (filters.acceptingClients !== undefined) count++;
  if (filters.state) count++;
  if (filters.city) count++;
  if (filters.userLat !== undefined && filters.userLng !== undefined) count++;
  return count;
}

interface ActiveFiltersProps {
  className?: string;
}

export function ActiveFilters({ className }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFiltersFromParams(searchParams);

  const removeFilter = (key: string, value?: string) => {
    const newFilters = { ...filters };

    if (key === "serviceTypes" && value) {
      newFilters.serviceTypes = filters.serviceTypes?.filter((v) => v !== value);
    } else if (key === "insurances" && value) {
      newFilters.insurances = filters.insurances?.filter((v) => v !== value);
    } else if (key === "languages" && value) {
      newFilters.languages = filters.languages?.filter((v) => v !== value);
    } else if (key === "location") {
      // Clear all location-related filters
      delete newFilters.userLat;
      delete newFilters.userLng;
      delete newFilters.radiusMiles;
    } else {
      delete newFilters[key as keyof SearchFilters];
    }

    const params = filtersToSearchParams(newFilters);
    router.push(`/search?${params.toString()}`);
  };

  const chips: Array<{ key: string; value?: string; label: string }> = [];

  if (filters.state) {
    chips.push({ key: "state", label: filters.state });
  }
  if (filters.city) {
    chips.push({ key: "city", label: filters.city });
  }
  filters.serviceTypes?.forEach((type) => {
    const typeLabel = SERVICE_MODES.find((t) => t.value === type)?.label || type;
    chips.push({ key: "serviceTypes", value: type, label: typeLabel });
  });
  filters.insurances?.forEach((ins) => {
    chips.push({ key: "insurances", value: ins, label: ins });
  });
  filters.languages?.forEach((lang) => {
    chips.push({ key: "languages", value: lang, label: lang });
  });
  if (filters.acceptingClients) {
    chips.push({ key: "acceptingClients", label: "Accepting clients" });
  }
  if (filters.userLat !== undefined && filters.userLng !== undefined) {
    const radiusLabel = filters.radiusMiles ? `Within ${filters.radiusMiles} mi` : "Near me";
    chips.push({ key: "location", label: radiusLabel });
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip, index) => (
        <Badge
          key={`${chip.key}-${chip.value || index}`}
          variant="filter"
          className="cursor-pointer"
          onClick={() => removeFilter(chip.key, chip.value)}
        >
          {chip.label}
          <X className="h-3 w-3 transition-transform duration-300 ease-premium hover:scale-110" />
        </Badge>
      ))}
    </div>
  );
}
