/**
 * Stripe product and price configuration
 *
 * These IDs should match what's configured in your Stripe dashboard.
 * In production, these would be real price IDs like "price_1ABC123..."
 *
 * Plans:
 * - Free: $0/mo (no Stripe subscription needed)
 * - Pro: $79/mo or $564/yr ($47/mo equivalent - 40% off)
 * - Enterprise: $199/mo or $1,428/yr ($119/mo equivalent - 40% off)
 * - Featured Add-on: $99/mo (requires Pro or Enterprise)
 */

export type BillingInterval = "month" | "year";

export interface PlanPricing {
  priceId: string;
  price: number; // Monthly equivalent price
  totalPrice?: number; // For annual, the total yearly price
  savings?: number; // For annual, savings compared to monthly
}

export interface StripePlan {
  name: string;
  monthly: PlanPricing;
  annual: PlanPricing;
  features: string[];
}

export const STRIPE_PLANS: Record<"pro" | "enterprise", StripePlan> = {
  pro: {
    name: "Pro",
    monthly: {
      priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
      price: 79,
    },
    annual: {
      priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_pro_annual",
      price: 47, // Per month equivalent
      totalPrice: 564, // Total per year
      savings: 384, // Savings vs monthly ($948 - $564)
    },
    features: [
      "Branded agency page & intake forms",
      "Up to 250 CRM contacts",
      "Communication templates",
      "Up to 5 locations",
      "Photo gallery (up to 10)",
      "Video embed",
      "Verified badge & Google rating",
      "Analytics dashboard",
      "Priority search placement",
      "Up to 5 job postings",
      "Insurance & authorization tracking",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthly: {
      priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "price_enterprise_monthly",
      price: 199,
    },
    annual: {
      priceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || "price_enterprise_annual",
      price: 119, // Per month equivalent
      totalPrice: 1428, // Total per year
      savings: 960, // Savings vs monthly ($2388 - $1428)
    },
    features: [
      "Everything in Pro",
      "Unlimited locations & CRM contacts",
      "Homepage placement",
      "Unlimited job postings",
      "Dedicated support",
    ],
  },
};

/**
 * Featured addon price IDs (actual prices fetched from Stripe at runtime)
 */
export const FEATURED_PRICE_IDS = {
  monthly: process.env.STRIPE_FEATURED_MONTHLY_PRICE_ID || "price_featured_monthly",
  annual: process.env.STRIPE_FEATURED_ANNUAL_PRICE_ID || "price_featured_annual",
};

export type PlanId = keyof typeof STRIPE_PLANS;

/**
 * Get plan details by plan tier name
 */
export function getPlanByTier(tier: string): StripePlan | null {
  if (tier === "pro" || tier === "enterprise") {
    return STRIPE_PLANS[tier];
  }
  return null;
}

/**
 * Get price ID for a plan tier and billing interval
 */
export function getPriceId(tier: string, interval: BillingInterval = "month"): string | null {
  const plan = getPlanByTier(tier);
  if (!plan) return null;
  return interval === "year" ? plan.annual.priceId : plan.monthly.priceId;
}

/**
 * Get pricing details for a plan tier and billing interval
 */
export function getPlanPricing(tier: string, interval: BillingInterval = "month"): PlanPricing | null {
  const plan = getPlanByTier(tier);
  if (!plan) return null;
  return interval === "year" ? plan.annual : plan.monthly;
}

/**
 * Check if a plan tier requires payment
 */
export function isPaidPlan(tier: string): boolean {
  return tier === "pro" || tier === "enterprise";
}

/**
 * Get featured addon price ID for a billing interval
 */
export function getFeaturedPriceId(interval: BillingInterval = "month"): string {
  return interval === "year"
    ? FEATURED_PRICE_IDS.annual
    : FEATURED_PRICE_IDS.monthly;
}

/**
 * Billing portal configuration (relative path - origin is added in actions)
 */
export const BILLING_PORTAL_CONFIG = {
  returnUrl: "/dashboard/billing",
};

/**
 * Checkout success/cancel URL paths (relative paths - origin is added in actions)
 */
export const CHECKOUT_URLS = {
  success: "/dashboard/billing/success",
  cancel: "/dashboard/billing/cancel",
};