"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geo/geocode";
import { stripe } from "@/lib/stripe";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type LocationServiceMode = "center_based" | "in_home" | "both";

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
  createdAt: string;
  serviceMode: LocationServiceMode;
  insurances: string[];
  // Contact info
  contactPhone: string | null;
  contactEmail: string | null;
  useCompanyContact: boolean;
  // Google Business integration
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  // Featured subscription
  isFeatured: boolean;
  featuredSubscription: {
    status: string;
    billingInterval: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

// Plan-based location limits
const LOCATION_LIMITS: Record<string, number> = {
  free: 1,
  premium: 5, // "pro" in UI
  featured: 999, // "enterprise" in UI - essentially unlimited
  pro: 5,
  enterprise: 999,
};

/**
 * Get all locations for the current user's listing
 */
export async function getLocations(): Promise<ActionResult<LocationData[]>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  const { data: locations, error } = await supabase
    .from("locations")
    .select(`
      id, label, street, city, state, postal_code, latitude, longitude,
      service_radius_miles, is_primary, created_at, service_mode, insurances,
      contact_phone, contact_email, use_company_contact,
      google_place_id, google_rating, google_rating_count,
      is_featured,
      location_featured_subscriptions!left (
        status,
        billing_interval,
        current_period_end,
        cancel_at_period_end
      )
    `)
    .eq("listing_id", listing.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: locations.map((loc) => {
      // location_featured_subscriptions is returned as an object (not array) due to unique constraint
      // It can be null if no subscription exists, or an object with subscription data
      const rawSub = loc.location_featured_subscriptions as unknown;
      const featuredSub = rawSub && typeof rawSub === "object" && !Array.isArray(rawSub)
        ? (rawSub as {
            status: string;
            billing_interval: string;
            current_period_end: string | null;
            cancel_at_period_end: boolean;
          })
        : null;

      return {
        id: loc.id,
        label: loc.label,
        street: loc.street,
        city: loc.city,
        state: loc.state,
        postalCode: loc.postal_code,
        latitude: loc.latitude,
        longitude: loc.longitude,
        serviceRadiusMiles: loc.service_radius_miles || 25,
        isPrimary: loc.is_primary,
        createdAt: loc.created_at,
        serviceMode: (loc.service_mode as LocationServiceMode) || "both",
        insurances: (loc.insurances as string[]) || [],
        contactPhone: loc.contact_phone,
        contactEmail: loc.contact_email,
        useCompanyContact: loc.use_company_contact ?? true,
        googlePlaceId: loc.google_place_id,
        googleRating: loc.google_rating,
        googleRatingCount: loc.google_rating_count,
        isFeatured: loc.is_featured || false,
        featuredSubscription: featuredSub ? {
          status: featuredSub.status,
          billingInterval: featuredSub.billing_interval,
          currentPeriodEnd: featuredSub.current_period_end,
          cancelAtPeriodEnd: featuredSub.cancel_at_period_end,
        } : null,
      };
    }),
  };
}

/**
 * Add a new location
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
  serviceMode: LocationServiceMode;
  insurances: string[];
  // Contact info
  contactPhone?: string;
  contactEmail?: string;
  useCompanyContact?: boolean;
}): Promise<ActionResult<{ id: string; geocoded: boolean }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing and profile
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Check location limit
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id);

  const limit = LOCATION_LIMITS[profile.plan_tier] || 1;
  if ((count || 0) >= limit) {
    return {
      success: false,
      error: `Your plan allows a maximum of ${limit} location${limit === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }

  // Check if this is the first location (make it primary)
  const isPrimary = (count || 0) === 0;

  // Auto-geocode the address if coordinates not provided
  let latitude = data.latitude || null;
  let longitude = data.longitude || null;
  let geocodeSuccess = false;

  if (!latitude || !longitude) {
    // Build full address for geocoding
    const addressParts = [
      data.street,
      data.city,
      data.state,
      data.postalCode,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ") + ", USA";

    try {
      const geocodeResult = await geocodeAddress(fullAddress);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        geocodeSuccess = true;
      }
    } catch {
      // Geocoding failed - continue without coordinates, location will still be saved
    }
  } else {
    geocodeSuccess = true;
  }

  const { data: newLocation, error } = await supabase
    .from("locations")
    .insert({
      listing_id: listing.id,
      label: data.label || null,
      street: data.street || null,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode || null,
      latitude,
      longitude,
      service_radius_miles: data.serviceRadiusMiles || 25,
      is_primary: isPrimary,
      service_mode: data.serviceMode,
      insurances: data.insurances,
      // Contact info defaults to using company contact
      contact_phone: data.contactPhone || null,
      contact_email: data.contactEmail || null,
      use_company_contact: data.useCompanyContact ?? true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true, data: { id: newLocation.id, geocoded: geocodeSuccess } };
}

/**
 * Update an existing location
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
    serviceMode?: LocationServiceMode;
    insurances?: string[];
    // Contact info
    contactPhone?: string;
    contactEmail?: string;
    useCompanyContact?: boolean;
  }
): Promise<ActionResult<{ geocoded: boolean }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, listing_id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label || null;
  if (data.street !== undefined) updateData.street = data.street || null;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.postalCode !== undefined) updateData.postal_code = data.postalCode || null;
  if (data.serviceRadiusMiles !== undefined) updateData.service_radius_miles = data.serviceRadiusMiles;
  if (data.serviceMode !== undefined) updateData.service_mode = data.serviceMode;
  if (data.insurances !== undefined) updateData.insurances = data.insurances;
  // Contact info
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone || null;
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail || null;
  if (data.useCompanyContact !== undefined) updateData.use_company_contact = data.useCompanyContact;

  // Check if address fields changed - if so, re-geocode
  const addressChanged =
    data.street !== undefined ||
    data.city !== undefined ||
    data.state !== undefined ||
    data.postalCode !== undefined;

  let geocodeSuccess = false;

  if (addressChanged) {
    // Get current location data to merge with updates
    const { data: currentLocation } = await supabase
      .from("locations")
      .select("street, city, state, postal_code")
      .eq("id", locationId)
      .single();

    if (currentLocation) {
      const street = data.street ?? currentLocation.street;
      const city = data.city ?? currentLocation.city;
      const state = data.state ?? currentLocation.state;
      const postalCode = data.postalCode ?? currentLocation.postal_code;

      const addressParts = [street, city, state, postalCode].filter(Boolean);
      const fullAddress = addressParts.join(", ") + ", USA";

      try {
        const geocodeResult = await geocodeAddress(fullAddress);
        if (geocodeResult) {
          updateData.latitude = geocodeResult.latitude;
          updateData.longitude = geocodeResult.longitude;
          geocodeSuccess = true;
        } else {
          // Clear coordinates if geocoding fails
          updateData.latitude = null;
          updateData.longitude = null;
        }
      } catch {
        // Geocoding failed - clear coordinates
        updateData.latitude = null;
        updateData.longitude = null;
      }
    }
  } else if (data.latitude !== undefined || data.longitude !== undefined) {
    // Manual coordinate update
    if (data.latitude !== undefined) updateData.latitude = data.latitude || null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude || null;
    geocodeSuccess = data.latitude != null && data.longitude != null;
  }

  const { error } = await supabase
    .from("locations")
    .update(updateData)
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true, data: { geocoded: geocodeSuccess } };
}

/**
 * Delete a location
 */
export async function deleteLocation(locationId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership and check if primary
  const { data: location } = await supabase
    .from("locations")
    .select("id, listing_id, is_primary, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Don't allow deleting the only location
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", location.listing_id);

  if ((count || 0) <= 1) {
    return { success: false, error: "Cannot delete the only location" };
  }

  // Check for active featured subscription and cancel it
  const adminClient = await createAdminClient();
  const { data: featuredSub } = await adminClient
    .from("location_featured_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("location_id", locationId)
    .eq("status", "active")
    .single();

  if (featuredSub) {
    // Cancel the Stripe subscription immediately
    try {
      await stripe.subscriptions.cancel(featuredSub.stripe_subscription_id);
      console.log(`Cancelled featured subscription for location ${locationId}`);
    } catch (err) {
      console.error("Failed to cancel featured subscription:", err);
      // Continue with deletion anyway - the webhook will handle cleanup
      // and the CASCADE delete will remove the subscription record
    }
  }

  const { error } = await supabase.from("locations").delete().eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  // If we deleted the primary location, make another one primary
  if (location.is_primary) {
    const { data: newPrimary } = await supabase
      .from("locations")
      .select("id")
      .eq("listing_id", location.listing_id)
      .limit(1)
      .single();

    if (newPrimary) {
      await supabase
        .from("locations")
        .update({ is_primary: true })
        .eq("id", newPrimary.id);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  revalidatePath("/dashboard/locations");
  return { success: true };
}

/**
 * Set a location as the primary location
 */
export async function setPrimaryLocation(locationId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, listing_id, listings!inner(profile_id)")
    .eq("id", locationId)
    .single();

  if (!location) {
    return { success: false, error: "Location not found" };
  }

  const listing = location.listings as unknown as { profile_id: string };
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Remove primary from all other locations
  await supabase
    .from("locations")
    .update({ is_primary: false })
    .eq("listing_id", location.listing_id);

  // Set this one as primary
  const { error } = await supabase
    .from("locations")
    .update({ is_primary: true })
    .eq("id", locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true };
}

/**
 * Get location limit for the current user's plan
 */
export async function getLocationLimit(): Promise<ActionResult<{ limit: number; current: number }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: true, data: { limit: LOCATION_LIMITS[profile.plan_tier] || 1, current: 0 } };
  }

  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id);

  return {
    success: true,
    data: {
      limit: LOCATION_LIMITS[profile.plan_tier] || 1,
      current: count || 0,
    },
  };
}
