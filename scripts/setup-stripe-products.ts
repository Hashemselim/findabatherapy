/**
 * Stripe Products & Prices Setup Script
 *
 * Run this script to create products and prices in your Stripe account.
 * This creates both monthly and annual prices for each plan.
 *
 * Usage: npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex);
      const value = trimmed.substring(eqIndex + 1);
      envVars[key] = value;
    }
  }
});

const STRIPE_SECRET_KEY = envVars.STRIPE_SECRET_KEY;
const SITE_URL = envVars.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in .env.local");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

interface PlanConfig {
  name: string;
  description: string;
  monthlyPrice: number; // in dollars
  annualPrice: number; // in dollars (total per year)
  features: string[];
  metadata: Record<string, string>;
}

const PLANS: Record<string, PlanConfig> = {
  pro: {
    name: "Pro",
    description: "Stand out and connect with more families",
    monthlyPrice: 79,
    annualPrice: 564, // $47/mo equivalent, 40% off
    features: [
      "Up to 5 service locations",
      "Priority search placement",
      "Contact form on listing",
      "Photo gallery (up to 10)",
      "Video embed",
      "Verified badge",
      "Analytics dashboard",
      "Up to 5 job postings",
      "Up to 250 CRM contacts",
    ],
    metadata: {
      plan_tier: "pro",
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "Maximum visibility for large agencies",
    monthlyPrice: 199,
    annualPrice: 1428, // $119/mo equivalent, 40% off
    features: [
      "Unlimited service locations",
      "Top search placement",
      "Contact form on listing",
      "Photo gallery (up to 10)",
      "Video embed",
      "Verified badge",
      "Advanced analytics",
      "Homepage placement",
      "Dedicated support",
      "Unlimited job postings",
      "Unlimited CRM contacts",
    ],
    metadata: {
      plan_tier: "enterprise",
    },
  },
  featured: {
    name: "Featured Add-on",
    description: "Premium visibility boost for your listing",
    monthlyPrice: 99,
    annualPrice: 948, // $79/mo equivalent
    features: [
      "Pinned to top of state results",
      "Sponsored banner placements",
      "Featured badge on listing",
      "Monthly performance reports",
    ],
    metadata: {
      plan_tier: "featured",
      addon: "true",
    },
  },
};

interface ProductResult {
  productId: string;
  monthlyPriceId: string;
  annualPriceId: string;
}

async function createProduct(key: string, config: PlanConfig): Promise<ProductResult> {
  console.log(`\nCreating product: ${config.name}...`);

  // Create the product
  const product = await stripe.products.create({
    name: `Find ABA Therapy - ${config.name}`,
    description: config.description,
    metadata: {
      ...config.metadata,
      features: JSON.stringify(config.features),
    },
  });

  console.log(`  ✓ Product created: ${product.id}`);

  // Create monthly price
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: config.monthlyPrice * 100, // Convert to cents
    currency: "usd",
    recurring: {
      interval: "month",
    },
    metadata: {
      ...config.metadata,
      billing_interval: "month",
    },
  });

  console.log(`  ✓ Monthly price created: ${monthlyPrice.id} ($${config.monthlyPrice}/month)`);

  // Create annual price
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: config.annualPrice * 100, // Convert to cents
    currency: "usd",
    recurring: {
      interval: "year",
    },
    metadata: {
      ...config.metadata,
      billing_interval: "year",
    },
  });

  const monthlyEquivalent = Math.round(config.annualPrice / 12);
  console.log(`  ✓ Annual price created: ${annualPrice.id} ($${config.annualPrice}/year = $${monthlyEquivalent}/mo)`);

  return {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    annualPriceId: annualPrice.id,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Stripe Products & Prices Setup");
  console.log("=".repeat(60));

  // Check if we're in test mode
  const isTestMode = STRIPE_SECRET_KEY.startsWith("sk_test_");
  console.log(`\nMode: ${isTestMode ? "TEST (Sandbox)" : "LIVE (Production)"}`);

  if (!isTestMode) {
    console.log("\n⚠️  WARNING: You are using a LIVE Stripe key!");
    console.log("Press Ctrl+C within 5 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const results: Record<string, ProductResult> = {};

  try {
    // Create all products and prices
    for (const [key, config] of Object.entries(PLANS)) {
      results[key] = await createProduct(key, config);
    }

    // Output the environment variables to add
    console.log("\n" + "=".repeat(60));
    console.log("SUCCESS! Add these to your .env.local file:");
    console.log("=".repeat(60));
    console.log(`
# Stripe Price IDs (${isTestMode ? "TEST" : "PRODUCTION"})
# Monthly prices
STRIPE_PRO_MONTHLY_PRICE_ID=${results.pro.monthlyPriceId}
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=${results.enterprise.monthlyPriceId}
# Annual prices (40% discount)
STRIPE_PRO_ANNUAL_PRICE_ID=${results.pro.annualPriceId}
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=${results.enterprise.annualPriceId}
# Featured Location Add-on
STRIPE_FEATURED_MONTHLY_PRICE_ID=${results.featured.monthlyPriceId}
STRIPE_FEATURED_ANNUAL_PRICE_ID=${results.featured.annualPriceId}
`);

    console.log("=".repeat(60));
    console.log("Next steps:");
    console.log("=".repeat(60));
    console.log(`
1. Copy the price IDs above to your .env.local file
2. Set up a webhook endpoint in Stripe Dashboard:
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Add endpoint: ${SITE_URL}/api/stripe/webhooks
   - Select events:
     • checkout.session.completed
     • customer.subscription.created
     • customer.subscription.updated
     • customer.subscription.deleted
     • invoice.paid
     • invoice.payment_failed
3. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
`);

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
