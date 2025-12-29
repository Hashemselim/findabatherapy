"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Building2, Home, Loader2, MapPin, Users, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import {
  locationWithServicesSchema,
  type LocationWithServicesData,
  SERVICE_RADIUS_OPTIONS,
  LOCATION_SERVICE_MODES,
  INSURANCE_OPTIONS,
} from "@/lib/validations/onboarding";
import { updateListingLocationWithServices, getOnboardingData } from "@/lib/actions/onboarding";

export default function OnboardingLocationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LocationWithServicesData>({
    resolver: zodResolver(locationWithServicesSchema),
    defaultValues: {
      label: "",
      serviceMode: "both",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      insurances: [],
      isAcceptingClients: true,
      latitude: undefined,
      longitude: undefined,
    },
  });

  const serviceRadius = watch("serviceRadiusMiles");
  const serviceMode = watch("serviceMode");
  const selectedInsurances = watch("insurances") || [];
  const isAcceptingClients = watch("isAcceptingClients");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  // Load existing data
  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data?.location) {
        const loc = result.data.location;
        reset({
          label: "",
          serviceMode: loc.serviceMode || "both",
          street: loc.street || "",
          city: loc.city || "",
          state: loc.state || "",
          postalCode: loc.postalCode || "",
          serviceRadiusMiles: loc.serviceRadiusMiles || 25,
          insurances: loc.insurances || [],
          isAcceptingClients: loc.isAcceptingClients ?? true,
          latitude: loc.latitude ?? undefined,
          longitude: loc.longitude ?? undefined,
        });
        // Set address input from existing data
        const addressParts = [loc.street, loc.city, loc.state, loc.postalCode].filter(Boolean);
        setAddressInput(addressParts.join(", "));
      }
    }
    loadData();
  }, [reset]);

  const handlePlaceSelect = (place: PlaceDetails) => {
    setSelectedPlace(place);
    // Auto-populate form fields from place details
    if (place.city) setValue("city", place.city);
    if (place.state) setValue("state", place.state);
    if (place.postalCode) setValue("postalCode", place.postalCode);
    setValue("latitude", place.latitude);
    setValue("longitude", place.longitude);
    // Extract street from formatted address (everything before city)
    if (place.formattedAddress && place.city) {
      const cityIndex = place.formattedAddress.indexOf(place.city);
      if (cityIndex > 0) {
        const street = place.formattedAddress.substring(0, cityIndex).replace(/,\s*$/, "").trim();
        if (street && street !== place.city) {
          setValue("street", street);
        }
      }
    }
  };

  function toggleInsurance(insurance: string) {
    const current = selectedInsurances || [];
    if (current.includes(insurance)) {
      setValue(
        "insurances",
        current.filter((i) => i !== insurance),
        { shouldValidate: true }
      );
    } else {
      setValue("insurances", [...current, insurance], { shouldValidate: true });
    }
  }

  async function onSubmit(data: LocationWithServicesData) {
    setError(null);

    startTransition(async () => {
      const result = await updateListingLocationWithServices(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Skip old services step - go directly to enhanced (premium features)
      router.push("/dashboard/onboarding/enhanced");
    });
  }

  const showServiceRadius = serviceMode === "in_home" || serviceMode === "both";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Primary location</h1>
        <p className="mt-1 text-muted-foreground sm:mt-2">
          Enter your main service location and the insurances you accept. You can add more
          locations later from your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Service Mode Selection */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#5788FF]" />
              Service type
            </CardTitle>
            <CardDescription>
              How do you deliver services at this location?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {LOCATION_SERVICE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setValue("serviceMode", mode.value as LocationWithServicesData["serviceMode"])}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                    serviceMode === mode.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {mode.value === "center_based" && <Building2 className="h-6 w-6 text-[#5788FF]" />}
                  {mode.value === "in_home" && <Home className="h-6 w-6 text-[#5788FF]" />}
                  {mode.value === "both" && (
                    <div className="flex">
                      <Building2 className="h-5 w-5 text-[#5788FF]" />
                      <Home className="h-5 w-5 text-[#5788FF]" />
                    </div>
                  )}
                  <span className="font-medium">{mode.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{mode.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Location details</CardTitle>
            <CardDescription>
              This is where families will find you in search results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Address Autocomplete */}
            <div className="space-y-2">
              <Label>
                Address <span className="text-destructive">*</span>
              </Label>
              <PlacesAutocomplete
                value={addressInput}
                onChange={(value) => {
                  setAddressInput(value);
                  // Clear coordinates if user is typing manually
                  if (selectedPlace) {
                    setSelectedPlace(null);
                    setValue("latitude", undefined);
                    setValue("longitude", undefined);
                  }
                }}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search for your address..."
                showIcon={true}
                inputClassName="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Start typing to search for your address. This helps families find you in location-based searches.
              </p>
            </div>

            {/* Show selected address details */}
            {(watch("city") || watch("state")) && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Selected Address</p>
                <p className="text-sm text-foreground">
                  {[watch("street"), watch("city"), watch("state"), watch("postalCode")]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {latitude && longitude ? (
                  <p className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Location coordinates verified - you&apos;ll appear in nearby searches
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Select from suggestions to appear in location-based searches
                  </p>
                )}
              </div>
            )}

            {/* Validation errors */}
            {(errors.city || errors.state || errors.street) && (
              <div className="text-sm text-destructive space-y-1">
                {errors.city && <p>{errors.city.message}</p>}
                {errors.state && <p>{errors.state.message}</p>}
                {errors.street && <p>{errors.street.message}</p>}
              </div>
            )}

            {/* Service Radius (for in-home services) */}
            {showServiceRadius && (
              <div className="space-y-2">
                <Label htmlFor="serviceRadius">
                  Service radius <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={serviceRadius?.toString()}
                  onValueChange={(value) =>
                    setValue("serviceRadiusMiles", parseInt(value, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select radius" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_RADIUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How far from this location do you provide in-home services?
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Selection */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Insurance accepted</CardTitle>
            <CardDescription>
              Select all insurance plans you accept at this location. <span className="text-destructive">*</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {INSURANCE_OPTIONS.map((insurance) => (
                <div key={insurance} className="flex items-center space-x-2">
                  <Checkbox
                    id={`insurance-${insurance}`}
                    checked={selectedInsurances.includes(insurance)}
                    onCheckedChange={() => toggleInsurance(insurance)}
                  />
                  <Label
                    htmlFor={`insurance-${insurance}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {insurance}
                  </Label>
                </div>
              ))}
            </div>
            {errors.insurances && (
              <p className="mt-2 text-sm text-destructive">{errors.insurances.message}</p>
            )}

            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> You can add more locations
                with different insurance options from your dashboard after completing onboarding.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#5788FF]" />
              Availability
            </CardTitle>
            <CardDescription>
              Let families know if you&apos;re currently accepting new clients at this location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
              <div>
                <p className="font-medium text-foreground">Accepting new clients</p>
                <p className="text-sm text-muted-foreground">
                  Toggle off if you have a waitlist or aren&apos;t taking new referrals
                </p>
              </div>
              <Switch
                checked={isAcceptingClients}
                onCheckedChange={(checked: boolean) => setValue("isAcceptingClients", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/onboarding/details")}
            disabled={isPending}
            className="w-full rounded-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            className="w-full rounded-full px-8 sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
