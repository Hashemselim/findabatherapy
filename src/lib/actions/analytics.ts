"use server";

import { queryConvex } from "@/lib/platform/convex/server";
import {
  type DashboardMetrics,
  type TimePeriod,
  type LocationAnalytics,
} from "@/lib/analytics/events";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get analytics metrics for the current user's listing
 * @param period - Time period: "month", "quarter", or "year"
 * @param locationIds - Optional array of location IDs to filter by
 */
export async function getListingAnalytics(
  period: TimePeriod = "month",
  locationIds?: string[]
): Promise<ActionResult<DashboardMetrics>> {
  try {
    const result = await queryConvex<DashboardMetrics>("analytics:getListingAnalytics", {
      period,
      locationIds: locationIds || null,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[ANALYTICS] getListingAnalytics error:", error);
    return { success: false, error: "Failed to fetch analytics" };
  }
}

/**
 * Lightweight analytics summary for dashboard overview
 * Returns just key totals without time series data
 */
export interface AnalyticsSummary {
  views: number;
  inquiries: number;
  searchImpressions: number;
  /** Impressions from confirmed real users (client-side tracking) */
  userImpressions: number;
  /** Impressions from AI assistants (ChatGPT, Claude, Perplexity, etc.) */
  aiImpressions: number;
  /** Impressions from SEO bots/crawlers */
  botImpressions: number;
  clickThroughRate: number;
  viewsTrend: number;
  inquiriesTrend: number;
}

export async function getAnalyticsSummary(): Promise<ActionResult<AnalyticsSummary>> {
  try {
    const result = await queryConvex<AnalyticsSummary>("analytics:getAnalyticsSummary");
    return { success: true, data: result };
  } catch (error) {
    console.error("[ANALYTICS] getAnalyticsSummary error:", error);
    return { success: false, error: "Failed to fetch analytics summary" };
  }
}

/**
 * Get analytics data broken down by location
 * @param period - Time period: "month", "quarter", or "year"
 */
export async function getLocationAnalytics(
  period: TimePeriod = "month"
): Promise<ActionResult<LocationAnalytics[]>> {
  try {
    const result = await queryConvex<LocationAnalytics[]>("analytics:getLocationAnalytics", {
      period,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[ANALYTICS] getLocationAnalytics error:", error);
    return { success: false, error: "Failed to fetch location analytics" };
  }
}
