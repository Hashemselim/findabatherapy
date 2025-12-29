"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Plus,
  MapPin,
  Star,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Building2,
  Home,
  Sparkles,
  MapPinOff,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  addLocation,
  updateLocation,
  deleteLocation,
  setPrimaryLocation,
  type LocationData,
  type LocationServiceMode,
} from "@/lib/actions/locations";
import {
  SERVICE_RADIUS_OPTIONS,
  LOCATION_SERVICE_MODES,
  INSURANCE_OPTIONS,
} from "@/lib/validations/onboarding";
import { GoogleBusinessLinkModal } from "@/components/dashboard/google-business-link-modal";
import { FeaturedUpgradeButton, type FeaturedPricing } from "@/components/dashboard/featured-upgrade-button";
import { FeaturedManageButton } from "@/components/dashboard/featured-manage-button";

const locationFormSchema = z
  .object({
    label: z.string().optional(),
    serviceMode: z.enum(["center_based", "in_home", "both"]),
    street: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().length(2, "Please select a state"),
    postalCode: z.string().optional(),
    serviceRadiusMiles: z.number().min(5).max(100),
    insurances: z.array(z.string()).min(1, "Please select at least one insurance"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.serviceMode === "center_based" || data.serviceMode === "both") {
        return data.street && data.street.trim().length > 0;
      }
      return true;
    },
    {
      message: "Street address is required for center-based services",
      path: ["street"],
    }
  );

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationsManagerProps {
  initialLocations: LocationData[];
  locationLimit: number;
  planTier: string;
  featuredPricing: FeaturedPricing;
}

const SERVICE_MODE_LABELS: Record<LocationServiceMode, string> = {
  center_based: "Center-Based",
  in_home: "In-Home",
  both: "Center & In-Home",
};

export function LocationsManager({
  initialLocations,
  locationLimit,
  planTier,
  featuredPricing,
}: LocationsManagerProps) {
  const [locations, setLocations] = useState<LocationData[]>(initialLocations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [googleLinkModalOpen, setGoogleLinkModalOpen] = useState(false);
  const [googleLinkLocation, setGoogleLinkLocation] = useState<LocationData | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for featured_success param to show success message
  useEffect(() => {
    const featuredSuccess = searchParams.get("featured_success");
    if (featuredSuccess) {
      const location = locations.find(loc => loc.id === featuredSuccess);
      const locationName = location ? (location.label || `${location.city}, ${location.state}`) : "Your location";
      setSuccess(`${locationName} is now featured and will appear at the top of search results!`);
      // Clear the URL param
      router.replace("/dashboard/locations", { scroll: false });
      setTimeout(() => setSuccess(null), 5000);
    }
  }, [searchParams, router, locations]);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      label: "",
      serviceMode: "both",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      insurances: [],
      latitude: undefined,
      longitude: undefined,
    },
  });

  const serviceMode = form.watch("serviceMode");
  const selectedInsurances = form.watch("insurances") || [];
  const canAddMore = locations.length < locationLimit;
  const isFreePlan = planTier === "free";

  const showServiceRadius = serviceMode === "in_home" || serviceMode === "both";

  const resetForm = () => {
    form.reset({
      label: "",
      serviceMode: "both",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      insurances: [],
      latitude: undefined,
      longitude: undefined,
    });
    setAddressInput("");
    setSelectedPlace(null);
    setEditingLocation(null);
    setError(null);
  };

  const handlePlaceSelect = (place: PlaceDetails) => {
    setSelectedPlace(place);
    // Auto-populate form fields from place details
    if (place.city) form.setValue("city", place.city);
    if (place.state) form.setValue("state", place.state);
    if (place.postalCode) form.setValue("postalCode", place.postalCode);
    form.setValue("latitude", place.latitude);
    form.setValue("longitude", place.longitude);
    // Extract street from formatted address (everything before city)
    if (place.formattedAddress && place.city) {
      const cityIndex = place.formattedAddress.indexOf(place.city);
      if (cityIndex > 0) {
        const street = place.formattedAddress.substring(0, cityIndex).replace(/,\s*$/, "").trim();
        if (street && street !== place.city) {
          form.setValue("street", street);
        }
      }
    }
  };

  const openEditDialog = (location: LocationData) => {
    setEditingLocation(location);
    // Build address string for display
    const addressParts = [location.street, location.city, location.state, location.postalCode].filter(Boolean);
    setAddressInput(addressParts.join(", "));
    setSelectedPlace(null); // Clear selected place when editing
    form.reset({
      label: location.label || "",
      serviceMode: location.serviceMode,
      street: location.street || "",
      city: location.city,
      state: location.state,
      postalCode: location.postalCode || "",
      serviceRadiusMiles: location.serviceRadiusMiles,
      insurances: location.insurances || [],
      latitude: location.latitude || undefined,
      longitude: location.longitude || undefined,
    });
    setIsDialogOpen(true);
  };

  const toggleInsurance = (insurance: string) => {
    const current = selectedInsurances || [];
    if (current.includes(insurance)) {
      form.setValue(
        "insurances",
        current.filter((i) => i !== insurance),
        { shouldValidate: true }
      );
    } else {
      form.setValue("insurances", [...current, insurance], { shouldValidate: true });
    }
  };

  const handleSubmit = (values: LocationFormValues) => {
    setError(null);

    startTransition(async () => {
      if (editingLocation) {
        // Update existing location
        const result = await updateLocation(editingLocation.id, {
          label: values.label || undefined,
          serviceMode: values.serviceMode,
          street: values.street || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          serviceRadiusMiles: values.serviceRadiusMiles,
          insurances: values.insurances,
          latitude: values.latitude,
          longitude: values.longitude,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        // Update local state
        const geocoded = result.data?.geocoded ?? false;
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === editingLocation.id
              ? {
                  ...loc,
                  label: values.label || null,
                  serviceMode: values.serviceMode,
                  street: values.street || null,
                  city: values.city,
                  state: values.state,
                  postalCode: values.postalCode || null,
                  serviceRadiusMiles: values.serviceRadiusMiles,
                  insurances: values.insurances,
                  // Update lat/lng status based on geocoding result
                  latitude: geocoded ? loc.latitude ?? 1 : null,
                  longitude: geocoded ? loc.longitude ?? 1 : null,
                }
              : loc
          )
        );

        setSuccess(geocoded ? "Location updated and address verified" : "Location updated (address could not be verified)");
      } else {
        // Add new location
        const result = await addLocation({
          label: values.label || undefined,
          serviceMode: values.serviceMode,
          street: values.street || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          serviceRadiusMiles: values.serviceRadiusMiles,
          insurances: values.insurances,
          latitude: values.latitude,
          longitude: values.longitude,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        // Add to local state
        const geocoded = result.data?.geocoded ?? false;
        const newLocation: LocationData = {
          id: result.data!.id,
          label: values.label || null,
          serviceMode: values.serviceMode,
          street: values.street || null,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || null,
          // Set placeholder coords if geocoded (actual values are in DB)
          latitude: geocoded ? 1 : null,
          longitude: geocoded ? 1 : null,
          serviceRadiusMiles: values.serviceRadiusMiles,
          insurances: values.insurances,
          isPrimary: locations.length === 0,
          createdAt: new Date().toISOString(),
          // Contact info - defaults to using company contact
          contactPhone: null,
          contactEmail: null,
          useCompanyContact: true,
          // Google Business - not linked initially
          googlePlaceId: null,
          googleRating: null,
          googleRatingCount: null,
          // Featured - not featured initially
          isFeatured: false,
          featuredSubscription: null,
        };

        setLocations((prev) => [...prev, newLocation]);
        setSuccess(geocoded ? "Location added and address verified" : "Location added (address could not be verified)");
      }

      setIsDialogOpen(false);
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const handleDelete = (locationId: string) => {
    startTransition(async () => {
      const result = await deleteLocation(locationId);

      if (!result.success) {
        setError(result.error);
        setTimeout(() => setError(null), 3000);
        return;
      }

      setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
      setSuccess("Location deleted");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const handleSetPrimary = (locationId: string) => {
    startTransition(async () => {
      const result = await setPrimaryLocation(locationId);

      if (!result.success) {
        setError(result.error);
        setTimeout(() => setError(null), 3000);
        return;
      }

      setLocations((prev) =>
        prev.map((loc) => ({
          ...loc,
          isPrimary: loc.id === locationId,
        }))
      );
      setSuccess("Primary location updated");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  return (
    <>
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Manage your service locations. Each location can have different services and insurances.
            </CardDescription>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={!canAddMore || isPending}
                onClick={() => resetForm()}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Location" : "Add Location"}
                </DialogTitle>
                <DialogDescription>
                  {editingLocation
                    ? "Update the location details below."
                    : "Add a new service location with its service type and accepted insurances."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Service Mode */}
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {LOCATION_SERVICE_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => form.setValue("serviceMode", mode.value as LocationServiceMode)}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors ${
                          serviceMode === mode.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {mode.value === "center_based" && <Building2 className="h-4 w-4 text-[#5788FF]" />}
                        {mode.value === "in_home" && <Home className="h-4 w-4 text-[#5788FF]" />}
                        {mode.value === "both" && (
                          <div className="flex">
                            <Building2 className="h-4 w-4 text-[#5788FF]" />
                            <Home className="h-4 w-4 text-[#5788FF]" />
                          </div>
                        )}
                        <span className="font-medium">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Main Office, North Branch"
                    {...form.register("label")}
                    disabled={isPending}
                  />
                </div>

                {/* Address Autocomplete */}
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <PlacesAutocomplete
                    value={addressInput}
                    onChange={(value) => {
                      setAddressInput(value);
                      // Clear coordinates if user is typing manually
                      if (selectedPlace) {
                        setSelectedPlace(null);
                        form.setValue("latitude", undefined);
                        form.setValue("longitude", undefined);
                      }
                    }}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Search for an address..."
                    showIcon={true}
                    inputClassName="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Start typing to search for your address
                  </p>
                </div>

                {/* Show selected address details (read-only confirmation) */}
                {(form.watch("city") || form.watch("state")) && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Selected Address</p>
                    <p className="text-sm text-foreground">
                      {[form.watch("street"), form.watch("city"), form.watch("state"), form.watch("postalCode")]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {form.watch("latitude") && form.watch("longitude") ? (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Coordinates verified
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Select from suggestions for accurate location
                      </p>
                    )}
                  </div>
                )}

                {/* Validation errors */}
                {(form.formState.errors.city || form.formState.errors.state || form.formState.errors.street) && (
                  <div className="text-xs text-destructive space-y-1">
                    {form.formState.errors.city && <p>{form.formState.errors.city.message}</p>}
                    {form.formState.errors.state && <p>{form.formState.errors.state.message}</p>}
                    {form.formState.errors.street && <p>{form.formState.errors.street.message}</p>}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">

                  {showServiceRadius && (
                    <div className="space-y-2">
                      <Label htmlFor="serviceRadius">Service Radius</Label>
                      <Select
                        value={form.watch("serviceRadiusMiles").toString()}
                        onValueChange={(value) =>
                          form.setValue("serviceRadiusMiles", parseInt(value))
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger id="serviceRadius">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_RADIUS_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Insurance Selection */}
                <div className="space-y-2">
                  <Label>Insurance Accepted *</Label>
                  <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                    {INSURANCE_OPTIONS.map((insurance) => (
                      <div key={insurance} className="flex items-center space-x-2">
                        <Checkbox
                          id={`insurance-${insurance}`}
                          checked={selectedInsurances.includes(insurance)}
                          onCheckedChange={() => toggleInsurance(insurance)}
                          disabled={isPending}
                        />
                        <Label
                          htmlFor={`insurance-${insurance}`}
                          className="cursor-pointer text-xs font-normal"
                        >
                          {insurance}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.insurances && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.insurances.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingLocation ? (
                      "Save Changes"
                    ) : (
                      "Add Location"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {error && !isDialogOpen && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {locations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No locations added yet. Add your first location to appear in search results.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => {
              const locationName = location.label || `${location.city}, ${location.state}`;
              const isFeatured = location.isFeatured && location.featuredSubscription;

              return (
                <div
                  key={location.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isFeatured
                      ? "border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/50 ring-1 ring-amber-200/50"
                      : "border-border/60"
                  }`}
                >
                  {/* Main content */}
                  <div className="flex items-start gap-3">
                    <div className={`hidden rounded-lg p-2 sm:block ${
                      isFeatured ? "bg-amber-100" : "bg-primary/10"
                    }`}>
                      <MapPin className={`h-4 w-4 ${isFeatured ? "text-amber-600" : "text-[#5788FF]"}`} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{locationName}</p>
                        {location.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                        {isFeatured && (
                          <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-700" variant="outline">
                            <Sparkles className="h-3 w-3 fill-amber-400" />
                            Featured
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {SERVICE_MODE_LABELS[location.serviceMode]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">
                        {[location.street, location.city, location.state, location.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {(location.serviceMode === "in_home" || location.serviceMode === "both") && (
                        <p className="text-xs text-muted-foreground">
                          Service radius: {location.serviceRadiusMiles} miles
                        </p>
                      )}
                      {location.insurances && location.insurances.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Insurance:{" "}
                          {location.insurances.slice(0, 3).join(", ")}
                          {location.insurances.length > 3 && ` +${location.insurances.length - 3} more`}
                        </p>
                      )}
                      {/* Geocoding status indicator */}
                      {location.latitude && location.longitude ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Address verified
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-xs text-amber-600">
                          <MapPinOff className="h-3 w-3" />
                          Address not verified
                        </p>
                      )}
                      {/* Google Business Link - Paid feature only */}
                      {location.googlePlaceId ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${location.googlePlaceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs transition-colors hover:bg-amber-100"
                          >
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-amber-700">
                              {location.googleRating?.toFixed(1) || "N/A"}
                            </span>
                            {location.googleRatingCount && (
                              <span className="text-amber-600">
                                ({location.googleRatingCount.toLocaleString()})
                              </span>
                            )}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleLinkLocation(location);
                              setGoogleLinkModalOpen(true);
                            }}
                            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : !isFreePlan ? (
                        <button
                          type="button"
                          onClick={() => {
                            setGoogleLinkLocation(location);
                            setGoogleLinkModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 text-xs text-[#5788FF] underline-offset-2 hover:underline"
                        >
                          <Star className="h-3 w-3" />
                          Show your Google rating
                        </button>
                      ) : (
                        <Link
                          href="/dashboard/billing"
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <Star className="h-3 w-3" />
                          <span>Google rating</span>
                          <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">Pro</Badge>
                        </Link>
                      )}
                    </div>

                    {/* Actions - desktop only */}
                    <div className="hidden items-center gap-1 sm:flex">
                      {!location.isPrimary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(location.id)}
                          disabled={isPending}
                          title="Set as primary"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(location)}
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {locations.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={isPending}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Location</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this location? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(location.id)}
                                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Featured upgrade section - separate from badges */}
                  {!isFreePlan && (
                    <div className={`mt-3 flex items-center justify-between border-t pt-3 ${
                      isFeatured ? "border-amber-200/60" : "border-border/40"
                    }`}>
                      {isFeatured && location.featuredSubscription ? (
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-amber-700">
                              Appearing at top of {location.state} searches
                            </span>
                          </div>
                          <FeaturedManageButton
                            locationId={location.id}
                            locationName={locationName}
                            status={location.featuredSubscription.status}
                            billingInterval={location.featuredSubscription.billingInterval}
                            currentPeriodEnd={location.featuredSubscription.currentPeriodEnd}
                            cancelAtPeriodEnd={location.featuredSubscription.cancelAtPeriodEnd}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-muted-foreground">
                              Boost to top of search results
                            </span>
                          </div>
                          <FeaturedUpgradeButton
                            locationId={location.id}
                            locationName={locationName}
                            disabled={isPending}
                            pricing={featuredPricing}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile actions */}
                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/40 pt-3 sm:hidden">
                    {!location.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(location.id)}
                        disabled={isPending}
                        title="Set as primary"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Star className="h-4 w-4" />
                        <span className="ml-2">Primary</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(location)}
                      disabled={isPending}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="ml-2">Edit</span>
                    </Button>
                    {locations.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="ml-2 text-destructive">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this location? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(location.id)}
                              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!canAddMore && !isFreePlan && (
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached your plan&apos;s location limit ({locationLimit}).
          </p>
        )}

        {isFreePlan && locations.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)]" />
            <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:flex">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      Add more locations
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                      <Sparkles className="h-3 w-3" />
                      Pro
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Free plan is limited to 1 location. Upgrade to add up to 5 locations.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="w-full shrink-0 rounded-full sm:w-auto">
                <Link href="/dashboard/billing">
                  Upgrade Now
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

      {/* Google Business Link Modal */}
      {googleLinkLocation && (
        <GoogleBusinessLinkModal
          open={googleLinkModalOpen}
          onOpenChange={setGoogleLinkModalOpen}
          locationId={googleLinkLocation.id}
          locationCity={googleLinkLocation.city}
          locationState={googleLinkLocation.state}
          currentPlaceId={googleLinkLocation.googlePlaceId}
          currentRating={googleLinkLocation.googleRating}
          currentRatingCount={googleLinkLocation.googleRatingCount}
          onSuccess={() => {
            // Refresh location data from server
            // For now, we do a simple page refresh approach via revalidation
            // The server action already calls revalidatePath
            setSuccess("Google Business updated");
            setTimeout(() => setSuccess(null), 3000);
            // Update local state optimistically - the modal will have passed the new data
            // We need to refetch to get updated google data
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
