"use server";

import { getUser, createClient } from "@/lib/supabase/server";
import {
  type PlanTier,
  type PlanFeatures,
  getPlanFeatures,
  hasMinimumTier,
} from "./features";

type GuardResult<T = void> =
  | { allowed: true; data?: T }
  | { allowed: false; reason: string; requiredPlan: PlanTier };

/**
 * Get the current user's plan tier from the database
 *
 * During onboarding: Returns selected plan tier (allows Pro field access before payment)
 * After onboarding: Returns "free" if subscription is not active, regardless of plan_tier
 */
export async function getCurrentPlanTier(): Promise<PlanTier> {
  const user = await getUser();
  if (!user) {
    return "free";
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  const planTier = (profile?.plan_tier as PlanTier) || "free";

  // During onboarding: respect selected plan (allows Pro field access before payment)
  if (!profile?.onboarding_completed_at) {
    return planTier;
  }

  // After onboarding: require active subscription for paid plans
  const isActiveSubscription =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  if (planTier !== "free" && !isActiveSubscription) {
    return "free";
  }

  return planTier;
}

/**
 * Get the current user's plan features
 */
export async function getCurrentPlanFeatures(): Promise<PlanFeatures> {
  const tier = await getCurrentPlanTier();
  return getPlanFeatures(tier);
}

/**
 * Check if the current user can access a feature
 */
export async function canAccessFeature(
  feature: keyof PlanFeatures
): Promise<boolean> {
  const features = await getCurrentPlanFeatures();
  const value = features[feature];

  // For boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // For numeric features (maxLocations, maxPhotos) - check if > 0
  if (typeof value === "number") {
    return value > 0;
  }

  // For string features like searchPriority
  return true;
}

/**
 * Guard: Check if user can add more locations
 */
export async function guardAddLocation(
  currentCount: number
): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (currentCount >= features.maxLocations) {
    return {
      allowed: false,
      reason: `Your ${tier} plan allows up to ${features.maxLocations} location${features.maxLocations === 1 ? "" : "s"}`,
      requiredPlan: tier === "free" ? "pro" : "enterprise",
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user can upload more photos
 */
export async function guardUploadPhoto(
  currentCount: number
): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasPhotoGallery) {
    return {
      allowed: false,
      reason: "Photo gallery is a Pro feature",
      requiredPlan: "pro",
    };
  }

  if (currentCount >= features.maxPhotos) {
    return {
      allowed: false,
      reason: `Your ${tier} plan allows up to ${features.maxPhotos} photos`,
      requiredPlan: "enterprise",
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user can use contact form
 */
export async function guardContactForm(): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasContactForm) {
    return {
      allowed: false,
      reason: "Contact form is a Pro feature",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user can embed video
 */
export async function guardVideoEmbed(): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasVideoEmbed) {
    return {
      allowed: false,
      reason: "Video embed is a Pro feature",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user can access analytics
 */
export async function guardAnalytics(): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasAnalytics) {
    return {
      allowed: false,
      reason: "Analytics dashboard is a Pro feature",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user meets minimum plan requirement
 */
export async function guardMinimumPlan(
  minimumTier: PlanTier
): Promise<GuardResult> {
  const currentTier = await getCurrentPlanTier();

  if (!hasMinimumTier(currentTier, minimumTier)) {
    return {
      allowed: false,
      reason: `This feature requires a ${minimumTier} plan`,
      requiredPlan: minimumTier,
    };
  }

  return { allowed: true };
}

/**
 * Guard: Check if user is eligible for Featured add-on
 */
export async function guardFeaturedAddon(): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasFeaturedAddonEligibility) {
    return {
      allowed: false,
      reason: "Featured add-on requires a Pro or Enterprise plan",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}
