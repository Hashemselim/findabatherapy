/**
 * Script to sync featured location subscriptions from Stripe
 *
 * Run with: npx tsx scripts/sync-featured-subscriptions.ts
 *
 * This script:
 * 1. Fetches all subscriptions from Stripe with metadata.type = "featured_location"
 * 2. Creates/updates the location_featured_subscriptions table
 * 3. Sets is_featured = true on the corresponding locations
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for admin operations
);

async function syncFeaturedSubscriptions() {
  console.log("Starting featured subscriptions sync...\n");

  // Fetch all active/trialing featured location subscriptions from Stripe
  const subscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.items.data"],
    });

    // Filter for featured location subscriptions
    const featured = response.data.filter(
      (sub) => sub.metadata?.type === "featured_location"
    );
    subscriptions.push(...featured);

    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`Found ${subscriptions.length} featured location subscription(s) in Stripe\n`);

  for (const subscription of subscriptions) {
    const profileId = subscription.metadata?.profile_id;
    const locationId = subscription.metadata?.location_id;
    const billingInterval = subscription.metadata?.billing_interval || "month";

    if (!profileId || !locationId) {
      console.log(`⚠️  Skipping subscription ${subscription.id} - missing metadata`);
      continue;
    }

    // Determine status
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const isPastDue = subscription.status === "past_due";
    const isCancelled = subscription.status === "canceled" || subscription.status === "incomplete_expired";

    let status: string;
    if (isActive) {
      status = "active";
    } else if (isPastDue) {
      status = "past_due";
    } else {
      status = "cancelled";
    }

    // Get current period end
    const subscriptionItem = subscription.items.data[0];
    const currentPeriodEnd = subscriptionItem?.current_period_end
      ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
      : null;

    console.log(`Processing subscription ${subscription.id}:`);
    console.log(`  Location: ${locationId}`);
    console.log(`  Profile: ${profileId}`);
    console.log(`  Status: ${status}`);
    console.log(`  Billing: ${billingInterval}`);
    console.log(`  Cancel at period end: ${subscription.cancel_at_period_end}`);

    // Check if record exists
    const { data: existing } = await supabase
      .from("location_featured_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("location_featured_subscriptions")
        .update({
          status,
          billing_interval: billingInterval,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.log(`  ❌ Error updating record: ${error.message}`);
      } else {
        console.log(`  ✅ Updated existing record`);
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from("location_featured_subscriptions")
        .insert({
          location_id: locationId,
          profile_id: profileId,
          stripe_subscription_id: subscription.id,
          stripe_subscription_item_id: subscriptionItem?.id || null,
          billing_interval: billingInterval,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

      if (error) {
        console.log(`  ❌ Error inserting record: ${error.message}`);
      } else {
        console.log(`  ✅ Created new record`);
      }
    }

    // Update is_featured on location
    if (status === "active" || status === "past_due") {
      const { error } = await supabase
        .from("locations")
        .update({ is_featured: true })
        .eq("id", locationId);

      if (error) {
        console.log(`  ❌ Error updating location is_featured: ${error.message}`);
      } else {
        console.log(`  ✅ Set location is_featured = true`);
      }
    } else if (isCancelled) {
      const { error } = await supabase
        .from("locations")
        .update({ is_featured: false })
        .eq("id", locationId);

      if (error) {
        console.log(`  ❌ Error updating location is_featured: ${error.message}`);
      } else {
        console.log(`  ✅ Set location is_featured = false (cancelled)`);
      }
    }

    console.log("");
  }

  console.log("Sync complete!");
}

syncFeaturedSubscriptions().catch(console.error);
