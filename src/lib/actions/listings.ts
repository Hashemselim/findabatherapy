"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface ListingData {
  id: string;
  slug: string;
  headline: string | null;
  description: string | null;
  summary: string | null;
  serviceModes: string[];
  status: "draft" | "published" | "suspended";
  isAcceptingClients: boolean;
  logoUrl: string | null;
  videoUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingWithRelations extends ListingData {
  profile: {
    agencyName: string;
    contactEmail: string;
    contactPhone: string | null;
    website: string | null;
    planTier: string;
  };
  primaryLocation: {
    id: string;
    street: string | null;
    city: string;
    state: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusMiles: number;
  } | null;
  locations: Array<{
    id: string;
    label: string | null;
    street: string | null;
    city: string;
    state: string;
    postalCode: string | null;
    isPrimary: boolean;
    isFeatured: boolean;
    serviceMode?: "center_based" | "in_home" | "both";
    insurances?: string[];
    serviceRadiusMiles?: number;
    latitude?: number | null;
    longitude?: number | null;
    // Google Business integration
    googlePlaceId?: string | null;
    googleRating?: number | null;
    googleRatingCount?: number | null;
  }>;
  attributes: Record<string, unknown>;
}

/**
 * Get listing for the current user's dashboard
 */
export async function getListing(): Promise<ActionResult<ListingWithRelations>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing with profile
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      headline,
      description,
      summary,
      service_modes,
      status,
      is_accepting_clients,
      logo_url,
      video_url,
      published_at,
      created_at,
      updated_at,
      profiles!inner (
        agency_name,
        contact_email,
        contact_phone,
        website,
        plan_tier
      )
    `)
    .eq("profile_id", user.id)
    .single();

  if (listingError) {
    if (listingError.code === "PGRST116") {
      return { success: false, error: "No listing found" };
    }
    return { success: false, error: listingError.message };
  }

  // Get all locations
  const { data: locations } = await supabase
    .from("locations")
    .select("id, label, street, city, state, postal_code, latitude, longitude, service_radius_miles, is_primary, is_featured, service_mode, insurances, google_place_id, google_rating, google_rating_count")
    .eq("listing_id", listing.id)
    .order("is_primary", { ascending: false });

  // Get attributes
  const { data: attrs } = await supabase
    .from("listing_attribute_values")
    .select("attribute_key, value_json, value_text, value_number, value_boolean")
    .eq("listing_id", listing.id);

  const attributes: Record<string, unknown> = {};
  if (attrs) {
    attrs.forEach((attr) => {
      attributes[attr.attribute_key] =
        attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;
    });
  }

  const primaryLocation = locations?.find((l) => l.is_primary);
  const profile = listing.profiles as unknown as {
    agency_name: string;
    contact_email: string;
    contact_phone: string | null;
    website: string | null;
    plan_tier: string;
  };

  return {
    success: true,
    data: {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      description: listing.description,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      status: listing.status as "draft" | "published" | "suspended",
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url ?? null,
      videoUrl: listing.video_url ?? null,
      publishedAt: listing.published_at,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      profile: {
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
        contactPhone: profile.contact_phone,
        website: profile.website,
        planTier: profile.plan_tier,
      },
      primaryLocation: primaryLocation
        ? {
            id: primaryLocation.id,
            street: primaryLocation.street,
            city: primaryLocation.city,
            state: primaryLocation.state,
            postalCode: primaryLocation.postal_code,
            latitude: primaryLocation.latitude,
            longitude: primaryLocation.longitude,
            serviceRadiusMiles: primaryLocation.service_radius_miles || 25,
          }
        : null,
      locations:
        locations?.map((l) => ({
          id: l.id,
          label: l.label,
          street: l.street,
          city: l.city,
          state: l.state,
          postalCode: l.postal_code,
          isPrimary: l.is_primary,
          isFeatured: l.is_featured || false,
          serviceMode: l.service_mode as "center_based" | "in_home" | "both" | undefined,
          insurances: l.insurances || [],
          serviceRadiusMiles: l.service_radius_miles || 25,
          latitude: l.latitude,
          longitude: l.longitude,
          googlePlaceId: l.google_place_id,
          googleRating: l.google_rating,
          googleRatingCount: l.google_rating_count,
        })) || [],
      attributes,
    },
  };
}

/**
 * Update listing details
 */
export async function updateListing(data: {
  headline?: string;
  description?: string;
  summary?: string;
  serviceModes?: string[];
  isAcceptingClients?: boolean;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.serviceModes !== undefined) updateData.service_modes = data.serviceModes;
  if (data.isAcceptingClients !== undefined) updateData.is_accepting_clients = data.isAcceptingClients;

  const { error } = await supabase
    .from("listings")
    .update(updateData)
    .eq("profile_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true };
}

/**
 * Update listing status (draft, published, suspended)
 */
export async function updateListingStatus(
  status: "draft" | "published" | "suspended"
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get profile to check plan tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // For paid plans that haven't completed checkout, prevent publishing
  // This will be handled by Stripe webhooks in Phase 4
  // For now, allow publishing for all plans

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("listings")
    .update(updateData)
    .eq("profile_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true };
}

/**
 * Publish listing (convenience method)
 */
export async function publishListing(): Promise<ActionResult> {
  return updateListingStatus("published");
}

/**
 * Unpublish listing (set to draft)
 */
export async function unpublishListing(): Promise<ActionResult> {
  return updateListingStatus("draft");
}

/**
 * Get listing attributes (insurance, ages, languages, etc.)
 */
export async function getListingAttributes(): Promise<ActionResult<Record<string, unknown>>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing ID
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Listing not found" };
  }

  // Get attributes
  const { data: attrs } = await supabase
    .from("listing_attribute_values")
    .select("attribute_key, value_json, value_text, value_number, value_boolean")
    .eq("listing_id", listing.id);

  const attributes: Record<string, unknown> = {};
  if (attrs) {
    attrs.forEach((attr) => {
      attributes[attr.attribute_key] =
        attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;
    });
  }

  return { success: true, data: attributes };
}

/**
 * Update listing attributes (insurance, ages, languages, diagnoses, specialties)
 */
export async function updateListingAttributes(data: {
  insurances?: string[];
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  isAcceptingClients?: boolean;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing ID
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update is_accepting_clients on listing if provided
  if (data.isAcceptingClients !== undefined) {
    await supabase
      .from("listings")
      .update({
        is_accepting_clients: data.isAcceptingClients,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
  }

  // Prepare attributes to upsert
  const attributesToUpsert: Array<{
    listing_id: string;
    attribute_key: string;
    value_json?: unknown;
  }> = [];

  if (data.insurances !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "insurances",
      value_json: data.insurances,
    });
  }

  if (data.languages !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "languages",
      value_json: data.languages,
    });
  }

  if (data.diagnoses !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "diagnoses",
      value_json: data.diagnoses,
    });
  }

  if (data.clinicalSpecialties !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "clinical_specialties",
      value_json: data.clinicalSpecialties,
    });
  }

  if (data.agesServedMin !== undefined || data.agesServedMax !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "ages_served",
      value_json: {
        min: data.agesServedMin ?? 0,
        max: data.agesServedMax ?? 21,
      },
    });
  }

  // Upsert attributes
  for (const attr of attributesToUpsert) {
    // Delete existing then insert (simple upsert pattern)
    await supabase
      .from("listing_attribute_values")
      .delete()
      .eq("listing_id", attr.listing_id)
      .eq("attribute_key", attr.attribute_key);

    await supabase.from("listing_attribute_values").insert({
      listing_id: attr.listing_id,
      attribute_key: attr.attribute_key,
      value_json: attr.value_json,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true };
}

/**
 * Update contact form enabled setting
 */
export async function updateContactFormEnabled(enabled: boolean): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing ID and profile
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, profiles!inner(plan_tier)")
    .eq("profile_id", user.id)
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Listing not found" };
  }

  const profile = listing.profiles as unknown as { plan_tier: string };

  // Only allow for paid plans
  if (profile.plan_tier === "free") {
    return { success: false, error: "Contact form is only available for paid plans" };
  }

  // Delete existing then insert
  await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id)
    .eq("attribute_key", "contact_form_enabled");

  const { error } = await supabase.from("listing_attribute_values").insert({
    listing_id: listing.id,
    attribute_key: "contact_form_enabled",
    value_boolean: enabled,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listing");
  return { success: true };
}

/**
 * Get listing by slug (for public view)
 */
export async function getListingBySlug(
  slug: string
): Promise<ActionResult<ListingWithRelations>> {
  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      headline,
      description,
      summary,
      service_modes,
      status,
      is_accepting_clients,
      logo_url,
      video_url,
      published_at,
      created_at,
      updated_at,
      profiles!inner (
        agency_name,
        contact_email,
        contact_phone,
        website,
        plan_tier
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError) {
    if (listingError.code === "PGRST116") {
      return { success: false, error: "Listing not found" };
    }
    return { success: false, error: listingError.message };
  }

  // Get all locations
  const { data: locations } = await supabase
    .from("locations")
    .select("id, label, street, city, state, postal_code, latitude, longitude, service_radius_miles, is_primary, is_featured, service_mode, insurances, google_place_id, google_rating, google_rating_count")
    .eq("listing_id", listing.id)
    .order("is_primary", { ascending: false });

  // Get attributes
  const { data: attrs } = await supabase
    .from("listing_attribute_values")
    .select("attribute_key, value_json, value_text, value_number, value_boolean")
    .eq("listing_id", listing.id);

  const attributes: Record<string, unknown> = {};
  if (attrs) {
    attrs.forEach((attr) => {
      attributes[attr.attribute_key] =
        attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;
    });
  }

  const primaryLocation = locations?.find((l) => l.is_primary);
  const profile = listing.profiles as unknown as {
    agency_name: string;
    contact_email: string;
    contact_phone: string | null;
    website: string | null;
    plan_tier: string;
  };

  return {
    success: true,
    data: {
      id: listing.id,
      slug: listing.slug,
      headline: listing.headline,
      description: listing.description,
      summary: listing.summary,
      serviceModes: listing.service_modes || [],
      status: listing.status as "draft" | "published" | "suspended",
      isAcceptingClients: listing.is_accepting_clients,
      logoUrl: listing.logo_url ?? null,
      videoUrl: listing.video_url ?? null,
      publishedAt: listing.published_at,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      profile: {
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
        contactPhone: profile.contact_phone,
        website: profile.website,
        planTier: profile.plan_tier,
      },
      primaryLocation: primaryLocation
        ? {
            id: primaryLocation.id,
            street: primaryLocation.street,
            city: primaryLocation.city,
            state: primaryLocation.state,
            postalCode: primaryLocation.postal_code,
            latitude: primaryLocation.latitude,
            longitude: primaryLocation.longitude,
            serviceRadiusMiles: primaryLocation.service_radius_miles || 25,
          }
        : null,
      locations:
        locations?.map((l) => ({
          id: l.id,
          label: l.label,
          street: l.street,
          city: l.city,
          state: l.state,
          postalCode: l.postal_code,
          isPrimary: l.is_primary,
          isFeatured: l.is_featured || false,
          serviceMode: l.service_mode as "center_based" | "in_home" | "both" | undefined,
          insurances: l.insurances || [],
          serviceRadiusMiles: l.service_radius_miles || 25,
          latitude: l.latitude,
          longitude: l.longitude,
          googlePlaceId: l.google_place_id,
          googleRating: l.google_rating,
          googleRatingCount: l.google_rating_count,
        })) || [],
      attributes,
    },
  };
}
