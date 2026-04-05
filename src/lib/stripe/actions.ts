"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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
import { requireWorkspaceRole, getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { CHECKOUT_URLS, BILLING_PORTAL_CONFIG, getPriceId, getFeaturedPriceId, type BillingInterval } from "./config";
import { getRequestOrigin, getValidatedOrigin } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireBillingContext() {
  if (isConvexDataEnabled()) {
    const membership = await requireWorkspaceRole("owner");
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");
    return {
      membership,
      user,
      profileId: membership.workspaceId,
      email: user.email,
    };
  }

  const membership = await requireProfileRole("owner");
  const user = await getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return {
    membership,
    user,
    profileId: membership.profile_id,
    email: user.email,
  };
}

export async function getBillingPortalRestriction(
  profileId?: string
): Promise<ActionResult<{ reason: string | null }>> {
  const resolvedProfileId = profileId || (await getCurrentProfileId());
  if (!resolvedProfileId) {
    return { success: false, error: "Not authenticated" };
  }

  return { success: true, data: { reason: null } };
}

/**
 * Create a Stripe checkout session for a NEW subscription (no existing subscription)
 * @param planTier - The plan tier to subscribe to
 * @param billingInterval - Monthly or annual billing
 * @param returnTo - Optional return destination after successful payment (e.g., "onboarding")
 */
export async function createCheckoutSession(
  planTier: "pro",
  billingInterval: BillingInterval = "month",
  returnTo?: string
): Promise<ActionResult<{ url: string }>> {
  let email: string | undefined;
  let profileId: string;
  let customerId: string | null = null;
  let existingSubscriptionId: string | null = null;
  let existingPlanTier: string | null = null;
  let listingId: string | null = null;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
    email = ctx.email ?? undefined;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{
      workspaceId: string;
      listingId: string | null;
      planTier: string;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState");

    customerId = state.stripeCustomerId;
    existingSubscriptionId = state.stripeSubscriptionId;
    existingPlanTier = state.planTier;
    listingId = state.listingId;
  } else {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, stripe_subscription_id, plan_tier")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    customerId = profile.stripe_customer_id;
    existingSubscriptionId = profile.stripe_subscription_id;
    existingPlanTier = profile.plan_tier;

    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("profile_id", profileId)
      .single();
    listingId = listing?.id ?? null;
  }

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

    // Build success/cancel URLs with optional return_to parameter
    const successUrl = returnTo
      ? `${origin}${CHECKOUT_URLS.success}?session_id={CHECKOUT_SESSION_ID}&return_to=${returnTo}`
      : `${origin}${CHECKOUT_URLS.success}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnTo
      ? `${origin}${CHECKOUT_URLS.cancel}?return_to=${returnTo}`
      : `${origin}${CHECKOUT_URLS.cancel}`;

    // Create checkout session for NEW subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
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

/**
 * Upgrade an existing subscription or change billing interval
 * - Interval changes: Immediate with proration
 */
export async function upgradeSubscription(
  planTier: "pro",
  billingInterval: BillingInterval = "month",
  returnTo?: string
): Promise<ActionResult<{ url: string }>> {
  let profileId: string;
  let subscriptionId: string | null = null;
  let currentBillingInterval: string | null = null;
  let listingId: string | null = null;

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{
      workspaceId: string;
      listingId: string | null;
      planTier: string;
      billingInterval: string;
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState");

    subscriptionId = state.stripeSubscriptionId;
    currentBillingInterval = state.billingInterval;
    listingId = state.listingId;
  } else {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, stripe_subscription_id, plan_tier, billing_interval")
      .eq("id", profileId)
      .single();

    if (!profile) return { success: false, error: "Profile not found" };

    subscriptionId = profile.stripe_subscription_id;
    currentBillingInterval = profile.billing_interval;

    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("profile_id", profileId)
      .single();
    listingId = listing?.id ?? null;
  }

  if (!subscriptionId) {
    return { success: false, error: "No active subscription to upgrade" };
  }

  const newPriceId = getPriceId(planTier, billingInterval);
  if (!newPriceId) {
    return { success: false, error: "Invalid plan" };
  }

  const isUpgrade = false;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return { success: false, error: "Subscription is not active" };
    }

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return { success: false, error: "Could not find subscription item" };
    }

    // If there's an existing subscription schedule (from a pending downgrade), cancel it first
    if (subscription.schedule) {
      const scheduleId = typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule.id;
      await stripe.subscriptionSchedules.release(scheduleId);
    }

    const headersList = await headers();
    const origin = getValidatedOrigin(headersList.get("origin"));

    const rawInterval = currentBillingInterval || "month";
    const currentInterval = rawInterval === "annual" || rawInterval === "year" ? "year" : "month";
    const isSwitchingToAnnual = currentInterval === "month" && billingInterval === "year";

    if (isUpgrade || isSwitchingToAnnual) {
      await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          profile_id: profileId,
          listing_id: listingId || "",
          plan_tier: planTier,
          billing_interval: billingInterval,
        },
      });

      if (isConvexDataEnabled()) {
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
      } else {
        const adminClient = await createAdminClient();
        await adminClient
          .from("profiles")
          .update({ plan_tier: planTier, billing_interval: billingInterval })
          .eq("id", profileId);
      }

      // Revalidate dashboard pages so the UI reflects the change immediately
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/company");
      revalidatePath("/dashboard/locations");

      const successUrl = returnTo
        ? `${origin}${CHECKOUT_URLS.success}?upgraded=true&return_to=${returnTo}`
        : `${origin}${CHECKOUT_URLS.success}?upgraded=true`;

      return { success: true, data: { url: successUrl } };
    } else {
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

      // Don't update profile plan_tier yet - user keeps current plan until period ends
      // The webhook for subscription.updated will handle this when the schedule executes

      const successUrl = returnTo
        ? `${origin}${CHECKOUT_URLS.success}?downgraded=true&return_to=${returnTo}`
        : `${origin}${CHECKOUT_URLS.success}?downgraded=true`;

      return { success: true, data: { url: successUrl } };
    }
  } catch (error) {
    console.error("Stripe plan change error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to change subscription",
    };
  }
}

/**
 * Create a Stripe billing portal session for managing subscription
 */
export async function createBillingPortalSession(): Promise<ActionResult<{ url: string }>> {
  let profileId: string;
  let stripeCustomerId: string | null = null;

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

  if (isConvexDataEnabled()) {
    const linkage = await getCurrentBillingLinkage();
    stripeCustomerId = linkage?.stripeCustomerId ?? null;
  } else {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", profileId)
      .single();
    stripeCustomerId = profile?.stripe_customer_id ?? null;
  }

  if (!stripeCustomerId) {
    return { success: false, error: "No billing account found" };
  }

  const headersList = await headers();
  const origin = getValidatedOrigin(headersList.get("origin"));
  const returnUrl = `${origin}${BILLING_PORTAL_CONFIG.returnUrl}`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Stripe portal error:", error);
    console.error("Return URL used:", returnUrl);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create portal session",
    };
  }
}

/**
 * Get subscription details for the current user
 */
export async function getSubscription(): Promise<
  ActionResult<{
    status: string;
    planTier: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null>
> {
  let planTier: string;
  let stripeSubId: string | null = null;

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{
      planTier: string;
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState").catch(() => null);

    if (!state) return { success: false, error: "Not authenticated" };
    planTier = state.planTier;
    stripeSubId = state.stripeSubscriptionId;
  } else {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier, stripe_subscription_id, stripe_customer_id")
      .eq("id", profileId)
      .single();

    if (!profile) return { success: false, error: "Profile not found" };
    planTier = profile.plan_tier;
    stripeSubId = profile.stripe_subscription_id;
  }

  if (planTier === "free" || !stripeSubId) {
    return {
      success: true,
      data: {
        status: "none",
        planTier,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      stripeSubId
    ) as unknown as { status: string; current_period_end: number; cancel_at_period_end: boolean };

    return {
      success: true,
      data: {
        status: subscription.status,
        planTier,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
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
        planTier,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }
}

/**
 * Get pending schedule change information if one exists
 * (downgrades and billing interval changes are scheduled at period end)
 */
export async function getPendingDowngrade(): Promise<
  ActionResult<{
    pendingPlanTier: string;
    pendingBillingInterval?: string;
    effectiveDate: string;
    scheduleId: string;
  } | null>
> {
  let stripeSubId: string | null = null;

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState").catch(() => null);
    stripeSubId = state?.stripeSubscriptionId ?? null;
  } else {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", profileId)
      .single();
    stripeSubId = profile?.stripe_subscription_id ?? null;
  }

  if (!stripeSubId) {
    return { success: true, data: null };
  }

  try {
    const schedules = await stripe.subscriptionSchedules.list({
      customer: (await stripe.subscriptions.retrieve(stripeSubId)).customer as string,
      limit: 10,
    });

    const activeSchedule = schedules.data.find(
      (schedule) =>
        schedule.status === "active" &&
        schedule.subscription === stripeSubId &&
        schedule.phases.length > 1
    );

    if (!activeSchedule) {
      return { success: true, data: null };
    }

    const nextPhase = activeSchedule.phases[1];
    if (!nextPhase) {
      return { success: true, data: null };
    }

    // Get the plan tier and billing interval from the next phase metadata
    const pendingPlanTier = nextPhase.metadata?.plan_tier;
    const pendingBillingInterval = nextPhase.metadata?.billing_interval;
    if (!pendingPlanTier) {
      return { success: true, data: null };
    }

    // The effective date is the end of the current phase
    const effectiveDate = new Date(activeSchedule.phases[0].end_date * 1000).toISOString();

    return {
      success: true,
      data: {
        pendingPlanTier,
        pendingBillingInterval,
        effectiveDate,
        scheduleId: activeSchedule.id,
      },
    };
  } catch (error) {
    console.error("Error fetching pending downgrade:", error);
    return { success: true, data: null };
  }
}

/**
 * Cancel a pending downgrade and keep the current plan
 */
export async function cancelPendingDowngrade(): Promise<ActionResult> {
  let stripeSubId: string | null = null;

  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{ stripeSubscriptionId: string | null }>(
      "billing:getCurrentBillingWorkspaceState"
    ).catch(() => null);
    stripeSubId = state?.stripeSubscriptionId ?? null;
  } else {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false, error: "Not authenticated" };
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", profileId)
      .single();
    stripeSubId = profile?.stripe_subscription_id ?? null;
  }

  if (!stripeSubId) {
    return { success: false, error: "No subscription found" };
  }

  try {
    const schedules = await stripe.subscriptionSchedules.list({
      customer: (await stripe.subscriptions.retrieve(stripeSubId)).customer as string,
      limit: 10,
    });

    const activeSchedule = schedules.data.find(
      (schedule) =>
        schedule.status === "active" &&
        schedule.subscription === stripeSubId
    );

    if (!activeSchedule) {
      return { success: false, error: "No pending downgrade found" };
    }

    await stripe.subscriptionSchedules.release(activeSchedule.id);

    await stripe.subscriptions.update(stripeSubId, {
      metadata: {
        pending_plan_tier: "",
      },
    });

    // Revalidate dashboard pages so the UI reflects the change
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error) {
    console.error("Error canceling pending downgrade:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel downgrade",
    };
  }
}

/**
 * Redirect to checkout for a plan (convenience action)
 */
export async function redirectToCheckout(planTier: "pro") {
  const result = await createCheckoutSession(planTier);

  if (result.success && result.data?.url) {
    redirect(result.data.url);
  }

  return result;
}

/**
 * Redirect to billing portal (form action)
 */
export async function redirectToBillingPortal(): Promise<void> {
  const result = await createBillingPortalSession();

  if (result.success && result.data?.url) {
    redirect(result.data.url);
  }

  // If we get here, the redirect failed - throw an error
  throw new Error(result.success ? "Failed to get portal URL" : result.error);
}

/**
 * Verify a checkout session and sync subscription status to the database
 * Called from the success page to ensure the subscription is activated
 * even if the webhook hasn't processed yet (race condition fix)
 */
export async function verifyAndSyncCheckoutSession(
  sessionId: string
): Promise<ActionResult<{ planTier: string; subscriptionStatus: string }>> {
  let profileId: string | null = null;

  if (isConvexDataEnabled()) {
    const ws = await getCurrentWorkspace();
    profileId = ws?.workspace.id ?? null;
  } else {
    profileId = await getCurrentProfileId();
  }

  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const sessionProfileId = session.metadata?.profile_id;
    if (sessionProfileId !== profileId) {
      return { success: false, error: "Session does not belong to this user" };
    }

    if (session.payment_status !== "paid") {
      return { success: false, error: "Payment not completed" };
    }

    const subscription = session.subscription as import("stripe").Stripe.Subscription | null;
    if (!subscription) {
      return { success: false, error: "No subscription found" };
    }

    const planTier = session.metadata?.plan_tier || "pro";
    const billingInterval = session.metadata?.billing_interval || "month";

    if (isConvexDataEnabled()) {
      await mutateConvex("billing:syncCheckoutSubscription", {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        planTier,
        billingInterval,
        subscriptionStatus: "active",
      });
    } else {
      const listingIdVal = session.metadata?.listing_id;
      const adminClient = await createAdminClient();
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan_tier: planTier,
          billing_interval: billingInterval,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (profileError) {
        console.error("Error updating profile in verifyAndSyncCheckoutSession:", profileError);
        return { success: false, error: "Failed to update subscription status" };
      }

      if (listingIdVal) {
        await adminClient
          .from("listings")
          .update({
            status: "published",
            plan_tier: planTier,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", listingIdVal);
      }
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/locations");
    revalidatePath("/dashboard/billing");

    return {
      success: true,
      data: {
        planTier,
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

// ============================================================================
// Featured Location Actions
// ============================================================================

/**
 * Create a Stripe checkout session for featuring a specific location
 * @param locationId - The location to feature
 * @param billingInterval - Monthly or annual billing
 */
export async function createFeaturedLocationCheckout(
  locationId: string,
  billingInterval: BillingInterval = "month",
  returnTo: "locations" | "billing" = "locations"
): Promise<ActionResult<{ url?: string; subscriptionId?: string; status?: string; directCharge?: boolean }>> {
  let profileId: string;
  let email: string | undefined;
  let customerId: string | null = null;
  let mainSubId: string | null = null;
  let locationLabel = "Location";
  let listingIdForMetadata: string = "";

  try {
    const ctx = await requireBillingContext();
    profileId = ctx.profileId;
    email = ctx.email ?? undefined;
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  if (isConvexDataEnabled()) {
    const state = await queryConvex<{
      workspaceId: string;
      listingId: string | null;
      planTier: string;
      subscriptionStatus: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    }>("billing:getCurrentBillingWorkspaceState");

    const hasActiveProSubscription =
      state.planTier === "pro" &&
      (state.subscriptionStatus === "active" ||
        state.subscriptionStatus === "trialing") &&
      Boolean(state.stripeSubscriptionId);

    if (!hasActiveProSubscription) {
      return {
        success: false,
        error: "Featured placement requires an active Pro subscription",
      };
    }

    customerId = state.stripeCustomerId;
    mainSubId = state.stripeSubscriptionId;
    listingIdForMetadata = state.listingId || "";

    const featured = await queryConvex<{ locations: Array<{ locationId: string }> }>("billing:getFeaturedLocations");
    const alreadyFeatured = featured.locations.some((loc) => loc.locationId === locationId);
    if (alreadyFeatured) {
      return { success: false, error: "Location is already featured" };
    }

    locationLabel = locationId;
  } else {
    const supabase = await createClient();

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select(`
        id,
        city,
        state,
        label,
        is_featured,
        listing_id,
        listings!inner (
          id,
          profile_id,
          profiles!inner (
            id,
            plan_tier,
            stripe_customer_id,
            stripe_subscription_id
          )
        )
      `)
      .eq("id", locationId)
      .single();

    if (locationError || !location) {
      return { success: false, error: "Location not found" };
    }

    const listing = location.listings as unknown as {
      id: string;
      profile_id: string;
      profiles: {
        id: string;
        plan_tier: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
      };
    };

    if (listing.profile_id !== profileId) {
      return { success: false, error: "Not authorized" };
    }

    if (listing.profiles.plan_tier === "free") {
      return { success: false, error: "Featured upgrade requires Pro plan" };
    }

    if (location.is_featured) {
      return { success: false, error: "Location is already featured" };
    }

    customerId = listing.profiles.stripe_customer_id;
    mainSubId = listing.profiles.stripe_subscription_id;
    locationLabel = location.label || `${location.city}, ${location.state}`;
    listingIdForMetadata = listing.id;
  }

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
        // Subscription might not exist
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

      // The webhook will handle creating the database record and setting is_featured
      // Return success with a flag indicating no redirect needed
      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          directCharge: true,
        },
      };
    }

    // No payment method on file - fall back to checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
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

/**
 * Cancel a featured location subscription (at period end)
 * User keeps featured status until the end of their billing period
 */
export async function cancelFeaturedLocation(
  locationId: string
): Promise<ActionResult> {
  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  let stripeSubId: string | null = null;

  if (isConvexDataEnabled()) {
    const linkage = await getCurrentBillingLinkage();
    if (!linkage?.stripeCustomerId) {
      return { success: false, error: "No billing account found" };
    }

    const subs = await stripe.subscriptions.list({
      customer: linkage.stripeCustomerId,
      status: "active",
      limit: 100,
    });
    const matchingSub = subs.data.find(
      (s) => s.metadata?.type === "featured_location" && s.metadata?.location_id === locationId
    );
    if (!matchingSub) {
      return { success: false, error: "No featured subscription found for this location" };
    }
    stripeSubId = matchingSub.id;
  } else {
    const profileId = (await requireProfileRole("owner")).profile_id;
    const supabase = await createClient();
    const { data: featuredSub, error: subError } = await supabase
      .from("location_featured_subscriptions")
      .select("id, stripe_subscription_id, profile_id, status")
      .eq("location_id", locationId)
      .single();

    if (subError || !featuredSub) {
      return { success: false, error: "No featured subscription found for this location" };
    }
    if (featuredSub.profile_id !== profileId) {
      return { success: false, error: "Not authorized" };
    }
    if (featuredSub.status !== "active") {
      return { success: false, error: "Subscription is not active" };
    }
    stripeSubId = featuredSub.stripe_subscription_id;
  }

  if (!stripeSubId) {
    return { success: false, error: "No subscription found" };
  }

  try {
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
    });

    if (!isConvexDataEnabled()) {
      const supabase = await createClient();
      const { data: featuredSub } = await supabase
        .from("location_featured_subscriptions")
        .select("id")
        .eq("stripe_subscription_id", stripeSubId)
        .single();

      if (featuredSub) {
        const adminClient = await createAdminClient();
        await adminClient
          .from("location_featured_subscriptions")
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", featuredSub.id);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error) {
    console.error("Cancel featured location error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel subscription",
    };
  }
}

/**
 * Reactivate a featured location subscription that was set to cancel
 */
export async function reactivateFeaturedLocation(
  locationId: string
): Promise<ActionResult> {
  try {
    await requireBillingContext();
  } catch {
    return { success: false, error: "Not authenticated" };
  }

  let stripeSubId: string | null = null;

  if (isConvexDataEnabled()) {
    const linkage = await getCurrentBillingLinkage();
    if (!linkage?.stripeCustomerId) {
      return { success: false, error: "No billing account found" };
    }

    const subs = await stripe.subscriptions.list({
      customer: linkage.stripeCustomerId,
      limit: 100,
    });
    const matchingSub = subs.data.find(
      (s) =>
        s.metadata?.type === "featured_location" &&
        s.metadata?.location_id === locationId &&
        s.cancel_at_period_end
    );
    if (!matchingSub) {
      return { success: false, error: "No featured subscription found set to cancel" };
    }
    stripeSubId = matchingSub.id;
  } else {
    const profileId = (await requireProfileRole("owner")).profile_id;
    const supabase = await createClient();
    const { data: featuredSub, error: subError } = await supabase
      .from("location_featured_subscriptions")
      .select("id, stripe_subscription_id, profile_id, cancel_at_period_end")
      .eq("location_id", locationId)
      .single();

    if (subError || !featuredSub) {
      return { success: false, error: "No featured subscription found for this location" };
    }
    if (featuredSub.profile_id !== profileId) {
      return { success: false, error: "Not authorized" };
    }
    if (!featuredSub.cancel_at_period_end) {
      return { success: false, error: "Subscription is not set to cancel" };
    }
    stripeSubId = featuredSub.stripe_subscription_id;
  }

  if (!stripeSubId) {
    return { success: false, error: "No subscription found" };
  }

  try {
    await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: false,
    });

    if (!isConvexDataEnabled()) {
      const supabase = await createClient();
      const { data: featuredSub } = await supabase
        .from("location_featured_subscriptions")
        .select("id")
        .eq("stripe_subscription_id", stripeSubId)
        .single();

      if (featuredSub) {
        const adminClient = await createAdminClient();
        await adminClient
          .from("location_featured_subscriptions")
          .update({
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", featuredSub.id);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/company");
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error) {
    console.error("Reactivate featured location error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reactivate subscription",
    };
  }
}

// ============================================================================
// Stripe Price Fetching
// ============================================================================

export interface StripePriceInfo {
  priceId: string;
  unitAmount: number; // Price in cents
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
}

/**
 * Fetch price details from Stripe by price ID
 * Returns the actual price amount and billing interval from Stripe
 */
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

/**
 * Fetch featured addon prices from Stripe
 * Returns both monthly and annual pricing info
 */
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
      return { success: false, error: !monthlyResult.success ? monthlyResult.error : "Failed to fetch monthly price" };
    }

    if (!annualResult.success || !annualResult.data) {
      return { success: false, error: !annualResult.success ? annualResult.error : "Failed to fetch annual price" };
    }

    const monthlyPrice = monthlyResult.data.unitAmount / 100; // Convert cents to dollars
    const annualTotal = annualResult.data.unitAmount / 100;
    const annualMonthlyEquivalent = Math.round((annualTotal / 12) * 100) / 100; // Per month equivalent
    const annualSavings = Math.round((monthlyPrice * 12 - annualTotal) * 100) / 100;
    const annualSavingsPercent = Math.round((annualSavings / (monthlyPrice * 12)) * 100);

    return {
      success: true,
      data: {
        monthly: {
          price: monthlyPrice,
          priceId: monthlyPriceId,
        },
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

/**
 * Get all featured location subscriptions for the current user
 */
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
  if (isConvexDataEnabled()) {
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

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from("location_featured_subscriptions")
    .select(`
      id,
      location_id,
      status,
      billing_interval,
      current_period_end,
      cancel_at_period_end,
      locations!inner (
        id,
        label,
        city,
        state
      )
    `)
    .eq("profile_id", profileId)
    .in("status", ["active", "past_due"]);

  if (error) {
    console.error("Error fetching featured locations:", error);
    return { success: false, error: "Failed to fetch featured locations" };
  }

  const locations = (subscriptions || []).map((sub) => {
    const loc = sub.locations as unknown as {
      id: string;
      label: string | null;
      city: string;
      state: string;
    };
    return {
      id: sub.id,
      locationId: sub.location_id,
      locationLabel: loc.label || `${loc.city}, ${loc.state}`,
      city: loc.city,
      state: loc.state,
      status: sub.status,
      billingInterval: sub.billing_interval,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  });

  return { success: true, data: { locations } };
}
