"use client";

import { useEffect, useState, useCallback } from "react";
import {
  type PlanTier,
  type PlanFeatures,
  type PlanConfig,
  getPlanConfig,
  getPlanFeatures,
  getNextUpgradeTier,
  isPaidPlan,
} from "@/lib/plans/features";
import { getCurrentPlanTier } from "@/lib/plans/guards";

interface UsePlanFeaturesReturn {
  tier: PlanTier;
  features: PlanFeatures;
  config: PlanConfig;
  isLoading: boolean;
  isPaid: boolean;
  nextUpgradeTier: PlanTier | null;
  canAccess: (feature: keyof PlanFeatures) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to access the current user's plan features
 * Fetches from server on mount and provides cached values
 */
export function usePlanFeatures(): UsePlanFeaturesReturn {
  const [tier, setTier] = useState<PlanTier>("free");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlanData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentTier = await getCurrentPlanTier();
      setTier(currentTier);
    } catch (error) {
      console.error("Failed to fetch plan tier:", error);
      setTier("free");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const features = getPlanFeatures(tier);
  const config = getPlanConfig(tier);

  const canAccess = useCallback(
    (feature: keyof PlanFeatures): boolean => {
      const value = features[feature];
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value > 0;
      return true;
    },
    [features]
  );

  return {
    tier,
    features,
    config,
    isLoading,
    isPaid: isPaidPlan(tier),
    nextUpgradeTier: getNextUpgradeTier(tier),
    canAccess,
    refresh: fetchPlanData,
  };
}

/**
 * Hook to check a single feature access
 */
export function useCanAccessFeature(feature: keyof PlanFeatures): {
  canAccess: boolean;
  isLoading: boolean;
} {
  const { features, isLoading } = usePlanFeatures();

  const value = features[feature];
  let canAccess = false;

  if (typeof value === "boolean") {
    canAccess = value;
  } else if (typeof value === "number") {
    canAccess = value > 0;
  } else {
    canAccess = true;
  }

  return { canAccess, isLoading };
}

/**
 * Hook to check if user can perform action within limit
 */
export function useWithinLimit(
  limitFeature: "maxLocations" | "maxPhotos",
  currentCount: number
): {
  canAdd: boolean;
  limit: number;
  remaining: number;
  isLoading: boolean;
} {
  const { features, isLoading } = usePlanFeatures();
  const limit = features[limitFeature];
  const remaining = Math.max(0, limit - currentCount);

  return {
    canAdd: currentCount < limit,
    limit,
    remaining,
    isLoading,
  };
}
