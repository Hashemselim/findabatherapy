"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import type { PlaceDetails } from "@/hooks/use-places-autocomplete";
import {
  addLocation,
  deleteLocation,
  getLocations,
  setPrimaryLocation,
  updateLocation,
  type LocationData,
  type ServiceType,
} from "@/lib/actions/locations";
import {
  locationWithServicesSchema,
  type LocationWithServicesData,
  INSURANCE_OPTIONS,
  SERVICE_RADIUS_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/validations/onboarding";

const MAX_ONBOARDING_LOCATIONS = 3;

const SERVICE_TYPE_ICONS: Record<string, typeof Home> = {
  in_home: Home,
  in_center: Building2,
  telehealth: Video,
  school_based: GraduationCap,
};

const SERVICE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  in_home: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_center: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  telehealth: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  school_based: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function OnboardingLocationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [showForm, setShowForm] = useState(true);

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
      serviceTypes: ["in_home", "in_center"],
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

  const selectedServiceTypes = watch("serviceTypes") || [];
  const selectedInsurances = watch("insurances") || [];
  const isAcceptingClients = watch("isAcceptingClients");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const serviceRadius = watch("serviceRadiusMiles");
  const hasReachedLimit = locations.length >= MAX_ONBOARDING_LOCATIONS;
  const editingLocation = locations.find((location) => location.id === editingLocationId) || null;

  useEffect(() => {
    async function loadLocations() {
      const result = await getLocations();
      if (result.success && result.data) {
        const locs = result.data.slice(0, MAX_ONBOARDING_LOCATIONS);
        setLocations(locs);
        if (locs.length > 0) setShowForm(false);
      } else if (!result.success && result.error !== "No listing found") {
        setError(result.error);
      }
      setIsLoading(false);
    }

    loadLocations();
  }, []);

  function resetForm() {
    reset({
      label: "",
      serviceTypes: ["in_home", "in_center"],
      street: "",
      city: "",
      state: "",
      postalCode: "",
      serviceRadiusMiles: 25,
      insurances: [],
      isAcceptingClients: true,
      latitude: undefined,
      longitude: undefined,
    });
    setAddressInput("");
    setSelectedPlace(null);
    setEditingLocationId(null);
  }

  function populateForm(location: LocationData) {
    setEditingLocationId(location.id);
    setShowForm(true);
    reset({
      label: location.label || "",
      serviceTypes: location.serviceTypes || ["in_home", "in_center"],
      street: location.street || "",
      city: location.city,
      state: location.state,
      postalCode: location.postalCode || "",
      serviceRadiusMiles: location.serviceRadiusMiles || 25,
      insurances: location.insurances || [],
      isAcceptingClients: location.isAcceptingClients ?? true,
      latitude: location.latitude ?? undefined,
      longitude: location.longitude ?? undefined,
    });
    setAddressInput(
      [location.street, location.city, location.state, location.postalCode]
        .filter(Boolean)
        .join(", ")
    );
    setSelectedPlace(null);
  }

  function toggleServiceType(type: ServiceType) {
    const current = selectedServiceTypes || [];
    if (current.includes(type)) {
      setValue(
        "serviceTypes",
        current.filter((entry) => entry !== type),
        { shouldValidate: true }
      );
      return;
    }

    setValue("serviceTypes", [...current, type], { shouldValidate: true });
  }

  function toggleInsurance(insurance: string) {
    const current = selectedInsurances || [];
    if (current.includes(insurance)) {
      setValue(
        "insurances",
        current.filter((entry) => entry !== insurance),
        { shouldValidate: true }
      );
      return;
    }

    setValue("insurances", [...current, insurance], { shouldValidate: true });
  }

  function handlePlaceSelect(place: PlaceDetails) {
    setSelectedPlace(place);
    setValue("street", "");
    setValue("city", place.city || "");
    setValue("state", place.state || "");
    setValue("postalCode", place.postalCode || "");
    setValue("latitude", place.latitude);
    setValue("longitude", place.longitude);

    if (place.formattedAddress && place.city) {
      const cityIndex = place.formattedAddress.indexOf(place.city);
      if (cityIndex > 0) {
        const street = place.formattedAddress
          .substring(0, cityIndex)
          .replace(/,\s*$/, "")
          .trim();

        if (street && street !== place.city) {
          setValue("street", street);
        }
      }
    }
  }

  function handleLocationSave(values: LocationWithServicesData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (editingLocationId) {
        const result = await updateLocation(editingLocationId, {
          label: values.label || undefined,
          serviceTypes: values.serviceTypes as ServiceType[],
          street: values.street || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          serviceRadiusMiles: values.serviceRadiusMiles,
          latitude: values.latitude,
          longitude: values.longitude,
          insurances: values.insurances,
          isAcceptingClients: values.isAcceptingClients,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setLocations((current) =>
          current.map((location) =>
            location.id === editingLocationId
              ? {
                  ...location,
                  label: values.label || null,
                  serviceTypes: values.serviceTypes as ServiceType[],
                  street: values.street || null,
                  city: values.city,
                  state: values.state,
                  postalCode: values.postalCode || null,
                  serviceRadiusMiles: values.serviceRadiusMiles,
                  latitude: values.latitude ?? null,
                  longitude: values.longitude ?? null,
                  insurances: values.insurances,
                  isAcceptingClients: values.isAcceptingClients,
                }
              : location
          )
        );
        setSuccess("Location updated");
      } else {
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
          insurances: values.insurances,
          isAcceptingClients: values.isAcceptingClients,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setLocations((current) => [
          ...current,
          {
            id: result.data!.id,
            label: values.label || null,
            street: values.street || null,
            city: values.city,
            state: values.state,
            postalCode: values.postalCode || null,
            latitude: values.latitude ?? null,
            longitude: values.longitude ?? null,
            serviceRadiusMiles: values.serviceRadiusMiles,
            isPrimary: current.length === 0,
            isAcceptingClients: values.isAcceptingClients,
            createdAt: new Date().toISOString(),
            serviceTypes: values.serviceTypes as ServiceType[],
            insurances: values.insurances,
            contactPhone: null,
            contactEmail: null,
            contactWebsite: null,
            useCompanyContact: true,
            googlePlaceId: null,
            googleRating: null,
            googleRatingCount: null,
            showGoogleReviews: false,
            isFeatured: false,
            featuredSubscription: null,
          },
        ]);
        setSuccess("Location added");
      }

      resetForm();
      setShowForm(false);
    });
  }

  function handleDelete(locationId: string) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await deleteLocation(locationId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setLocations((current) => current.filter((location) => location.id !== locationId));
      if (editingLocationId === locationId) {
        resetForm();
      }
      setSuccess("Location removed");
    });
  }

  function handlePrimary(locationId: string) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await setPrimaryLocation(locationId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setLocations((current) =>
        current.map((location) => ({
          ...location,
          isPrimary: location.id === locationId,
        }))
      );
      setSuccess("Primary location updated");
    });
  }

  function handleAddNew() {
    resetForm();
    setShowForm(true);
  }

  function handleCancelForm() {
    resetForm();
    setShowForm(false);
  }

  function handleContinue() {
    if (locations.length === 0) {
      setError("Add at least one location before continuing.");
      return;
    }

    router.push("/dashboard/onboarding/services");
  }

  const showServiceRadius =
    selectedServiceTypes.includes("in_home") || selectedServiceTypes.includes("telehealth");

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">Loading your locations...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Step 3 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Where do you serve families?
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Add up to {MAX_ONBOARDING_LOCATIONS} locations during setup. Each carries its own service
          types and insurance. You can add more later.
        </p>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence mode="wait">
        {success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location cards */}
      {locations.length > 0 && (
        <motion.div variants={fadeUp} className="mb-6 space-y-3">
          {locations.map((location, index) => (
            <motion.div
              key={location.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group rounded-2xl border bg-card p-5 transition-colors ${
                editingLocationId === location.id
                  ? "border-foreground/20 shadow-xs"
                  : "border-border/60 hover:border-border/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">
                        {location.label || `${location.city}, ${location.state}`}
                      </h3>
                      {location.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/60">
                          <Star className="h-2.5 w-2.5" fill="currentColor" />
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {[location.street, location.city, location.state].filter(Boolean).join(", ")}
                    </p>

                    {/* Service type chips */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {location.serviceTypes.map((st) => {
                        const Icon = SERVICE_TYPE_ICONS[st] || MapPin;
                        const colors = SERVICE_TYPE_COLORS[st] || SERVICE_TYPE_COLORS.in_home;
                        return (
                          <span
                            key={st}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
                          >
                            <Icon className="h-3 w-3" />
                            {SERVICE_TYPE_OPTIONS.find((o) => o.value === st)?.label || st}
                          </span>
                        );
                      })}
                      {location.isAcceptingClients && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Accepting
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {!location.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handlePrimary(location.id)}
                      disabled={isPending}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-amber-600"
                      title="Make primary"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => populateForm(location)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(location.id)}
                      disabled={isPending}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add another button */}
          {!showForm && !hasReachedLimit && (
            <motion.button
              type="button"
              onClick={handleAddNew}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-card/50 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-card hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Add another location
            </motion.button>
          )}

          {!showForm && hasReachedLimit && (
            <p className="text-center text-xs text-muted-foreground">
              Maximum {MAX_ONBOARDING_LOCATIONS} locations during setup. Add more from your dashboard later.
            </p>
          )}
        </motion.div>
      )}

      {/* Location form */}
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            key="form"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8 }}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, staggerChildren: 0.08, delayChildren: 0.05 },
              },
            }}
          >
            <form onSubmit={handleSubmit(handleLocationSave)} className="space-y-6">
              {/* Form header */}
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingLocation ? "Edit location" : "Add a location"}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Where families will find you in search results.
                  </p>
                </div>
                {locations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Service types */}
              <motion.section
                variants={fadeUp}
                className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
              >
                <div>
                  <h3 className="text-base font-semibold text-foreground">Service types</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    How do you deliver services at this location?
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {SERVICE_TYPE_OPTIONS.map((type) => {
                    const isSelected = selectedServiceTypes.includes(type.value);
                    const Icon = SERVICE_TYPE_ICONS[type.value] || MapPin;
                    const colors = SERVICE_TYPE_COLORS[type.value] || SERVICE_TYPE_COLORS.in_home;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleServiceType(type.value as ServiceType)}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                          isSelected
                            ? `${colors.border} ${colors.bg}`
                            : "border-border/60 bg-muted/50 hover:border-border/70"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isSelected
                              ? `${colors.bg} ${colors.text}`
                              : "bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${isSelected ? colors.text : "text-foreground"}`}>
                            {type.label}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? `${colors.border} ${colors.bg}`
                                : "border-border/70"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              >
                                <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.serviceTypes && (
                  <p className="text-sm text-destructive">{errors.serviceTypes.message}</p>
                )}
              </motion.section>

              {/* Address */}
              <motion.section
                variants={fadeUp}
                className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
              >
                <div>
                  <h3 className="text-base font-semibold text-foreground">Address</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Search for your address so families can find you in nearby results.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label" className="text-muted-foreground">
                    Location label <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <input
                    id="label"
                    className="flex h-11 w-full rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground/30 focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-foreground/5"
                    placeholder="Main office, North campus, etc."
                    value={watch("label") || ""}
                    onChange={(event) => setValue("label", event.target.value, { shouldValidate: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Address <span className="text-destructive">*</span>
                  </Label>
                  <PlacesAutocomplete
                    value={addressInput}
                    onChange={(value) => {
                      setAddressInput(value);
                      if (selectedPlace) {
                        setSelectedPlace(null);
                        setValue("latitude", undefined);
                        setValue("longitude", undefined);
                      }
                    }}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Search for your address..."
                    showIcon
                    inputClassName="h-11 rounded-xl border-border/60 bg-muted/50 focus:bg-card"
                  />
                </div>

                {(watch("city") || watch("state")) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl border border-border/60 bg-muted/50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {[watch("street"), watch("city"), watch("state"), watch("postalCode")]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs">
                          {latitude && longitude ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600">Coordinates verified</span>
                            </>
                          ) : (
                            <>
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              <span className="text-muted-foreground">Select from suggestions to verify map point</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {(errors.city || errors.state || errors.street) && (
                  <div className="space-y-1 text-sm text-destructive">
                    {errors.city && <p>{errors.city.message}</p>}
                    {errors.state && <p>{errors.state.message}</p>}
                    {errors.street && <p>{errors.street.message}</p>}
                  </div>
                )}
              </motion.section>

              {/* Service radius */}
              {showServiceRadius && (
                <motion.section
                  variants={fadeUp}
                  className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
                >
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Service radius</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      How far from this location do you travel or serve via telehealth?
                    </p>
                  </div>
                  <Select
                    value={serviceRadius?.toString()}
                    onValueChange={(value) =>
                      setValue("serviceRadiusMiles", Number.parseInt(value, 10), {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border/60 bg-muted/50">
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
                </motion.section>
              )}

              {/* Insurance */}
              <motion.section
                variants={fadeUp}
                className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
              >
                <div>
                  <h3 className="text-base font-semibold text-foreground">Insurance accepted</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Select all insurance plans accepted at this location.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {INSURANCE_OPTIONS.map((insurance) => {
                    const isSelected = selectedInsurances.includes(insurance);
                    return (
                      <label
                        key={insurance}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                          isSelected
                            ? "border-foreground/20 bg-foreground/5 text-foreground"
                            : "border-border/60 bg-muted/50 text-muted-foreground hover:border-border/70"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleInsurance(insurance)}
                          className="shrink-0"
                        />
                        <span className="truncate">{insurance}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.insurances && (
                  <p className="text-sm text-destructive">{errors.insurances.message}</p>
                )}
              </motion.section>

              {/* Accepting clients toggle */}
              <motion.section
                variants={fadeUp}
                className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Accepting new clients</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Let families know this location is open to inquiries.
                    </p>
                  </div>
                  <Switch
                    checked={isAcceptingClients}
                    onCheckedChange={(checked) =>
                      setValue("isAcceptingClients", checked, { shouldValidate: true })
                    }
                  />
                </div>
              </motion.section>

              {/* Form actions */}
              <motion.div
                variants={fadeUp}
                className="flex items-center justify-between"
              >
                <div>
                  {editingLocation && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={handleCancelForm}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
                  disabled={isPending || (!editingLocation && hasReachedLimit)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : editingLocation ? (
                    "Save changes"
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add location
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation footer */}
      <motion.div
        variants={fadeUp}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
      >
        <p className="text-xs text-muted-foreground sm:text-sm sm:text-muted-foreground">
          {locations.length === 0
            ? "Add at least one location to continue."
            : `${locations.length} location${locations.length !== 1 ? "s" : ""} added`}
        </p>

        <Button
          type="button"
          size="lg"
          className="h-11 w-full shrink-0 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 sm:ml-auto sm:w-auto"
          disabled={isPending || locations.length === 0}
          onClick={handleContinue}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
