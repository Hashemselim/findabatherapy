"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/config";

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
    subscriptionStatus: string | null;
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
    showGoogleReviews?: boolean;
    // Contact info overrides
    contactPhone?: string | null;
    contactEmail?: string | null;
    contactWebsite?: string | null;
    useCompanyContact?: boolean;
  }>;
  attributes: Record<string, unknown>;
  photoUrls?: string[];
}

/**
 * Get just the listing slug for the current user (lightweight query for nav)
 */
export async function getListingSlug(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("slug")
    .eq("user_id", user.id)
    .single();

  return data?.slug ?? null;
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
        plan_tier,
        subscription_status
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
    subscription_status: string | null;
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
        subscriptionStatus: profile.subscription_status,
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
  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Generate a URL-friendly slug from agency name
 */
function generateSlug(agencyName: string): string {
  return agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Update company/agency name in profile and listing slug
 */
export async function updateAgencyName(agencyName: string): Promise<ActionResult<{ newSlug: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!agencyName || agencyName.trim().length < 2) {
    return { success: false, error: "Company name must be at least 2 characters" };
  }

  const supabase = await createClient();
  const trimmedName = agencyName.trim();

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      agency_name: trimmedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  // Generate new slug and check for uniqueness
  let newSlug = generateSlug(trimmedName);
  let slugSuffix = 0;

  while (true) {
    const checkSlug = slugSuffix > 0 ? `${newSlug}-${slugSuffix}` : newSlug;
    const { data: existingListing } = await supabase
      .from("listings")
      .select("id")
      .eq("slug", checkSlug)
      .neq("profile_id", user.id) // Exclude current user's listing
      .single();

    if (!existingListing) {
      newSlug = checkSlug;
      break;
    }
    slugSuffix++;
  }

  // Update listing slug
  const { error: listingError } = await supabase
    .from("listings")
    .update({
      slug: newSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id);

  if (listingError) {
    return { success: false, error: listingError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true, data: { newSlug } };
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
  revalidatePath("/dashboard/company");
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
 * Falls back to primary location data for insurances if not set in attributes
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

  // Get attributes and primary location in parallel
  const [attrsResult, locationResult] = await Promise.all([
    supabase
      .from("listing_attribute_values")
      .select("attribute_key, value_json, value_text, value_number, value_boolean")
      .eq("listing_id", listing.id),
    supabase
      .from("locations")
      .select("insurances, is_accepting_clients")
      .eq("listing_id", listing.id)
      .eq("is_primary", true)
      .single(),
  ]);

  const attrs = attrsResult.data;
  const primaryLocation = locationResult.data;

  const attributes: Record<string, unknown> = {};
  if (attrs) {
    attrs.forEach((attr) => {
      attributes[attr.attribute_key] =
        attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;
    });
  }

  // Fall back to primary location data if insurances not set in attributes
  // This handles the case where onboarding saved to locations table
  if (!attributes.insurances && primaryLocation?.insurances?.length) {
    attributes.insurances = primaryLocation.insurances;
  }

  return { success: true, data: attributes };
}

/**
 * Update listing attributes (insurance, ages, languages, diagnoses, specialties)
 */
export async function updateListingAttributes(data: {
  insurances?: string[];
  servicesOffered?: string[];
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

  if (data.servicesOffered !== undefined) {
    attributesToUpsert.push({
      listing_id: listing.id,
      attribute_key: "services_offered",
      value_json: data.servicesOffered,
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

    const { error: insertError } = await supabase.from("listing_attribute_values").insert({
      listing_id: attr.listing_id,
      attribute_key: attr.attribute_key,
      value_json: attr.value_json,
    });

    if (insertError) {
      console.error(`Failed to insert attribute ${attr.attribute_key}:`, insertError);
      return { success: false, error: `Failed to save ${attr.attribute_key}: ${insertError.message}` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Update company contact info (stored in profiles table)
 */
export async function updateCompanyContact(data: {
  contactEmail: string;
  contactPhone?: string;
  website?: string;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone || null,
      website: data.website || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");
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
  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Get listing by slug (for public view)
 * Optimized: Parallel queries for locations, attributes, and photos
 */
export async function getListingBySlug(
  slug: string
): Promise<ActionResult<ListingWithRelations>> {
  const supabase = await createClient();

  // First, get the listing (required to get listing.id for subsequent queries)
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
        plan_tier,
        subscription_status
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

  // Parallel fetch: locations, attributes, and photos
  const [locationsResult, attrsResult, photosResult] = await Promise.all([
    supabase
      .from("locations")
      .select("id, label, street, city, state, postal_code, latitude, longitude, service_radius_miles, is_primary, is_featured, service_mode, insurances, google_place_id, google_rating, google_rating_count, show_google_reviews, contact_phone, contact_email, contact_website, use_company_contact")
      .eq("listing_id", listing.id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("listing_attribute_values")
      .select("attribute_key, value_json, value_text, value_number, value_boolean")
      .eq("listing_id", listing.id),
    supabase
      .from("media_assets")
      .select("id, storage_path, sort_order")
      .eq("listing_id", listing.id)
      .eq("media_type", "photo")
      .order("sort_order", { ascending: true }),
  ]);

  const locations = locationsResult.data;
  const attrs = attrsResult.data;
  const photos = photosResult.data;

  // Build photo URLs
  const photoUrls = photos?.map((photo) => {
    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.photos)
      .getPublicUrl(photo.storage_path);
    return data.publicUrl;
  }) || [];

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
    subscription_status: string | null;
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
        subscriptionStatus: profile.subscription_status,
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
          showGoogleReviews: l.show_google_reviews || false,
          contactPhone: l.contact_phone,
          contactEmail: l.contact_email,
          contactWebsite: l.contact_website,
          useCompanyContact: l.use_company_contact ?? true,
        })) || [],
      attributes,
      photoUrls,
    },
  };
}
