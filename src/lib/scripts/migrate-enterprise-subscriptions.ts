/**
 * One-time migration script: Enterprise → Pro Stripe subscriptions
 *
 * Run with: npx tsx src/lib/scripts/migrate-enterprise-subscriptions.ts
 *
 * This script:
 * 1. Queries profiles where migrated_from_enterprise_at IS NOT NULL
 * 2. Fetches each user's Stripe subscription
 * 3. Updates the subscription item to the Pro price ID (matching their billing interval)
 * 4. Uses proration_behavior: "none" so the new price starts at next billing cycle
 *
 * Safe to run multiple times — skips users already on a Pro price.
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pro price IDs from config (read from env, same as STRIPE_PLANS.pro)
const PRO_MONTHLY_PRICE_ID =
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly";
const PRO_ANNUAL_PRICE_ID =
  process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_pro_annual";

const PRO_PRICE_IDS = new Set([PRO_MONTHLY_PRICE_ID, PRO_ANNUAL_PRICE_ID]);

async function migrateEnterpriseSubscriptions() {
  console.log("=== Enterprise → Pro Stripe Subscription Migration ===\n");
  console.log(`Pro monthly price ID: ${PRO_MONTHLY_PRICE_ID}`);
  console.log(`Pro annual price ID:  ${PRO_ANNUAL_PRICE_ID}\n`);

  // 1. Query profiles that were migrated from enterprise
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, agency_name, stripe_subscription_id, stripe_customer_id, stripe_price_id"
    )
    .not("migrated_from_enterprise_at", "is", null);

  if (error) {
    console.error("Failed to query profiles:", error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No enterprise-migrated profiles found. Nothing to do.");
    return;
  }

  console.log(
    `Found ${profiles.length} enterprise-migrated profile(s) to check.\n`
  );

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    const label = `${profile.agency_name || "Unknown"} (${profile.id})`;

    // Skip if no Stripe subscription
    if (!profile.stripe_subscription_id) {
      console.log(`SKIP  ${label} — no stripe_subscription_id`);
      skipped++;
      continue;
    }

    try {
      // 2. Fetch the Stripe subscription
      const subscription = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      );

      if (subscription.status === "canceled") {
        console.log(`SKIP  ${label} — subscription is canceled`);
        skipped++;
        continue;
      }

      // Get the first (primary) subscription item
      const item = subscription.items.data[0];
      if (!item) {
        console.log(`SKIP  ${label} — no subscription items found`);
        skipped++;
        continue;
      }

      const currentPriceId = item.price.id;

      // 3. Check if already on a Pro price (idempotent)
      if (PRO_PRICE_IDS.has(currentPriceId)) {
        console.log(
          `SKIP  ${label} — already on Pro price (${currentPriceId})`
        );
        skipped++;
        continue;
      }

      // Determine the target Pro price based on the subscription's billing interval
      const interval = item.price.recurring?.interval;
      const targetPriceId =
        interval === "year" ? PRO_ANNUAL_PRICE_ID : PRO_MONTHLY_PRICE_ID;

      // 4. Update the subscription item to the Pro price
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [
          {
            id: item.id,
            price: targetPriceId,
          },
        ],
        proration_behavior: "none",
      });

      // Update the stripe_price_id in our database to stay in sync
      await supabase
        .from("profiles")
        .update({ stripe_price_id: targetPriceId })
        .eq("id", profile.id);

      console.log(
        `OK    ${label} — ${currentPriceId} → ${targetPriceId} (${interval || "month"}ly)`
      );
      migrated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`FAIL  ${label} — ${message}`);
      failed++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Total:    ${profiles.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

migrateEnterpriseSubscriptions().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
