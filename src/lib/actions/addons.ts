"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { stripe } from "@/lib/stripe";
import {
  createClient,
  createAdminClient,
  getCurrentProfileId,
  getUser,
  requireProfileRole,
} from "@/lib/supabase/server";
import { ADDON_PRICE_IDS, CHECKOUT_URLS } from "@/lib/stripe/config";
import { getValidatedOrigin } from "@/lib/utils/domains";
import { type PlanTier, getPlanFeatures } from "@/lib/plans/features";
import { type AddonType, type ActiveAddon, type EffectiveLimits, ADDON_INFO } from "@/lib/plans/addon-config";
import { getWorkspaceSeatSummary } from "@/lib/actions/workspace-users";

// Note: types are NOT re-exported from "use server" files.
// Import AddonType, ActiveAddon, ADDON_INFO from "@/lib/plans/addon-config" instead.

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Resolve plan tier for the current user (avoids circular import with guards.ts) */
async function resolveCurrentPlanTier(profileId?: string | null): Promise<PlanTier> {
  const resolvedProfileId = profileId || (await getCurrentProfileId());
  if (!resolvedProfileId) return "free";

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status, onboarding_completed_at")
    .eq("id", resolvedProfileId)
    .single();

  const planTier = (profile?.plan_tier as PlanTier) || "free";
  if (!profile?.onboarding_completed_at) return planTier;

  const isActive =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  return planTier !== "free" && !isActive ? "free" : planTier;
}

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
 * Create an add-on subscription — charges saved payment method inline,
 * falls back to Stripe Checkout if no payment method on file.
 */
export async function createAddonSubscription(
  addonType: AddonType,
  quantity: number = 1
): Promise<
  ActionResult<{
    directCharge: boolean;
    url?: string;
    subscriptionId?: string;
    addonType?: AddonType;
    quantity?: number;
  }>
> {
  const membership = await requireProfileRole("owner").catch(() => null);
  const user = await getUser();
  if (!membership || !user) {
    return { success: false, error: "Not authenticated" };
  }
  const profileId = membership.profile_id;

  // Only Pro users can buy add-ons
  const tier = await resolveCurrentPlanTier(profileId);
  if (tier !== "pro") {
    return { success: false, error: "Add-ons require a Pro plan" };
  }

  if (addonType === "homepage_placement" && quantity !== 1) {
    return {
      success: false,
      error: "Homepage placement is a single add-on and cannot be purchased in multiple quantities",
    };
  }

  const priceId = ADDON_PRICE_IDS[addonType];
  if (!priceId) {
    return {
      success: false,
      error: `No price configured for add-on: ${addonType}`,
    };
  }

  const supabase = await createClient();

  // Check for existing active addon of this type
  const { data: existing } = await supabase
    .from("profile_addons")
    .select("id, quantity, stripe_subscription_id, cancel_at_period_end")
    .eq("profile_id", profileId)
    .eq("addon_type", addonType)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    if (addonType === "homepage_placement") {
      return {
        success: false,
        error: "ALREADY_EXISTS",
      };
    }

    if (!existing.stripe_subscription_id) {
      return {
        success: false,
        error: "ALREADY_EXISTS",
      };
    }

    try {
      const existingSubscription = await stripe.subscriptions.retrieve(
        existing.stripe_subscription_id
      );
      const subscriptionItem = existingSubscription.items.data[0];

      if (!subscriptionItem) {
        return {
          success: false,
          error: "Could not update add-on quantity",
        };
      }

      const newQuantity = existing.quantity + quantity;

      await stripe.subscriptions.update(existing.stripe_subscription_id, {
        items: [
          {
            id: subscriptionItem.id,
            quantity: newQuantity,
          },
        ],
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profileId,
          quantity: String(newQuantity),
        },
      });

      revalidatePath("/dashboard/billing");
      return {
        success: true,
        data: {
          directCharge: true,
          subscriptionId: existing.stripe_subscription_id,
          addonType,
          quantity: newQuantity,
        },
      };
    } catch (error) {
      console.error("Addon quantity update error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update add-on quantity",
      };
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("id", profileId)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));
  const info = ADDON_INFO[addonType];

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

    // --- Payment method lookup (same pattern as Featured Location) ---
    let paymentMethodId: string | null = null;

    // 1. Check customer's default payment method
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.invoice_settings?.default_payment_method) {
      paymentMethodId = customer.invoice_settings.default_payment_method as string;
    }

    // 2. Check existing Pro subscription's payment method
    if (!paymentMethodId && profile.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        );
        if (existingSubscription.default_payment_method) {
          paymentMethodId = existingSubscription.default_payment_method as string;
        }
      } catch {
        // Subscription might not exist, continue
      }
    }

    // 3. Check customer's payment methods list
    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      if (paymentMethods.data.length > 0) {
        paymentMethodId = paymentMethods.data[0].id;
      }
    }

    // --- Charge inline or fall back to Checkout ---
    if (paymentMethodId) {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity }],
        default_payment_method: paymentMethodId,
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profile.id,
          quantity: String(quantity),
        },
        description: `${info.label} (x${quantity})`,
      });

      // Webhook will create the profile_addons row
      revalidatePath("/dashboard/billing");
      return {
        success: true,
        data: {
          directCharge: true,
          subscriptionId: subscription.id,
          addonType,
          quantity,
        },
      };
    }

    // No payment method — fall back to Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity }],
      success_url: `${origin}${CHECKOUT_URLS.success}?addon=${addonType}&quantity=${quantity}&session_id={CHECKOUT_SESSION_ID}`,
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

    return { success: true, data: { directCharge: false, url: session.url } };
  } catch (error) {
    console.error("Addon subscription error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create add-on subscription",
    };
  }
}

/**
 * Cancel an add-on subscription (at period end).
 * Sets cancel_at_period_end on Stripe and marks the local row.
 */
export async function cancelAddon(
  addonId: string
): Promise<ActionResult> {
  const membership = await requireProfileRole("owner").catch(() => null);
  if (!membership) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify the addon belongs to this user
  const { data: addon, error: fetchError } = await supabase
    .from("profile_addons")
    .select("id, stripe_subscription_id, status, profile_id, addon_type, quantity")
    .eq("id", addonId)
    .eq("profile_id", membership.profile_id)
    .eq("status", "active")
    .single();

  if (fetchError || !addon) {
    return { success: false, error: "Add-on not found or already cancelled" };
  }

  if (!addon.stripe_subscription_id) {
    return { success: false, error: "No subscription linked to this add-on" };
  }

  if (addon.addon_type === "extra_users") {
    const seatSummaryResult = await getWorkspaceSeatSummary(membership.profile_id);
    if (!seatSummaryResult.success || !seatSummaryResult.data) {
      return { success: false, error: "Failed to validate current seat usage" };
    }

    const futureMaxSeats = seatSummaryResult.data.maxSeats - addon.quantity;
    if (seatSummaryResult.data.usedSeats > futureMaxSeats) {
      return {
        success: false,
        error: "This seat add-on cannot be cancelled while the workspace is using those seats",
      };
    }
  }

  try {
    // Cancel at period end so the user keeps the add-on until billing cycle ends
    await stripe.subscriptions.update(addon.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Mark local row
    const adminClient = await createAdminClient();
    await adminClient
      .from("profile_addons")
      .update({ cancel_at_period_end: true })
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
 * Reactivate an add-on subscription that was set to cancel at period end.
 */
export async function reactivateAddon(
  addonId: string
): Promise<ActionResult> {
  const membership = await requireProfileRole("owner").catch(() => null);
  if (!membership) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: addon, error: fetchError } = await supabase
    .from("profile_addons")
    .select("id, stripe_subscription_id, status, profile_id, cancel_at_period_end")
    .eq("id", addonId)
    .eq("profile_id", membership.profile_id)
    .eq("status", "active")
    .single();

  if (fetchError || !addon) {
    return { success: false, error: "Add-on not found or already cancelled" };
  }

  if (!addon.stripe_subscription_id) {
    return { success: false, error: "No subscription linked to this add-on" };
  }

  if (!addon.cancel_at_period_end) {
    return { success: false, error: "Add-on is not set to cancel" };
  }

  try {
    await stripe.subscriptions.update(addon.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    const adminClient = await createAdminClient();
    await adminClient
      .from("profile_addons")
      .update({ cancel_at_period_end: false })
      .eq("id", addonId);

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("Reactivate addon error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reactivate add-on",
    };
  }
}

/**
 * Compute effective limits for a profile: Pro base limits + active add-on quantities
 */
export async function getEffectiveLimits(
  profileId: string
): Promise<ActionResult<EffectiveLimits>> {
  const tier = await resolveCurrentPlanTier(profileId);
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
