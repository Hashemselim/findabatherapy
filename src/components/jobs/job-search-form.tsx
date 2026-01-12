"use client";

import { useState, useCallback, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { jobFiltersToSearchParams, type JobUrlFilters } from "@/lib/search/job-filters";

interface JobSearchFormProps {
  /** Optional heading displayed above the search form */
  heading?: React.ReactNode;
  /** Default location string (e.g. "Austin, TX") */
  defaultLocation?: string;
  /** Default position value (single-select) */
  defaultPosition?: SearchPositionType;
  /** Action URL for form submission (default: /jobs/search) */
  action?: string;
}

export function JobSearchForm({
  heading,
  defaultLocation = "",
  defaultPosition,
  action = "/jobs/search",
}: JobSearchFormProps) {
  const router = useRouter();
  const [positionOpen, setPositionOpen] = useState(false);
  const [position, setPosition] = useState<SearchPositionType | undefined>(defaultPosition);
  const [location, setLocation] = useState(defaultLocation);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);

  // Sync state when props change
  useEffect(() => {
    setLocation(defaultLocation);
    setSelectedPlace(null);
  }, [defaultLocation]);

  useEffect(() => {
    setPosition(defaultPosition);
  }, [defaultPosition]);

  const handlePlaceSelect = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    if (place.city && place.state) {
      setLocation(`${place.city}, ${place.state}`);
    }
  }, []);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();

      // Build filters object
      const filters: JobUrlFilters = {};

      // Add position if selected
      if (position) {
        filters.position = position;
      }

      // Add location params
      if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
        filters.lat = selectedPlace.latitude;
        filters.lng = selectedPlace.longitude;
        filters.radius = 25;
        if (selectedPlace.city) filters.city = selectedPlace.city;
        if (selectedPlace.state) filters.state = selectedPlace.state;
      } else if (location.trim()) {
        const locationParts = location.split(",").map((s) => s.trim());
        if (locationParts.length >= 2) {
          filters.city = locationParts[0];
          filters.state = locationParts[1];
        }
      }

      const params = jobFiltersToSearchParams(filters);
      router.push(`${action}?${params.toString()}`);
    },
    [position, selectedPlace, location, action, router]
  );

  // Get selected position label for display
  const selectedPositionOption = position
    ? SEARCH_POSITION_OPTIONS.find((opt) => opt.value === position)
    : null;

  return (
    <div className="relative z-10 w-full overflow-visible rounded-3xl border border-border bg-white p-4 shadow-lg lg:p-6">
      {heading && (
        <h2 className="mb-4 text-3xl font-semibold text-foreground">{heading}</h2>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-[1.5fr_1.5fr_auto] md:items-end">
          {/* Position Select (single-select) */}
          <label className="text-sm font-medium text-muted-foreground">
            Position
            <Popover open={positionOpen} onOpenChange={setPositionOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex h-12 w-full items-center gap-2 rounded-2xl border border-border bg-white px-3 text-left text-sm transition-all duration-300 ease-premium hover:border-emerald-500/40 focus:border-emerald-500/50 focus:outline-none"
                >
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {selectedPositionOption ? (
                      <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700">
                        {selectedPositionOption.label}
                      </Badge>
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
          </label>

          {/* Location Input */}
          <div className="relative text-sm font-medium text-muted-foreground">
            <span>Location</span>
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
              initialValidated={!!defaultLocation}
              className="mt-2"
              inputClassName="h-12 rounded-2xl pl-10 text-base md:text-sm"
              pillClassName="border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="mt-2 h-12 w-full rounded-full border border-emerald-600 bg-emerald-600 px-6 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)] active:translate-y-0 md:mt-0 md:w-auto md:self-end"
          >
            Search Jobs
          </Button>
        </div>
      </form>
    </div>
  );
}
