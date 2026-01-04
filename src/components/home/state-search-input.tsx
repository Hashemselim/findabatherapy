"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { buildSearchUrl } from "@/lib/search/filters";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";

export function StateSearchInput() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);

  const handlePlaceSelect = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    if (place.city && place.state) {
      setLocation(`${place.city}, ${place.state}`);
    }
  }, []);

  const handleSearch = () => {
    if (!location.trim() && !selectedPlace) return;

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

    const url = buildSearchUrl(filters as never);
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1" onKeyDown={handleKeyDown}>
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
          inputClassName="h-12 rounded-xl border-border/60 bg-muted/30 pl-10 text-base md:text-sm transition-all duration-300 ease-premium focus:border-[#5788FF]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(87,136,255,0.1)]"
        />
      </div>
      <Button
        onClick={handleSearch}
        className="h-12 shrink-0 rounded-xl bg-[#5788FF] px-4 text-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:bg-[#4A7AEE] hover:shadow-md active:translate-y-0"
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
}
