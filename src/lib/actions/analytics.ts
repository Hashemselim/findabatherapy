"use server";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import {
  EVENT_TYPES,
  type DashboardMetrics,
  type ListingMetrics,
  type TimePeriod,
  type LocationAnalytics,
} from "@/lib/analytics/events";
import {
  getDateRangeForPeriod,
  getPreviousPeriodRange,
  getGranularityForPeriod,
  aggregateToGranularity,
} from "@/lib/analytics/date-utils";

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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  try {
    // Use admin client to read audit_events (RLS only allows service_role access)
    const adminClient = await createAdminClient();

    const dateRange = getDateRangeForPeriod(period);
    const previousRange = getPreviousPeriodRange(period);
    const granularity = getGranularityForPeriod(period);

    // Get current period metrics
    const currentMetrics = await getMetricsForPeriod(
      adminClient,
      listing.id,
      dateRange.start,
      dateRange.end,
      locationIds
    );

    // Get previous period metrics for comparison
    const previousMetrics = await getMetricsForPeriod(
      adminClient,
      listing.id,
      previousRange.start,
      previousRange.end,
      locationIds
    );

    // Get time series data (daily, then aggregate)
    const rawTimeSeries = await getTimeSeriesData(adminClient, listing.id, dateRange.start, dateRange.end, locationIds);

    // Aggregate to appropriate granularity
    const timeSeries = {
      views: aggregateToGranularity(rawTimeSeries.views, granularity),
      impressions: aggregateToGranularity(rawTimeSeries.impressions, granularity),
      clicks: aggregateToGranularity(rawTimeSeries.clicks, granularity),
    };

    // Get top sources
    const topSources = await getTopSources(adminClient, listing.id, dateRange.start, dateRange.end, locationIds);

    return {
      success: true,
      data: {
        current: currentMetrics,
        previous: previousMetrics,
        timeSeries,
        topSources,
      },
    };
  } catch {
    return { success: false, error: "Failed to fetch analytics" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = Awaited<ReturnType<typeof createClient>> | Awaited<ReturnType<typeof createAdminClient>>;

async function getMetricsForPeriod(
  supabase: SupabaseClient,
  listingId: string,
  start: Date,
  end: Date,
  locationIds?: string[]
): Promise<ListingMetrics> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  // Helper to filter events by locationId in metadata
  // Note: Supabase doesn't support filtering JSONB with .in() directly,
  // so we fetch and filter in JS when locationIds are specified
  const filterByLocation = locationIds && locationIds.length > 0;

  let viewCount = 0;
  let uniqueSessions = new Set<unknown>();
  let impressionCount = 0;
  let userImpressionCount = 0;
  let aiImpressionCount = 0;
  let botImpressionCount = 0;
  let clickCount = 0;

  // Get view count
  if (filterByLocation) {
    const { data: viewData } = await supabase
      .from("audit_events")
      .select("metadata")
      .eq("listing_id", listingId)
      .eq("event_type", EVENT_TYPES.LISTING_VIEW)
      .gte("created_at", startStr)
      .lte("created_at", endStr);

    viewCount = viewData?.filter((e) => {
      const locId = (e.metadata as Record<string, unknown>)?.locationId as string;
      return locationIds.includes(locId);
    }).length || 0;

    uniqueSessions = new Set(
      viewData?.filter((e) => {
        const locId = (e.metadata as Record<string, unknown>)?.locationId as string;
        return locationIds.includes(locId);
      }).map((e) => (e.metadata as Record<string, unknown>)?.sessionId).filter(Boolean)
    );
  } else {
    const { count } = await supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("event_type", EVENT_TYPES.LISTING_VIEW)
      .gte("created_at", startStr)
      .lte("created_at", endStr);
    viewCount = count || 0;

    const { data: uniqueViewData } = await supabase
      .from("audit_events")
      .select("metadata")
      .eq("listing_id", listingId)
      .eq("event_type", EVENT_TYPES.LISTING_VIEW)
      .gte("created_at", startStr)
      .lte("created_at", endStr);

    uniqueSessions = new Set(
      uniqueViewData?.map((e) => (e.metadata as Record<string, unknown>)?.sessionId).filter(Boolean)
    );
  }

  // Get search impressions (always fetch metadata to count by source)
  const { data: impressionData } = await supabase
    .from("audit_events")
    .select("metadata")
    .eq("listing_id", listingId)
    .eq("event_type", EVENT_TYPES.SEARCH_IMPRESSION)
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  if (filterByLocation) {
    const filteredImpressions = impressionData?.filter((e) => {
      const locId = (e.metadata as Record<string, unknown>)?.locationId as string;
      return locationIds.includes(locId);
    }) || [];
    impressionCount = filteredImpressions.length;
    userImpressionCount = filteredImpressions.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "user"
    ).length;
    aiImpressionCount = filteredImpressions.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "ai"
    ).length;
    botImpressionCount = filteredImpressions.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "bot"
    ).length;
  } else {
    impressionCount = impressionData?.length || 0;
    userImpressionCount = impressionData?.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "user"
    ).length || 0;
    aiImpressionCount = impressionData?.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "ai"
    ).length || 0;
    botImpressionCount = impressionData?.filter((e) =>
      (e.metadata as Record<string, unknown>)?.source === "bot"
    ).length || 0;
  }

  // Get search clicks
  if (filterByLocation) {
    const { data: clickData } = await supabase
      .from("audit_events")
      .select("metadata")
      .eq("listing_id", listingId)
      .eq("event_type", EVENT_TYPES.SEARCH_CLICK)
      .gte("created_at", startStr)
      .lte("created_at", endStr);

    clickCount = clickData?.filter((e) => {
      const locId = (e.metadata as Record<string, unknown>)?.locationId as string;
      return locationIds.includes(locId);
    }).length || 0;
  } else {
    const { count } = await supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("event_type", EVENT_TYPES.SEARCH_CLICK)
      .gte("created_at", startStr)
      .lte("created_at", endStr);
    clickCount = count || 0;
  }

  // Get contact clicks (no location filter - contacts are at listing level)
  const { count: contactClickCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .in("event_type", [
      EVENT_TYPES.LISTING_CONTACT_CLICK,
      EVENT_TYPES.LISTING_PHONE_CLICK,
      EVENT_TYPES.LISTING_EMAIL_CLICK,
    ])
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  // Get inquiries (no location filter)
  const { count: inquiryCount } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("event_type", EVENT_TYPES.INQUIRY_SUBMITTED)
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  const views = viewCount;
  const clicks = clickCount;
  const inquiries = inquiryCount || 0;

  // For impressions: only server-side tracking exists, so "unknown" = real users, "bot" = bots
  // Unlike search_performed which has client-side tracking (source="user"), impressions don't
  // So we use total - bot for human impressions
  const humanImpressions = impressionCount - botImpressionCount;

  return {
    views,
    uniqueViews: uniqueSessions.size,
    searchImpressions: impressionCount, // Total for reference
    userImpressions: humanImpressions, // Human impressions (total - bots) for display
    aiImpressions: aiImpressionCount,
    botImpressions: botImpressionCount,
    searchClicks: clicks,
    contactClicks: contactClickCount || 0,
    inquiries,
    clickThroughRate: humanImpressions > 0 ? (clicks / humanImpressions) * 100 : 0,
    conversionRate: views > 0 ? (inquiries / views) * 100 : 0,
  };
}

async function getTimeSeriesData(
  supabase: SupabaseClient,
  listingId: string,
  start: Date,
  end: Date,
  locationIds?: string[]
): Promise<DashboardMetrics["timeSeries"]> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  const filterByLocation = locationIds && locationIds.length > 0;

  // Get all events for the period
  const { data: events } = await supabase
    .from("audit_events")
    .select("event_type, created_at, metadata")
    .eq("listing_id", listingId)
    .in("event_type", [
      EVENT_TYPES.LISTING_VIEW,
      EVENT_TYPES.SEARCH_IMPRESSION,
      EVENT_TYPES.SEARCH_CLICK,
    ])
    .gte("created_at", startStr)
    .lte("created_at", endStr)
    .order("created_at");

  // Group by date
  const viewsByDate = new Map<string, number>();
  const impressionsByDate = new Map<string, number>();
  const clicksByDate = new Map<string, number>();

  for (const event of events || []) {
    const metadata = event.metadata as Record<string, unknown>;

    // Filter by locationId if specified
    if (filterByLocation) {
      const locId = metadata?.locationId as string;
      if (!locationIds.includes(locId)) continue;
    }

    const date = event.created_at.split("T")[0];

    if (event.event_type === EVENT_TYPES.LISTING_VIEW) {
      viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1);
    } else if (event.event_type === EVENT_TYPES.SEARCH_IMPRESSION) {
      // Exclude bot impressions from time series
      const source = metadata?.source as string;
      if (source !== "bot") {
        impressionsByDate.set(date, (impressionsByDate.get(date) || 0) + 1);
      }
    } else if (event.event_type === EVENT_TYPES.SEARCH_CLICK) {
      clicksByDate.set(date, (clicksByDate.get(date) || 0) + 1);
    }
  }

  // Generate date range
  const dates: string[] = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    views: dates.map((date) => ({ date, value: viewsByDate.get(date) || 0 })),
    impressions: dates.map((date) => ({
      date,
      value: impressionsByDate.get(date) || 0,
    })),
    clicks: dates.map((date) => ({ date, value: clicksByDate.get(date) || 0 })),
  };
}

async function getTopSources(
  supabase: SupabaseClient,
  listingId: string,
  start: Date,
  end: Date,
  locationIds?: string[]
): Promise<Array<{ source: string; count: number }>> {
  const startStr = start.toISOString();
  const endStr = end.toISOString();
  const filterByLocation = locationIds && locationIds.length > 0;

  const { data: events } = await supabase
    .from("audit_events")
    .select("metadata")
    .eq("listing_id", listingId)
    .eq("event_type", EVENT_TYPES.LISTING_VIEW)
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  const sourceCount = new Map<string, number>();

  for (const event of events || []) {
    const metadata = event.metadata as Record<string, unknown>;

    // Filter by locationId if specified
    if (filterByLocation) {
      const locId = metadata?.locationId as string;
      if (!locationIds.includes(locId)) continue;
    }

    const source = (metadata?.source as string) || "direct";
    sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
  }

  return Array.from(sourceCount.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
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
  viewsTrend: number; // percentage change from previous period
  inquiriesTrend: number;
}

export async function getAnalyticsSummary(): Promise<ActionResult<AnalyticsSummary>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  try {
    // Use admin client to read audit_events (RLS only allows service_role access)
    const adminClient = await createAdminClient();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(thirtyDaysAgo);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);

    // Current period metrics
    const current = await getMetricsForPeriod(adminClient, listing.id, thirtyDaysAgo, now);

    // Previous period for trends
    const previous = await getMetricsForPeriod(adminClient, listing.id, sixtyDaysAgo, thirtyDaysAgo);

    // Calculate trends
    const viewsTrend = previous.views > 0
      ? ((current.views - previous.views) / previous.views) * 100
      : 0;
    const inquiriesTrend = previous.inquiries > 0
      ? ((current.inquiries - previous.inquiries) / previous.inquiries) * 100
      : 0;

    return {
      success: true,
      data: {
        views: current.views,
        inquiries: current.inquiries,
        searchImpressions: current.searchImpressions,
        userImpressions: current.userImpressions,
        aiImpressions: current.aiImpressions,
        botImpressions: current.botImpressions,
        clickThroughRate: current.clickThroughRate,
        viewsTrend: Math.round(viewsTrend * 10) / 10,
        inquiriesTrend: Math.round(inquiriesTrend * 10) / 10,
      },
    };
  } catch {
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing with locations
  const { data: listing } = await supabase
    .from("listings")
    .select(`
      id,
      locations (
        id,
        label,
        city,
        state
      )
    `)
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  try {
    // Use admin client to read audit_events (RLS only allows service_role access)
    const adminClient = await createAdminClient();

    const dateRange = getDateRangeForPeriod(period);
    const granularity = getGranularityForPeriod(period);
    const startStr = dateRange.start.toISOString();
    const endStr = dateRange.end.toISOString();

    // Get all events with locationId
    const { data: events } = await adminClient
      .from("audit_events")
      .select("event_type, metadata, created_at")
      .eq("listing_id", listing.id)
      .in("event_type", [
        EVENT_TYPES.LISTING_VIEW,
        EVENT_TYPES.SEARCH_IMPRESSION,
        EVENT_TYPES.SEARCH_CLICK,
      ])
      .gte("created_at", startStr)
      .lte("created_at", endStr);

    // Build metrics per location
    const locationMetrics = new Map<string, {
      views: number;
      impressions: number;
      clicks: number;
      viewsByDate: Map<string, number>;
      impressionsByDate: Map<string, number>;
      clicksByDate: Map<string, number>;
    }>();

    // Initialize metrics for all locations
    for (const loc of listing.locations || []) {
      locationMetrics.set(loc.id, {
        views: 0,
        impressions: 0,
        clicks: 0,
        viewsByDate: new Map(),
        impressionsByDate: new Map(),
        clicksByDate: new Map(),
      });
    }

    // Also track events with no locationId as "unknown"
    locationMetrics.set("unknown", {
      views: 0,
      impressions: 0,
      clicks: 0,
      viewsByDate: new Map(),
      impressionsByDate: new Map(),
      clicksByDate: new Map(),
    });

    // Process events
    for (const event of events || []) {
      const metadata = event.metadata as Record<string, unknown>;
      const locationId = (metadata?.locationId as string) || "unknown";
      const date = event.created_at.split("T")[0];

      let metrics = locationMetrics.get(locationId);
      if (!metrics) {
        // Event for a location we don't know - add to unknown
        metrics = locationMetrics.get("unknown")!;
      }

      if (event.event_type === EVENT_TYPES.LISTING_VIEW) {
        metrics.views++;
        metrics.viewsByDate.set(date, (metrics.viewsByDate.get(date) || 0) + 1);
      } else if (event.event_type === EVENT_TYPES.SEARCH_IMPRESSION) {
        // Exclude bot impressions for consistent filtering across all analytics
        const source = metadata?.source as string;
        if (source !== "bot") {
          metrics.impressions++;
          metrics.impressionsByDate.set(date, (metrics.impressionsByDate.get(date) || 0) + 1);
        }
      } else if (event.event_type === EVENT_TYPES.SEARCH_CLICK) {
        metrics.clicks++;
        metrics.clicksByDate.set(date, (metrics.clicksByDate.get(date) || 0) + 1);
      }
    }

    // Build result array
    const result: LocationAnalytics[] = [];

    for (const loc of listing.locations || []) {
      const metrics = locationMetrics.get(loc.id)!;
      const ctr = metrics.impressions > 0
        ? (metrics.clicks / metrics.impressions) * 100
        : 0;

      // Convert date maps to arrays
      const viewsArray = Array.from(metrics.viewsByDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const impressionsArray = Array.from(metrics.impressionsByDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const clicksArray = Array.from(metrics.clicksByDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      result.push({
        locationId: loc.id,
        label: loc.label,
        city: loc.city,
        state: loc.state,
        metrics: {
          views: metrics.views,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          ctr: Math.round(ctr * 10) / 10,
        },
        timeSeries: {
          views: aggregateToGranularity(viewsArray, granularity),
          impressions: aggregateToGranularity(impressionsArray, granularity),
          clicks: aggregateToGranularity(clicksArray, granularity),
        },
      });
    }

    // Sort by views descending
    result.sort((a, b) => b.metrics.views - a.metrics.views);

    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to fetch location analytics" };
  }
}
