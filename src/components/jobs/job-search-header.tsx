"use client";

import { type ReactNode, useState, useCallback, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { cn } from "@/lib/utils";
import { SEARCH_POSITION_OPTIONS, type SearchPositionType } from "@/lib/validations/jobs";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import {
  parseJobFiltersFromParams,
  jobFiltersToSearchParams,
  type JobUrlFilters,
} from "@/lib/search/job-filters";

const pillClassName =
  "inline-flex items-center rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-foreground";

interface JobSearchHeaderProps {
  /** Optional heading displayed above the search bar */
  heading?: ReactNode;
  /** Default position value from URL (single-select) */
  defaultPosition?: SearchPositionType;
  /** Default location from URL */
  defaultLocation?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
  };
  /** When true, removes background styling for use with BubbleBackground */
  transparent?: boolean;
}

export function JobSearchHeader({
  heading,
  defaultPosition,
  defaultLocation,
  transparent,
}: JobSearchHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [positionOpen, setPositionOpen] = useState(false);
  const [position, setPosition] = useState<SearchPositionType | undefined>(defaultPosition);
  const [location, setLocation] = useState(
    defaultLocation?.city && defaultLocation?.state
      ? `${defaultLocation.city}, ${defaultLocation.state}`
      : ""
  );
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);

  // Sync state when URL params change (for external navigation)
  useEffect(() => {
    const filters = parseJobFiltersFromParams(searchParams);
    setPosition(filters.position);
  }, [searchParams]);

  // Sync location when props change
  useEffect(() => {
    const newLocation = defaultLocation?.city && defaultLocation?.state
      ? `${defaultLocation.city}, ${defaultLocation.state}`
      : "";
    setLocation(newLocation);
    setSelectedPlace(null);
  }, [defaultLocation]);

  const handlePlaceSelect = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    if (place.city && place.state) {
      setLocation(`${place.city}, ${place.state}`);
    }
  }, []);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();

      // Start with current URL filters to preserve them
      const currentFilters = parseJobFiltersFromParams(searchParams);

      // Build new filters, updating position and location
      const newFilters: JobUrlFilters = {
        ...currentFilters,
        // Update position from form state
        position: position,
      };

      // Update location params
      // NOTE: We don't default to a radius - shows all jobs in state, sorted by distance
      // This matches therapy search behavior
      if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
        newFilters.lat = selectedPlace.latitude;
        newFilters.lng = selectedPlace.longitude;
        newFilters.radius = currentFilters.radius; // Only set if explicitly provided
        newFilters.city = selectedPlace.city;
        newFilters.state = selectedPlace.state;
      } else if (defaultLocation?.lat !== undefined && defaultLocation?.lng !== undefined && !selectedPlace) {
        // Keep existing location if no new place selected
        newFilters.lat = defaultLocation.lat;
        newFilters.lng = defaultLocation.lng;
        newFilters.radius = currentFilters.radius; // Only set if explicitly provided
        newFilters.city = defaultLocation.city;
        newFilters.state = defaultLocation.state;
      }

      // Convert to URL params
      const params = jobFiltersToSearchParams(newFilters);

      // Reset pagination
      params.delete("page");

      router.push(`/jobs/search?${params.toString()}`);
    },
    [position, selectedPlace, defaultLocation, searchParams, router]
  );

  // Get selected position label for display
  const selectedPositionOption = position
    ? SEARCH_POSITION_OPTIONS.find((opt) => opt.value === position)
    : null;

  return (
    <div className={transparent ? "" : "border-b border-border/60 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30"}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="w-full space-y-3">
          {/* Heading */}
          {heading && (
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {heading}
            </h1>
          )}

          {/* Compact search card */}
          <div className="rounded-2xl border border-border/50 bg-white/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 ease-premium hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-4">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {/* Position dropdown (single-select) */}
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 text-left text-sm transition-all duration-300 ease-premium hover:border-emerald-500/40 focus:border-emerald-500/50 focus:outline-none sm:flex-[1.1] sm:min-w-[150px]"
                    >
                      <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        {selectedPositionOption ? (
                          <span className={pillClassName}>{selectedPositionOption.label}</span>
                        ) : (
                          <span className="text-muted-foreground">All positions</span>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search positions..." />
                      <CommandEmpty>No position found.</CommandEmpty>
                      <CommandGroup>
                        {/* All positions option */}
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setPosition(undefined);
                            setPositionOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              !position ? "opacity-100 text-emerald-600" : "opacity-0"
                            )}
                            aria-hidden
                          />
                          All positions
                        </CommandItem>
                        {SEARCH_POSITION_OPTIONS.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              setPosition(option.value);
                              setPositionOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                position === option.value ? "opacity-100 text-emerald-600" : "opacity-0"
                              )}
                              aria-hidden
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Location input */}
                <div className="relative flex-[1.3] sm:min-w-[200px]">
                  <PlacesAutocomplete
                    value={location}
                    onChange={(value) => {
                      setLocation(value);
                      if (selectedPlace && value !== `${selectedPlace.city}, ${selectedPlace.state}`) {
                        setSelectedPlace(null);
                      }
                    }}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="City, State or ZIP"
                    showIcon={true}
                    showPillWhenValidated={true}
                    initialValidated={!!defaultLocation?.lat}
                    inputClassName="h-10 rounded-xl pl-9 text-base md:text-sm bg-white border-border"
                    pillClassName="border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                  />
                </div>

                {/* Search button */}
                <Button
                  type="submit"
                  className="h-10 w-full rounded-xl border border-emerald-600 bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:bg-emerald-700 hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)] active:translate-y-0 sm:w-auto"
                >
                  Search
                </Button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
