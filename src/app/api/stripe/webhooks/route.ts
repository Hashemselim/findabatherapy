import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { isConvexDataEnabled } from "@/lib/platform/config";
import { mutateConvexUnauthenticated } from "@/lib/platform/convex/server";
import { env } from "@/env";
import { sendPaymentFailureNotification, sendAdminFirstPaymentNotification } from "@/lib/email/notifications";
import { stopDripForUser } from "@/lib/actions/drip-emails";

/**
 * Stripe webhook handler
 *
 * Handles subscription lifecycle events:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Plan changed
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.paid: Successful payment
 * - invoice.payment_failed: Failed payment
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = isConvexDataEnabled()
    ? null
    : await createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Route to appropriate handler based on checkout type
        if (session.metadata?.type === "featured_location") {
          await handleFeaturedLocationCheckoutCompleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, session);
        } else if (session.metadata?.type === "addon") {
          await handleAddonCheckoutCompleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, session);
        } else {
          await handleCheckoutCompleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, session);
        }
        break;
      }

      case "customer.subscription.created": {
        // Handle subscriptions created directly via API (not through checkout)
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionCreated(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionCreated(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        }
        // Note: Main plan subscriptions go through checkout, so we don't need to handle them here
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // Route to appropriate handler based on subscription type
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionUpdated(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionUpdated(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        } else {
          await handleSubscriptionUpdated(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        // Route to appropriate handler based on subscription type
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionDeleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionDeleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        } else {
          await handleSubscriptionDeleted(supabase as Awaited<ReturnType<typeof createAdminClient>>, subscription);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase as Awaited<ReturnType<typeof createAdminClient>>, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase as Awaited<ReturnType<typeof createAdminClient>>, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Called when a customer completes checkout
 */
async function handleCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session
) {
  const profileId = session.metadata?.profile_id;
  const listingId = session.metadata?.listing_id;
  const planTier = session.metadata?.plan_tier;
  const billingInterval = session.metadata?.billing_interval || "month";

  if (!profileId) {
    console.error("No profile_id in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookCheckoutCompleted", {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      planTier: planTier || "pro",
      billingInterval,
      profileId,
      listingId: listingId || undefined,
    });
  } else {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        plan_tier: planTier || "pro",
        billing_interval: billingInterval,
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return;
    }

    if (listingId) {
      await supabase
        .from("listings")
        .update({
          status: "published",
          plan_tier: planTier || "pro",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId);
    }

    await supabase.from("audit_events").insert({
      profile_id: profileId,
      listing_id: listingId || null,
      event_type: "subscription_created",
      payload: {
        plan_tier: planTier,
        billing_interval: billingInterval,
        subscription_id: subscriptionId,
        customer_id: session.customer,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  await stopDripForUser(profileId);

  console.log(`Checkout completed for profile ${profileId}, plan: ${planTier}, interval: ${billingInterval}`);
}

/**
 * Handle customer.subscription.updated
 * Called when subscription is modified (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;

  if (!profileId) {
    // Try to find profile by customer ID
    const customerId = subscription.customer as string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) {
      console.error("No profile found for subscription update");
      return;
    }

    // Update with found profile ID
    await updateProfileSubscription(supabase, profile.id, subscription);
  } else {
    await updateProfileSubscription(supabase, profileId, subscription);
  }
}

async function updateProfileSubscription(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  profileId: string,
  subscription: Stripe.Subscription
) {
  const planTier = subscription.metadata?.plan_tier || "pro";
  const billingInterval = subscription.metadata?.billing_interval || "month";

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookSubscriptionUpdated", {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      planTier,
      billingInterval,
      subscriptionStatus: subscription.status,
    });
  } else {
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const { error } = await supabase
      .from("profiles")
      .update({
        plan_tier: isActive ? planTier : "free",
        billing_interval: isActive ? billingInterval : "month",
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (error) {
      console.error("Error updating profile subscription:", error);
    }

    await supabase
      .from("listings")
      .update({
        plan_tier: isActive ? planTier : "free",
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profileId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Subscription updated for profile ${profileId}, status: ${subscription.status}, interval: ${billingInterval}`);
}

/**
 * Handle customer.subscription.deleted
 * Called when subscription is cancelled
 */
async function handleSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;
  const customerId = subscription.customer as string;

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookSubscriptionDeleted", {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    });
  } else {
    // Find profile by ID or customer ID
    let targetProfileId = profileId;
    if (!targetProfileId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        targetProfileId = profile.id;
      }
    }

    if (!targetProfileId) {
      console.error("No profile found for subscription deletion");
      return;
    }

    // Downgrade to free and clear subscription status
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        plan_tier: "free",
        billing_interval: "month",
        stripe_subscription_id: null,
        subscription_status: null, // Clear subscription status
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetProfileId);

    if (profileError) {
      console.error("Error downgrading profile:", profileError);
    }

    // Update listing to free tier (keep it published)
    await supabase
      .from("listings")
      .update({
        plan_tier: "free",
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", targetProfileId);

    // Log audit event
    await supabase.from("audit_events").insert({
      profile_id: targetProfileId,
      event_type: "subscription_cancelled",
      payload: {
        subscription_id: subscription.id,
      },
    });
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Subscription cancelled for ${profileId || customerId}`);
}

/**
 * Handle invoice.paid
 * Called when a payment succeeds
 */
async function handleInvoicePaid(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  if (isConvexDataEnabled()) {
    console.log(`Invoice paid for customer ${customerId}, amount: ${invoice.amount_paid}`);
    revalidatePath("/dashboard");
    return;
  }

  // Find profile with details needed for first payment notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agency_name, contact_email, plan_tier, billing_interval")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.log("No profile found for invoice.paid");
    return;
  }

  // Log audit event
  await supabase.from("audit_events").insert({
    profile_id: profile.id,
    event_type: "invoice_paid",
    payload: {
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      billing_reason: invoice.billing_reason,
    },
  });

  // Check if this is the first payment (subscription creation)
  // billing_reason === 'subscription_create' indicates the first invoice for a new subscription
  if (invoice.billing_reason === "subscription_create" && invoice.amount_paid > 0) {
    // Try to get the first location's state for additional context
    let state: string | null = null;
    const { data: locations } = await supabase
      .from("locations")
      .select("state")
      .eq("profile_id", profile.id)
      .limit(1);

    if (locations && locations.length > 0) {
      state = locations[0].state;
    }

    // Send admin notification for first payment
    await sendAdminFirstPaymentNotification({
      agencyName: profile.agency_name || "Unknown",
      email: profile.contact_email || "unknown@example.com",
      planTier: profile.plan_tier || "pro",
      billingInterval: profile.billing_interval || "month",
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      state,
    });

    console.log(`First payment notification sent for profile ${profile.id}`);
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Invoice paid for profile ${profile.id}, amount: ${invoice.amount_paid}`);
}

/**
 * Handle invoice.payment_failed
 * Called when a payment fails
 */
async function handleInvoicePaymentFailed(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  if (isConvexDataEnabled()) {
    console.log(`Invoice payment failed for customer ${customerId}, amount: ${invoice.amount_due}`);
    revalidatePath("/dashboard");
    return;
  }

  // Find profile with email for notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, contact_email, agency_name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.log("No profile found for invoice.payment_failed");
    return;
  }

  // Log audit event
  await supabase.from("audit_events").insert({
    profile_id: profile.id,
    event_type: "invoice_payment_failed",
    payload: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  // Send notification email to user about failed payment (placeholder - see lib/email/notifications.ts)
  if (profile.contact_email) {
    await sendPaymentFailureNotification({
      to: profile.contact_email,
      providerName: profile.agency_name || "Provider",
      invoiceId: invoice.id || "unknown",
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count || 1,
    });
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Invoice payment failed for profile ${profile.id}`);
}

// ============================================================================
// Featured Location Subscription Handlers
// ============================================================================

/**
 * Handle checkout.session.completed for featured location
 * Called when a customer completes checkout for featuring a location
 */
async function handleFeaturedLocationCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session
) {
  const profileId = session.metadata?.profile_id;
  const locationId = session.metadata?.location_id;
  const billingInterval = session.metadata?.billing_interval || "month";
  const subscriptionId = session.subscription as string;

  if (!profileId || !locationId) {
    console.error("Missing metadata in featured location checkout:", {
      profileId,
      locationId,
    });
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });

  // Get current period end from the subscription item (moved in newer Stripe API)
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookFeaturedLocationCreated", {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      locationId,
      billingInterval,
      currentPeriodEnd,
    });
  } else {
    const { data: existingFeatured } = await supabase
      .from("location_featured_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (existingFeatured) {
      console.log(`Featured subscription already exists for ${subscriptionId}, skipping duplicate checkout insert`);
      return;
    }

    // Insert featured subscription record
    const { error: insertError } = await supabase
      .from("location_featured_subscriptions")
      .insert({
        location_id: locationId,
        profile_id: profileId,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_item_id: subscriptionItem?.id || null,
        billing_interval: billingInterval,
        status: "active",
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (insertError) {
      console.error("Error inserting featured subscription:", insertError);
      return;
    }

    // Update denormalized flag on location
    const { error: updateError } = await supabase
      .from("locations")
      .update({ is_featured: true })
      .eq("id", locationId);

    if (updateError) {
      console.error("Error updating location is_featured:", updateError);
    }

    // Log audit event
    await supabase.from("audit_events").insert({
      profile_id: profileId,
      location_id: locationId,
      event_type: "featured_location_activated",
      payload: {
        subscription_id: subscriptionId,
        billing_interval: billingInterval,
      },
    });
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Featured location activated: ${locationId} for profile ${profileId}`);
}

/**
 * Handle customer.subscription.created for featured location
 * Called when subscription is created directly via API (not through checkout)
 * This happens when user already has a payment method on file
 */
async function handleFeaturedLocationSubscriptionCreated(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;
  const locationId = subscription.metadata?.location_id;
  const billingInterval = subscription.metadata?.billing_interval || "month";

  if (!profileId || !locationId) {
    console.error("Missing metadata in featured location subscription:", {
      profileId,
      locationId,
    });
    return;
  }

  // Get current period end from the subscription item
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookFeaturedLocationCreated", {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      locationId,
      billingInterval,
      currentPeriodEnd,
    });
  } else {
    // Check if record already exists (idempotency)
    const { data: existing } = await supabase
      .from("location_featured_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (existing) {
      console.log(`Featured subscription already exists for ${subscription.id}`);
      return;
    }

    // Insert featured subscription record
    const { error: insertError } = await supabase
      .from("location_featured_subscriptions")
      .insert({
        location_id: locationId,
        profile_id: profileId,
        stripe_subscription_id: subscription.id,
        stripe_subscription_item_id: subscriptionItem?.id || null,
        billing_interval: billingInterval,
        status: "active",
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (insertError) {
      console.error("Error inserting featured subscription:", insertError);
      return;
    }

    // Update denormalized flag on location
    const { error: updateError } = await supabase
      .from("locations")
      .update({ is_featured: true })
      .eq("id", locationId);

    if (updateError) {
      console.error("Error updating location is_featured:", updateError);
    }

    // Log audit event
    await supabase.from("audit_events").insert({
      profile_id: profileId,
      location_id: locationId,
      event_type: "featured_location_activated",
      payload: {
        subscription_id: subscription.id,
        billing_interval: billingInterval,
        source: "direct_subscription",
      },
    });
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Featured location activated (direct): ${locationId} for profile ${profileId}`);
}

/**
 * Handle customer.subscription.updated for featured location
 * Called when subscription is modified (renewal, payment method change, etc.)
 */
async function handleFeaturedLocationSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const locationId = subscription.metadata?.location_id;

  if (!locationId) {
    console.error("No location_id in featured subscription metadata");
    return;
  }

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const isPastDue = subscription.status === "past_due";

  let status: string;
  if (isActive) {
    status = "active";
  } else if (isPastDue) {
    status = "past_due";
  } else {
    status = "cancelled";
  }

  // Get current period end from the subscription item (moved in newer Stripe API)
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookFeaturedLocationUpdated", {
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      locationId,
    });
  } else {
    // Update the subscription record
    const { error: updateSubError } = await supabase
      .from("location_featured_subscriptions")
      .update({
        status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (updateSubError) {
      console.error("Error updating featured subscription:", updateSubError);
    }

    // Keep is_featured true for active and past_due (grace period)
    // Only remove featured status when subscription is actually deleted
    if (!isActive && !isPastDue) {
      await supabase
        .from("locations")
        .update({ is_featured: false })
        .eq("id", locationId);
    }
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Featured location subscription updated: ${locationId}, status: ${status}`);
}

/**
 * Handle customer.subscription.deleted for featured location
 * Called when subscription is cancelled (end of billing period or immediate)
 */
async function handleFeaturedLocationSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const locationId = subscription.metadata?.location_id;
  const profileId = subscription.metadata?.profile_id;

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookFeaturedLocationDeleted", {
      stripeSubscriptionId: subscription.id,
      locationId: locationId || undefined,
    });
  } else {
    // Update the subscription record
    const { error: updateSubError } = await supabase
      .from("location_featured_subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (updateSubError) {
      console.error("Error updating featured subscription to cancelled:", updateSubError);
    }

    // Remove featured status from location
    if (locationId) {
      const { error: updateLocError } = await supabase
        .from("locations")
        .update({ is_featured: false })
        .eq("id", locationId);

      if (updateLocError) {
        console.error("Error removing is_featured from location:", updateLocError);
      }
    }

    // Log audit event
    if (profileId) {
      await supabase.from("audit_events").insert({
        profile_id: profileId,
        location_id: locationId || null,
        event_type: "featured_location_cancelled",
        payload: {
          subscription_id: subscription.id,
        },
      });
    }
  }

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Featured location subscription cancelled: ${locationId}`);
}

// ============================================================================
// Add-on Subscription Handlers
// ============================================================================

/**
 * Handle customer.subscription.created for add-on (inline charge path)
 * Called when subscription is created directly via API with a saved payment method.
 */
async function handleAddonSubscriptionCreated(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;
  const addonType = subscription.metadata?.addon_type;
  const quantity = parseInt(subscription.metadata?.quantity || "1", 10);

  if (!profileId || !addonType) {
    console.error("Missing metadata in addon subscription.created:", {
      profileId,
      addonType,
      subscriptionId: subscription.id,
    });
    return;
  }

  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookAddonCreated", {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      addonType,
      quantity,
      currentPeriodEnd,
    });
  } else {
    const { data: existingAddon } = await supabase
      .from("profile_addons")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (existingAddon) {
      console.log(`Addon already exists for subscription ${subscription.id}, skipping duplicate create`);
      return;
    }

    // Insert addon record
    const { error: insertError } = await supabase
      .from("profile_addons")
      .insert({
        profile_id: profileId,
        addon_type: addonType,
        quantity,
        stripe_subscription_id: subscription.id,
        status: "active",
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (insertError) {
      console.error("Error inserting addon from subscription.created:", insertError);
      return;
    }

    // Log audit event
    await supabase.from("audit_events").insert({
      profile_id: profileId,
      event_type: "addon_purchased",
      payload: {
        addon_type: addonType,
        quantity,
        subscription_id: subscription.id,
        source: "inline_charge",
      },
    });
  }

  revalidatePath("/dashboard/billing");
  console.log(`Addon purchased (inline): ${addonType} x${quantity} for profile ${profileId}`);
}

/**
 * Handle checkout.session.completed for add-on purchase
 */
async function handleAddonCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session
) {
  const profileId = session.metadata?.profile_id;
  const addonType = session.metadata?.addon_type;
  const quantity = parseInt(session.metadata?.quantity || "1", 10);
  const subscriptionId = session.subscription as string;

  if (!profileId || !addonType) {
    console.error("Missing metadata in addon checkout:", { profileId, addonType });
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });

  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookAddonCreated", {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      addonType,
      quantity,
      currentPeriodEnd,
    });
  } else {
    const { data: existingAddon } = await supabase
      .from("profile_addons")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (existingAddon) {
      console.log(`Addon already exists for subscription ${subscriptionId}, skipping duplicate checkout insert`);
      return;
    }

    // Insert addon record
    const { error: insertError } = await supabase
      .from("profile_addons")
      .insert({
        profile_id: profileId,
        addon_type: addonType,
        quantity,
        stripe_subscription_id: subscriptionId,
        status: "active",
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      });

    if (insertError) {
      console.error("Error inserting addon:", insertError);
      return;
    }

    // Log audit event
    await supabase.from("audit_events").insert({
      profile_id: profileId,
      event_type: "addon_purchased",
      payload: {
        addon_type: addonType,
        quantity,
        subscription_id: subscriptionId,
      },
    });
  }

  revalidatePath("/dashboard/billing");
  console.log(`Addon purchased: ${addonType} x${quantity} for profile ${profileId}`);
}

/**
 * Handle customer.subscription.updated for add-on
 */
async function handleAddonSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const isPastDue = subscription.status === "past_due";

  let status: string;
  if (isActive) {
    status = "active";
  } else if (isPastDue) {
    status = "past_due";
  } else {
    status = "canceled";
  }

  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

  // Sync quantity from Stripe subscription
  const quantity = subscriptionItem?.quantity ?? 1;

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookAddonUpdated", {
      stripeSubscriptionId: subscription.id,
      status,
      quantity,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } else {
    const { error } = await supabase
      .from("profile_addons")
      .update({
        status,
        quantity,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating addon subscription:", error);
    }
  }

  revalidatePath("/dashboard/billing");
  console.log(`Addon subscription updated: ${subscription.id}, status: ${status}, quantity: ${quantity}`);
}

/**
 * Handle customer.subscription.deleted for add-on
 */
async function handleAddonSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription
) {
  const profileId = subscription.metadata?.profile_id;

  if (isConvexDataEnabled()) {
    await mutateConvexUnauthenticated("billing:webhookAddonDeleted", {
      stripeSubscriptionId: subscription.id,
    });
  } else {
    const { error } = await supabase
      .from("profile_addons")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error canceling addon subscription:", error);
    }

    if (profileId) {
      await supabase.from("audit_events").insert({
        profile_id: profileId,
        event_type: "addon_cancelled",
        payload: {
          subscription_id: subscription.id,
          addon_type: subscription.metadata?.addon_type,
        },
      });
    }
  }

  revalidatePath("/dashboard/billing");
  console.log(`Addon subscription cancelled: ${subscription.id}`);
}
