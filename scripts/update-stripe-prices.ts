/**
 * Update Stripe Prices Script
 *
 * Creates new prices on existing products with updated pricing.
 * Run twice - once with test key, once with live key.
 *
 * Usage:
 *   npx tsx scripts/update-stripe-prices.ts
 */

import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
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

// Use STRIPE_SECRET_KEY_PROD if available, otherwise fall back to STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = envVars.STRIPE_SECRET_KEY_PROD || envVars.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in .env.local");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

// New pricing
const NEW_PRICES = {
  pro: {
    monthly: 7900, // $79 in cents
    annual: 56400, // $564 in cents
  },
  enterprise: {
    monthly: 19900, // $199 in cents
    annual: 142800, // $1428 in cents
  },
};

async function findProductByTier(tier: string): Promise<Stripe.Product | null> {
  // Search for product with matching metadata
  const products = await stripe.products.list({ limit: 100, active: true });

  for (const product of products.data) {
    if (product.metadata?.plan_tier === tier) {
      return product;
    }
    // Also check by name
    if (product.name.toLowerCase().includes(tier.toLowerCase())) {
      return product;
    }
  }

  return null;
}

async function createNewPrices(product: Stripe.Product, tier: "pro" | "enterprise") {
  const prices = NEW_PRICES[tier];

  console.log(`\nCreating new prices for ${product.name} (${product.id})...`);

  // Create monthly price
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: prices.monthly,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: {
      plan_tier: tier,
      billing_interval: "month",
      version: "2025-01",
    },
  });
  console.log(`  ✓ Monthly: ${monthlyPrice.id} ($${prices.monthly / 100}/mo)`);

  // Create annual price
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: prices.annual,
    currency: "usd",
    recurring: { interval: "year" },
    metadata: {
      plan_tier: tier,
      billing_interval: "year",
      version: "2025-01",
    },
  });
  console.log(`  ✓ Annual: ${annualPrice.id} ($${prices.annual / 100}/yr)`);

  return { monthlyPrice, annualPrice };
}

async function main() {
  const isTestMode = STRIPE_SECRET_KEY.startsWith("sk_test_");

  console.log("=".repeat(60));
  console.log(`Stripe Price Update - ${isTestMode ? "TEST (Sandbox)" : "LIVE (Production)"}`);
  console.log("=".repeat(60));

  if (!isTestMode) {
    console.log("\n⚠️  WARNING: You are using a LIVE Stripe key!");
    console.log("Press Ctrl+C within 5 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const results: Record<string, { monthly: string; annual: string }> = {};

  // Find and update Pro product
  const proProduct = await findProductByTier("pro");
  if (proProduct) {
    const { monthlyPrice, annualPrice } = await createNewPrices(proProduct, "pro");
    results.pro = { monthly: monthlyPrice.id, annual: annualPrice.id };
  } else {
    console.log("\n❌ Pro product not found. Create it first with setup-stripe-products.ts");
  }

  // Find and update Enterprise product
  const enterpriseProduct = await findProductByTier("enterprise");
  if (enterpriseProduct) {
    const { monthlyPrice, annualPrice } = await createNewPrices(enterpriseProduct, "enterprise");
    results.enterprise = { monthly: monthlyPrice.id, annual: annualPrice.id };
  } else {
    console.log("\n❌ Enterprise product not found. Create it first with setup-stripe-products.ts");
  }

  // Output results
  if (Object.keys(results).length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log(`SUCCESS! Update your ${isTestMode ? ".env.local" : "Vercel env vars"} with:`);
    console.log("=".repeat(60));

    if (results.pro) {
      console.log(`\n# Pro Plan - NEW PRICES ($79/mo, $564/yr)`);
      console.log(`STRIPE_PRO_MONTHLY_PRICE_ID=${results.pro.monthly}`);
      console.log(`STRIPE_PRO_ANNUAL_PRICE_ID=${results.pro.annual}`);
    }

    if (results.enterprise) {
      console.log(`\n# Enterprise Plan - NEW PRICES ($199/mo, $1428/yr)`);
      console.log(`STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=${results.enterprise.monthly}`);
      console.log(`STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=${results.enterprise.annual}`);
    }

    console.log("\n" + "=".repeat(60));
    if (isTestMode) {
      console.log("Next: Run again with your LIVE Stripe key to update production");
    } else {
      console.log("Done! Update these in Vercel environment variables.");
    }
    console.log("=".repeat(60));
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
