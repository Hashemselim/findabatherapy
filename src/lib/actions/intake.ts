"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface IntakeFormSettings {
  background_color: string;
  show_powered_by: boolean;
}

export interface IntakePageData {
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

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Get data for the standalone intake form page
 * Returns listing and profile info needed to render the intake page
 */
export async function getIntakePageData(
  slug: string
): Promise<ActionResult<IntakePageData>> {
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
        website,
        plan_tier,
        subscription_status,
        intake_form_settings
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
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: IntakeFormSettings | null;
  };

  // Check if provider has premium plan with active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isPremium = profile.plan_tier !== "free" && isActiveSubscription;

  if (!isPremium) {
    return { success: false, error: "Intake form not available" };
  }

  // Check if contact form is enabled
  const contactFormAttribute = listing.listing_attribute_values?.find(
    (attr: { attribute_key: string }) => attr.attribute_key === "contact_form_enabled"
  );
  const contactFormEnabled = contactFormAttribute?.value_boolean !== false;

  if (!contactFormEnabled) {
    return { success: false, error: "Contact form not enabled" };
  }

  // Get logo URL directly from listing
  const logoUrl = listing.logo_url ?? null;

  // Default intake form settings
  const defaultSettings: IntakeFormSettings = {
    background_color: "#5788FF",
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
        contactFormEnabled,
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

/**
 * Get data for the client intake form page
 * Returns listing and profile info needed to render the client intake page
 */
export async function getClientIntakePageData(
  slug: string
): Promise<ActionResult<ClientIntakePageData>> {
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
        website,
        plan_tier,
        subscription_status,
        intake_form_settings
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
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: IntakeFormSettings | null;
  };

  // Check if provider has premium plan with active subscription
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const isPremium = profile.plan_tier !== "free" && isActiveSubscription;

  if (!isPremium) {
    return { success: false, error: "Client intake form not available" };
  }

  // Check if client intake is enabled
  if (!listing.client_intake_enabled) {
    return { success: false, error: "Client intake form not enabled" };
  }

  const logoUrl = listing.logo_url ?? null;

  // Default intake form settings
  const defaultSettings: IntakeFormSettings = {
    background_color: "#5788FF",
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
        clientIntakeEnabled: listing.client_intake_enabled ?? false,
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
 * Update intake form settings for the current user's profile
 */
export async function updateIntakeFormSettings(
  settings: Partial<IntakeFormSettings>
): Promise<ActionResult> {
  const { getUser } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();

  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get current settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("intake_form_settings")
    .eq("id", user.id)
    .single();

  const currentSettings = (profile?.intake_form_settings as IntakeFormSettings) || {
    background_color: "#5788FF",
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
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Failed to update settings" };
  }

  return { success: true };
}
