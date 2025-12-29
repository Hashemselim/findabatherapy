/**
 * Plan feature definitions and configuration
 * This is the source of truth for all plan-based feature restrictions
 */

export type PlanTier = "free" | "pro" | "enterprise";
export type BillingInterval = "month" | "year";

export interface PlanFeatures {
  // Limits
  maxLocations: number;
  maxPhotos: number;

  // Features
  hasContactForm: boolean;
  hasPhotoGallery: boolean;
  hasVideoEmbed: boolean;
  hasVerifiedBadge: boolean;
  hasAnalytics: boolean;
  hasHomepagePlacement: boolean;
  hasFeaturedAddonEligibility: boolean;
  hasGoogleRating: boolean;

  // Premium profile attributes (gated in onboarding)
  hasAgeRange: boolean;
  hasLanguages: boolean;
  hasDiagnoses: boolean;
  hasSpecialties: boolean;

  // Search
  searchPriority: "standard" | "priority";
}

export interface PlanPricing {
  monthly: {
    price: number;
  };
  annual: {
    price: number; // Per month equivalent
    totalPrice: number; // Total per year
    savings: number; // Savings vs monthly
  };
}

export interface PlanConfig {
  name: string;
  displayName: string;
  description: string;
  pricing: PlanPricing;
  features: PlanFeatures;
  highlights: string[];
}

/**
 * Plan configuration by tier
 */
export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    name: "free",
    displayName: "Free",
    description: "Get started with basic visibility",
    pricing: {
      monthly: { price: 0 },
      annual: { price: 0, totalPrice: 0, savings: 0 },
    },
    features: {
      maxLocations: 1,
      maxPhotos: 0,
      hasContactForm: false,
      hasPhotoGallery: false,
      hasVideoEmbed: false,
      hasVerifiedBadge: false,
      hasAnalytics: false,
      hasHomepagePlacement: false,
      hasFeaturedAddonEligibility: false,
      hasGoogleRating: false,
      hasAgeRange: false,
      hasLanguages: false,
      hasDiagnoses: false,
      hasSpecialties: false,
      searchPriority: "standard",
    },
    highlights: [
      "Basic listing",
      "1 service location",
      "Email contact only",
    ],
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    description: "Stand out and connect with more families",
    pricing: {
      monthly: { price: 49 },
      annual: { price: 29, totalPrice: 348, savings: 240 },
    },
    features: {
      maxLocations: 5,
      maxPhotos: 10,
      hasContactForm: true,
      hasPhotoGallery: true,
      hasVideoEmbed: true,
      hasVerifiedBadge: true,
      hasAnalytics: true,
      hasHomepagePlacement: false,
      hasFeaturedAddonEligibility: true,
      hasGoogleRating: true,
      hasAgeRange: true,
      hasLanguages: true,
      hasDiagnoses: true,
      hasSpecialties: true,
      searchPriority: "priority",
    },
    highlights: [
      "Up to 5 locations",
      "Contact form on listing",
      "Photo gallery (up to 10)",
      "Video embed",
      "Verified badge",
      "Google star rating integration",
      "Analytics dashboard",
      "Priority in search results",
      "Ages, languages, diagnoses & specialties",
    ],
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    description: "Maximum visibility for large agencies",
    pricing: {
      monthly: { price: 149 },
      annual: { price: 89, totalPrice: 1068, savings: 720 },
    },
    features: {
      maxLocations: 999, // Essentially unlimited
      maxPhotos: 10,
      hasContactForm: true,
      hasPhotoGallery: true,
      hasVideoEmbed: true,
      hasVerifiedBadge: true,
      hasAnalytics: true,
      hasHomepagePlacement: true,
      hasFeaturedAddonEligibility: true,
      hasGoogleRating: true,
      hasAgeRange: true,
      hasLanguages: true,
      hasDiagnoses: true,
      hasSpecialties: true,
      searchPriority: "priority",
    },
    highlights: [
      "Unlimited locations",
      "Everything in Pro",
      "Homepage placement",
      "Dedicated support",
    ],
  },
};

/**
 * Feature metadata for UI display
 */
export const FEATURE_METADATA: Record<
  keyof PlanFeatures,
  { name: string; description: string; upgradeMessage: string }
> = {
  maxLocations: {
    name: "Service Locations",
    description: "Number of physical locations you can list",
    upgradeMessage: "Upgrade to add more service locations",
  },
  maxPhotos: {
    name: "Photo Gallery",
    description: "Number of photos you can add to your listing",
    upgradeMessage: "Upgrade to Pro to showcase your facility with photos",
  },
  hasContactForm: {
    name: "Contact Form",
    description: "Allow families to contact you directly through your listing",
    upgradeMessage: "Upgrade to Pro to receive inquiries through your listing",
  },
  hasPhotoGallery: {
    name: "Photo Gallery",
    description: "Display photos of your facility and team",
    upgradeMessage: "Upgrade to Pro to add a photo gallery",
  },
  hasVideoEmbed: {
    name: "Video Embed",
    description: "Add a YouTube or Vimeo video to your listing",
    upgradeMessage: "Upgrade to Pro to add a video to your listing",
  },
  hasVerifiedBadge: {
    name: "Verified Badge",
    description: "Display a verified badge on your listing",
    upgradeMessage: "Upgrade to Pro to get a verified badge",
  },
  hasAnalytics: {
    name: "Analytics Dashboard",
    description: "Track views, clicks, and inquiries",
    upgradeMessage: "Upgrade to Pro to access analytics",
  },
  hasHomepagePlacement: {
    name: "Homepage Placement",
    description: "Featured placement on the homepage",
    upgradeMessage: "Upgrade to Enterprise for homepage placement",
  },
  hasFeaturedAddonEligibility: {
    name: "Featured Add-on",
    description: "Eligibility for the Featured add-on ($99/mo)",
    upgradeMessage: "Upgrade to Pro to access Featured add-on",
  },
  hasGoogleRating: {
    name: "Google Star Rating",
    description: "Display your Google Business star rating on your listing",
    upgradeMessage: "Upgrade to Pro to show your Google rating",
  },
  searchPriority: {
    name: "Search Priority",
    description: "Higher ranking in search results",
    upgradeMessage: "Upgrade to Pro for priority search ranking",
  },
  hasAgeRange: {
    name: "Age Range",
    description: "Display the age range you serve on your listing",
    upgradeMessage: "Upgrade to Pro to display ages served",
  },
  hasLanguages: {
    name: "Languages Spoken",
    description: "Display languages your team speaks",
    upgradeMessage: "Upgrade to Pro to display languages spoken",
  },
  hasDiagnoses: {
    name: "Diagnoses Supported",
    description: "Display diagnoses your practice specializes in",
    upgradeMessage: "Upgrade to Pro to display diagnoses supported",
  },
  hasSpecialties: {
    name: "Clinical Specialties",
    description: "Display your clinical specialties and services",
    upgradeMessage: "Upgrade to Pro to display clinical specialties",
  },
};

/**
 * Get plan configuration by tier
 */
export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIGS[tier];
}

/**
 * Get features for a specific plan
 */
export function getPlanFeatures(tier: PlanTier): PlanFeatures {
  return PLAN_CONFIGS[tier].features;
}

/**
 * Check if a plan is paid
 */
export function isPaidPlan(tier: PlanTier): boolean {
  return tier !== "free";
}

/**
 * Get the next upgrade tier
 */
export function getNextUpgradeTier(currentTier: PlanTier): PlanTier | null {
  switch (currentTier) {
    case "free":
      return "pro";
    case "pro":
      return "enterprise";
    case "enterprise":
      return null;
  }
}

/**
 * Compare two plan tiers
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function comparePlanTiers(a: PlanTier, b: PlanTier): number {
  const order: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };
  return order[a] - order[b];
}

/**
 * Check if tier A has at least the same level as tier B
 */
export function hasMinimumTier(current: PlanTier, minimum: PlanTier): boolean {
  return comparePlanTiers(current, minimum) >= 0;
}
