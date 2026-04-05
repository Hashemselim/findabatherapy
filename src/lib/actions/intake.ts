"use server";

import { headers } from "next/headers";

import { isConvexDataEnabled } from "@/lib/platform/config";
import {
  type IntakeFieldsConfig,
  mergeWithDefaults,
} from "@/lib/intake/field-registry";
import { isPublicProfileVisible } from "@/lib/public-visibility";
import { getRequestOrigin } from "@/lib/utils/domains";

export interface IntakeFormSettings {
  background_color: string;
  show_powered_by: boolean;
  /** Per-field enable/required config for the intake form */
  fields?: IntakeFieldsConfig;
}

export interface ContactPageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
    contactFormEnabled: boolean;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

// Backward compatibility alias
export type IntakePageData = ContactPageData;

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Get data for the standalone contact form page
 * Returns listing and profile info needed to render the contact page
 */
export async function getContactPageData(
  slug: string
): Promise<ActionResult<ContactPageData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<ContactPageData>("intake:getContactPageData", { slug });
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Provider not found" };
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  // Fetch listing with profile data
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      status,
      logo_url,
      profiles!inner (
        agency_name,
        contact_email,
        website,
        plan_tier,
        subscription_status,
        intake_form_settings,
        is_seeded
      ),
      listing_attribute_values (
        attribute_key,
        value_boolean
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Provider not found" };
  }

  const profile = listing.profiles as unknown as {
    agency_name: string;
    contact_email: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: IntakeFormSettings | null;
    is_seeded: boolean;
  };

  if (!isPublicProfileVisible(profile)) {
    return { success: false, error: "Provider not found" };
  }

  // Check if provider has premium plan with active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isPremium = profile.plan_tier !== "free" && isActiveSubscription;

  // Check if contact form is enabled
  const contactFormAttribute = listing.listing_attribute_values?.find(
    (attr: { attribute_key: string }) => attr.attribute_key === "contact_form_enabled"
  );
  const contactFormEnabled = contactFormAttribute?.value_boolean !== false;

  // For premium users, enforce contact form enabled check
  if (isPremium && !contactFormEnabled) {
    return { success: false, error: "Contact form not enabled" };
  }

  // Get logo URL directly from listing
  const logoUrl = listing.logo_url ?? null;

  // Default intake form settings
  const defaultSettings: IntakeFormSettings = {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  const intakeFormSettings = profile.intake_form_settings
    ? {
        ...defaultSettings,
        ...profile.intake_form_settings,
      }
    : defaultSettings;

  return {
    success: true,
    data: {
      listing: {
        id: listing.id,
        slug: listing.slug,
        logoUrl,
        // Free-tier providers: page renders in preview mode (form is locked)
        contactFormEnabled: isPremium ? contactFormEnabled : false,
      },
      profile: {
        agencyName: profile.agency_name,
        website: profile.website,
        planTier: profile.plan_tier,
        subscriptionStatus: profile.subscription_status,
        intakeFormSettings,
      },
    },
  };
}

// Backward compatibility alias for old function name
export const getIntakePageData = getContactPageData;

export interface ClientIntakePageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
    clientIntakeEnabled: boolean;
    profileId: string;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

export interface ClientResourcesPageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

/**
 * Get data for the client intake form page
 * Returns listing and profile info needed to render the client intake page
 */
export async function getClientIntakePageData(
  slug: string
): Promise<ActionResult<ClientIntakePageData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<ClientIntakePageData>("intake:getClientIntakePageData", { slug });
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Provider not found" };
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  // Fetch listing with profile data
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      status,
      logo_url,
      profile_id,
      client_intake_enabled,
      profiles!inner (
        agency_name,
        contact_email,
        website,
        plan_tier,
        subscription_status,
        intake_form_settings,
        is_seeded
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Provider not found" };
  }

  const profile = listing.profiles as unknown as {
    agency_name: string;
    contact_email: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: IntakeFormSettings | null;
    is_seeded: boolean;
  };

  if (!isPublicProfileVisible(profile)) {
    return { success: false, error: "Provider not found" };
  }

  // Check if provider has premium plan with active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isPremium = profile.plan_tier !== "free" && isActiveSubscription;

  // For premium users, enforce client intake enabled check
  if (isPremium && !listing.client_intake_enabled) {
    return { success: false, error: "Client intake form not enabled" };
  }

  const logoUrl = listing.logo_url ?? null;

  // Default intake form settings
  const defaultSettings: IntakeFormSettings = {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  const intakeFormSettings = profile.intake_form_settings
    ? {
        ...defaultSettings,
        ...profile.intake_form_settings,
      }
    : defaultSettings;

  return {
    success: true,
    data: {
      listing: {
        id: listing.id,
        slug: listing.slug,
        logoUrl,
        // Free-tier providers: page renders in preview mode (form is locked)
        clientIntakeEnabled: isPremium ? (listing.client_intake_enabled ?? false) : false,
        profileId: listing.profile_id,
      },
      profile: {
        agencyName: profile.agency_name,
        website: profile.website,
        planTier: profile.plan_tier,
        subscriptionStatus: profile.subscription_status,
        intakeFormSettings,
      },
    },
  };
}

/**
 * Get data for the standalone client resources page
 * Returns listing and profile info needed to render the resources page
 */
export async function getClientResourcesPageData(
  slug: string
): Promise<ActionResult<ClientResourcesPageData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<ClientResourcesPageData>("intake:getClientResourcesPageData", { slug });
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Provider not found" };
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      slug,
      status,
      logo_url,
      profiles!inner (
        agency_name,
        contact_email,
        website,
        plan_tier,
        subscription_status,
        intake_form_settings,
        is_seeded
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Provider not found" };
  }

  const profile = listing.profiles as unknown as {
    agency_name: string;
    contact_email: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: IntakeFormSettings | null;
    is_seeded: boolean;
  };

  if (!isPublicProfileVisible(profile)) {
    return { success: false, error: "Provider not found" };
  }

  const defaultSettings: IntakeFormSettings = {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  const intakeFormSettings = profile.intake_form_settings
    ? {
        ...defaultSettings,
        ...profile.intake_form_settings,
      }
    : defaultSettings;

  return {
    success: true,
    data: {
      listing: {
        id: listing.id,
        slug: listing.slug,
        logoUrl: listing.logo_url ?? null,
      },
      profile: {
        agencyName: profile.agency_name,
        website: profile.website,
        planTier: profile.plan_tier,
        subscriptionStatus: profile.subscription_status,
        intakeFormSettings,
      },
    },
  };
}

/**
 * Update intake form settings for the current user's profile
 */
export async function updateIntakeFormSettings(
  settings: Partial<IntakeFormSettings>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("intake:updateIntakeFormSettings", { settings });
      return { success: true };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Failed to update settings" };
    }
  }

  const { getCurrentProfileId } = await import("@/lib/supabase/server");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Get current settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("intake_form_settings")
    .eq("id", profileId)
    .single();

  const currentSettings = (profile?.intake_form_settings as IntakeFormSettings) || {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  // Merge with new settings
  const newSettings = {
    ...currentSettings,
    ...settings,
  };

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({ intake_form_settings: newSettings })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: "Failed to update settings" };
  }

  return { success: true };
}

// =============================================================================
// INTAKE FIELD CONFIGURATION
// =============================================================================

/**
 * Save the provider's intake field configuration.
 * Reads current JSONB, merges the `fields` key, writes back.
 */
export async function updateIntakeFieldsConfig(
  fieldsConfig: IntakeFieldsConfig,
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("intake:updateIntakeFieldsConfig", { fieldsConfig });
      return { success: true };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Failed to save field configuration" };
    }
  }

  const { getCurrentProfileId } = await import("@/lib/supabase/server");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Read current settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("intake_form_settings")
    .eq("id", profileId)
    .single();

  const current = (profile?.intake_form_settings as IntakeFormSettings) || {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  // Merge fields into existing settings
  const updated: IntakeFormSettings = {
    ...current,
    fields: fieldsConfig,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ intake_form_settings: updated })
    .eq("id", profileId);

  if (error) {
    return { success: false, error: "Failed to save field configuration" };
  }

  return { success: true };
}

/**
 * Load the provider's intake field configuration, merged with defaults
 * so new fields always have a value.
 */
export async function getIntakeFieldsConfig(
  profileId: string,
): Promise<IntakeFieldsConfig> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<IntakeFieldsConfig>("intake:getIntakeFieldsConfig", { profileId });
      return result;
    } catch (error) {
      console.error("Convex error:", error);
      return mergeWithDefaults(undefined);
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("intake_form_settings")
    .eq("id", profileId)
    .single();

  const settings = profile?.intake_form_settings as IntakeFormSettings | null;
  return mergeWithDefaults(settings?.fields);
}

// =============================================================================
// INTAKE TOKENS (Pre-fill links)
// =============================================================================

import { randomBytes } from "crypto";
import { INTAKE_FIELD_MAP } from "@/lib/intake/field-registry";

function generateToken(): string {
  return randomBytes(16).toString("base64url"); // ~22 chars, URL-safe
}

export interface PrefillData {
  clientName: string;
  fields: Record<string, unknown>;
}

/**
 * Generate a tokenised intake URL for a client so the parent sees a
 * pre-populated form. The token is valid for 7 days.
 */
export async function createIntakeToken(
  clientId: string,
): Promise<ActionResult<{ url: string; token: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ url: string; token: string }>("intake:createIntakeToken", { clientId });
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Failed to create intake token" };
    }
  }

  const { getCurrentProfileId } = await import("@/lib/supabase/server");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify client belongs to this provider
  const { data: client } = await supabase
    .from("clients")
    .select("id, profile_id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Get the listing slug for URL construction
  const { data: publishedListings } = await supabase
    .from("listings")
    .select("slug")
    .eq("profile_id", profileId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1);

  const listing = publishedListings?.[0];

  if (!listing) {
    return { success: false, error: "No published listing found" };
  }

  const token = generateToken();

  const { error } = await supabase.from("intake_tokens").insert({
    client_id: clientId,
    profile_id: profileId,
    token,
  });

  if (error) {
    return { success: false, error: "Failed to create intake token" };
  }

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
  try {
    const headersList = await headers();
    siteUrl = getRequestOrigin(headersList, "therapy");
  } catch {
    // Fall back to env-based origin when there is no active request context.
  }
  const url = `${siteUrl}/intake/${listing.slug}/client?token=${token}`;

  return { success: true, data: { url, token } };
}

/**
 * Validate an intake token and return pre-fill data for the form.
 * Called from the public intake page when ?token= is present.
 * Does NOT require authentication (anonymous visitors).
 */
export async function getIntakeTokenData(
  token: string,
): Promise<ActionResult<PrefillData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<PrefillData>("intake:getIntakeTokenData", { token });
      return { success: true, data: result };
    } catch (error) {
      console.error("Convex error:", error);
      return { success: false, error: "Invalid or expired link" };
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  // Look up the token
  const { data: tokenRow } = await supabase
    .from("intake_tokens")
    .select("id, client_id, profile_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return { success: false, error: "Invalid or expired link" };
  }

  if (tokenRow.used_at) {
    return { success: false, error: "This intake link has already been used" };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { success: false, error: "This intake link has expired" };
  }

  // Load client data
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", tokenRow.client_id)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Load related records
  const [
    { data: parents },
    { data: insurances },
    { data: locations },
  ] = await Promise.all([
    supabase
      .from("client_parents")
      .select("*")
      .eq("client_id", tokenRow.client_id)
      .order("sort_order")
      .limit(1),
    supabase
      .from("client_insurances")
      .select("*")
      .eq("client_id", tokenRow.client_id)
      .order("sort_order")
      .limit(1),
    supabase
      .from("client_locations")
      .select("*")
      .eq("client_id", tokenRow.client_id)
      .order("sort_order"),
  ]);

  // Build a flat field map matching intake form field keys
  const fields: Record<string, unknown> = {};

  // Map client fields
  for (const [key, def] of Object.entries(INTAKE_FIELD_MAP)) {
    if (def.dbTable === "clients" && client[def.dbColumn] != null) {
      fields[key] = client[def.dbColumn];
    }
  }

  // Map primary parent fields
  const parent = parents?.[0];
  if (parent) {
    for (const [key, def] of Object.entries(INTAKE_FIELD_MAP)) {
      if (def.dbTable === "client_parents" && parent[def.dbColumn] != null) {
        fields[key] = parent[def.dbColumn];
      }
    }
  }

  // Map primary insurance fields
  const insurance = insurances?.[0];
  if (insurance) {
    for (const [key, def] of Object.entries(INTAKE_FIELD_MAP)) {
      if (def.dbTable === "client_insurances" && insurance[def.dbColumn] != null) {
        fields[key] = insurance[def.dbColumn];
      }
    }
  }

  // Map home location (is_primary = true)
  const homeLocation = locations?.find((l) => l.is_primary);
  if (homeLocation) {
    for (const [key, def] of Object.entries(INTAKE_FIELD_MAP)) {
      if (def.dbTable === "client_locations" && homeLocation[def.dbColumn] != null) {
        fields[key] = homeLocation[def.dbColumn];
      }
    }
  }

  // Map first non-primary location as service location
  const serviceLocation = locations?.find((l) => !l.is_primary);
  if (serviceLocation) {
    for (const [key, def] of Object.entries(INTAKE_FIELD_MAP)) {
      if (def.dbTable === "service_locations" && serviceLocation[def.dbColumn] != null) {
        fields[key] = serviceLocation[def.dbColumn];
      }
    }
  }

  const clientName = [client.child_first_name, client.child_last_name]
    .filter(Boolean)
    .join(" ") || "Client";

  return {
    success: true,
    data: { clientName, fields },
  };
}

/**
 * Mark an intake token as used (called after successful form submission).
 */
export async function markIntakeTokenUsed(token: string): Promise<void> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      await mutateConvexUnauthenticated("intake:markIntakeTokenUsed", { token });
      return;
    } catch (error) {
      console.error("Convex error:", error);
      return;
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  await supabase
    .from("intake_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);
}

/**
 * Fetches public-facing agency locations for the intake form.
 * Used by the Service Location section to let parents pick a Center/Clinic.
 */
export async function getPublicAgencyLocations(listingId: string) {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<Array<{
        id: string;
        label: string;
        street: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        latitude: number | null;
        longitude: number | null;
      }>>("intake:getPublicAgencyLocations", { listingId });
      return result;
    } catch (error) {
      console.error("Convex error:", error);
      return [];
    }
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, label, street, city, state, postal_code, latitude, longitude")
    .eq("listing_id", listingId)
    .order("is_primary", { ascending: false });

  if (error) {
    console.error("[INTAKE] Failed to fetch agency locations:", error);
    return [];
  }

  return data || [];
}
