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
  maxJobPostings: number; // -1 for unlimited
  maxClients: number; // -1 for unlimited

  // Features
  hasContactForm: boolean;
  hasPhotoGallery: boolean;
  hasVideoEmbed: boolean;
  hasVerifiedBadge: boolean;
  hasAnalytics: boolean;
  hasHomepagePlacement: boolean;
  hasFeaturedAddonEligibility: boolean;
  hasGoogleRating: boolean;

  // Profile attributes (free for all tiers)
  hasAgeRange: boolean;
  hasLanguages: boolean;
  hasDiagnoses: boolean;
  hasSpecialties: boolean;

  // Branded pages & workflow tools (Pro+)
  hasBrandedPages: boolean;
  hasCommunications: boolean;
  hasInsuranceTracking: boolean;
  hasAuthTracking: boolean;
  hasDocuments: boolean;
  hasAutoTasks: boolean;
  hasReferralTracking: boolean;

  // Operations
  hasTaskAutomation: boolean;
  hasCredentialTracking: boolean;

  // Provider Website
  hasWebsiteWatermarkRemoval: boolean;
  hasCustomDomain: boolean;

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
    savingsPercent: number; // Savings percentage
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
    description: "Get started with a professional listing",
    pricing: {
      monthly: { price: 0 },
      annual: { price: 0, totalPrice: 0, savings: 0, savingsPercent: 0 },
    },
    features: {
      maxLocations: 3,
      maxPhotos: 3,
      maxJobPostings: 1,
      maxClients: 10,
      hasContactForm: false,
      hasPhotoGallery: true,
      hasVideoEmbed: false,
      hasVerifiedBadge: false,
      hasAnalytics: false,
      hasHomepagePlacement: false,
      hasFeaturedAddonEligibility: false,
      hasGoogleRating: false,
      hasAgeRange: true,
      hasLanguages: true,
      hasDiagnoses: true,
      hasSpecialties: true,
      hasBrandedPages: false,
      hasCommunications: false,
      hasInsuranceTracking: false,
      hasAuthTracking: false,
      hasDocuments: false,
      hasAutoTasks: false,
      hasReferralTracking: false,
      hasTaskAutomation: false,
      hasCredentialTracking: false,
      hasWebsiteWatermarkRemoval: false,
      hasCustomDomain: false,
      searchPriority: "standard",
    },
    highlights: [
      "Professional listing with all profile details",
      "Up to 3 service locations",
      "Photo gallery (up to 3)",
      "Ages, languages, diagnoses & specialties",
      "1 job posting",
      "10 client records",
      "SEO-boosting backlink",
    ],
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    description: "Branded pages, full CRM, and growth tools",
    pricing: {
      monthly: { price: 79 },
      annual: { price: 47, totalPrice: 564, savings: 384, savingsPercent: 40 },
    },
    features: {
      maxLocations: 5,
      maxPhotos: 10,
      maxJobPostings: 5,
      maxClients: 250,
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
      hasBrandedPages: true,
      hasCommunications: true,
      hasInsuranceTracking: true,
      hasAuthTracking: true,
      hasDocuments: true,
      hasAutoTasks: true,
      hasReferralTracking: true,
      hasTaskAutomation: true,
      hasCredentialTracking: true,
      hasWebsiteWatermarkRemoval: true,
      hasCustomDomain: true,
      searchPriority: "priority",
    },
    highlights: [
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
    name: "enterprise",
    displayName: "Enterprise",
    description: "Maximum visibility for large agencies",
    pricing: {
      monthly: { price: 199 },
      annual: { price: 119, totalPrice: 1428, savings: 960, savingsPercent: 40 },
    },
    features: {
      maxLocations: 999, // Essentially unlimited
      maxPhotos: 10,
      maxJobPostings: -1, // Unlimited
      maxClients: 999, // Essentially unlimited
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
      hasBrandedPages: true,
      hasCommunications: true,
      hasInsuranceTracking: true,
      hasAuthTracking: true,
      hasDocuments: true,
      hasAutoTasks: true,
      hasReferralTracking: true,
      hasTaskAutomation: true,
      hasCredentialTracking: true,
      hasWebsiteWatermarkRemoval: true,
      hasCustomDomain: true,
      searchPriority: "priority",
    },
    highlights: [
      "Everything in Pro",
      "Unlimited locations & CRM contacts",
      "Homepage placement",
      "Unlimited job postings",
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
    upgradeMessage: "Upgrade to add more photos",
  },
  maxJobPostings: {
    name: "Job Postings",
    description: "Number of job postings you can create",
    upgradeMessage: "Upgrade to post more jobs",
  },
  maxClients: {
    name: "Client Records",
    description: "Number of client records you can manage",
    upgradeMessage: "Upgrade to Pro for more client records and full CRM tools",
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
    upgradeMessage: "Available on all plans",
  },
  hasLanguages: {
    name: "Languages Spoken",
    description: "Display languages your team speaks",
    upgradeMessage: "Available on all plans",
  },
  hasDiagnoses: {
    name: "Diagnoses Supported",
    description: "Display diagnoses your practice specializes in",
    upgradeMessage: "Available on all plans",
  },
  hasSpecialties: {
    name: "Clinical Specialties",
    description: "Display your clinical specialties and services",
    upgradeMessage: "Available on all plans",
  },
  hasBrandedPages: {
    name: "Branded Agency Page",
    description: "A professional, shareable agency page with your branding",
    upgradeMessage: "Upgrade to Pro for branded pages, CRM tools, and communication templates",
  },
  hasCommunications: {
    name: "Client Communications",
    description: "Send templated emails to clients throughout the lifecycle",
    upgradeMessage: "Upgrade to Pro to send communications to clients",
  },
  hasInsuranceTracking: {
    name: "Insurance Tracking",
    description: "Track client insurance details and verification status",
    upgradeMessage: "Upgrade to Pro for insurance tracking and full CRM tools",
  },
  hasAuthTracking: {
    name: "Authorization Tracking",
    description: "Track client authorizations and expiration dates",
    upgradeMessage: "Upgrade to Pro for authorization tracking and automated reminders",
  },
  hasDocuments: {
    name: "Document Management",
    description: "Upload and organize client documents",
    upgradeMessage: "Upgrade to Pro for document management",
  },
  hasAutoTasks: {
    name: "Automated Tasks",
    description: "Automatically create tasks for expiring authorizations and credentials",
    upgradeMessage: "Upgrade to Pro for automated task reminders",
  },
  hasReferralTracking: {
    name: "Referral Analytics",
    description: "Track where your clients come from with referral source analytics",
    upgradeMessage: "Upgrade to Pro for referral source tracking and analytics",
  },
  hasTaskAutomation: {
    name: "Task Automation",
    description: "Automatically create reminder tasks for expiring authorizations and credentials",
    upgradeMessage: "Upgrade to Pro to enable automated task reminders",
  },
  hasCredentialTracking: {
    name: "Credential Tracking",
    description: "Track employee credentials and expiration dates",
    upgradeMessage: "Upgrade to Pro to track employee credentials",
  },
  hasWebsiteWatermarkRemoval: {
    name: "Website Watermark Removal",
    description: "Remove the 'Powered by FindABATherapy' watermark from your provider website",
    upgradeMessage: "Upgrade to Pro to remove the watermark from your website",
  },
  hasCustomDomain: {
    name: "Custom Domain",
    description: "Connect your own domain to your provider website",
    upgradeMessage: "Upgrade to Pro to use a custom domain for your website",
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

/**
 * Calculate effective plan tier based on subscription status
 * Returns "free" if subscription is not active, regardless of plan_tier in database
 */
export function getEffectivePlanTier(
  planTier: string,
  subscriptionStatus: string | null
): PlanTier {
  if (planTier === "free") return "free";

  const isActiveSubscription =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  return isActiveSubscription ? (planTier as PlanTier) : "free";
}
