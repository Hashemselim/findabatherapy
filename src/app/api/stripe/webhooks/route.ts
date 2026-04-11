import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/env";
import { stopDripForUser } from "@/lib/actions/drip-emails";
import {
  sendAdminFirstPaymentNotification,
  sendPaymentFailureNotification,
} from "@/lib/email/notifications";
import { queryConvexUnauthenticated, mutateConvexUnauthenticated } from "@/lib/platform/convex/server";
import { stripe } from "@/lib/stripe";

function revalidateBillingSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/billing");
}

function getCurrentPeriodEndFromSubscription(subscription: Stripe.Subscription) {
  const subscriptionItem = subscription.items.data[0];
  return subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
    : new Date().toISOString();
}

async function loadSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data"] });
}

type WebhookWorkspaceContext = {
  workspaceId: string;
  agencyName: string | null;
  contactEmail: string | null;
  planTier: string;
  billingInterval: string;
  state: string | null;
  slug: string | null;
} | null;

async function getWebhookWorkspaceContext(args: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}) {
  return queryConvexUnauthenticated<WebhookWorkspaceContext>(
    "billing:getWebhookWorkspaceContext",
    args,
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "featured_location") {
          await handleFeaturedLocationCheckoutCompleted(session);
        } else if (session.metadata?.type === "addon") {
          await handleAddonCheckoutCompleted(session);
        } else {
          await handleCheckoutCompleted(session);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionCreated(subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionCreated(subscription);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionUpdated(subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionUpdated(subscription);
        } else {
          await handleSubscriptionUpdated(subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.type === "featured_location") {
          await handleFeaturedLocationSubscriptionDeleted(subscription);
        } else if (subscription.metadata?.type === "addon") {
          await handleAddonSubscriptionDeleted(subscription);
        } else {
          await handleSubscriptionDeleted(subscription);
        }
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const profileId = session.metadata?.profile_id;
  const listingId = session.metadata?.listing_id;
  const planTier = session.metadata?.plan_tier || "pro";
  const billingInterval = session.metadata?.billing_interval || "month";
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!profileId || !stripeCustomerId || !stripeSubscriptionId) {
    console.error("Missing checkout metadata", {
      profileId,
      stripeCustomerId,
      stripeSubscriptionId,
    });
    return;
  }

  await mutateConvexUnauthenticated("billing:webhookCheckoutCompleted", {
    stripeCustomerId,
    stripeSubscriptionId,
    planTier,
    billingInterval,
    profileId,
    listingId: listingId || undefined,
  });

  await stopDripForUser(profileId);
  revalidateBillingSurfaces();
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!stripeCustomerId) {
    console.error("No customer id on subscription update", subscription.id);
    return;
  }

  await mutateConvexUnauthenticated("billing:webhookSubscriptionUpdated", {
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    planTier: subscription.metadata?.plan_tier || "pro",
    billingInterval: subscription.metadata?.billing_interval || "month",
    subscriptionStatus: subscription.status,
  });

  revalidateBillingSurfaces();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!stripeCustomerId) {
    console.error("No customer id on subscription deletion", subscription.id);
    return;
  }

  await mutateConvexUnauthenticated("billing:webhookSubscriptionDeleted", {
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
  });

  revalidateBillingSurfaces();
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) {
    return;
  }

  const context = await getWebhookWorkspaceContext({ stripeCustomerId });
  if (
    context &&
    invoice.billing_reason === "subscription_create" &&
    invoice.amount_paid > 0 &&
    context.contactEmail
  ) {
    await sendAdminFirstPaymentNotification({
      agencyName: context.agencyName || "Unknown",
      email: context.contactEmail,
      planTier: context.planTier || "pro",
      billingInterval: context.billingInterval || "month",
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      state: context.state,
    });
  }

  revalidateBillingSurfaces();
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) {
    return;
  }

  const context = await getWebhookWorkspaceContext({ stripeCustomerId });
  if (context?.contactEmail) {
    await sendPaymentFailureNotification({
      to: context.contactEmail,
      providerName: context.agencyName || "Provider",
      invoiceId: invoice.id || "unknown",
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count || 1,
    });
  }

  revalidateBillingSurfaces();
}

async function handleFeaturedLocationCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const locationId = session.metadata?.location_id;
  const billingInterval = session.metadata?.billing_interval || "month";

  if (!stripeCustomerId || !stripeSubscriptionId || !locationId) {
    console.error("Missing featured checkout metadata", {
      stripeCustomerId,
      stripeSubscriptionId,
      locationId,
    });
    return;
  }

  const subscription = await loadSubscription(stripeSubscriptionId);
  await mutateConvexUnauthenticated("billing:webhookFeaturedLocationCreated", {
    stripeCustomerId,
    stripeSubscriptionId,
    locationId,
    billingInterval,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
  });

  revalidateBillingSurfaces();
}

async function handleFeaturedLocationSubscriptionCreated(subscription: Stripe.Subscription) {
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const locationId = subscription.metadata?.location_id;
  const billingInterval = subscription.metadata?.billing_interval || "month";

  if (!stripeCustomerId || !locationId) {
    console.error("Missing featured subscription metadata", {
      stripeCustomerId,
      locationId,
      subscriptionId: subscription.id,
    });
    return;
  }

  await mutateConvexUnauthenticated("billing:webhookFeaturedLocationCreated", {
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    locationId,
    billingInterval,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
  });

  revalidateBillingSurfaces();
}

async function handleFeaturedLocationSubscriptionUpdated(subscription: Stripe.Subscription) {
  const locationId = subscription.metadata?.location_id;
  if (!locationId) {
    console.error("No location_id in featured subscription metadata");
    return;
  }

  const status =
    subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : "cancelled";

  await mutateConvexUnauthenticated("billing:webhookFeaturedLocationUpdated", {
    stripeSubscriptionId: subscription.id,
    status,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    locationId,
  });

  revalidateBillingSurfaces();
}

async function handleFeaturedLocationSubscriptionDeleted(subscription: Stripe.Subscription) {
  await mutateConvexUnauthenticated("billing:webhookFeaturedLocationDeleted", {
    stripeSubscriptionId: subscription.id,
    locationId: subscription.metadata?.location_id || undefined,
  });

  revalidateBillingSurfaces();
}

async function handleAddonSubscriptionCreated(subscription: Stripe.Subscription) {
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const addonType = subscription.metadata?.addon_type;
  const quantity = parseInt(subscription.metadata?.quantity || "1", 10);

  if (!stripeCustomerId || !addonType) {
    console.error("Missing addon subscription metadata", {
      stripeCustomerId,
      addonType,
      subscriptionId: subscription.id,
    });
    return;
  }

  await mutateConvexUnauthenticated("billing:webhookAddonCreated", {
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    addonType,
    quantity,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
  });

  revalidateBillingSurfaces();
}

async function handleAddonCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const addonType = session.metadata?.addon_type;
  const quantity = parseInt(session.metadata?.quantity || "1", 10);

  if (!stripeCustomerId || !stripeSubscriptionId || !addonType) {
    console.error("Missing addon checkout metadata", {
      stripeCustomerId,
      stripeSubscriptionId,
      addonType,
    });
    return;
  }

  const subscription = await loadSubscription(stripeSubscriptionId);
  await mutateConvexUnauthenticated("billing:webhookAddonCreated", {
    stripeCustomerId,
    stripeSubscriptionId,
    addonType,
    quantity,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
  });

  revalidateBillingSurfaces();
}

async function handleAddonSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionItem = subscription.items.data[0];
  const status =
    subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : "canceled";

  await mutateConvexUnauthenticated("billing:webhookAddonUpdated", {
    stripeSubscriptionId: subscription.id,
    status,
    quantity: subscriptionItem?.quantity ?? 1,
    currentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  revalidateBillingSurfaces();
}

async function handleAddonSubscriptionDeleted(subscription: Stripe.Subscription) {
  await mutateConvexUnauthenticated("billing:webhookAddonDeleted", {
    stripeSubscriptionId: subscription.id,
  });

  revalidateBillingSurfaces();
}
