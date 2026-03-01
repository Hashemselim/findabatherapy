import { getCurrentPlanTier } from "@/lib/plans/guards";

/**
 * Server-side equivalent of usePreviewData.
 * Returns demo data for free-plan users, real data for pro users.
 * Falls back to demo data when real data is null.
 */
export async function getPreviewData<T>(
  realData: T | null,
  demoData: T
): Promise<{ data: T; isPreview: boolean }> {
  const tier = await getCurrentPlanTier();
  const isFreePlan = tier === "free";

  if (isFreePlan) {
    return { data: demoData, isPreview: true };
  }

  return {
    data: realData ?? demoData,
    isPreview: realData === null,
  };
}
