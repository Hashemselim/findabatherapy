"use client";

import { useAuth } from "@/contexts/auth-context";

/**
 * Returns whether the current user is in preview mode (free plan).
 * Free users see demo data instead of empty states.
 */
export function usePreviewMode(): { isPreview: boolean } {
  const { profile } = useAuth();
  const isPreview = !profile || profile.plan_tier === "free";
  return { isPreview };
}

/**
 * Returns either real data or demo data depending on the user's plan tier.
 * Free plan users always see demoData. Pro users see realData (falling back
 * to demoData if realData is null).
 */
export function usePreviewData<T>(
  realData: T | null,
  demoData: T
): { data: T; isPreview: boolean } {
  const { isPreview } = usePreviewMode();

  if (isPreview) {
    return { data: demoData, isPreview: true };
  }

  return {
    data: realData ?? demoData,
    isPreview: realData === null,
  };
}
