"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { getCurrentUser } from "@/lib/platform/auth/server";
import { getCurrentBillingLinkage } from "@/lib/platform/billing/server";
import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";
import { getCurrentWorkspace, requireWorkspaceRole } from "@/lib/platform/workspace/server";
import { stripe } from "@/lib/stripe";
import { getRequestOrigin, getValidatedOrigin } from "@/lib/utils/domains";
import {
  BILLING_PORTAL_CONFIG,
  CHECKOUT_URLS,
  getFeaturedPriceId,
  getPriceId,
  type BillingInterval,
} from "./config";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireBillingContext() {
  const membership = await requireWorkspaceRole("owner");
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  return {
    membership,
    user,
    profileId: membership.workspaceId,
    email: user.email,
  };
}

function revalidateBillingSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/billing");
}

function readBillingInterval(value: string | null | undefined): BillingInterval {
  return value === "annual" || value === "year" ? "year" : "month";
}

export async function getBillingPortalRestriction(
  profileId?: string,
): Promise<ActionResult<{ reason: string | null }>> {
  if (profileId) {
    return { success: true, data: { reason: null } };
  }

  try {
    await requireBillingContext();
    return { success: true, data: { reason: null } };
  } catch {
    return { success: false, error: "Not authenticated" };
  }
}

export async function createCheckoutSession(
  planTier: "pro",
  billingInterval: BillingInterval = "month",
  returnTo?: string,
): Promise<ActionResult<{ url: string }>> {
  let email: string | undefined;
  let profileId: string;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
    email = ctx.email ?? undefined;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const state = await queryConvex<{
    workspaceId: string;
    listingId: string | null;
    planTier: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }>("billing:getCurrentBillingWorkspaceState");

  let customerId = state.stripeCustomerId;
  const existingSubscriptionId = state.stripeSubscriptionId;
  const existingPlanTier = state.planTier;
  const listingId = state.listingId;

  if (existingSubscriptionId && existingPlanTier !== "free") {
    return upgradeSubscription(planTier, billingInterval, returnTo);
  }

  const priceId = getPriceId(planTier, billingInterval);
  if (!priceId) {
    return { success: false, error: "Invalid plan" };
  }

  const headersList = await headers();
  const origin = getRequestOrigin(headersList, "goodaba");

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { profile_id: profileId },
      });
      customerId = customer.id;
      await mutateConvex("billing:setStripeCustomerId", { stripeCustomerId: customerId });
    }

    const successUrl = returnTo
      ? `${origin}${CHECKOUT_URLS.success}?session_id={CHECKOUT_SESSION_ID}&return_to=${returnTo}`
      : `${origin}${CHECKOUT_URLS.success}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnTo
      ? `${origin}${CHECKOUT_URLS.cancel}?return_to=${returnTo}`
      : `${origin}${CHECKOUT_URLS.cancel}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profile_id: profileId,
        listing_id: listingId || "",
        plan_tier: planTier,
        billing_interval: billingInterval,
        return_to: returnTo || "",
      },
      subscription_data: {
        metadata: {
          profile_id: profileId,
          listing_id: listingId || "",
          plan_tier: planTier,
          billing_interval: billingInterval,
        },
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    };
  }
}

export async function upgradeSubscription(
  planTier: "pro",
  billingInterval: BillingInterval = "month",
  returnTo?: string,
): Promise<ActionResult<{ url: string }>> {
  let profileId: string;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const state = await queryConvex<{
    workspaceId: string;
    listingId: string | null;
    planTier: string;
    billingInterval: string;
    stripeSubscriptionId: string | null;
  }>("billing:getCurrentBillingWorkspaceState");

  const subscriptionId = state.stripeSubscriptionId;
  const currentBillingInterval = state.billingInterval;
  const listingId = state.listingId;

  if (!subscriptionId) {
    return { success: false, error: "No active subscription to upgrade" };
  }

  const newPriceId = getPriceId(planTier, billingInterval);
  if (!newPriceId) {
    return { success: false, error: "Invalid plan" };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return { success: false, error: "Subscription is not active" };
    }

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return { success: false, error: "Could not find subscription item" };
    }

    if (subscription.schedule) {
      const scheduleId =
        typeof subscription.schedule === "string"
          ? subscription.schedule
          : subscription.schedule.id;
      await stripe.subscriptionSchedules.release(scheduleId);
    }

    const headersList = await headers();
    const origin = getValidatedOrigin(headersList.get("origin"));

    const currentInterval = readBillingInterval(currentBillingInterval);
    const isSwitchingToAnnual = currentInterval === "month" && billingInterval === "year";
    const isUpgrade = false;

    if (isUpgrade || isSwitchingToAnnual) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: "create_prorations",
        metadata: {
          profile_id: profileId,
          listing_id: listingId || "",
          plan_tier: planTier,
          billing_interval: billingInterval,
        },
      });

      const linkage = await getCurrentBillingLinkage();
      if (linkage?.stripeCustomerId) {
        await mutateConvex("billing:syncCheckoutSubscription", {
          stripeCustomerId: linkage.stripeCustomerId,
          stripeSubscriptionId: subscriptionId,
          planTier,
          billingInterval,
          subscriptionStatus: "active",
        });
      }

      revalidateBillingSurfaces();

      const successUrl = returnTo
        ? `${origin}${CHECKOUT_URLS.success}?upgraded=true&return_to=${returnTo}`
        : `${origin}${CHECKOUT_URLS.success}?upgraded=true`;

      return { success: true, data: { url: successUrl } };
    }

    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscriptionId,
    });

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: subscription.items.data[0].price.id as string, quantity: 1 }],
          start_date: schedule.phases[0].start_date,
          end_date: schedule.phases[0].end_date,
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          metadata: {
            profile_id: profileId,
            listing_id: listingId || "",
            plan_tier: planTier,
            billing_interval: billingInterval,
          },
        },
      ],
    });

    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        profile_id: profileId,
        listing_id: listingId || "",
        pending_plan_tier: planTier,
      },
    });

    const successUrl = returnTo
      ? `${origin}${CHECKOUT_URLS.success}?downgraded=true&return_to=${returnTo}`
      : `${origin}${CHECKOUT_URLS.success}?downgraded=true`;

    return { success: true, data: { url: successUrl } };
  } catch (error) {
    console.error("Stripe plan change error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to change subscription",
    };
  }
}

export async function createBillingPortalSession(): Promise<ActionResult<{ url: string }>> {
  let profileId: string;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const restrictionResult = await getBillingPortalRestriction(profileId);
  if (!restrictionResult.success) {
    return { success: false, error: restrictionResult.error };
  }
  if (restrictionResult.data?.reason) {
    return { success: false, error: restrictionResult.data.reason };
  }

  const linkage = await getCurrentBillingLinkage();
  const stripeCustomerId = linkage?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    return { success: false, error: "No billing account found" };
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}${BILLING_PORTAL_CONFIG.returnUrl}`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Stripe portal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create portal session",
    };
  }
}

export async function getSubscription(): Promise<
  ActionResult<{
    status: string;
    planTier: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null>
> {
  const state = await queryConvex<{
    planTier: string;
    stripeSubscriptionId: string | null;
  }>("billing:getCurrentBillingWorkspaceState").catch(() => null);

  if (!state) {
    return { success: false, error: "Not authenticated" };
  }

  if (state.planTier === "free" || !state.stripeSubscriptionId) {
    return {
      success: true,
      data: {
        status: "none",
        planTier: state.planTier,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(state.stripeSubscriptionId);
    const item = subscription.items.data[0];

    return {
      success: true,
      data: {
        status: subscription.status,
        planTier: state.planTier,
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      success: true,
      data: {
        status: "error",
        planTier: state.planTier,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }
}

export async function getPendingDowngrade(): Promise<
  ActionResult<{
    pendingPlanTier: string;
    pendingBillingInterval?: string;
    effectiveDate: string;
    scheduleId: string;
  } | null>
> {
  const state = await queryConvex<{
    stripeSubscriptionId: string | null;
  }>("billing:getCurrentBillingWorkspaceState").catch(() => null);
  const stripeSubId = state?.stripeSubscriptionId ?? null;

  if (!stripeSubId) {
    return { success: true, data: null };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubId);
    const schedules = await stripe.subscriptionSchedules.list({
      customer: subscription.customer as string,
      limit: 10,
    });

    const activeSchedule = schedules.data.find(
      (schedule) =>
        schedule.status === "active" &&
        schedule.subscription === stripeSubId &&
        schedule.phases.length > 1,
    );
    if (!activeSchedule) {
      return { success: true, data: null };
    }

    const nextPhase = activeSchedule.phases[1];
    if (!nextPhase?.metadata?.plan_tier) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        pendingPlanTier: nextPhase.metadata.plan_tier,
        pendingBillingInterval: nextPhase.metadata.billing_interval,
        effectiveDate: new Date(activeSchedule.phases[0].end_date * 1000).toISOString(),
        scheduleId: activeSchedule.id,
      },
    };
  } catch (error) {
    console.error("Error fetching pending downgrade:", error);
    return { success: true, data: null };
  }
}

export async function cancelPendingDowngrade(): Promise<ActionResult> {
  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const state = await queryConvex<{ stripeSubscriptionId: string | null }>(
    "billing:getCurrentBillingWorkspaceState",
  ).catch(() => null);
  const stripeSubId = state?.stripeSubscriptionId ?? null;

  if (!stripeSubId) {
    return { success: false, error: "No subscription found" };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubId);
    const schedules = await stripe.subscriptionSchedules.list({
      customer: subscription.customer as string,
      limit: 10,
    });

    const activeSchedule = schedules.data.find(
      (schedule) => schedule.status === "active" && schedule.subscription === stripeSubId,
    );
    if (!activeSchedule) {
      return { success: false, error: "No pending downgrade found" };
    }

    await stripe.subscriptionSchedules.release(activeSchedule.id);
    await stripe.subscriptions.update(stripeSubId, {
      metadata: { pending_plan_tier: "" },
    });

    revalidateBillingSurfaces();
    return { success: true };
  } catch (error) {
    console.error("Error canceling pending downgrade:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel downgrade",
    };
  }
}

export async function redirectToCheckout(planTier: "pro") {
  const result = await createCheckoutSession(planTier);
  if (result.success && result.data?.url) {
    redirect(result.data.url);
  }
  return result;
}

export async function redirectToBillingPortal(): Promise<void> {
  const result = await createBillingPortalSession();
  if (result.success && result.data?.url) {
    redirect(result.data.url);
  }
  throw new Error(result.success ? "Failed to get portal URL" : result.error);
}

export async function verifyAndSyncCheckoutSession(
  sessionId: string,
): Promise<ActionResult<{ planTier: string; subscriptionStatus: string }>> {
  const workspace = await getCurrentWorkspace();
  const profileId = workspace?.workspace.id ?? null;

  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.metadata?.profile_id !== profileId) {
      return { success: false, error: "Session does not belong to this user" };
    }
    if (session.payment_status !== "paid") {
      return { success: false, error: "Payment not completed" };
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) {
      return { success: false, error: "No subscription found" };
    }

    await mutateConvex("billing:syncCheckoutSubscription", {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      planTier: session.metadata?.plan_tier || "pro",
      billingInterval: session.metadata?.billing_interval || "month",
      subscriptionStatus: "active",
    });

    return {
      success: true,
      data: {
        planTier: session.metadata?.plan_tier || "pro",
        subscriptionStatus: "active",
      },
    };
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify checkout session",
    };
  }
}

type DashboardLocation = {
  id: string;
  label: string | null;
  city: string;
  state: string;
};

export async function createFeaturedLocationCheckout(
  locationId: string,
  billingInterval: BillingInterval = "month",
  returnTo: "locations" | "billing" = "locations",
): Promise<ActionResult<{ url?: string; subscriptionId?: string; status?: string; directCharge?: boolean }>> {
  let profileId: string;
  let email: string | undefined;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
    email = ctx.email ?? undefined;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const [state, featured, locations] = await Promise.all([
    queryConvex<{
      workspaceId: string;
      listingId: string | null;
      planTier: string;
      subscriptionStatus: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState"),
    queryConvex<{ locations: Array<{ locationId: string }> }>("billing:getFeaturedLocations"),
    queryConvex<DashboardLocation[]>("locations:getDashboardLocations"),
  ]);

  const hasActiveProSubscription =
    state.planTier === "pro" &&
    (state.subscriptionStatus === "active" || state.subscriptionStatus === "trialing") &&
    Boolean(state.stripeSubscriptionId);
  if (!hasActiveProSubscription) {
    return { success: false, error: "Featured placement requires an active Pro subscription" };
  }

  const location = locations.find((entry) => entry.id === locationId);
  if (!location) {
    return { success: false, error: "Location not found" };
  }
  if (featured.locations.some((entry) => entry.locationId === locationId)) {
    return { success: false, error: "Location is already featured" };
  }

  let customerId = state.stripeCustomerId;
  const mainSubId = state.stripeSubscriptionId;
  const listingIdForMetadata = state.listingId || "";
  const locationLabel = location.label || `${location.city}, ${location.state}`;
  const priceId = getFeaturedPriceId(billingInterval);

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
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
    if (!paymentMethodId && mainSubId) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(mainSubId);
        if (existingSubscription.default_payment_method) {
          paymentMethodId = existingSubscription.default_payment_method as string;
        }
      } catch {
        // Ignore missing main subscription; checkout fallback still works.
      }
    }
    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      paymentMethodId = paymentMethods.data[0]?.id ?? null;
    }

    if (paymentMethodId) {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        metadata: {
          type: "featured_location",
          profile_id: profileId,
          location_id: locationId,
          listing_id: listingIdForMetadata,
          billing_interval: billingInterval,
        },
        description: `Featured Location: ${locationLabel}`,
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          directCharge: true,
        },
      };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${CHECKOUT_URLS.success}?featured_location=true&location_id=${locationId}&location_name=${encodeURIComponent(locationLabel)}&billing_interval=${billingInterval}&return_to=${returnTo}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${CHECKOUT_URLS.cancel}?featured_location=true&location_id=${locationId}&location_name=${encodeURIComponent(locationLabel)}&return_to=${returnTo}`,
      metadata: {
        type: "featured_location",
        profile_id: profileId,
        location_id: locationId,
        listing_id: listingIdForMetadata,
        billing_interval: billingInterval,
      },
      subscription_data: {
        metadata: {
          type: "featured_location",
          profile_id: profileId,
          location_id: locationId,
          listing_id: listingIdForMetadata,
          billing_interval: billingInterval,
        },
        description: `Featured Location: ${locationLabel}`,
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { url: session.url, directCharge: false } };
  } catch (error) {
    console.error("Featured location checkout error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    };
  }
}

async function findFeaturedSubscriptionId(locationId: string, shouldBeCanceling?: boolean) {
  const linkage = await getCurrentBillingLinkage();
  if (!linkage?.stripeCustomerId) {
    return { error: "No billing account found", stripeSubId: null as string | null };
  }

  const subs = await stripe.subscriptions.list({
    customer: linkage.stripeCustomerId,
    limit: 100,
  });

  const matching = subs.data.find((subscription) => {
    const isFeatured =
      subscription.metadata?.type === "featured_location" &&
      subscription.metadata?.location_id === locationId;
    if (!isFeatured) {
      return false;
    }
    if (shouldBeCanceling === undefined) {
      return subscription.status === "active";
    }
    return subscription.cancel_at_period_end === shouldBeCanceling;
  });

  if (!matching) {
    return {
      error:
        shouldBeCanceling === true
          ? "No featured subscription found set to cancel"
          : "No featured subscription found for this location",
      stripeSubId: null as string | null,
    };
  }

  return { error: null, stripeSubId: matching.id };
}

export async function cancelFeaturedLocation(locationId: string): Promise<ActionResult> {
  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const { error, stripeSubId } = await findFeaturedSubscriptionId(locationId);
  if (error || !stripeSubId) {
    return { success: false, error: error || "No subscription found" };
  }

  try {
    await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
    revalidateBillingSurfaces();
    return { success: true };
  } catch (err) {
    console.error("Cancel featured location error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel subscription",
    };
  }
}

export async function reactivateFeaturedLocation(locationId: string): Promise<ActionResult> {
  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  const { error, stripeSubId } = await findFeaturedSubscriptionId(locationId, true);
  if (error || !stripeSubId) {
    return { success: false, error: error || "No subscription found" };
  }

  try {
    await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
    revalidateBillingSurfaces();
    return { success: true };
  } catch (err) {
    console.error("Reactivate featured location error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reactivate subscription",
    };
  }
}

export interface StripePriceInfo {
  priceId: string;
  unitAmount: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
}

export async function getStripePriceInfo(priceId: string): Promise<ActionResult<StripePriceInfo>> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) {
      return { success: false, error: "Price is not active" };
    }
    if (price.type !== "recurring" || !price.recurring) {
      return { success: false, error: "Price is not a recurring subscription price" };
    }

    return {
      success: true,
      data: {
        priceId: price.id,
        unitAmount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring.interval as "month" | "year",
        intervalCount: price.recurring.interval_count,
      },
    };
  } catch (error) {
    console.error("Error fetching Stripe price:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch price",
    };
  }
}

export async function getFeaturedAddonPrices(): Promise<
  ActionResult<{
    monthly: { price: number; priceId: string };
    annual: { price: number; totalPrice: number; priceId: string; savings: number; savingsPercent: number };
  }>
> {
  const monthlyPriceId = process.env.STRIPE_FEATURED_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_FEATURED_ANNUAL_PRICE_ID;

  if (!monthlyPriceId || !annualPriceId) {
    return { success: false, error: "Featured price IDs not configured" };
  }

  try {
    const [monthlyResult, annualResult] = await Promise.all([
      getStripePriceInfo(monthlyPriceId),
      getStripePriceInfo(annualPriceId),
    ]);

    if (!monthlyResult.success || !monthlyResult.data) {
      return {
        success: false,
        error: !monthlyResult.success ? monthlyResult.error : "Failed to fetch monthly price",
      };
    }
    if (!annualResult.success || !annualResult.data) {
      return {
        success: false,
        error: !annualResult.success ? annualResult.error : "Failed to fetch annual price",
      };
    }

    const monthlyPrice = monthlyResult.data.unitAmount / 100;
    const annualTotal = annualResult.data.unitAmount / 100;
    const annualMonthlyEquivalent = Math.round((annualTotal / 12) * 100) / 100;
    const annualSavings = Math.round((monthlyPrice * 12 - annualTotal) * 100) / 100;
    const annualSavingsPercent = Math.round((annualSavings / (monthlyPrice * 12)) * 100);

    return {
      success: true,
      data: {
        monthly: { price: monthlyPrice, priceId: monthlyPriceId },
        annual: {
          price: annualMonthlyEquivalent,
          totalPrice: annualTotal,
          priceId: annualPriceId,
          savings: annualSavings,
          savingsPercent: annualSavingsPercent,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching featured addon prices:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch prices",
    };
  }
}

export async function getFeaturedLocations(): Promise<
  ActionResult<{
    locations: Array<{
      id: string;
      locationId: string;
      locationLabel: string;
      city: string;
      state: string;
      status: string;
      billingInterval: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    }>;
  }>
> {
  try {
    const result = await queryConvex<{
      locations: Array<{
        id: string;
        locationId: string;
        locationLabel: string;
        city: string;
        state: string;
        status: string;
        billingInterval: string;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
      }>;
    }>("billing:getFeaturedLocations");
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex getFeaturedLocations error:", error);
    return { success: true, data: { locations: [] } };
  }
}
