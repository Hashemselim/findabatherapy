"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import { ADDON_PRICE_IDS, CHECKOUT_URLS } from "@/lib/stripe/config";
import { getValidatedOrigin } from "@/lib/utils/domains";
import { getPlanFeatures } from "@/lib/plans/features";
import { getCurrentPlanTier } from "@/lib/plans/guards";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type AddonType = keyof typeof ADDON_PRICE_IDS;

export interface ActiveAddon {
  id: string;
  addonType: AddonType;
  quantity: number;
  status: string;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  grandfatheredUntil: string | null;
  createdAt: string;
}

/** Human-readable labels and unit info for each addon type */
export const ADDON_INFO: Record<
  AddonType,
  { label: string; unitLabel: string; unitsPerPack: number; priceLabel: string }
> = {
  extra_users: {
    label: "Extra Users",
    unitLabel: "user",
    unitsPerPack: 1,
    priceLabel: "$20/user/mo",
  },
  location_pack: {
    label: "Location Pack",
    unitLabel: "location",
    unitsPerPack: 5,
    priceLabel: "$10/mo for 5 locations",
  },
  job_pack: {
    label: "Job Pack",
    unitLabel: "job posting",
    unitsPerPack: 5,
    priceLabel: "$5/mo for 5 jobs",
  },
  storage_pack: {
    label: "Storage Pack",
    unitLabel: "GB",
    unitsPerPack: 10,
    priceLabel: "$5/mo for 10GB",
  },
  homepage_placement: {
    label: "Homepage Placement",
    unitLabel: "placement",
    unitsPerPack: 1,
    priceLabel: "Contact for pricing",
  },
};

/**
 * Fetch active add-ons for a profile
 */
export async function getActiveAddons(
  profileId: string
): Promise<ActionResult<ActiveAddon[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profile_addons")
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching addons:", error);
    return { success: false, error: "Failed to fetch add-ons" };
  }

  const addons: ActiveAddon[] = (data || []).map((row) => ({
    id: row.id,
    addonType: row.addon_type as AddonType,
    quantity: row.quantity,
    status: row.status,
    stripeSubscriptionId: row.stripe_subscription_id,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    currentPeriodEnd: row.current_period_end,
    grandfatheredUntil: row.grandfathered_until,
    createdAt: row.created_at,
  }));

  return { success: true, data: addons };
}

/**
 * Create a Stripe checkout session for an add-on purchase
 */
export async function createAddonCheckout(
  addonType: AddonType,
  quantity: number = 1
): Promise<ActionResult<{ url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Only Pro users can buy add-ons
  const tier = await getCurrentPlanTier();
  if (tier !== "pro") {
    return { success: false, error: "Add-ons require a Pro plan" };
  }

  const priceId = ADDON_PRICE_IDS[addonType];
  if (!priceId) {
    return {
      success: false,
      error: `No price configured for add-on: ${addonType}`,
    };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));

  try {
    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { profile_id: profile.id },
      });
      customerId = customer.id;

      const adminClient = await createAdminClient();
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.id);
    }

    const info = ADDON_INFO[addonType];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      success_url: `${origin}${CHECKOUT_URLS.success}?addon=${addonType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing`,
      metadata: {
        type: "addon",
        addon_type: addonType,
        profile_id: profile.id,
        quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profile.id,
          quantity: String(quantity),
        },
        description: `${info.label} (x${quantity})`,
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Addon checkout error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create checkout session",
    };
  }
}

/**
 * Cancel an add-on subscription at period end
 */
export async function cancelAddon(
  addonId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: addon, error: fetchError } = await supabase
    .from("profile_addons")
    .select("id, profile_id, stripe_subscription_id, status, grandfathered_until")
    .eq("id", addonId)
    .single();

  if (fetchError || !addon) {
    return { success: false, error: "Add-on not found" };
  }

  if (addon.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  if (addon.status !== "active") {
    return { success: false, error: "Add-on is not active" };
  }

  // Grandfathered add-ons have no Stripe subscription — just deactivate locally
  if (!addon.stripe_subscription_id) {
    const adminClient = await createAdminClient();
    await adminClient
      .from("profile_addons")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", addonId);

    revalidatePath("/dashboard/billing");
    return { success: true };
  }

  try {
    await stripe.subscriptions.update(addon.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const adminClient = await createAdminClient();
    await adminClient
      .from("profile_addons")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", addonId);

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("Cancel addon error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel add-on",
    };
  }
}

/**
 * Compute effective limits for a profile: Pro base limits + active add-on quantities
 */
export interface EffectiveLimits {
  maxLocations: number;
  maxJobPostings: number;
  maxUsers: number;
  maxStorageGB: number;
  hasHomepagePlacement: boolean;
}

export async function getEffectiveLimits(
  profileId: string
): Promise<ActionResult<EffectiveLimits>> {
  const tier = await getCurrentPlanTier();
  const base = getPlanFeatures(tier);

  // Start with base limits
  const limits: EffectiveLimits = {
    maxLocations: base.maxLocations,
    maxJobPostings: base.maxJobPostings,
    maxUsers: 1, // Default 1 user
    maxStorageGB: 5, // Default 5GB
    hasHomepagePlacement: base.hasHomepagePlacement,
  };

  // If not pro, no add-ons apply
  if (tier !== "pro") {
    return { success: true, data: limits };
  }

  // Fetch active add-ons
  const result = await getActiveAddons(profileId);
  if (!result.success || !result.data) {
    return { success: true, data: limits };
  }

  for (const addon of result.data) {
    const info = ADDON_INFO[addon.addonType];
    const totalUnits = addon.quantity * info.unitsPerPack;

    switch (addon.addonType) {
      case "location_pack":
        limits.maxLocations += totalUnits;
        break;
      case "job_pack":
        limits.maxJobPostings += totalUnits;
        break;
      case "extra_users":
        limits.maxUsers += totalUnits;
        break;
      case "storage_pack":
        limits.maxStorageGB += totalUnits;
        break;
      case "homepage_placement":
        limits.hasHomepagePlacement = true;
        break;
    }
  }

  return { success: true, data: limits };
}
