"use server";

import { revalidatePath } from "next/cache";

import { isDevOnboardingPreviewEnabled } from "@/lib/onboarding-preview";
import { createClient, getCurrentProfileId, getUser } from "@/lib/supabase/server";
import { toUserFacingSupabaseError } from "@/lib/supabase/user-facing-errors";
import { isConvexDataEnabled } from "@/lib/platform/config";
import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";
import { createWorkspaceForUser } from "@/lib/workspace/memberships";
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

function normalizeOnboardingIntent(value: unknown): OnboardingIntent {
  if (value === "therapy" || value === "jobs" || value === "both") {
    return value;
  }
  if (value === "context_jobs" || value === "jobs_only") {
    return "jobs";
  }
  return "both";
}

async function ensureCurrentUserWorkspace(
  fallback?: {
    agencyName?: string;
    contactEmail?: string;
  }
): Promise<ActionResult<{ profileId: string }>> {
  const user = await getUser();
  if (!user?.id || !user.email) {
    return unauthenticatedResult();
  }

  const agencyName =
    fallback?.agencyName?.trim() ||
    user.user_metadata?.agency_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split("@")[0] ||
    "My Agency";
  const contactEmail = (fallback?.contactEmail || user.email).trim().toLowerCase();
  const planTier = user.user_metadata?.selected_plan === "pro" ? "pro" : "free";
  const billingInterval =
    user.user_metadata?.billing_interval === "annual" ||
    user.user_metadata?.billing_interval === "year"
      ? "year"
      : "month";

  await createWorkspaceForUser({
    userId: user.id,
    email: contactEmail,
    agencyName,
    planTier,
    billingInterval,
    primaryIntent: normalizeOnboardingIntent(user.user_metadata?.selected_intent),
  });

  return { success: true, data: { profileId: user.id } };
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
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("listings:updateCompanyContact", {
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        website: data.website || null,
      });
      await mutateConvex("listings:updateAgencyName", {
        agencyName: data.agencyName,
      });
      revalidatePath("/dashboard");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update profile basics" };
    }
  }

  let profileId = await getCurrentProfileId();
  if (!profileId) {
    const ensuredWorkspace = await ensureCurrentUserWorkspace({
      agencyName: data.agencyName,
      contactEmail: data.contactEmail,
    });
    if (!ensuredWorkspace.success) {
      return { success: false, error: ensuredWorkspace.error };
    }
    if (!ensuredWorkspace.data) {
      return { success: false, error: "Not authenticated" };
    }
    profileId = ensuredWorkspace.data.profileId;
  }

  const supabase = await createClient();
  const profileUpdates = {
    agency_name: data.agencyName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone || null,
    website: data.website || null,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedProfiles, error } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("id", profileId)
    .select("id");

  if (error) {
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:updateProfileBasics",
        error,
        fallback: "We could not save your agency details. Please try again.",
      }),
    };
  }

  if (!updatedProfiles?.length) {
    const ensuredWorkspace = await ensureCurrentUserWorkspace({
      agencyName: data.agencyName,
      contactEmail: data.contactEmail,
    });
    if (!ensuredWorkspace.success) {
      return { success: false, error: ensuredWorkspace.error };
    }
    if (!ensuredWorkspace.data) {
      return { success: false, error: "Profile not found" };
    }

    profileId = ensuredWorkspace.data.profileId;

    const retry = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", profileId)
      .select("id");

    if (retry.error) {
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updateProfileBasicsRetry",
          error: retry.error,
          fallback: "We could not save your agency details. Please try again.",
        }),
      };
    }

    if (!retry.data?.length) {
      return { success: false, error: "Profile not found" };
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Update profile plan tier
 */
export async function updateProfilePlan(
  plan: "free" | "pro"
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    // In Convex mode, plan changes go through billing - no-op here
    return { success: true };
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
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
      .eq("id", profileId);

    if (error) {
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updateProfilePlan",
          error,
          fallback: "We could not save your plan selection. Please try again.",
        }),
      };
    }
  }

  // Store selected plan for checkout redirect (handled client-side via localStorage)
  return { success: true };
}

/**
 * Update onboarding intent preference.
 */
export async function updateProfileIntent(intent: OnboardingIntent): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("workspaces:setCurrentWorkspacePrimaryIntentIfMissing", { intent });
      revalidatePath("/dashboard/onboarding");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update intent" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      primary_intent: intent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:updateProfileIntent",
        error,
        fallback: "We could not save your onboarding preference. Please try again.",
      }),
    };
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
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("listings:updateDashboardListing", {
        headline: data.headline,
        description: data.description,
        serviceModes: data.serviceModes,
      });
      if (data.servicesOffered) {
        await mutateConvex("listings:updateListingAttributes", {
          servicesOffered: data.servicesOffered,
        });
      }
      return { success: true, data: { listingId: "convex" } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update listing details" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Check if listing exists
  const { data: existingListing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updateListingDetails",
          error,
          fallback: "We could not save your agency details. Please try again.",
        }),
      };
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
    .eq("id", profileId)
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
      profile_id: profileId,
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
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:createListing",
        error,
        fallback: "We could not create your listing. Please try again.",
      }),
    };
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
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("locations:addLocation", {
        city: data.city,
        state: data.state,
        street: data.street || undefined,
        postalCode: data.postalCode || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        serviceRadiusMiles: data.serviceRadiusMiles,
        serviceTypes: ["in_home", "in_center"],
        insurances: [],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update location" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updateListingLocation",
          error,
          fallback: "We could not save your location. Please try again.",
        }),
      };
    }
  } else {
    // Create new location
    const { error } = await supabase.from("locations").insert(locationData);

    if (error) {
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:createListingLocation",
          error,
          fallback: "We could not save your location. Please try again.",
        }),
      };
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
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("locations:addLocation", {
        label: data.label || "Primary Location",
        city: data.city,
        state: data.state,
        street: data.street || undefined,
        postalCode: data.postalCode || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        serviceRadiusMiles: data.serviceRadiusMiles,
        serviceTypes: data.serviceTypes,
        insurances: data.insurances,
        isAcceptingClients: data.isAcceptingClients ?? true,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update location with services" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updateLocationWithServices",
          error,
          fallback: "We could not save your location details. Please try again.",
        }),
      };
    }
  } else {
    // Create new location
    const { error } = await supabase.from("locations").insert(locationData);

    if (error) {
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:createLocationWithServices",
          error,
          fallback: "We could not save your location details. Please try again.",
        }),
      };
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
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("listings:updateListingAttributes", {
        insurances: data.insurances,
        isAcceptingClients: data.isAcceptingClients,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update basic attributes" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:updateBasicAttributes",
        error,
        fallback: "We could not save your accepted insurances. Please try again.",
      }),
    };
  }

  return { success: true };
}

/**
 * Update listing attributes (services, insurances, etc.)
 */
export async function updateListingAttributes(
  data: ServicesData
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      await mutateConvex("listings:updateListingAttributes", {
        isAcceptingClients: data.isAcceptingClients,
        languages: data.languages,
        diagnoses: data.diagnoses,
        clinicalSpecialties: data.clinicalSpecialties,
        agesServedMin: data.agesServedMin,
        agesServedMax: data.agesServedMax,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update listing attributes" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:updateListingAttributes",
        error,
        fallback: "We could not save your service details. Please try again.",
      }),
    };
  }

  return { success: true };
}

/**
 * Complete onboarding and optionally publish listing
 */
export async function completeOnboarding(
  publish: boolean = false
): Promise<ActionResult<{ redirectTo: string }>> {
  if (isConvexDataEnabled()) {
    try {
      if (publish) {
        await mutateConvex("listings:updateListingStatus", { status: "published" });
      }
      const ws = await queryConvex<{ workspace: { planTier: string | null; billingInterval: string | null } } | null>("workspaces:getCurrentWorkspace");
      let redirectTo = "/dashboard/clients/pipeline";
      if (ws?.workspace?.planTier === "pro") {
        const interval = ws.workspace.billingInterval === "annual" || ws.workspace.billingInterval === "year" ? "year" : "month";
        redirectTo = `/dashboard/billing/checkout?plan=pro&interval=${interval}`;
      }
      revalidatePath("/dashboard");
      return { success: true, data: { redirectTo } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to complete onboarding" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get profile and listing
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, billing_interval")
    .eq("id", profileId)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("profile_id", profileId)
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
    .eq("id", profileId);

  if (profileError) {
    return {
      success: false,
      error: toUserFacingSupabaseError({
        action: "ONBOARDING:completeProfile",
        error: profileError,
        fallback: "We could not complete onboarding. Please try again.",
      }),
    };
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
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:publishListing",
          error: listingError,
          fallback: "We could not publish your listing. Please try again.",
        }),
      };
    }
  }

  revalidatePath("/dashboard");

  // Determine redirect based on plan
  // Free plan: Go to dashboard
  // Paid plan: Go to checkout to complete payment
  let redirectTo = "/dashboard/clients/pipeline";
  if (profile?.plan_tier === "pro") {
    // Normalize billing interval: convert "monthly"/"annual" to "month"/"year" for Stripe
    const interval = profile.billing_interval === "annual" || profile.billing_interval === "year" ? "year" : "month";
    redirectTo = `/dashboard/billing/checkout?plan=${profile.plan_tier}&interval=${interval}`;
  }

  return { success: true, data: { redirectTo } };
}

export async function finalizeOnboardingAsFree(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return completeOnboarding(true);
}

export async function finalizeOnboardingAfterPayment(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return completeOnboarding(true);
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
  if (isConvexDataEnabled()) {
    try {
      if (data.videoUrl !== undefined) {
        await mutateConvex("files:updateListingVideoUrl", { videoUrl: data.videoUrl || null });
      }
      if (data.contactFormEnabled !== undefined) {
        await mutateConvex("listings:updateContactFormEnabled", { enabled: data.contactFormEnabled });
      }
      const attributeArgs: Record<string, unknown> = {};
      if (data.agesServedMin !== undefined) attributeArgs.agesServedMin = data.agesServedMin;
      if (data.agesServedMax !== undefined) attributeArgs.agesServedMax = data.agesServedMax;
      if (data.languages !== undefined) attributeArgs.languages = data.languages;
      if (data.diagnoses !== undefined) attributeArgs.diagnoses = data.diagnoses;
      if (data.clinicalSpecialties !== undefined) attributeArgs.clinicalSpecialties = data.clinicalSpecialties;
      if (Object.keys(attributeArgs).length > 0) {
        await mutateConvex("listings:updateListingAttributes", attributeArgs);
      }
      revalidatePath("/dashboard");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update premium attributes" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return unauthenticatedResult();
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
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
      return {
        success: false,
        error: toUserFacingSupabaseError({
          action: "ONBOARDING:updatePremiumAttributes",
          error,
          fallback: "We could not save your premium details. Please try again.",
        }),
      };
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
      brandColor: string;
      showPoweredBy: boolean;
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
  if (isConvexDataEnabled()) {
    try {
      const wsData = await queryConvex<{
        workspace: {
          agencyName: string;
          contactEmail: string;
          contactPhone: string | null;
          website: string | null;
          planTier: string | null;
          billingInterval: string | null;
          primaryIntent: string | null;
          brandColor?: string | null;
          showPoweredBy?: boolean;
        };
      } | null>("workspaces:getCurrentWorkspace");

      const listingData = await queryConvex<{
        listing: {
          _id: string;
          slug: string;
          headline: string | null;
          description: string | null;
          serviceModes: string[];
          isAcceptingClients: boolean;
          videoUrl: string | null;
          logoUrl: string | null;
        } | null;
        attributes: Record<string, unknown>;
        locations: Array<{
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
          isPrimary?: boolean;
        }>;
      } | null>("listings:getDashboardListing");

      const ws = wsData?.workspace ?? null;
      const listing = listingData?.listing ?? null;
      const primaryLocation = listingData?.locations?.find((l) => l.isPrimary) ?? listingData?.locations?.[0] ?? null;

      return {
        success: true,
        data: {
          profile: ws
            ? {
                agencyName: ws.agencyName,
                contactEmail: ws.contactEmail,
                contactPhone: ws.contactPhone,
                website: ws.website,
                brandColor: ws.brandColor || "#0866FF",
                showPoweredBy: ws.showPoweredBy ?? true,
                planTier: ws.planTier || "free",
                billingInterval: ws.billingInterval || "month",
                primaryIntent: (ws.primaryIntent || "both") as OnboardingIntent,
              }
            : null,
          listing: listing
            ? {
                id: listing._id,
                slug: listing.slug,
                headline: listing.headline,
                description: listing.description,
                serviceModes: listing.serviceModes || [],
                isAcceptingClients: listing.isAcceptingClients,
                videoUrl: listing.videoUrl,
                logoUrl: listing.logoUrl,
              }
            : null,
          location: primaryLocation
            ? {
                street: primaryLocation.street,
                city: primaryLocation.city,
                state: primaryLocation.state,
                postalCode: primaryLocation.postalCode,
                serviceRadiusMiles: primaryLocation.serviceRadiusMiles || 25,
                latitude: primaryLocation.latitude,
                longitude: primaryLocation.longitude,
                serviceTypes: primaryLocation.serviceTypes || ["in_home", "in_center"],
                insurances: primaryLocation.insurances || [],
                isAcceptingClients: primaryLocation.isAcceptingClients ?? true,
              }
            : null,
          attributes: listingData?.attributes ?? {},
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to load onboarding data" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
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
    .select("agency_name, contact_email, contact_phone, website, plan_tier, billing_interval, primary_intent, intake_form_settings")
    .eq("id", profileId)
    .single();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, headline, description, service_modes, is_accepting_clients, video_url, logo_url")
    .eq("profile_id", profileId)
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
            brandColor:
              (
                profile.intake_form_settings as
                  | { background_color?: string; show_powered_by?: boolean }
                  | null
              )?.background_color || "#0866FF",
            showPoweredBy:
              (
                profile.intake_form_settings as
                  | { background_color?: string; show_powered_by?: boolean }
                  | null
              )?.show_powered_by ?? true,
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
  if (isConvexDataEnabled()) {
    try {
      // Profile fields
      const hasContactFields = data.contactEmail !== undefined || data.contactPhone !== undefined || data.website !== undefined;
      if (hasContactFields) {
        const contactArgs: Record<string, unknown> = {};
        if (data.contactEmail !== undefined) contactArgs.contactEmail = data.contactEmail;
        if (data.contactPhone !== undefined) contactArgs.contactPhone = data.contactPhone || null;
        if (data.website !== undefined) contactArgs.website = data.website || null;
        await mutateConvex("listings:updateCompanyContact", contactArgs);
      }
      if (data.agencyName !== undefined) {
        await mutateConvex("listings:updateAgencyName", { agencyName: data.agencyName });
      }

      // Listing fields
      const hasListingFields = data.headline !== undefined || data.description !== undefined || data.serviceModes !== undefined;
      if (hasListingFields) {
        const listingArgs: Record<string, unknown> = {};
        if (data.headline !== undefined) listingArgs.headline = data.headline;
        if (data.description !== undefined) listingArgs.description = data.description;
        if (data.serviceModes !== undefined) listingArgs.serviceModes = data.serviceModes;
        await mutateConvex("listings:updateDashboardListing", listingArgs);
      }

      // Attribute fields
      const attributeArgs: Record<string, unknown> = {};
      if (data.insurances !== undefined) attributeArgs.insurances = data.insurances;
      if (data.agesServedMin !== undefined) attributeArgs.agesServedMin = data.agesServedMin;
      if (data.agesServedMax !== undefined) attributeArgs.agesServedMax = data.agesServedMax;
      if (data.languages !== undefined) attributeArgs.languages = data.languages;
      if (data.diagnoses !== undefined) attributeArgs.diagnoses = data.diagnoses;
      if (data.clinicalSpecialties !== undefined) attributeArgs.clinicalSpecialties = data.clinicalSpecialties;
      if (Object.keys(attributeArgs).length > 0) {
        await mutateConvex("listings:updateListingAttributes", attributeArgs);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to save onboarding draft" };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
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
    await supabase.from("profiles").update(profileUpdates).eq("id", profileId);
  }

  // Get or create listing
  let { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  // If no listing exists and we have enough data, create one
  if (!listing && data.agencyName) {
    const slug = generateSlug(data.agencyName);
    const { data: newListing } = await supabase
      .from("listings")
      .insert({
        profile_id: profileId,
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
