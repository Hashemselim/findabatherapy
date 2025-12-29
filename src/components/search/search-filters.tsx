"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, ChevronDown, MapPin, Loader2, Navigation } from "lucide-react";
import { useDebouncedCallback } from "@/hooks/use-debounce";

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useGeolocation } from "@/hooks/use-geolocation";

interface SearchFiltersProps {
  className?: string;
}

export function SearchFilters({ className }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilters = parseFiltersFromParams(searchParams);

  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);

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
    if (!isOpen) {
      debouncedApply();
    }
  }, [filters, isOpen, debouncedApply]);

  const handleFilterChange = (
    key: keyof SearchFilters,
    value: SearchFilters[keyof SearchFilters]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayToggle = (
    key: "serviceModes" | "insurances" | "languages",
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
            />
          </div>
          {/* Sticky footer with Apply button */}
          <div className="sticky bottom-0 border-t bg-background pt-4 pb-2">
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - filters auto-apply with debounce */}
      <div className="hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
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
    key: "serviceModes" | "insurances" | "languages",
    value: string
  ) => void;
  onLocationUpdate: (lat: number | undefined, lng: number | undefined) => void;
}

function FilterContent({
  filters,
  onFilterChange,
  onArrayToggle,
  onLocationUpdate,
}: FilterContentProps) {
  const [addressInput, setAddressInput] = useState("");
  // Compute the location label from filters
  const computeLocationLabel = useCallback((): string | null => {
    if (filters.city && filters.state) {
      return `${filters.city}, ${filters.state}`;
    } else if (filters.state) {
      return filters.state;
    } else if (filters.userLat !== undefined && filters.userLng !== undefined) {
      return "Location set";
    }
    return null;
  }, [filters.city, filters.state, filters.userLat, filters.userLng]);

  const [locationLabel, setLocationLabel] = useState<string | null>(computeLocationLabel);
  const geolocation = useGeolocation();

  // Update location label when filters change (e.g., from URL sync)
  useEffect(() => {
    // If there's no location coordinates, clear the label
    if (filters.userLat === undefined || filters.userLng === undefined) {
      setLocationLabel(null);
    } else {
      // Update label based on city/state or fallback to generic label
      const newLabel = computeLocationLabel();
      if (newLabel) {
        setLocationLabel(newLabel);
      }
    }
  }, [filters.userLat, filters.userLng, computeLocationLabel]);

  const handleNearMe = useCallback(() => {
    geolocation.requestLocation();
  }, [geolocation]);

  // Update filters when geolocation succeeds
  const handleUseCurrentLocation = useCallback(() => {
    if (geolocation.latitude && geolocation.longitude) {
      onLocationUpdate(geolocation.latitude, geolocation.longitude);
      setLocationLabel("Current location");
      if (!filters.radiusMiles) {
        onFilterChange("radiusMiles", 25);
      }
    }
  }, [geolocation.latitude, geolocation.longitude, onLocationUpdate, onFilterChange, filters.radiusMiles]);

  // Handle place selection from PlacesAutocomplete - get coordinates directly
  const handlePlaceSelect = useCallback((place: PlaceDetails) => {
    onLocationUpdate(place.latitude, place.longitude);
    // Set a label for the selected place
    const label = place.city && place.state
      ? `${place.city}, ${place.state}`
      : place.formattedAddress || addressInput;
    setLocationLabel(label);
    // Also update city/state filters for better search results display
    if (place.city) onFilterChange("city", place.city);
    if (place.state) onFilterChange("state", place.state);
    if (!filters.radiusMiles) {
      onFilterChange("radiusMiles", 25);
    }
    setAddressInput("");
  }, [onLocationUpdate, onFilterChange, filters.radiusMiles, addressInput]);

  const clearLocation = useCallback(() => {
    onLocationUpdate(undefined, undefined);
    onFilterChange("radiusMiles", undefined);
    onFilterChange("city", undefined);
    onFilterChange("state", undefined);
    setAddressInput("");
    setLocationLabel(null);
    geolocation.clearLocation();
  }, [onLocationUpdate, onFilterChange, geolocation]);

  const hasLocation = filters.userLat !== undefined && filters.userLng !== undefined;

  return (
    <>
      {/* Location / Proximity Search */}
      <FilterSection title="Location" defaultOpen>
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
                onClick={handleNearMe}
                disabled={geolocation.loading}
              >
                {geolocation.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Use my location
              </Button>

              {/* Show location ready message */}
              {geolocation.latitude && geolocation.longitude && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Location detected
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleUseCurrentLocation}
                  >
                    Search near me
                  </Button>
                </div>
              )}

              {geolocation.error && (
                <p className="text-xs text-destructive">{geolocation.error}</p>
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
                placeholder="City, State or ZIP"
                showIcon={true}
                inputClassName="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Select a location from the suggestions
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

      {/* Service Modes */}
      <FilterSection title="Service Type" defaultOpen>
        <div className="space-y-2">
          {SERVICE_MODES.map((mode) => (
            <div key={mode.value} className="flex items-center space-x-2">
              <Checkbox
                id={`mode-${mode.value}`}
                checked={filters.serviceModes?.includes(mode.value) || false}
                onCheckedChange={() => onArrayToggle("serviceModes", mode.value)}
              />
              <Label htmlFor={`mode-${mode.value}`} className="text-sm font-normal">
                {mode.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Insurance */}
      <FilterSection title="Insurance Accepted">
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {COMMON_INSURANCES.map((insurance) => (
            <div key={insurance} className="flex items-center space-x-2">
              <Checkbox
                id={`insurance-${insurance}`}
                checked={filters.insurances?.includes(insurance) || false}
                onCheckedChange={() => onArrayToggle("insurances", insurance)}
              />
              <Label
                htmlFor={`insurance-${insurance}`}
                className="text-sm font-normal"
              >
                {insurance}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Languages */}
      <FilterSection title="Languages Spoken">
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {COMMON_LANGUAGES.map((language) => (
            <div key={language} className="flex items-center space-x-2">
              <Checkbox
                id={`language-${language}`}
                checked={filters.languages?.includes(language) || false}
                onCheckedChange={() => onArrayToggle("languages", language)}
              />
              <Label
                htmlFor={`language-${language}`}
                className="text-sm font-normal"
              >
                {language}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>
    </>
  );
}

interface FilterSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, defaultOpen = false, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.serviceModes?.length) count += filters.serviceModes.length;
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

    if (key === "serviceModes" && value) {
      newFilters.serviceModes = filters.serviceModes?.filter((v) => v !== value);
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
  filters.serviceModes?.forEach((mode) => {
    const modeLabel = SERVICE_MODES.find((m) => m.value === mode)?.label || mode;
    chips.push({ key: "serviceModes", value: mode, label: modeLabel });
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
        <button
          key={`${chip.key}-${chip.value || index}`}
          onClick={() => removeFilter(chip.key, chip.value)}
          className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
