"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getWorkspaceSeatSummary } from "@/lib/actions/workspace-users";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getCurrentBillingLinkage } from "@/lib/platform/billing/server";
import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";
import { requireWorkspaceRole } from "@/lib/platform/workspace/server";
import { type ActiveAddon, ADDON_INFO, type AddonType, type EffectiveLimits } from "@/lib/plans/addon-config";
import { type PlanTier, getPlanFeatures } from "@/lib/plans/features";
import { stripe } from "@/lib/stripe";
import { ADDON_PRICE_IDS, CHECKOUT_URLS } from "@/lib/stripe/config";
import { getValidatedOrigin } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function toStripePeriodEndIso(subscription: unknown): string | undefined {
  const value = Reflect.get(subscription as object, "current_period_end");
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : undefined;
}

async function resolveCurrentPlanTier(): Promise<PlanTier> {
  try {
    const result = await queryConvex<{ planTier: "free" | "pro" }>("billing:getCurrentPlanTierQuery");
    return result.planTier;
  } catch {
    return "free";
  }
}

/**
 * Fetch active add-ons for the current workspace.
 */
export async function getActiveAddons(
  profileId: string
): Promise<ActionResult<ActiveAddon[]>> {
  void profileId;
  try {
    const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
    return { success: true, data: addons };
  } catch (error) {
    console.error("[ADDONS] getActiveAddons error:", error);
    return { success: false, error: "Failed to fetch add-ons" };
  }
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
  const membership = await requireWorkspaceRole("owner");
  const profileId = membership.workspaceId;
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const tier = await resolveCurrentPlanTier();
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
    return { success: false, error: `No price configured for add-on: ${addonType}` };
  }

  const activeAddons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
  const existing = activeAddons.find((addon) => addon.addonType === addonType);
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
      const updatedSubscription = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
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

      await mutateConvex("billing:webhookAddonUpdated", {
        stripeSubscriptionId: existing.stripeSubscriptionId,
        status: updatedSubscription.status,
        quantity: newQuantity,
        currentPeriodEnd: toStripePeriodEndIso(updatedSubscription),
        cancelAtPeriodEnd: Boolean(updatedSubscription.cancel_at_period_end),
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
      console.error("[ADDONS] update existing add-on quantity error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update add-on quantity",
      };
    }
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));
  const info = ADDON_INFO[addonType];
  const linkage = await getCurrentBillingLinkage();
  let customerId = linkage?.stripeCustomerId ?? null;
  const stripeSubscriptionId = linkage?.stripeSubscriptionId ?? null;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { profile_id: profileId },
      });
      customerId = customer.id;
      await mutateConvex("billing:setStripeCustomerId", { stripeCustomerId: customerId });
    }

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
        const existingSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (existingSubscription.default_payment_method) {
          paymentMethodId = existingSubscription.default_payment_method as string;
        }
      } catch {
        // Ignore missing base subscription and continue with other payment method lookup paths.
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

      await mutateConvex("billing:webhookAddonCreated", {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        addonType,
        quantity,
        currentPeriodEnd: toStripePeriodEndIso(subscription),
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
    console.error("[ADDONS] createAddonSubscription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create add-on subscription",
    };
  }
}

/**
 * Cancel an add-on subscription (at period end).
 */
export async function cancelAddon(
  addonId: string
): Promise<ActionResult> {
  const membership = await requireWorkspaceRole("owner");
  const profileId = membership.workspaceId;

  const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
  const addon = addons.find((candidate) => candidate.id === addonId);
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
    const updatedSubscription = await stripe.subscriptions.update(addon.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await mutateConvex("billing:webhookAddonUpdated", {
      stripeSubscriptionId: addon.stripeSubscriptionId,
      status: updatedSubscription.status,
      quantity: updatedSubscription.items.data[0]?.quantity ?? addon.quantity,
      currentPeriodEnd: toStripePeriodEndIso(updatedSubscription),
      cancelAtPeriodEnd: Boolean(updatedSubscription.cancel_at_period_end),
    });

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("[ADDONS] cancelAddon error:", error);
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
  await requireWorkspaceRole("owner");

  const addons = await queryConvex<ActiveAddon[]>("billing:getActiveAddons");
  const addon = addons.find((candidate) => candidate.id === addonId);
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
    const updatedSubscription = await stripe.subscriptions.update(addon.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await mutateConvex("billing:webhookAddonUpdated", {
      stripeSubscriptionId: addon.stripeSubscriptionId,
      status: updatedSubscription.status,
      quantity: updatedSubscription.items.data[0]?.quantity ?? addon.quantity,
      currentPeriodEnd: toStripePeriodEndIso(updatedSubscription),
      cancelAtPeriodEnd: Boolean(updatedSubscription.cancel_at_period_end),
    });

    revalidatePath("/dashboard/billing");
    return { success: true };
  } catch (error) {
    console.error("[ADDONS] reactivateAddon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reactivate add-on",
    };
  }
}

/**
 * Compute effective limits for the current workspace: Pro base limits + active add-on quantities.
 */
export async function getEffectiveLimits(
  profileId: string
): Promise<ActionResult<EffectiveLimits>> {
  void profileId;
  try {
    const limits = await queryConvex<EffectiveLimits>("billing:getEffectiveLimits");
    return { success: true, data: limits };
  } catch (error) {
    console.error("[ADDONS] getEffectiveLimits error:", error);
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
