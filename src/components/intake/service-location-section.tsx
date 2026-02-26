"use client";

import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { MapPin } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import { LOCATION_LABEL_OPTIONS } from "@/lib/validations/clients";

export interface AgencyLocationOption {
  id: string;
  label: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ServiceLocationSectionProps {
  form: UseFormReturn<Record<string, unknown>>;
  required: boolean;
  brandColor: string;
  agencyLocations: AgencyLocationOption[];
}

export function ServiceLocationSection({
  form,
  required,
  brandColor,
  agencyLocations,
}: ServiceLocationSectionProps) {
  const [addressInput, setAddressInput] = useState("");
  const serviceLocation = form.watch("service_location") as
    | Record<string, unknown>
    | undefined;
  const locationType = (serviceLocation?.location_type as string) || "";
  const sameAsHome = (serviceLocation?.same_as_home as boolean) || false;
  const homeAddress = form.watch("home_address") as
    | Record<string, unknown>
    | undefined;

  // When "same as home" is toggled, sync address from home_address
  useEffect(() => {
    if (locationType === "home" && sameAsHome && homeAddress) {
      updateServiceFields({
        same_as_home: true,
        street_address: (homeAddress.street_address as string) || "",
        city: (homeAddress.city as string) || "",
        state: (homeAddress.state as string) || "",
        postal_code: (homeAddress.postal_code as string) || "",
        latitude: homeAddress.latitude as number | undefined,
        longitude: homeAddress.longitude as number | undefined,
        place_id: (homeAddress.place_id as string) || "",
        formatted_address: (homeAddress.formatted_address as string) || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    locationType,
    sameAsHome,
    homeAddress?.street_address,
    homeAddress?.city,
    homeAddress?.state,
    homeAddress?.postal_code,
  ]);

  /** Merge partial updates into the service_location object */
  const updateServiceFields = (
    partial: Record<string, unknown>,
  ) => {
    const current = (form.getValues("service_location") as Record<string, unknown>) || {};
    form.setValue(
      "service_location",
      { ...current, ...partial },
      { shouldValidate: true },
    );
  };

  const handleTypeChange = (type: string) => {
    // Reset address fields when type changes
    updateServiceFields({
      location_type: type,
      same_as_home: false,
      agency_location_id: "",
      street_address: "",
      city: "",
      state: "",
      postal_code: "",
      latitude: undefined,
      longitude: undefined,
      place_id: "",
      formatted_address: "",
      notes: "",
    });
    setAddressInput("");
  };

  const handlePlaceSelect = (place: PlaceDetails) => {
    updateServiceFields({
      street_address: place.streetAddress || "",
      city: place.city || "",
      state: place.state || "",
      postal_code: place.postalCode || "",
      latitude: place.latitude,
      longitude: place.longitude,
      place_id: place.placeId || "",
      formatted_address: place.formattedAddress || "",
    });
    setAddressInput(place.formattedAddress || "");
  };

  const handleAgencyLocationSelect = (locationId: string) => {
    const loc = agencyLocations.find((l) => l.id === locationId);
    if (!loc) return;
    updateServiceFields({
      agency_location_id: locationId,
      street_address: loc.street || "",
      city: loc.city || "",
      state: loc.state || "",
      postal_code: loc.postal_code || "",
      latitude: loc.latitude ?? undefined,
      longitude: loc.longitude ?? undefined,
      formatted_address: [loc.street, loc.city, loc.state, loc.postal_code]
        .filter(Boolean)
        .join(", "),
    });
  };

  const handleSameAsHomeToggle = (checked: boolean) => {
    if (checked && homeAddress) {
      updateServiceFields({
        same_as_home: true,
        street_address: (homeAddress.street_address as string) || "",
        city: (homeAddress.city as string) || "",
        state: (homeAddress.state as string) || "",
        postal_code: (homeAddress.postal_code as string) || "",
        latitude: homeAddress.latitude as number | undefined,
        longitude: homeAddress.longitude as number | undefined,
        place_id: (homeAddress.place_id as string) || "",
        formatted_address: (homeAddress.formatted_address as string) || "",
      });
    } else {
      updateServiceFields({
        same_as_home: false,
        street_address: "",
        city: "",
        state: "",
        postal_code: "",
        latitude: undefined,
        longitude: undefined,
        place_id: "",
        formatted_address: "",
      });
      setAddressInput("");
    }
  };

  // Build summary from current service address
  const hasAddress =
    serviceLocation &&
    (serviceLocation.street_address || serviceLocation.city);
  const addressParts = hasAddress
    ? [
        serviceLocation.street_address as string,
        serviceLocation.city as string,
        serviceLocation.state as string,
        serviceLocation.postal_code as string,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const fieldError = form.formState.errors.service_location;
  const errorMessage = fieldError?.message as string | undefined;

  // Determine if we should show address input (for School, Daycare, Grandparents', Other, and Home when not same-as-home)
  const showAddressInput =
    locationType === "school" ||
    locationType === "daycare" ||
    locationType === "grandparents" ||
    locationType === "other" ||
    (locationType === "home" && !sameAsHome);

  // Show agency location picker for Center/Clinic when agency has locations
  const showAgencyPicker =
    locationType === "clinic" && agencyLocations.length > 0;
  // Fallback to address input if clinic but no agency locations
  const showClinicFallback =
    locationType === "clinic" && agencyLocations.length === 0;

  return (
    <div className="space-y-4 sm:col-span-2">
      <Label>
        Service Location
        {required && <span className="text-destructive"> *</span>}
      </Label>

      {/* Location Type dropdown — always visible */}
      <Select value={locationType} onValueChange={handleTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select location type" />
        </SelectTrigger>
        <SelectContent>
          {LOCATION_LABEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Conditional content based on type */}
      {locationType === "home" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="same_as_home"
              checked={sameAsHome}
              onCheckedChange={(checked) =>
                handleSameAsHomeToggle(checked === true)
              }
            />
            <Label htmlFor="same_as_home" className="text-sm font-normal">
              Same address as client&apos;s home
            </Label>
          </div>
        </div>
      )}

      {/* Agency location picker for Center/Clinic */}
      {!!showAgencyPicker && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Select a location
          </Label>
          <Select
            value={
              (serviceLocation?.agency_location_id as string) || ""
            }
            onValueChange={handleAgencyLocationSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a center/clinic" />
            </SelectTrigger>
            <SelectContent>
              {agencyLocations.map((loc) => {
                const display = [
                  loc.label,
                  loc.city,
                  loc.state,
                ]
                  .filter(Boolean)
                  .join(" — ");
                return (
                  <SelectItem key={loc.id} value={loc.id}>
                    {display || "Location"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Address input for types that need it */}
      {(showAddressInput || showClinicFallback) && (
        <PlacesAutocomplete
          value={addressInput}
          onChange={setAddressInput}
          onPlaceSelect={handlePlaceSelect}
          placeholder="Start typing an address..."
          showIcon
        />
      )}

      {/* Notes field for "Other" type */}
      {locationType === "other" && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Location Notes
          </Label>
          <Textarea
            value={(serviceLocation?.notes as string) || ""}
            onChange={(e) => updateServiceFields({ notes: e.target.value })}
            placeholder="Describe the location..."
            rows={2}
          />
        </div>
      )}

      {/* Address summary */}
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
