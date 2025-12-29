"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import { CHECKOUT_URLS, BILLING_PORTAL_CONFIG, getPriceId, getFeaturedPriceId, type BillingInterval } from "./config";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Create a Stripe checkout session for a NEW subscription (no existing subscription)
 * @param planTier - The plan tier to subscribe to
 * @param billingInterval - Monthly or annual billing
 * @param returnTo - Optional return destination after successful payment (e.g., "onboarding")
 */
export async function createCheckoutSession(
  planTier: "pro" | "enterprise",
  billingInterval: BillingInterval = "month",
  returnTo?: string
): Promise<ActionResult<{ url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get profile with subscription info
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, contact_email, stripe_customer_id, stripe_subscription_id, plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // If user already has an active subscription, use upgrade flow instead
  if (profile.stripe_subscription_id && profile.plan_tier !== "free") {
    return upgradeSubscription(planTier, billingInterval, returnTo);
  }

  // Get listing ID
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const priceId = getPriceId(planTier, billingInterval);
  if (!priceId) {
    return { success: false, error: "Invalid plan" };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

  try {
    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.contact_email,
        metadata: {
          profile_id: profile.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      const adminClient = await createAdminClient();
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.id);
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profile_id: profile.id,
        listing_id: listing?.id || "",
        plan_tier: planTier,
        billing_interval: billingInterval,
        return_to: returnTo || "",
      },
      subscription_data: {
        metadata: {
          profile_id: profile.id,
          listing_id: listing?.id || "",
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
 * Upgrade an existing subscription to a higher plan or change billing interval
 * - Upgrades (pro -> enterprise): Immediate change with proration
 * - Downgrades (enterprise -> pro): Change at end of billing period, no credit
 * - Interval changes: Immediate with proration
 */
export async function upgradeSubscription(
  planTier: "pro" | "enterprise",
  billingInterval: BillingInterval = "month",
  returnTo?: string
): Promise<ActionResult<{ url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_subscription_id, plan_tier, billing_interval")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  if (!profile.stripe_subscription_id) {
    return { success: false, error: "No active subscription to upgrade" };
  }

  const newPriceId = getPriceId(planTier, billingInterval);
  if (!newPriceId) {
    return { success: false, error: "Invalid plan" };
  }

  // Determine if this is an upgrade, downgrade, or interval change
  const isUpgrade = profile.plan_tier === "pro" && planTier === "enterprise";
  // Treat interval change (monthly -> annual) as an upgrade behavior (immediate with proration)

  // Get listing ID for metadata
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  try {
    // Get the current subscription to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

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
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Determine if this is switching to annual (always treat as upgrade - immediate with proration)
    // Note: treat null/undefined billing_interval as "month" (the default for existing users)
    const currentInterval = profile.billing_interval || "month";
    const isSwitchingToAnnual = currentInterval === "month" && billingInterval === "year";

    if (isUpgrade || isSwitchingToAnnual) {
      // UPGRADE: Immediate change with proration (charge difference now)
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          profile_id: profile.id,
          listing_id: listing?.id || "",
          plan_tier: planTier,
          billing_interval: billingInterval,
        },
      });

      // Update the profile with the new plan tier and billing interval immediately
      const adminClient = await createAdminClient();
      await adminClient
        .from("profiles")
        .update({ plan_tier: planTier, billing_interval: billingInterval })
        .eq("id", profile.id);

      const successUrl = returnTo
        ? `${origin}${CHECKOUT_URLS.success}?upgraded=true&return_to=${returnTo}`
        : `${origin}${CHECKOUT_URLS.success}?upgraded=true`;

      return { success: true, data: { url: successUrl } };
    } else {
      // DOWNGRADE: Schedule change at end of billing period (no credit)
      // Create a subscription schedule to change the price at period end
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: profile.stripe_subscription_id,
      });

      // Update the schedule to change to the new price at the end of current phase
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release", // Continue as regular subscription after schedule ends
        phases: [
          {
            // Current phase - keep existing price until end of current period
            items: [{ price: subscription.items.data[0].price.id as string, quantity: 1 }],
            start_date: schedule.phases[0].start_date,
            end_date: schedule.phases[0].end_date,
          },
          {
            // Next phase - switch to new (lower) price
            items: [{ price: newPriceId, quantity: 1 }],
            metadata: {
              profile_id: profile.id,
              listing_id: listing?.id || "",
              plan_tier: planTier,
              billing_interval: billingInterval,
            },
          },
        ],
      });

      // Update subscription metadata to indicate pending downgrade
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        metadata: {
          profile_id: profile.id,
          listing_id: listing?.id || "",
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return { success: false, error: "No billing account found" };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const returnUrl = `${origin}${BILLING_PORTAL_CONFIG.returnUrl}`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Free plan - no subscription
  if (profile.plan_tier === "free" || !profile.stripe_subscription_id) {
    return {
      success: true,
      data: {
        status: "none",
        planTier: profile.plan_tier,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    ) as unknown as { status: string; current_period_end: number; cancel_at_period_end: boolean };

    return {
      success: true,
      data: {
        status: subscription.status,
        planTier: profile.plan_tier,
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
        planTier: profile.plan_tier,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return { success: true, data: null };
  }

  try {
    // Check if there's an active schedule for this subscription
    const schedules = await stripe.subscriptionSchedules.list({
      customer: (await stripe.subscriptions.retrieve(profile.stripe_subscription_id)).customer as string,
      limit: 10,
    });

    // Find an active schedule that's attached to this subscription
    const activeSchedule = schedules.data.find(
      (schedule) =>
        schedule.status === "active" &&
        schedule.subscription === profile.stripe_subscription_id &&
        schedule.phases.length > 1
    );

    if (!activeSchedule) {
      return { success: true, data: null };
    }

    // Get the next phase (downgrade phase)
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return { success: false, error: "No subscription found" };
  }

  try {
    // Find and cancel the active schedule
    const schedules = await stripe.subscriptionSchedules.list({
      customer: (await stripe.subscriptions.retrieve(profile.stripe_subscription_id)).customer as string,
      limit: 10,
    });

    const activeSchedule = schedules.data.find(
      (schedule) =>
        schedule.status === "active" &&
        schedule.subscription === profile.stripe_subscription_id
    );

    if (!activeSchedule) {
      return { success: false, error: "No pending downgrade found" };
    }

    // Release the schedule - this keeps the current subscription as-is
    await stripe.subscriptionSchedules.release(activeSchedule.id);

    // Clear the pending_plan_tier metadata from the subscription
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      metadata: {
        pending_plan_tier: "",
      },
    });

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
export async function redirectToCheckout(planTier: "pro" | "enterprise") {
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
  billingInterval: BillingInterval = "month"
): Promise<ActionResult<{ url?: string; subscriptionId?: string; status?: string; directCharge?: boolean }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get location with parent listing and profile info
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
          stripe_subscription_id,
          contact_email
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
      contact_email: string;
    };
  };

  // Verify user owns this location
  if (listing.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  // Verify Pro or Enterprise plan
  const planTier = listing.profiles.plan_tier;
  if (planTier === "free") {
    return { success: false, error: "Featured upgrade requires Pro or Enterprise plan" };
  }

  // Check if already featured
  if (location.is_featured) {
    return { success: false, error: "Location is already featured" };
  }

  const priceId = getFeaturedPriceId(billingInterval);

  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    // Create or retrieve Stripe customer
    let customerId = listing.profiles.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: listing.profiles.contact_email,
        metadata: {
          profile_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      const adminClient = await createAdminClient();
      await adminClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create location label for display
    const locationLabel = location.label || `${location.city}, ${location.state}`;

    // Try to find a payment method - check multiple sources
    let paymentMethodId: string | null = null;

    // First, check customer's default payment method
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.invoice_settings?.default_payment_method) {
      paymentMethodId = customer.invoice_settings.default_payment_method as string;
    }

    // If no default on customer, check their existing subscription
    if (!paymentMethodId && listing.profiles.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          listing.profiles.stripe_subscription_id
        );
        if (existingSubscription.default_payment_method) {
          paymentMethodId = existingSubscription.default_payment_method as string;
        }
      } catch {
        // Subscription might not exist, continue without payment method
      }
    }

    // If still no payment method, check customer's payment methods list
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
      // Customer has a payment method on file - create subscription directly
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        metadata: {
          type: "featured_location",
          profile_id: user.id,
          location_id: locationId,
          listing_id: listing.id,
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/locations?featured_success=${locationId}`,
      cancel_url: `${origin}/dashboard/locations?featured_cancel=${locationId}`,
      metadata: {
        type: "featured_location",
        profile_id: user.id,
        location_id: locationId,
        listing_id: listing.id,
        billing_interval: billingInterval,
      },
      subscription_data: {
        metadata: {
          type: "featured_location",
          profile_id: user.id,
          location_id: locationId,
          listing_id: listing.id,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the featured subscription
  const { data: featuredSub, error: subError } = await supabase
    .from("location_featured_subscriptions")
    .select("id, stripe_subscription_id, profile_id, status")
    .eq("location_id", locationId)
    .single();

  if (subError || !featuredSub) {
    return { success: false, error: "No featured subscription found for this location" };
  }

  // Verify user owns this subscription
  if (featuredSub.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  if (featuredSub.status !== "active") {
    return { success: false, error: "Subscription is not active" };
  }

  try {
    // Cancel at period end (user keeps featured until billing cycle ends)
    await stripe.subscriptions.update(featuredSub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update local record
    const adminClient = await createAdminClient();
    await adminClient
      .from("location_featured_subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", featuredSub.id);

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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get the featured subscription
  const { data: featuredSub, error: subError } = await supabase
    .from("location_featured_subscriptions")
    .select("id, stripe_subscription_id, profile_id, cancel_at_period_end")
    .eq("location_id", locationId)
    .single();

  if (subError || !featuredSub) {
    return { success: false, error: "No featured subscription found for this location" };
  }

  // Verify user owns this subscription
  if (featuredSub.profile_id !== user.id) {
    return { success: false, error: "Not authorized" };
  }

  if (!featuredSub.cancel_at_period_end) {
    return { success: false, error: "Subscription is not set to cancel" };
  }

  try {
    // Reactivate by removing cancel_at_period_end
    await stripe.subscriptions.update(featuredSub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update local record
    const adminClient = await createAdminClient();
    await adminClient
      .from("location_featured_subscriptions")
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", featuredSub.id);

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
  const user = await getUser();
  if (!user) {
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
    .eq("profile_id", user.id)
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
