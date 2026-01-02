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
  "inline-flex items-center rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs font-semibold text-foreground";

type CompactSearchBarProps = {
  heading?: ReactNode;
  defaultLocation?: string;
  defaultServices?: string[];
  defaultInsurance?: string;
};

const DEFAULT_SERVICES = ["in_home", "in_center"];

export function CompactSearchBar({
  heading,
  defaultLocation = "",
  defaultServices,
  defaultInsurance,
}: CompactSearchBarProps) {
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

  // Sync state when props change
  useEffect(() => {
    setLocation(defaultLocation);
    setSelectedPlace(null);
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

    const filters: Record<string, string | string[] | number | undefined> = {};

    if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
      filters.userLat = selectedPlace.latitude;
      filters.userLng = selectedPlace.longitude;
      filters.radiusMiles = 25;
      if (selectedPlace.city) filters.city = selectedPlace.city;
      if (selectedPlace.state) filters.state = selectedPlace.state;
    } else if (location.trim()) {
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
    <div className="w-full space-y-3">
      {/* Heading */}
      {heading && (
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {heading}
        </h1>
      )}

      {/* Compact search card */}
      <div className="rounded-2xl border border-border/50 bg-white/80 p-3 shadow-sm backdrop-blur-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
              initialValidated={!!defaultLocation}
              inputClassName="h-10 rounded-xl pl-9 text-sm bg-white border-border"
            />
          </div>

          {/* Setting dropdown */}
          <Popover open={settingOpen} onOpenChange={setSettingOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 text-left text-sm sm:flex-[1.1] sm:min-w-[150px]"
              >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                {activeServices.length ? (
                  activeServices.length === SERVICE_MODES.length ? (
                    <span className="text-foreground">All settings</span>
                  ) : (
                    <>
                      {activeServices.map((service) => (
                        <span key={service.value} className={cn(pillClassName, "shrink-0")}>
                          {service.label}
                        </span>
                      ))}
                    </>
                  )
                ) : (
                  <span className="text-muted-foreground">Setting</span>
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

        {/* Insurance dropdown */}
        <Popover open={insuranceOpen} onOpenChange={setInsuranceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 text-left text-sm sm:flex-[0.9] sm:min-w-[130px]"
            >
              <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 overflow-hidden">
                {insurance ? (
                  <span className={pillClassName}>{insurance}</span>
                ) : (
                  <span className="text-muted-foreground">Insurance</span>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
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

        {/* Search button */}
          <Button
            onClick={handleSearch}
            className="h-10 w-full rounded-xl border border-[#FEE720] bg-[#FEE720] px-5 text-sm font-semibold text-[#333333] hover:bg-[#FFF5C2] sm:w-auto"
          >
            Find care
          </Button>
        </div>
      </div>
    </div>
  );
}
