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
import { isConvexDataEnabled } from "@/lib/platform/config";
import { queryConvex, mutateConvex } from "@/lib/platform/convex/server";
import { getCurrentBillingLinkage } from "@/lib/platform/billing/server";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { requireWorkspaceRole } from "@/lib/platform/workspace/server";
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
  if (isConvexDataEnabled()) {
    try {
      const result = await queryConvex<{ planTier: "free" | "pro" }>("billing:getCurrentPlanTierQuery");
      return result.planTier;
    } catch {
      return "free";
    }
  }

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
  if (isConvexDataEnabled()) {
    try {
      const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
      return { success: true, data: addons };
    } catch (error) {
      console.error("Convex getActiveAddons error:", error);
      return { success: false, error: "Failed to fetch add-ons" };
    }
  }

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
  // Auth and plan tier check
  let profileId: string;
  let userEmail: string | undefined;
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  if (isConvexDataEnabled()) {
    const membership = await requireWorkspaceRole("owner");
    profileId = membership.workspaceId;
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };
    userEmail = user.email ?? undefined;

    const linkage = await getCurrentBillingLinkage();
    stripeCustomerId = linkage?.stripeCustomerId ?? null;
    stripeSubscriptionId = linkage?.stripeSubscriptionId ?? null;
  } else {
    const membership = await requireProfileRole("owner").catch(() => null);
    const user = await getUser();
    if (!membership || !user) {
      return { success: false, error: "Not authenticated" };
    }
    profileId = membership.profile_id;
    userEmail = user.email;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, stripe_subscription_id")
      .eq("id", profileId)
      .single();

    if (!profile) return { success: false, error: "Profile not found" };
    stripeCustomerId = profile.stripe_customer_id;
    stripeSubscriptionId = profile.stripe_subscription_id;
  }

  // Only Pro users can buy add-ons
  const tier = await resolveCurrentPlanTier(isConvexDataEnabled() ? undefined : profileId);
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

  // Check for existing active addon of this type
  if (isConvexDataEnabled()) {
    const activeAddons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
    const existing = activeAddons.find((a) => a.addonType === addonType);

    if (existing) {
      if (addonType === "homepage_placement") {
        return { success: false, error: "ALREADY_EXISTS" };
      }

      if (!existing.stripeSubscriptionId) {
        return { success: false, error: "ALREADY_EXISTS" };
      }

      try {
        const existingSubscription = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
        const subscriptionItem = existingSubscription.items.data[0];
        if (!subscriptionItem) {
          return { success: false, error: "Could not update add-on quantity" };
        }

        const newQuantity = existing.quantity + quantity;
        await stripe.subscriptions.update(existing.stripeSubscriptionId, {
          items: [{ id: subscriptionItem.id, quantity: newQuantity }],
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
            subscriptionId: existing.stripeSubscriptionId,
            addonType,
            quantity: newQuantity,
          },
        };
      } catch (error) {
        console.error("Addon quantity update error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update add-on quantity",
        };
      }
    }
  } else {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("profile_addons")
      .select("id, quantity, stripe_subscription_id, cancel_at_period_end")
      .eq("profile_id", profileId)
      .eq("addon_type", addonType)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      if (addonType === "homepage_placement") {
        return { success: false, error: "ALREADY_EXISTS" };
      }

      if (!existing.stripe_subscription_id) {
        return { success: false, error: "ALREADY_EXISTS" };
      }

      try {
        const existingSubscription = await stripe.subscriptions.retrieve(existing.stripe_subscription_id);
        const subscriptionItem = existingSubscription.items.data[0];
        if (!subscriptionItem) {
          return { success: false, error: "Could not update add-on quantity" };
        }

        const newQuantity = existing.quantity + quantity;
        await stripe.subscriptions.update(existing.stripe_subscription_id, {
          items: [{ id: subscriptionItem.id, quantity: newQuantity }],
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
          error: error instanceof Error ? error.message : "Failed to update add-on quantity",
        };
      }
    }
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));
  const info = ADDON_INFO[addonType];

  try {
    // Create or retrieve Stripe customer
    let customerId = stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { profile_id: profileId },
      });
      customerId = customer.id;

      if (isConvexDataEnabled()) {
        await mutateConvex("billing:setStripeCustomerId", { stripeCustomerId: customerId });
      } else {
        const adminClient = await createAdminClient();
        await adminClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", profileId);
      }
    }

    // --- Payment method lookup ---
    let paymentMethodId: string | null = null;

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.invoice_settings?.default_payment_method) {
      paymentMethodId = customer.invoice_settings.default_payment_method as string;
    }

    if (!paymentMethodId && stripeSubscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (existingSub.default_payment_method) {
          paymentMethodId = existingSub.default_payment_method as string;
        }
      } catch {
        // Subscription might not exist, continue
      }
    }

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
          profile_id: profileId,
          quantity: String(quantity),
        },
        description: `${info.label} (x${quantity})`,
      });

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
        profile_id: profileId,
        quantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          type: "addon",
          addon_type: addonType,
          profile_id: profileId,
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
 */
export async function cancelAddon(
  addonId: string
): Promise<ActionResult> {
  let profileId: string;

  if (isConvexDataEnabled()) {
    const membership = await requireWorkspaceRole("owner");
    profileId = membership.workspaceId;
  } else {
    const membership = await requireProfileRole("owner").catch(() => null);
    if (!membership) return { success: false, error: "Not authenticated" };
    profileId = membership.profile_id;
  }

  // Fetch addon details
  let addon: { id: string; stripeSubscriptionId: string | null; addonType: string; quantity: number } | null = null;

  if (isConvexDataEnabled()) {
    const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
    const found = addons.find((a) => a.id === addonId);
    if (found) {
      addon = {
        id: found.id,
        stripeSubscriptionId: found.stripeSubscriptionId ?? null,
        addonType: found.addonType,
        quantity: found.quantity,
      };
    }
  } else {
    const supabase = await createClient();
    const { data, error: fetchError } = await supabase
      .from("profile_addons")
      .select("id, stripe_subscription_id, status, profile_id, addon_type, quantity")
      .eq("id", addonId)
      .eq("profile_id", profileId)
      .eq("status", "active")
      .single();

    if (fetchError || !data) {
      return { success: false, error: "Add-on not found or already cancelled" };
    }
    addon = {
      id: data.id,
      stripeSubscriptionId: data.stripe_subscription_id,
      addonType: data.addon_type,
      quantity: data.quantity,
    };
  }

  if (!addon) {
    return { success: false, error: "Add-on not found or already cancelled" };
  }

  if (!addon.stripeSubscriptionId) {
    return { success: false, error: "No subscription linked to this add-on" };
  }

  if (addon.addonType === "extra_users") {
    const seatSummaryResult = await getWorkspaceSeatSummary(profileId);
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
    await stripe.subscriptions.update(addon.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    if (!isConvexDataEnabled()) {
      const adminClient = await createAdminClient();
      await adminClient
        .from("profile_addons")
        .update({ cancel_at_period_end: true })
        .eq("id", addonId);
    }

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("Cancel addon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel add-on",
    };
  }
}

/**
 * Reactivate an add-on subscription that was set to cancel at period end.
 */
export async function reactivateAddon(
  addonId: string
): Promise<ActionResult> {
  let profileId: string;

  if (isConvexDataEnabled()) {
    const membership = await requireWorkspaceRole("owner");
    profileId = membership.workspaceId;
  } else {
    const membership = await requireProfileRole("owner").catch(() => null);
    if (!membership) return { success: false, error: "Not authenticated" };
    profileId = membership.profile_id;
  }

  // Fetch addon
  let addon: { id: string; stripeSubscriptionId: string | null; cancelAtPeriodEnd: boolean } | null = null;

  if (isConvexDataEnabled()) {
    const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
    const found = addons.find((a) => a.id === addonId);
    if (found) {
      addon = {
        id: found.id,
        stripeSubscriptionId: found.stripeSubscriptionId ?? null,
        cancelAtPeriodEnd: found.cancelAtPeriodEnd,
      };
    }
  } else {
    const supabase = await createClient();
    const { data, error: fetchError } = await supabase
      .from("profile_addons")
      .select("id, stripe_subscription_id, status, profile_id, cancel_at_period_end")
      .eq("id", addonId)
      .eq("profile_id", profileId)
      .eq("status", "active")
      .single();

    if (fetchError || !data) {
      return { success: false, error: "Add-on not found or already cancelled" };
    }
    addon = {
      id: data.id,
      stripeSubscriptionId: data.stripe_subscription_id,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    };
  }

  if (!addon) {
    return { success: false, error: "Add-on not found or already cancelled" };
  }

  if (!addon.stripeSubscriptionId) {
    return { success: false, error: "No subscription linked to this add-on" };
  }

  if (!addon.cancelAtPeriodEnd) {
    return { success: false, error: "Add-on is not set to cancel" };
  }

  try {
    await stripe.subscriptions.update(addon.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    if (!isConvexDataEnabled()) {
      const adminClient = await createAdminClient();
      await adminClient
        .from("profile_addons")
        .update({ cancel_at_period_end: false })
        .eq("id", addonId);
    }

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("Reactivate addon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reactivate add-on",
    };
  }
}

/**
 * Compute effective limits for a profile: Pro base limits + active add-on quantities
 */
export async function getEffectiveLimits(
  profileId: string
): Promise<ActionResult<EffectiveLimits>> {
  if (isConvexDataEnabled()) {
    try {
      const limits = await queryConvex<EffectiveLimits>("billing:getEffectiveLimits");
      return { success: true, data: limits };
    } catch (error) {
      console.error("Convex getEffectiveLimits error:", error);
      const base = getPlanFeatures("free");
      return {
        success: true,
        data: {
          maxLocations: base.maxLocations,
          maxJobPostings: base.maxJobPostings,
          maxUsers: 1,
          maxStorageGB: 5,
          hasHomepagePlacement: base.hasHomepagePlacement,
        },
      };
    }
  }

  const tier = await resolveCurrentPlanTier(profileId);
  const base = getPlanFeatures(tier);

  const limits: EffectiveLimits = {
    maxLocations: base.maxLocations,
    maxJobPostings: base.maxJobPostings,
    maxUsers: 1,
    maxStorageGB: 5,
    hasHomepagePlacement: base.hasHomepagePlacement,
  };

  if (tier !== "pro") {
    return { success: true, data: limits };
  }

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
