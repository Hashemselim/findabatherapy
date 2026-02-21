"use server";

import { revalidatePath } from "next/cache";

import { isDevOnboardingPreviewEnabled } from "@/lib/onboarding-preview";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  CompanyBasics,
  CompanyDetails,
  LocationData,
  LocationWithServicesData,
  ServicesData,
} from "@/lib/validations/onboarding";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type OnboardingIntent = "therapy" | "jobs" | "both";

function unauthenticatedResult<T = void>(data?: T): ActionResult<T> {
  if (isDevOnboardingPreviewEnabled()) {
    return data === undefined ? { success: true } : { success: true, data };
  }
  return { success: false, error: "Not authenticated" };
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
 * Update profile with company basics (creates profile if it doesn't exist)
 */
export async function updateProfileBasics(
  data: CompanyBasics
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      agency_name: data.agencyName,
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
  return { success: true };
}

/**
 * Update profile plan tier
 */
export async function updateProfilePlan(
  plan: "free" | "pro" | "enterprise"
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  // For free plan, update directly. For paid plans, this will be updated after Stripe checkout
  if (plan === "free") {
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        plan_tier: plan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  // Store selected plan for checkout redirect (handled client-side via localStorage)
  return { success: true };
}

/**
 * Update onboarding intent preference.
 */
export async function updateProfileIntent(intent: OnboardingIntent): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      primary_intent: intent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/onboarding");
  return { success: true };
}

/**
 * Create or update the listing with company details
 */
export async function updateListingDetails(
  data: CompanyDetails & { contactPhone?: string; website?: string; servicesOffered?: string[] }
): Promise<ActionResult<{ listingId: string }>> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Check if listing exists
  const { data: existingListing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (existingListing) {
    // Update existing listing
    const { error } = await supabase
      .from("listings")
      .update({
        headline: data.headline,
        description: data.description,
        service_modes: data.serviceModes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingListing.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Save services_offered to listing_attribute_values
    if (data.servicesOffered && data.servicesOffered.length > 0) {
      await supabase
        .from("listing_attribute_values")
        .delete()
        .eq("listing_id", existingListing.id)
        .eq("attribute_key", "services_offered");

      await supabase.from("listing_attribute_values").insert({
        listing_id: existingListing.id,
        attribute_key: "services_offered",
        value_json: data.servicesOffered,
      });
    }

    return { success: true, data: { listingId: existingListing.id } };
  }

  // Get profile for agency name to generate slug
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Generate unique slug
  let slug = generateSlug(profile.agency_name);
  let slugSuffix = 0;

  // Check for slug uniqueness
  while (true) {
    const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
    const { data: existingSlug } = await supabase
      .from("listings")
      .select("id")
      .eq("slug", checkSlug)
      .single();

    if (!existingSlug) {
      slug = checkSlug;
      break;
    }
    slugSuffix++;
  }

  // Create new listing
  const { data: newListing, error } = await supabase
    .from("listings")
    .insert({
      profile_id: user.id,
      slug,
      headline: data.headline,
      description: data.description,
      service_modes: data.serviceModes,
      plan_tier: profile.plan_tier,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Save services_offered to listing_attribute_values for new listing
  if (data.servicesOffered && data.servicesOffered.length > 0) {
    await supabase.from("listing_attribute_values").insert({
      listing_id: newListing.id,
      attribute_key: "services_offered",
      value_json: data.servicesOffered,
    });
  }

  return { success: true, data: { listingId: newListing.id } };
}

/**
 * Add or update primary location (legacy - without services)
 */
export async function updateListingLocation(
  data: LocationData
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found. Please complete previous steps." };
  }

  // Check for existing primary location
  const { data: existingLocation } = await supabase
    .from("locations")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("is_primary", true)
    .single();

  const locationData = {
    listing_id: listing.id,
    street: data.street || null,
    city: data.city,
    state: data.state,
    postal_code: data.postalCode || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    service_radius_miles: data.serviceRadiusMiles,
    service_mode: "both", // Legacy column - still has NOT NULL constraint
    is_primary: true,
    label: "Primary Location",
  };

  if (existingLocation) {
    // Update existing location
    const { error } = await supabase
      .from("locations")
      .update(locationData)
      .eq("id", existingLocation.id);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Create new location
    const { error } = await supabase.from("locations").insert(locationData);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

/**
 * Add or update primary location with service types and insurances
 */
export async function updateListingLocationWithServices(
  data: LocationWithServicesData
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found. Please complete previous steps." };
  }

  // Check for existing primary location
  const { data: existingLocation } = await supabase
    .from("locations")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("is_primary", true)
    .single();

  // Map service_types array to legacy service_mode value for backward compatibility
  const legacyServiceMode = data.serviceTypes.includes("in_home") && data.serviceTypes.includes("in_center")
    ? "both"
    : data.serviceTypes.includes("in_home")
    ? "in_home"
    : "center_based";

  const locationData = {
    listing_id: listing.id,
    label: data.label || "Primary Location",
    service_types: data.serviceTypes,
    service_mode: legacyServiceMode, // Legacy column - still has NOT NULL constraint
    street: data.street || null,
    city: data.city,
    state: data.state,
    postal_code: data.postalCode || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    service_radius_miles: data.serviceRadiusMiles,
    insurances: data.insurances,
    is_accepting_clients: data.isAcceptingClients ?? true,
    is_primary: true,
  };

  if (existingLocation) {
    // Update existing location
    const { error } = await supabase
      .from("locations")
      .update(locationData)
      .eq("id", existingLocation.id);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Create new location
    const { error } = await supabase.from("locations").insert(locationData);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  // Also update is_accepting_clients on the listing to keep in sync
  // This ensures the dashboard listing page shows the correct value
  await supabase
    .from("listings")
    .update({
      is_accepting_clients: data.isAcceptingClients ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listing.id);

  return { success: true };
}

/**
 * Update basic listing attributes (insurances only - for simplified onboarding per PRD 3.2.2)
 */
export async function updateBasicAttributes(
  data: { insurances: string[]; isAcceptingClients?: boolean }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found. Please complete previous steps." };
  }

  // Update is_accepting_clients on listing if provided
  if (data.isAcceptingClients !== undefined) {
    await supabase
      .from("listings")
      .update({ is_accepting_clients: data.isAcceptingClients })
      .eq("id", listing.id);
  }

  // Delete existing insurances attribute
  await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id)
    .eq("attribute_key", "insurances");

  // Insert new insurances attribute
  const { error } = await supabase
    .from("listing_attribute_values")
    .insert({
      listing_id: listing.id,
      attribute_key: "insurances",
      value_json: data.insurances,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update listing attributes (services, insurances, etc.)
 */
export async function updateListingAttributes(
  data: ServicesData
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found. Please complete previous steps." };
  }

  // Update is_accepting_clients on listing
  await supabase
    .from("listings")
    .update({ is_accepting_clients: data.isAcceptingClients })
    .eq("id", listing.id);

  // Prepare attributes to upsert (insurances are now per-location)
  const attributes = [
    {
      listing_id: listing.id,
      attribute_key: "ages_served",
      value_json: { min: data.agesServedMin, max: data.agesServedMax },
    },
    {
      listing_id: listing.id,
      attribute_key: "languages",
      value_json: data.languages,
    },
    {
      listing_id: listing.id,
      attribute_key: "diagnoses",
      value_json: data.diagnoses,
    },
    {
      listing_id: listing.id,
      attribute_key: "clinical_specialties",
      value_json: data.clinicalSpecialties,
    },
  ];

  // Delete existing attributes for this listing
  await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id);

  // Insert new attributes
  const { error } = await supabase
    .from("listing_attribute_values")
    .insert(attributes);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Complete onboarding and optionally publish listing
 */
export async function completeOnboarding(
  publish: boolean = false
): Promise<ActionResult<{ redirectTo: string }>> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get profile and listing
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, billing_interval")
    .eq("id", user.id)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update profile onboarding status
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  // If publishing, update listing status
  if (publish) {
    const { error: listingError } = await supabase
      .from("listings")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    if (listingError) {
      return { success: false, error: listingError.message };
    }
  }

  revalidatePath("/dashboard");

  // Determine redirect based on plan
  // Free plan: Go to dashboard
  // Paid plan: Go to checkout to complete payment
  let redirectTo = "/dashboard";
  if (profile?.plan_tier === "pro" || profile?.plan_tier === "enterprise") {
    // Normalize billing interval: convert "monthly"/"annual" to "month"/"year" for Stripe
    const interval = profile.billing_interval === "annual" || profile.billing_interval === "year" ? "year" : "month";
    redirectTo = `/dashboard/billing/checkout?plan=${profile.plan_tier}&interval=${interval}`;
  }

  return { success: true, data: { redirectTo } };
}

/**
 * Update premium attributes (Enhanced Details step)
 * This includes ages, languages, diagnoses, specialties, video URL, and contact form toggle
 */
export async function updatePremiumAttributes(data: {
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  videoUrl?: string;
  contactFormEnabled?: boolean;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found. Please complete previous steps." };
  }

  // Update video URL on listing if provided
  if (data.videoUrl !== undefined) {
    await supabase
      .from("listings")
      .update({
        video_url: data.videoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);
  }

  // Prepare attributes to upsert (only if values are provided)
  const attributes: Array<{
    listing_id: string;
    attribute_key: string;
    value_json?: unknown;
    value_boolean?: boolean;
  }> = [];

  if (data.agesServedMin !== undefined && data.agesServedMax !== undefined) {
    attributes.push({
      listing_id: listing.id,
      attribute_key: "ages_served",
      value_json: { min: data.agesServedMin, max: data.agesServedMax },
    });
  }

  if (data.languages !== undefined) {
    attributes.push({
      listing_id: listing.id,
      attribute_key: "languages",
      value_json: data.languages,
    });
  }

  if (data.diagnoses !== undefined) {
    attributes.push({
      listing_id: listing.id,
      attribute_key: "diagnoses",
      value_json: data.diagnoses,
    });
  }

  if (data.clinicalSpecialties !== undefined) {
    attributes.push({
      listing_id: listing.id,
      attribute_key: "clinical_specialties",
      value_json: data.clinicalSpecialties,
    });
  }

  if (data.contactFormEnabled !== undefined) {
    attributes.push({
      listing_id: listing.id,
      attribute_key: "contact_form_enabled",
      value_boolean: data.contactFormEnabled,
    });
  }

  // Delete existing attributes that we're updating
  const keysToUpdate = attributes.map((a) => a.attribute_key);
  if (keysToUpdate.length > 0) {
    await supabase
      .from("listing_attribute_values")
      .delete()
      .eq("listing_id", listing.id)
      .in("attribute_key", keysToUpdate);

    // Insert new attributes
    const { error } = await supabase
      .from("listing_attribute_values")
      .insert(attributes);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get onboarding progress data
 */
export async function getOnboardingData(): Promise<
  ActionResult<{
    profile: {
      agencyName: string;
      contactEmail: string;
      contactPhone: string | null;
      website: string | null;
      planTier: string;
      billingInterval: string;
      primaryIntent: OnboardingIntent;
    } | null;
    listing: {
      id: string;
      slug: string;
      headline: string | null;
      description: string | null;
      serviceModes: string[];
      isAcceptingClients: boolean;
      videoUrl: string | null;
      logoUrl: string | null;
    } | null;
    location: {
      street: string | null;
      city: string;
      state: string;
      postalCode: string | null;
      serviceRadiusMiles: number;
      latitude: number | null;
      longitude: number | null;
      serviceTypes: ("in_home" | "in_center" | "telehealth" | "school_based")[];
      insurances: string[];
      isAcceptingClients: boolean;
    } | null;
    attributes: Record<string, unknown>;
  }>
> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult({
      profile: null,
      listing: null,
      location: null,
      attributes: {},
    });
  }

  const supabase = await createClient();

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email, contact_phone, website, plan_tier, billing_interval, primary_intent")
    .eq("id", user.id)
    .single();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, headline, description, service_modes, is_accepting_clients, video_url, logo_url")
    .eq("profile_id", user.id)
    .single();

  // Get primary location
  let location = null;
  if (listing) {
    const { data: loc } = await supabase
      .from("locations")
      .select("street, city, state, postal_code, service_radius_miles, latitude, longitude, service_types, insurances, is_accepting_clients")
      .eq("listing_id", listing.id)
      .eq("is_primary", true)
      .single();

    if (loc) {
      location = {
        street: loc.street,
        city: loc.city,
        state: loc.state,
        postalCode: loc.postal_code,
        serviceRadiusMiles: loc.service_radius_miles || 25,
        latitude: loc.latitude,
        longitude: loc.longitude,
        serviceTypes: (loc.service_types as ("in_home" | "in_center" | "telehealth" | "school_based")[]) || ["in_home", "in_center"],
        insurances: (loc.insurances as string[]) || [],
        isAcceptingClients: loc.is_accepting_clients ?? true,
      };
    }
  }

  // Get attributes
  const attributes: Record<string, unknown> = {};
  if (listing) {
    const { data: attrs } = await supabase
      .from("listing_attribute_values")
      .select("attribute_key, value_json, value_text, value_number, value_boolean")
      .eq("listing_id", listing.id);

    if (attrs) {
      attrs.forEach((attr) => {
        attributes[attr.attribute_key] =
          attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;
      });
    }
  }

  return {
    success: true,
    data: {
      profile: profile
        ? {
            agencyName: profile.agency_name,
            contactEmail: profile.contact_email,
            contactPhone: profile.contact_phone,
            website: profile.website,
            planTier: profile.plan_tier,
            billingInterval: profile.billing_interval || "month",
            primaryIntent: (profile.primary_intent || "both") as OnboardingIntent,
          }
        : null,
      listing: listing
        ? {
            id: listing.id,
            slug: listing.slug,
            headline: listing.headline,
            description: listing.description,
            serviceModes: listing.service_modes || [],
            isAcceptingClients: listing.is_accepting_clients,
            videoUrl: listing.video_url,
            logoUrl: listing.logo_url,
          }
        : null,
      location,
      attributes,
    },
  };
}

/**
 * Save onboarding draft data (auto-save)
 * This saves partial form data without validation so users don't lose progress
 */
export async function saveOnboardingDraft(data: {
  // Profile fields
  agencyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  // Listing fields
  headline?: string;
  description?: string;
  serviceModes?: string[];
  // Location fields
  city?: string;
  state?: string;
  serviceRadiusMiles?: number;
  // Attribute fields
  insurances?: string[];
  // Premium fields
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  videoUrl?: string;
  contactFormEnabled?: boolean;
}): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Update profile fields if any provided
  const profileUpdates: Record<string, unknown> = {};
  if (data.agencyName !== undefined) profileUpdates.agency_name = data.agencyName;
  if (data.contactEmail !== undefined) profileUpdates.contact_email = data.contactEmail;
  if (data.contactPhone !== undefined) profileUpdates.contact_phone = data.contactPhone || null;
  if (data.website !== undefined) profileUpdates.website = data.website || null;

  if (Object.keys(profileUpdates).length > 0) {
    profileUpdates.updated_at = new Date().toISOString();
    await supabase.from("profiles").update(profileUpdates).eq("id", user.id);
  }

  // Get or create listing
  let { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  // If no listing exists and we have enough data, create one
  if (!listing && data.agencyName) {
    const slug = generateSlug(data.agencyName);
    const { data: newListing } = await supabase
      .from("listings")
      .insert({
        profile_id: user.id,
        slug,
        headline: data.headline || null,
        description: data.description || null,
        service_modes: data.serviceModes || [],
        is_accepting_clients: true,
        status: "draft",
      })
      .select("id")
      .single();
    listing = newListing;
  }

  if (listing) {
    // Update listing fields if any provided
    const listingUpdates: Record<string, unknown> = {};
    if (data.headline !== undefined) listingUpdates.headline = data.headline || null;
    if (data.description !== undefined) listingUpdates.description = data.description || null;
    if (data.serviceModes !== undefined) listingUpdates.service_modes = data.serviceModes;
    if (data.videoUrl !== undefined) listingUpdates.video_url = data.videoUrl || null;

    if (Object.keys(listingUpdates).length > 0) {
      listingUpdates.updated_at = new Date().toISOString();
      await supabase.from("listings").update(listingUpdates).eq("id", listing.id);
    }

    // Update location if city or state provided
    if (data.city !== undefined || data.state !== undefined || data.serviceRadiusMiles !== undefined) {
      const { data: existingLocation } = await supabase
        .from("locations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("is_primary", true)
        .single();

      const locationData: Record<string, unknown> = {};
      if (data.city !== undefined) locationData.city = data.city;
      if (data.state !== undefined) locationData.state = data.state;
      if (data.serviceRadiusMiles !== undefined) locationData.service_radius_miles = data.serviceRadiusMiles;

      if (existingLocation) {
        locationData.updated_at = new Date().toISOString();
        await supabase.from("locations").update(locationData).eq("id", existingLocation.id);
      } else if (data.city && data.state) {
        await supabase.from("locations").insert({
          listing_id: listing.id,
          city: data.city,
          state: data.state,
          service_radius_miles: data.serviceRadiusMiles || 25,
          is_primary: true,
        });
      }
    }

    // Update attributes (insurances, ages, languages, etc.)
    const attributesToSave: Array<{
      listing_id: string;
      attribute_key: string;
      value_json?: unknown;
      value_boolean?: boolean;
    }> = [];

    if (data.insurances !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "insurances",
        value_json: data.insurances,
      });
    }

    if (data.agesServedMin !== undefined && data.agesServedMax !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "ages_served",
        value_json: { min: data.agesServedMin, max: data.agesServedMax },
      });
    }

    if (data.languages !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "languages",
        value_json: data.languages,
      });
    }

    if (data.diagnoses !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "diagnoses",
        value_json: data.diagnoses,
      });
    }

    if (data.clinicalSpecialties !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "clinical_specialties",
        value_json: data.clinicalSpecialties,
      });
    }

    if (data.contactFormEnabled !== undefined) {
      attributesToSave.push({
        listing_id: listing.id,
        attribute_key: "contact_form_enabled",
        value_boolean: data.contactFormEnabled,
      });
    }

    // Delete and re-insert attributes
    if (attributesToSave.length > 0) {
      const keysToUpdate = attributesToSave.map((a) => a.attribute_key);
      await supabase
        .from("listing_attribute_values")
        .delete()
        .eq("listing_id", listing.id)
        .in("attribute_key", keysToUpdate);

      await supabase.from("listing_attribute_values").insert(attributesToSave);
    }
  }

  return { success: true };
}
