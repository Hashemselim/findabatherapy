import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/env";
import { sendPaymentFailureNotification } from "@/lib/email/notifications";

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

  const supabase = await createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Route to appropriate handler based on checkout type
        if (session.metadata?.type === "featured_location") {
          await handleFeaturedLocationCheckoutCompleted(supabase, session);
        } else {
          await handleCheckoutCompleted(supabase, session);
        }
        break;
      }

      case "customer.subscription.created": {
        // Handle subscriptions created directly via API (not through checkout)
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionCreated(supabase, subscription);
        }
        // Note: Main plan subscriptions go through checkout, so we don't need to handle them here
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // Route to appropriate handler based on subscription type
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionUpdated(supabase, subscription);
        } else {
          await handleSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        // Route to appropriate handler based on subscription type
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionDeleted(supabase, subscription);
        } else {
          await handleSubscriptionDeleted(supabase, subscription);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
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

  // Get subscription details
  const subscriptionId = session.subscription as string;

  // Update profile with Stripe IDs, plan tier, billing interval, and subscription status
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      plan_tier: planTier || "pro",
      billing_interval: billingInterval,
      subscription_status: "active", // New subscription is always active
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return;
  }

  // Publish listing if it exists
  if (listingId) {
    const { error: listingError } = await supabase
      .from("listings")
      .update({
        status: "published",
        plan_tier: planTier || "pro",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);

    if (listingError) {
      console.error("Error updating listing:", listingError);
    }
  }

  // Log audit event
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

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

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
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  // Update profile with subscription status
  const { error } = await supabase
    .from("profiles")
    .update({
      plan_tier: isActive ? planTier : "free",
      billing_interval: isActive ? billingInterval : "month",
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status, // Sync Stripe subscription status
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    console.error("Error updating profile subscription:", error);
  }

  // Update listing plan tier
  await supabase
    .from("listings")
    .update({
      plan_tier: isActive ? planTier : "free",
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  // Revalidate dashboard pages so the UI reflects the change
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

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Subscription cancelled for profile ${targetProfileId}`);
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

  // Find profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
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
    },
  });

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

  // Check if record already exists (idempotency)
  const { data: existing } = await supabase
    .from("location_featured_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (existing) {
    console.log(`Featured subscription already exists for ${subscription.id}`);
    return;
  }

  // Get current period end from the subscription item
  const subscriptionItem = subscription.items.data[0];
  const currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();

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

  // Revalidate dashboard pages so the UI reflects the change
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");

  console.log(`Featured location subscription cancelled: ${locationId}`);
}
