"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { MapPin } from "lucide-react";

import { Label } from "@/components/ui/label";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";

interface HomeAddressSectionProps {
  form: UseFormReturn<Record<string, unknown>>;
  required: boolean;
  brandColor: string;
}

export function HomeAddressSection({
  form,
  required,
  brandColor,
}: HomeAddressSectionProps) {
  const [addressInput, setAddressInput] = useState("");
  const homeAddress = form.watch("home_address") as
    | Record<string, unknown>
    | undefined;

  const handlePlaceSelect = (place: PlaceDetails) => {
    form.setValue(
      "home_address",
      {
        street_address: place.streetAddress || "",
        city: place.city || "",
        state: place.state || "",
        postal_code: place.postalCode || "",
        latitude: place.latitude,
        longitude: place.longitude,
        place_id: place.placeId || "",
        formatted_address: place.formattedAddress || "",
      },
      { shouldValidate: true },
    );
    setAddressInput(place.formattedAddress || "");
  };

  // Build summary from selected address
  const hasAddress = homeAddress && (homeAddress.street_address || homeAddress.city);
  const addressParts = hasAddress
    ? [
        homeAddress.street_address as string,
        homeAddress.city as string,
        homeAddress.state as string,
        homeAddress.postal_code as string,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const fieldError = form.formState.errors.home_address;
  const errorMessage = fieldError?.message as string | undefined;

  return (
    <div className="space-y-3 sm:col-span-2">
      <Label>
        Home Address
        {required && <span className="text-destructive"> *</span>}
      </Label>

      <PlacesAutocomplete
        value={addressInput}
        onChange={setAddressInput}
        onPlaceSelect={handlePlaceSelect}
        placeholder="Start typing an address..."
        showIcon
      />

      {/* Address confirmation after selection */}
      {!!hasAddress && addressParts && (
        <div
          className="flex items-start gap-2 rounded-lg border p-3 text-sm"
          style={{
            borderColor: `${brandColor}30`,
            backgroundColor: `${brandColor}08`,
          }}
        >
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: brandColor }}
          />
          <span className="text-muted-foreground">{addressParts}</span>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
