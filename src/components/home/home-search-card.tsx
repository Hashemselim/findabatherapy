"use client";

import { type ReactNode, useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { cn } from "@/lib/utils";
import { buildSearchUrl } from "@/lib/search/filters";
import { COMMON_INSURANCES, SERVICE_MODES } from "@/lib/search/filters";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";

const pillClassName =
  "inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground";

type HomeSearchCardProps = {
  heading?: ReactNode;
  defaultLocation?: string;
  defaultServices?: string[];
  defaultInsurance?: string;
};

const DEFAULT_SERVICES = ["in_home", "in_center"];

export function HomeSearchCard({
  heading,
  defaultLocation = "",
  defaultServices,
  defaultInsurance,
}: HomeSearchCardProps) {
  // Use stable reference for default services
  const services = defaultServices ?? DEFAULT_SERVICES;
  const router = useRouter();
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [insurance, setInsurance] = useState<string | undefined>(defaultInsurance);
  const [settingOpen, setSettingOpen] = useState(false);
  const [location, setLocation] = useState(defaultLocation);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>(
    SERVICE_MODES.reduce(
      (acc, mode) => ({
        ...acc,
        [mode.value]: services.includes(mode.value),
      }),
      {}
    )
  );

  // Sync state when props change (e.g., from URL param changes via page re-render)
  useEffect(() => {
    setLocation(defaultLocation);
    setSelectedPlace(null); // Reset selected place when location prop changes
  }, [defaultLocation]);

  useEffect(() => {
    setInsurance(defaultInsurance);
  }, [defaultInsurance]);

  useEffect(() => {
    setSelectedServices(
      SERVICE_MODES.reduce(
        (acc, mode) => ({
          ...acc,
          [mode.value]: services.includes(mode.value),
        }),
        {}
      )
    );
  }, [services]);

  const handlePlaceSelect = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    // Update location display to city, state format
    if (place.city && place.state) {
      setLocation(`${place.city}, ${place.state}`);
    }
  }, []);

  const toggleService = (key: string) =>
    setSelectedServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  const activeServices = useMemo(() => {
    return SERVICE_MODES.filter((mode) => selectedServices[mode.value]);
  }, [selectedServices]);

  const handleSearch = () => {
    const serviceModes = activeServices.map((s) => s.value);

    // Build filters
    const filters: Record<string, string | string[] | number | undefined> = {};

    // If we have a selected place with coordinates, use proximity search
    if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
      filters.userLat = selectedPlace.latitude;
      filters.userLng = selectedPlace.longitude;
      filters.radiusMiles = 25; // Default radius

      // Also set city/state for display purposes
      if (selectedPlace.city) filters.city = selectedPlace.city;
      if (selectedPlace.state) filters.state = selectedPlace.state;
    } else if (location.trim()) {
      // Fallback: parse location string
      const locationParts = location.split(",").map((s) => s.trim());
      if (locationParts.length >= 2) {
        filters.city = locationParts[0];
        filters.state = locationParts[1];
      } else {
        filters.query = location;
      }
    }

    if (serviceModes.length > 0 && serviceModes.length < SERVICE_MODES.length) {
      filters.serviceTypes = serviceModes;
    }

    if (insurance) {
      filters.insurances = [insurance];
    }

    const url = buildSearchUrl(filters as never);
    router.push(url);
  };

  return (
    <div className="relative z-10 w-full overflow-visible rounded-3xl border border-border bg-white p-4 shadow-lg lg:p-6">
      {heading ? <h2 className="mb-4 text-3xl font-semibold text-foreground">{heading}</h2> : null}
      <div className="grid gap-4 md:grid-cols-[1.7fr_1.7fr_1.7fr_auto] md:items-end">
        <div className="relative text-sm font-medium text-muted-foreground">
          <span>Location</span>
          <PlacesAutocomplete
            value={location}
            onChange={(value) => {
              setLocation(value);
              // Clear selected place if user types manually
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
            inputClassName="h-12 rounded-2xl pl-10 text-sm"
          />
        </div>

        <label className="text-sm font-medium text-muted-foreground">
          Therapy setting
          <Popover open={settingOpen} onOpenChange={setSettingOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex h-12 w-full items-center gap-2 rounded-2xl border border-border px-3 text-left text-sm"
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {activeServices.length ? (
                    activeServices.slice(0, 2).map((service) => (
                      <span key={service.value} className={cn(pillClassName, "min-w-0 shrink")}>
                        <span className="truncate">{service.label}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Select setting</span>
                  )}
                  {activeServices.length > 2 && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      +{activeServices.length - 2}
                    </span>
                  )}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Filter settings..." />
                <CommandEmpty>No setting found.</CommandEmpty>
                <CommandGroup>
                  {SERVICE_MODES.map((mode) => {
                    const active = selectedServices[mode.value];
                    return (
                      <CommandItem
                        key={mode.value}
                        value={mode.value}
                        onSelect={() => toggleService(mode.value)}
                        className="flex items-center gap-2"
                      >
                        <Check className={cn("h-4 w-4", active ? "opacity-100 text-primary" : "opacity-0")} aria-hidden />
                        {mode.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </label>

        <label className="text-sm font-medium text-muted-foreground">
          Insurance
          <Popover open={insuranceOpen} onOpenChange={setInsuranceOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex h-12 w-full items-center gap-2 rounded-2xl border border-border px-3 text-left text-sm"
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden">
                  {insurance ? (
                    <span className={pillClassName}>{insurance}</span>
                  ) : (
                    <span className="text-muted-foreground">Select plan</span>
                  )}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search insurance..." />
                <CommandEmpty>No insurance found.</CommandEmpty>
                <CommandGroup>
                  {COMMON_INSURANCES.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={(value) => {
                        setInsurance(value === insurance ? undefined : value);
                        setInsuranceOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          insurance === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </label>
        <Button
          onClick={handleSearch}
          className="mt-2 h-12 w-full rounded-full border border-[#FEE720] bg-[#FEE720] px-6 text-base font-semibold text-[#333333] hover:bg-[#FFF5C2] md:mt-0 md:w-auto md:self-end"
          size="lg"
        >
          Find care
        </Button>
      </div>
    </div>
  );
}
