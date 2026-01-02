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
  CheckCircle2,
  AlertCircle,
  Building2,
  Home,
  Sparkles,
  MapPinOff,
  TrendingUp,
  Video,
  GraduationCap,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  type ServiceType,
} from "@/lib/actions/locations";
import {
  SERVICE_RADIUS_OPTIONS,
  INSURANCE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/validations/onboarding";
import { GoogleBusinessLinkModal } from "@/components/dashboard/google-business-link-modal";
import { FeaturedUpgradeButton, type FeaturedPricing } from "@/components/dashboard/featured-upgrade-button";
import { FeaturedManageButton } from "@/components/dashboard/featured-manage-button";
import { useFormErrorHandler, FormErrorSummary } from "@/hooks/use-form-error-handler";

const locationFormSchema = z
  .object({
    label: z.string().optional(),
    serviceTypes: z.array(z.string()).min(1, "Please select at least one service type"),
    street: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().length(2, "Please select a state"),
    postalCode: z.string().optional(),
    serviceRadiusMiles: z.number().min(5).max(100),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // Contact override
    useCompanyContact: z.boolean(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactWebsite: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((val) => {
        if (!val || val === "") return "";
        // Auto-prepend https:// if no protocol specified
        if (!val.match(/^https?:\/\//i)) {
          return `https://${val}`;
        }
        return val;
      })
      .refine((val) => val === "" || z.string().url().safeParse(val).success, {
        message: "Please enter a valid website URL",
      }),
    // Insurances - always location-level
    insurances: z.array(z.string()).min(1, "Please select at least one insurance"),
    // Accepting clients
    isAcceptingClients: z.boolean(),
  })
  .refine(
    (data) => {
      // If center-based or school-based is selected, street address is required
      if (data.serviceTypes.includes("in_center") || data.serviceTypes.includes("school_based")) {
        return data.street && data.street.trim().length > 0;
      }
      return true;
    },
    {
      message: "Street address is required for center-based and school-based services",
      path: ["street"],
    }
  );

type LocationFormValues = {
  label?: string;
  serviceTypes: string[];
  street?: string;
  city: string;
  state: string;
  postalCode?: string;
  serviceRadiusMiles: number;
  latitude?: number;
  longitude?: number;
  useCompanyContact: boolean;
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  insurances: string[];
  isAcceptingClients: boolean;
};

export interface CompanyDefaults {
  phone: string | null;
  email: string;
  website: string | null;
}

interface LocationsManagerProps {
  initialLocations: LocationData[];
  locationLimit: number;
  planTier: string;
  featuredPricing: FeaturedPricing;
  companyDefaults: CompanyDefaults;
}

export function LocationsManager({
  initialLocations,
  locationLimit,
  planTier,
  featuredPricing,
  companyDefaults,
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
      serviceTypes: ["in_home", "in_center"],
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      latitude: undefined,
      longitude: undefined,
      // Contact override - default to using company contact
      useCompanyContact: true,
      contactPhone: "",
      contactEmail: "",
      contactWebsite: "",
      // Insurances - empty by default, user must select
      insurances: [],
      // Accepting clients - default to true
      isAcceptingClients: true,
    },
  });

  const { formRef, hasErrors, errorCount } = useFormErrorHandler({
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
  });

  const selectedServiceTypes = form.watch("serviceTypes") || [];
  const selectedInsurances = form.watch("insurances") || [];
  const useCompanyContact = form.watch("useCompanyContact");
  const isAcceptingClients = form.watch("isAcceptingClients");
  const canAddMore = locations.length < locationLimit;
  const isFreePlan = planTier === "free";

  const showServiceRadius = selectedServiceTypes.includes("in_home") || selectedServiceTypes.includes("telehealth");

  const resetForm = () => {
    form.reset({
      label: "",
      serviceTypes: ["in_home", "in_center"],
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      latitude: undefined,
      longitude: undefined,
      // Contact override - reset to using company contact
      useCompanyContact: true,
      contactPhone: "",
      contactEmail: "",
      contactWebsite: "",
      // Insurances - empty for new locations
      insurances: [],
      // Accepting clients
      isAcceptingClients: true,
    });
    setAddressInput("");
    setSelectedPlace(null);
    setEditingLocation(null);
    setError(null);
  };

  const handlePlaceSelect = (place: PlaceDetails) => {
    setSelectedPlace(place);
    // Clear previous values first, then set new ones
    form.setValue("street", "");
    form.setValue("city", place.city || "");
    form.setValue("state", place.state || "");
    form.setValue("postalCode", place.postalCode || "");
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
      serviceTypes: location.serviceTypes || ["in_home", "in_center"],
      street: location.street || "",
      city: location.city,
      state: location.state,
      postalCode: location.postalCode || "",
      serviceRadiusMiles: location.serviceRadiusMiles,
      latitude: location.latitude || undefined,
      longitude: location.longitude || undefined,
      // Contact override
      useCompanyContact: location.useCompanyContact,
      contactPhone: location.contactPhone || "",
      contactEmail: location.contactEmail || "",
      contactWebsite: location.contactWebsite || "",
      // Insurances
      insurances: location.insurances || [],
      // Accepting clients
      isAcceptingClients: location.isAcceptingClients,
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

  const toggleServiceType = (type: string) => {
    const current = selectedServiceTypes || [];
    if (current.includes(type)) {
      form.setValue(
        "serviceTypes",
        current.filter((t) => t !== type),
        { shouldValidate: true }
      );
    } else {
      form.setValue("serviceTypes", [...current, type], { shouldValidate: true });
    }
  };

  const handleSubmit = (values: LocationFormValues) => {
    setError(null);

    startTransition(async () => {
      if (editingLocation) {
        // Update existing location
        const result = await updateLocation(editingLocation.id, {
          label: values.label || undefined,
          serviceTypes: values.serviceTypes as ServiceType[],
          street: values.street || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          serviceRadiusMiles: values.serviceRadiusMiles,
          latitude: values.latitude,
          longitude: values.longitude,
          // Contact override
          useCompanyContact: values.useCompanyContact,
          contactPhone: values.useCompanyContact ? undefined : values.contactPhone,
          contactEmail: values.useCompanyContact ? undefined : values.contactEmail,
          contactWebsite: values.useCompanyContact ? undefined : values.contactWebsite,
          // Insurances
          insurances: values.insurances,
          // Accepting clients
          isAcceptingClients: values.isAcceptingClients,
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
                  serviceTypes: values.serviceTypes as ServiceType[],
                  street: values.street || null,
                  city: values.city,
                  state: values.state,
                  postalCode: values.postalCode || null,
                  serviceRadiusMiles: values.serviceRadiusMiles,
                  // Update lat/lng status based on geocoding result
                  latitude: geocoded ? loc.latitude ?? 1 : null,
                  longitude: geocoded ? loc.longitude ?? 1 : null,
                  // Contact override
                  useCompanyContact: values.useCompanyContact,
                  contactPhone: values.useCompanyContact ? null : (values.contactPhone || null),
                  contactEmail: values.useCompanyContact ? null : (values.contactEmail || null),
                  contactWebsite: values.useCompanyContact ? null : (values.contactWebsite || null),
                  // Insurances
                  insurances: values.insurances,
                  // Accepting clients
                  isAcceptingClients: values.isAcceptingClients,
                }
              : loc
          )
        );

        setSuccess(geocoded ? "Location updated and address verified" : "Location updated (address could not be verified)");
      } else {
        // Add new location
        const result = await addLocation({
          label: values.label || undefined,
          serviceTypes: values.serviceTypes as ServiceType[],
          street: values.street || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          serviceRadiusMiles: values.serviceRadiusMiles,
          latitude: values.latitude,
          longitude: values.longitude,
          // Contact override
          useCompanyContact: values.useCompanyContact,
          contactPhone: values.useCompanyContact ? undefined : values.contactPhone,
          contactEmail: values.useCompanyContact ? undefined : values.contactEmail,
          contactWebsite: values.useCompanyContact ? undefined : values.contactWebsite,
          // Insurances
          insurances: values.insurances,
          // Accepting clients
          isAcceptingClients: values.isAcceptingClients,
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
          serviceTypes: values.serviceTypes as ServiceType[],
          street: values.street || null,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || null,
          // Set placeholder coords if geocoded (actual values are in DB)
          latitude: geocoded ? 1 : null,
          longitude: geocoded ? 1 : null,
          serviceRadiusMiles: values.serviceRadiusMiles,
          isPrimary: locations.length === 0,
          isAcceptingClients: values.isAcceptingClients,
          createdAt: new Date().toISOString(),
          // Contact override
          useCompanyContact: values.useCompanyContact,
          contactPhone: values.useCompanyContact ? null : (values.contactPhone || null),
          contactEmail: values.useCompanyContact ? null : (values.contactEmail || null),
          contactWebsite: values.useCompanyContact ? null : (values.contactWebsite || null),
          // Insurances
          insurances: values.insurances,
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

  const handleFeaturedSuccess = (locationId: string, billingInterval: string) => {
    // Optimistically update local state so UI reflects featured status immediately
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId
          ? {
              ...loc,
              isFeatured: true,
              featuredSubscription: {
                status: "active",
                billingInterval: billingInterval as "month" | "year",
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
              },
            }
          : loc
      )
    );

    const location = locations.find((l) => l.id === locationId);
    const locationName = location?.label || `${location?.city}, ${location?.state}` || "Location";
    setSuccess(`${locationName} is now featured and will appear at the top of search results!`);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleFeaturedCancel = (locationId: string) => {
    // Optimistically update to show cancellation pending
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId && loc.featuredSubscription
          ? {
              ...loc,
              featuredSubscription: {
                ...loc.featuredSubscription,
                cancelAtPeriodEnd: true,
              },
            }
          : loc
      )
    );

    const location = locations.find((l) => l.id === locationId);
    const locationName = location?.label || `${location?.city}, ${location?.state}` || "Location";
    setSuccess(`Featured status for ${locationName} will end at the current billing period.`);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleFeaturedReactivate = (locationId: string) => {
    // Optimistically update to show reactivation
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === locationId && loc.featuredSubscription
          ? {
              ...loc,
              featuredSubscription: {
                ...loc.featuredSubscription,
                cancelAtPeriodEnd: false,
              },
            }
          : loc
      )
    );

    const location = locations.find((l) => l.id === locationId);
    const locationName = location?.label || `${location?.city}, ${location?.state}` || "Location";
    setSuccess(`${locationName} featured status has been reactivated!`);
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <>
    <div className="space-y-4">
      {/* Success/Error Messages */}
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

      {/* Add Location Button */}
      {canAddMore && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            disabled={isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      )}

      {/* Add Location Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
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
              <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Service Types - Multi-select */}
                <div className="space-y-2">
                  <Label>Service Types *</Label>
                  <p className="text-xs text-muted-foreground">Select all service types available at this location</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SERVICE_TYPE_OPTIONS.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleServiceType(type.value)}
                        className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors ${
                          selectedServiceTypes.includes(type.value)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                          selectedServiceTypes.includes(type.value)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}>
                          {selectedServiceTypes.includes(type.value) && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {type.value === "in_home" && <Home className="h-4 w-4 text-[#5788FF]" />}
                          {type.value === "in_center" && <Building2 className="h-4 w-4 text-[#5788FF]" />}
                          {type.value === "telehealth" && <Video className="h-4 w-4 text-[#5788FF]" />}
                          {type.value === "school_based" && <GraduationCap className="h-4 w-4 text-[#5788FF]" />}
                          <span className="font-medium">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.serviceTypes && (
                    <p className="text-xs text-destructive">{form.formState.errors.serviceTypes.message}</p>
                  )}
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

                {/* Accepting New Clients Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="acceptingClients" className="cursor-pointer font-medium">
                        Accepting New Clients
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show families that this location has availability
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="acceptingClients"
                    checked={isAcceptingClients}
                    onCheckedChange={(checked) => form.setValue("isAcceptingClients", checked)}
                    disabled={isPending}
                  />
                </div>

                {/* Contact Override Section */}
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useCompanyContact"
                      checked={useCompanyContact}
                      onCheckedChange={(checked) => {
                        form.setValue("useCompanyContact", !!checked);
                        if (checked) {
                          form.setValue("contactPhone", "");
                          form.setValue("contactEmail", "");
                          form.setValue("contactWebsite", "");
                        }
                      }}
                      disabled={isPending}
                    />
                    <Label htmlFor="useCompanyContact" className="cursor-pointer text-sm font-medium">
                      Use company contact info
                    </Label>
                  </div>

                  {useCompanyContact ? (
                    <div className="rounded-lg bg-muted/40 p-3 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Using company defaults:</p>
                      <p>{companyDefaults.phone || "No phone set"}</p>
                      <p>{companyDefaults.email}</p>
                      <p>{companyDefaults.website ? companyDefaults.website.replace(/^https?:\/\//, "") : "No website set"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="contactPhone" className="text-xs">Phone</Label>
                          <Input
                            id="contactPhone"
                            placeholder="(555) 123-4567"
                            {...form.register("contactPhone")}
                            disabled={isPending}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="contactEmail" className="text-xs">Email</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            placeholder="contact@example.com"
                            {...form.register("contactEmail")}
                            disabled={isPending}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="contactWebsite" className="text-xs">Website</Label>
                        <Input
                          id="contactWebsite"
                          type="text"
                          placeholder="example.com"
                          {...form.register("contactWebsite")}
                          disabled={isPending}
                        />
                        {form.formState.errors.contactWebsite && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.contactWebsite.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Insurance Section - Always location-level */}
                <div className="space-y-3">
                  <Label>Insurance Accepted *</Label>
                  <p className="text-xs text-muted-foreground">
                    Select all insurance plans accepted at this location
                  </p>
                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-background p-3 sm:grid-cols-2">
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

                <div className="flex flex-col items-end gap-2 pt-4">
                  {hasErrors && <FormErrorSummary errorCount={errorCount} />}
                  <div className="flex gap-2">
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
                </div>
              </form>
            </DialogContent>
          </Dialog>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No locations added yet. Add your first location to appear in search results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((location) => {
            const locationName = location.label || `${location.city}, ${location.state}`;
            const isFeatured = location.isFeatured && location.featuredSubscription;

            return (
              <Card key={location.id} className="border-border/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isFeatured ? "bg-amber-100" : "bg-[#5788FF]/10"
                      }`}>
                        <MapPin className={`h-5 w-5 ${isFeatured ? "text-amber-600" : "text-[#5788FF]"}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{locationName}</CardTitle>
                        <CardDescription className="mt-1">
                          {location.street
                            ? `${location.street}, ${location.city}, ${location.state} ${location.postalCode}`
                            : `${location.city}, ${location.state}`}
                        </CardDescription>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isFeatured && (
                            <Badge className="bg-amber-500 text-white">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                          {location.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                          <Badge
                            variant={location.isAcceptingClients ? "default" : "secondary"}
                            className={location.isAcceptingClients ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}
                          >
                            {location.isAcceptingClients ? "Accepting Clients" : "Not Accepting"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(location)} disabled={isPending}>
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Service Types as Badges */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Service Types
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(location.serviceTypes || []).length > 0 ? (
                        (location.serviceTypes || []).map((type) => {
                          const typeOption = SERVICE_TYPE_OPTIONS.find((t) => t.value === type);
                          return (
                            <Badge key={type} variant="outline" className="text-xs">
                              {typeOption?.label || type}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground">No service types set</span>
                      )}
                    </div>
                  </div>

                  {/* Service Radius */}
                  {((location.serviceTypes || []).includes("in_home") ||
                    (location.serviceTypes || []).includes("telehealth")) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Service Radius
                      </p>
                      <p className="text-foreground">
                        {location.serviceRadiusMiles} miles
                      </p>
                    </div>
                  )}

                  {/* Insurances as Badges */}
                  {location.insurances && location.insurances.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Insurances Accepted
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {location.insurances.map((insurance) => (
                          <Badge key={insurance} variant="outline" className="text-xs">
                            {insurance}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Geocoding and Google status */}
                  <div className="flex items-center gap-4">
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

                  {/* Actions Row */}
                  <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    {/* Left side - Featured upgrade or status */}
                    {!isFreePlan && (
                      <>
                        {isFeatured && location.featuredSubscription ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 shrink-0 text-amber-600" />
                            <span className="text-sm text-amber-700">
                              Appearing at top of {location.state} searches
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="text-sm text-muted-foreground">
                              Boost to top of search results
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Right side - Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!isFreePlan && (
                        <>
                          {isFeatured && location.featuredSubscription ? (
                            <FeaturedManageButton
                              locationId={location.id}
                              locationName={locationName}
                              status={location.featuredSubscription.status}
                              billingInterval={location.featuredSubscription.billingInterval}
                              currentPeriodEnd={location.featuredSubscription.currentPeriodEnd}
                              cancelAtPeriodEnd={location.featuredSubscription.cancelAtPeriodEnd}
                              onCancel={() => handleFeaturedCancel(location.id)}
                              onReactivate={() => handleFeaturedReactivate(location.id)}
                            />
                          ) : (
                            <FeaturedUpgradeButton
                              locationId={location.id}
                              locationName={locationName}
                              disabled={isPending}
                              pricing={featuredPricing}
                              onSuccess={({ billingInterval }) =>
                                handleFeaturedSuccess(location.id, billingInterval)
                              }
                            />
                          )}
                        </>
                      )}
                      {!location.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(location.id)}
                          disabled={isPending}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Set Primary
                        </Button>
                      )}
                      {locations.length > 1 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isPending}>
                              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                              Delete
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Free plan upgrade upsell */}
      {isFreePlan && locations.length > 0 && (
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
          </CardContent>
        </Card>
      )}
    </div>

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
