"use server";

import { revalidatePath } from "next/cache";

import { getEffectiveLimits } from "@/lib/actions/addons";
import { geocodeAddress } from "@/lib/geo/geocode";
import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type ServiceType = "in_home" | "in_center" | "telehealth" | "school_based";

export interface LocationData {
  id: string;
  label: string | null;
  street: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  serviceRadiusMiles: number;
  isPrimary: boolean;
  isAcceptingClients: boolean;
  createdAt: string;
  serviceTypes: ServiceType[];
  insurances: string[];
  contactPhone: string | null;
  contactEmail: string | null;
  contactWebsite: string | null;
  useCompanyContact: boolean;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  showGoogleReviews: boolean;
  isFeatured: boolean;
  featuredSubscription: {
    status: string;
    billingInterval: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

function revalidateLocationViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");
}

async function geocodeLocationAddress(data: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}) {
  const addressParts = [data.street, data.city, data.state, data.postalCode].filter(Boolean);
  if (addressParts.length === 0) {
    return { latitude: null, longitude: null, geocoded: false };
  }

  try {
    const geocodeResult = await geocodeAddress(`${addressParts.join(", ")}, USA`);
    if (!geocodeResult) {
      return { latitude: null, longitude: null, geocoded: false };
    }

    return {
      latitude: geocodeResult.latitude,
      longitude: geocodeResult.longitude,
      geocoded: true,
    };
  } catch {
    return { latitude: null, longitude: null, geocoded: false };
  }
}

/**
 * Get all locations for the current user's listing.
 */
export async function getLocations(): Promise<ActionResult<LocationData[]>> {
  try {
    const locations = await queryConvex<LocationData[]>("locations:getDashboardLocations");
    return { success: true, data: locations };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load locations" };
  }
}

/**
 * Add a new location.
 */
export async function addLocation(data: {
  label?: string;
  street?: string;
  city: string;
  state: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusMiles?: number;
  serviceTypes: ServiceType[];
  insurances: string[];
  isAcceptingClients?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  useCompanyContact?: boolean;
}): Promise<ActionResult<{ id: string; geocoded: boolean }>> {
  try {
    const coordinatesProvided = data.latitude != null && data.longitude != null;
    const geocodeResult = coordinatesProvided
      ? { latitude: data.latitude ?? null, longitude: data.longitude ?? null, geocoded: true }
      : await geocodeLocationAddress({
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
        });

    const result = await mutateConvex<{ id: string; geocoded: boolean }>("locations:addLocation", {
      label: data.label,
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      latitude: geocodeResult.latitude,
      longitude: geocodeResult.longitude,
      serviceRadiusMiles: data.serviceRadiusMiles,
      serviceTypes: data.serviceTypes,
      insurances: data.insurances,
      isAcceptingClients: data.isAcceptingClients,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      contactWebsite: data.contactWebsite,
      useCompanyContact: data.useCompanyContact,
      geocoded: geocodeResult.geocoded,
    });

    revalidateLocationViews();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add location" };
  }
}

/**
 * Update an existing location.
 */
export async function updateLocation(
  locationId: string,
  data: {
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    serviceRadiusMiles?: number;
    serviceTypes?: ServiceType[];
    insurances?: string[];
    isAcceptingClients?: boolean;
    contactPhone?: string;
    contactEmail?: string;
    contactWebsite?: string;
    useCompanyContact?: boolean;
  }
): Promise<ActionResult<{ geocoded: boolean }>> {
  try {
    const locationsResult = await getLocations();
    if (!locationsResult.success || !locationsResult.data) {
      return {
        success: false,
        error: !locationsResult.success
          ? locationsResult.error
          : "Failed to load locations",
      };
    }

    const currentLocation = locationsResult.data.find((location) => location.id === locationId);
    if (!currentLocation) {
      return { success: false, error: "Location not found" };
    }

    const addressChanged =
      data.street !== undefined ||
      data.city !== undefined ||
      data.state !== undefined ||
      data.postalCode !== undefined;

    let latitude: number | null | undefined = data.latitude;
    let longitude: number | null | undefined = data.longitude;
    let geocoded = false;

    if (addressChanged) {
      const geocodeResult = await geocodeLocationAddress({
        street: data.street ?? currentLocation.street,
        city: data.city ?? currentLocation.city,
        state: data.state ?? currentLocation.state,
        postalCode: data.postalCode ?? currentLocation.postalCode,
      });
      latitude = geocodeResult.latitude;
      longitude = geocodeResult.longitude;
      geocoded = geocodeResult.geocoded;
    } else if (data.latitude !== undefined || data.longitude !== undefined) {
      latitude = data.latitude ?? null;
      longitude = data.longitude ?? null;
      geocoded = latitude != null && longitude != null;
    }

    const result = await mutateConvex<{ geocoded: boolean }>("locations:updateLocation", {
      locationId,
      label: data.label,
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      latitude: addressChanged || data.latitude !== undefined ? (latitude ?? null) : undefined,
      longitude: addressChanged || data.longitude !== undefined ? (longitude ?? null) : undefined,
      serviceRadiusMiles: data.serviceRadiusMiles,
      serviceTypes: data.serviceTypes,
      insurances: data.insurances,
      isAcceptingClients: data.isAcceptingClients,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      contactWebsite: data.contactWebsite,
      useCompanyContact: data.useCompanyContact,
      geocoded,
    });

    revalidateLocationViews();
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update location" };
  }
}

/**
 * Delete a location.
 */
export async function deleteLocation(locationId: string): Promise<ActionResult> {
  try {
    await mutateConvex("locations:deleteLocation", { locationId });
    revalidateLocationViews();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete location" };
  }
}

/**
 * Set a location as the primary location.
 */
export async function setPrimaryLocation(locationId: string): Promise<ActionResult> {
  try {
    await mutateConvex("locations:setPrimaryLocation", { locationId });
    revalidateLocationViews();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to set primary location" };
  }
}

/**
 * Get location limit for the current user's plan.
 */
export async function getLocationLimit(): Promise<ActionResult<{ limit: number; current: number }>> {
  try {
    const [limitsResult, locationsResult] = await Promise.all([
      getEffectiveLimits(""),
      getLocations(),
    ]);

    if (!locationsResult.success || !locationsResult.data) {
      return {
        success: false,
        error: !locationsResult.success
          ? locationsResult.error
          : "Failed to get location limit",
      };
    }

    const limit = limitsResult.success && limitsResult.data ? limitsResult.data.maxLocations : 1;
    return {
      success: true,
      data: {
        limit,
        current: locationsResult.data.length,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to get location limit" };
  }
}
