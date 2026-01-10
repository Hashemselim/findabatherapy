"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface RemovalRequestWithDetails {
  id: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Google Places listing info
  googlePlacesListing: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
  };
  // Requester's profile
  profile: {
    id: string;
    agencyName: string;
    contactEmail: string;
  };
  // Requester's listing
  listing: {
    id: string;
    slug: string;
    headline: string | null;
  };
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ?? false;
}

/**
 * Get removal requests with filters (admin only)
 */
export async function getRemovalRequests(filters: {
  status?: "pending" | "approved" | "denied";
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ requests: RemovalRequestWithDetails[]; total: number }>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("removal_requests")
    .select(
      `
      id,
      reason,
      status,
      admin_notes,
      reviewed_at,
      created_at,
      google_places_listings (
        id,
        name,
        slug,
        city,
        state
      ),
      profiles (
        id,
        agency_name,
        contact_email
      ),
      listings (
        id,
        slug,
        headline
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Transform data
  const requests: RemovalRequestWithDetails[] = (data || []).map((req) => {
    const gp = req.google_places_listings as unknown as {
      id: string;
      name: string;
      slug: string;
      city: string;
      state: string;
    };
    const profile = req.profiles as unknown as {
      id: string;
      agency_name: string;
      contact_email: string;
    };
    const listing = req.listings as unknown as {
      id: string;
      slug: string;
      headline: string | null;
    };

    return {
      id: req.id,
      reason: req.reason,
      status: req.status as "pending" | "approved" | "denied",
      adminNotes: req.admin_notes,
      reviewedAt: req.reviewed_at,
      createdAt: req.created_at,
      googlePlacesListing: {
        id: gp.id,
        name: gp.name,
        slug: gp.slug,
        city: gp.city,
        state: gp.state,
      },
      profile: {
        id: profile.id,
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
      },
      listing: {
        id: listing.id,
        slug: listing.slug,
        headline: listing.headline,
      },
    };
  });

  return {
    success: true,
    data: {
      requests,
      total: count || 0,
    },
  };
}

/**
 * Approve a removal request (admin only)
 */
export async function approveRemovalRequest(
  requestId: string,
  adminNotes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // Get the request
  const { data: request } = await supabase
    .from("removal_requests")
    .select("id, google_places_listing_id, status")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Request has already been processed" };
  }

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser();

  // Update request status
  const { error: updateError } = await supabase
    .from("removal_requests")
    .update({
      status: "approved",
      admin_notes: adminNotes || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Mark Google Places listing as removed
  const { error: gpError } = await supabase
    .from("google_places_listings")
    .update({
      status: "removed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.google_places_listing_id);

  if (gpError) {
    return { success: false, error: gpError.message };
  }

  return { success: true };
}

/**
 * Deny a removal request (admin only)
 */
export async function denyRemovalRequest(
  requestId: string,
  adminNotes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // Get the request
  const { data: request } = await supabase
    .from("removal_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Request has already been processed" };
  }

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser();

  // Update request status
  const { error: updateError } = await supabase
    .from("removal_requests")
    .update({
      status: "denied",
      admin_notes: adminNotes || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export interface StateListingCounts {
  state: string;
  realListings: number;
  scrapedListings: number;
  total: number;
}

export interface ApplicationAnalytics {
  // Overall counts
  totalViews: number;
  totalSearches: number;
  /** Searches confirmed from real users (client-side tracking) */
  totalUserSearches: number;
  /** Searches from AI assistants (ChatGPT, Claude, Perplexity, etc.) */
  totalAiSearches: number;
  /** Searches detected as SEO bots/crawlers */
  totalBotSearches: number;
  totalInquiries: number;
  totalContactClicks: number;
  // Today's counts
  todayViews: number;
  todaySearches: number;
  todayInquiries: number;
  todayContactClicks: number;
  // This week's counts
  weekViews: number;
  weekSearches: number;
  weekInquiries: number;
  weekContactClicks: number;
  // This month's counts
  monthViews: number;
  monthSearches: number;
  monthInquiries: number;
  monthContactClicks: number;
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats(): Promise<
  ActionResult<{
    totalGooglePlacesListings: number;
    activeGooglePlacesListings: number;
    removedGooglePlacesListings: number;
    pendingRemovalRequests: number;
    totalRemovalRequests: number;
  }>
> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get Google Places counts
  const { count: totalGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true });

  const { count: activeGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: removedGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "removed");

  // Get removal request counts
  const { count: pendingRequests } = await supabase
    .from("removal_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: totalRequests } = await supabase
    .from("removal_requests")
    .select("*", { count: "exact", head: true });

  return {
    success: true,
    data: {
      totalGooglePlacesListings: totalGP || 0,
      activeGooglePlacesListings: activeGP || 0,
      removedGooglePlacesListings: removedGP || 0,
      pendingRemovalRequests: pendingRequests || 0,
      totalRemovalRequests: totalRequests || 0,
    },
  };
}

/**
 * Get listings count per state (admin only)
 * Returns real listings (from locations table) and scraped listings (from google_places_listings)
 */
export async function getListingsPerState(): Promise<ActionResult<StateListingCounts[]>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get real listings per state (from locations table, only published listings)
  const { data: realListings, error: realError } = await supabase
    .from("locations")
    .select("state, listings!inner(status)")
    .eq("listings.status", "published");

  if (realError) {
    return { success: false, error: realError.message };
  }

  // Get scraped listings per state (from google_places_listings, only active)
  const { data: scrapedListings, error: scrapedError } = await supabase
    .from("google_places_listings")
    .select("state")
    .eq("status", "active");

  if (scrapedError) {
    return { success: false, error: scrapedError.message };
  }

  // Aggregate counts by state
  const stateCounts: Record<string, { real: number; scraped: number }> = {};

  // Count real listings
  for (const loc of realListings || []) {
    const state = loc.state?.toUpperCase() || "Unknown";
    if (!stateCounts[state]) {
      stateCounts[state] = { real: 0, scraped: 0 };
    }
    stateCounts[state].real++;
  }

  // Count scraped listings
  for (const gp of scrapedListings || []) {
    const state = gp.state?.toUpperCase() || "Unknown";
    if (!stateCounts[state]) {
      stateCounts[state] = { real: 0, scraped: 0 };
    }
    stateCounts[state].scraped++;
  }

  // Convert to array and sort by total count
  const result: StateListingCounts[] = Object.entries(stateCounts)
    .map(([state, counts]) => ({
      state,
      realListings: counts.real,
      scrapedListings: counts.scraped,
      total: counts.real + counts.scraped,
    }))
    .sort((a, b) => b.total - a.total);

  return { success: true, data: result };
}

/**
 * Get application-wide analytics (admin only)
 * Returns views, searches, inquiries, and contact clicks
 */
export async function getApplicationAnalytics(): Promise<ActionResult<ApplicationAnalytics>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  // Use admin client to read audit_events (RLS only allows service_role access)
  const adminClient = await createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Helper to count events by type (uses admin client for audit_events)
  async function countEvents(eventType: string, since?: string): Promise<number> {
    let query = adminClient
      .from("audit_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", eventType);

    if (since) {
      query = query.gte("created_at", since);
    }

    const { count } = await query;
    return count || 0;
  }

  // Helper to count inquiries
  async function countInquiries(since?: string): Promise<number> {
    let query = supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true });

    if (since) {
      query = query.gte("created_at", since);
    }

    const { count } = await query;
    return count || 0;
  }

  // Helper to count search_performed by source
  async function countSearchesBySource(source: "user" | "ai" | "bot"): Promise<number> {
    const { count } = await adminClient
      .from("audit_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "search_performed")
      .filter("metadata->>source", "eq", source);
    return count || 0;
  }

  // Fetch all counts in parallel
  const [
    totalViews,
    totalSearches,
    totalUserSearches,
    totalAiSearches,
    totalBotSearches,
    totalInquiries,
    totalContactClicks,
    todayViews,
    todaySearches,
    todayInquiries,
    todayContactClicks,
    weekViews,
    weekSearches,
    weekInquiries,
    weekContactClicks,
    monthViews,
    monthSearches,
    monthInquiries,
    monthContactClicks,
  ] = await Promise.all([
    // Total counts
    countEvents("listing_view"),
    countEvents("search_performed"),
    countSearchesBySource("user"),
    countSearchesBySource("ai"),
    countSearchesBySource("bot"),
    countInquiries(),
    countEvents("listing_contact_click"),
    // Today's counts
    countEvents("listing_view", todayStart),
    countEvents("search_performed", todayStart),
    countInquiries(todayStart),
    countEvents("listing_contact_click", todayStart),
    // This week's counts
    countEvents("listing_view", weekStart),
    countEvents("search_performed", weekStart),
    countInquiries(weekStart),
    countEvents("listing_contact_click", weekStart),
    // This month's counts
    countEvents("listing_view", monthStart),
    countEvents("search_performed", monthStart),
    countInquiries(monthStart),
    countEvents("listing_contact_click", monthStart),
  ]);

  return {
    success: true,
    data: {
      totalViews,
      totalSearches,
      totalUserSearches,
      totalAiSearches,
      totalBotSearches,
      totalInquiries,
      totalContactClicks,
      todayViews,
      todaySearches,
      todayInquiries,
      todayContactClicks,
      weekViews,
      weekSearches,
      weekInquiries,
      weekContactClicks,
      monthViews,
      monthSearches,
      monthInquiries,
      monthContactClicks,
    },
  };
}

// ============================================
// NEW ANALYTICS ACTIONS FOR ADMIN DASHBOARD
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CustomerMetrics {
  totalCustomers: number;
  byTier: { tier: string; count: number }[];
  byBillingInterval: { interval: string; count: number }[];
  todaySignups: number;
  weekSignups: number;
  monthSignups: number;
}

export interface OnboardingMetrics {
  totalSignups: number;
  completedOnboarding: number;
  completionRate: number;
  pendingOnboarding: number;
  avgCompletionTimeHours: number | null;
}

export interface CustomersByState {
  state: string;
  customers: number;
  listings: number;
  featuredLocations: number;
}

export interface SearchAnalytics {
  byState: { state: string; count: number }[];
  byInsurance: { insurance: string; count: number }[];
  byServiceMode: { mode: string; count: number }[];
  topQueries: { query: string; count: number }[];
  zeroResultSearches: { query: string; state: string | null; count: number }[];
}

export interface TimeSeriesData {
  date: string;
  count: number;
}

export interface AnalyticsTimeSeries {
  views: TimeSeriesData[];
  searches: TimeSeriesData[];
  inquiries: TimeSeriesData[];
  signups: TimeSeriesData[];
}

export interface ConversionMetrics {
  searches: number;
  /** Searches confirmed from real users (client-side tracking) */
  userSearches: number;
  /** Searches detected as bot/crawler traffic */
  botSearches: number;
  impressions: number;
  clicks: number;
  views: number;
  inquiries: number;
  searchToClickRate: number;
  viewToInquiryRate: number;
}

/**
 * Get customer metrics (admin only)
 */
export async function getCustomerMetrics(): Promise<ActionResult<CustomerMetrics>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get all profiles (non-seeded)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, plan_tier, billing_interval, created_at")
    .eq("is_seeded", false);

  if (error) {
    return { success: false, error: error.message };
  }

  const allProfiles = profiles || [];

  // Count by tier
  const tierCounts: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const p of allProfiles) {
    const tier = p.plan_tier || "free";
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  // Count by billing interval (only for paid customers)
  const intervalCounts: Record<string, number> = { month: 0, year: 0 };
  for (const p of allProfiles) {
    if (p.plan_tier && p.plan_tier !== "free" && p.billing_interval) {
      intervalCounts[p.billing_interval] = (intervalCounts[p.billing_interval] || 0) + 1;
    }
  }

  // Count signups by period
  const todaySignups = allProfiles.filter((p) => p.created_at >= todayStart).length;
  const weekSignups = allProfiles.filter((p) => p.created_at >= weekStart).length;
  const monthSignups = allProfiles.filter((p) => p.created_at >= monthStart).length;

  return {
    success: true,
    data: {
      totalCustomers: allProfiles.length,
      byTier: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
      byBillingInterval: Object.entries(intervalCounts).map(([interval, count]) => ({ interval, count })),
      todaySignups,
      weekSignups,
      monthSignups,
    },
  };
}

/**
 * Get onboarding metrics (admin only)
 */
export async function getOnboardingMetrics(): Promise<ActionResult<OnboardingMetrics>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get all profiles (non-seeded)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, created_at, onboarding_completed_at")
    .eq("is_seeded", false);

  if (error) {
    return { success: false, error: error.message };
  }

  const allProfiles = profiles || [];
  const completed = allProfiles.filter((p) => p.onboarding_completed_at);
  const pending = allProfiles.filter((p) => !p.onboarding_completed_at);

  // Calculate average completion time
  let avgCompletionTimeHours: number | null = null;
  if (completed.length > 0) {
    const completionTimes = completed.map((p) => {
      const created = new Date(p.created_at).getTime();
      const completedAt = new Date(p.onboarding_completed_at!).getTime();
      return (completedAt - created) / (1000 * 60 * 60); // hours
    });
    avgCompletionTimeHours = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
  }

  return {
    success: true,
    data: {
      totalSignups: allProfiles.length,
      completedOnboarding: completed.length,
      completionRate: allProfiles.length > 0 ? (completed.length / allProfiles.length) * 100 : 0,
      pendingOnboarding: pending.length,
      avgCompletionTimeHours,
    },
  };
}

/**
 * Get customers by state (admin only)
 */
export async function getCustomersByState(): Promise<ActionResult<CustomersByState[]>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get all locations with their listing and profile info
  const { data: locations, error } = await supabase
    .from("locations")
    .select(`
      state,
      is_featured,
      listing_id,
      listings!inner (
        id,
        profile_id,
        status
      )
    `)
    .eq("listings.status", "published");

  if (error) {
    return { success: false, error: error.message };
  }

  // Aggregate by state
  const stateData: Record<string, { profiles: Set<string>; listings: Set<string>; featured: number }> = {};

  for (const loc of locations || []) {
    const state = loc.state?.toUpperCase() || "Unknown";
    if (!stateData[state]) {
      stateData[state] = { profiles: new Set(), listings: new Set(), featured: 0 };
    }

    const listing = loc.listings as unknown as { id: string; profile_id: string };
    stateData[state].profiles.add(listing.profile_id);
    stateData[state].listings.add(listing.id);
    if (loc.is_featured) {
      stateData[state].featured++;
    }
  }

  const result: CustomersByState[] = Object.entries(stateData)
    .map(([state, data]) => ({
      state,
      customers: data.profiles.size,
      listings: data.listings.size,
      featuredLocations: data.featured,
    }))
    .sort((a, b) => b.customers - a.customers);

  return { success: true, data: result };
}

/**
 * Get search analytics with breakdowns (admin only)
 */
export async function getSearchAnalytics(
  dateRange?: DateRange
): Promise<ActionResult<SearchAnalytics>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // Use admin client to read audit_events (RLS only allows service_role access)
  const adminClient = await createAdminClient();

  // Build base query
  let query = adminClient
    .from("audit_events")
    .select("metadata")
    .eq("event_type", "search_performed");

  if (dateRange) {
    query = query
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());
  }

  const { data: events, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Aggregate data
  const stateCounts: Record<string, number> = {};
  const insuranceCounts: Record<string, number> = {};
  const serviceModeCounts: Record<string, number> = {};
  const queryCounts: Record<string, number> = {};
  const zeroResults: Record<string, { state: string | null; count: number }> = {};

  for (const event of events || []) {
    const metadata = event.metadata as {
      filters?: {
        state?: string;
        insurances?: string[];
        serviceModes?: string[];
      };
      query?: string;
      resultsCount?: number;
    };

    // Count by state
    if (metadata?.filters?.state) {
      const state = metadata.filters.state.toUpperCase();
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }

    // Count by insurance
    if (metadata?.filters?.insurances) {
      for (const ins of metadata.filters.insurances) {
        insuranceCounts[ins] = (insuranceCounts[ins] || 0) + 1;
      }
    }

    // Count by service mode
    if (metadata?.filters?.serviceModes) {
      for (const mode of metadata.filters.serviceModes) {
        serviceModeCounts[mode] = (serviceModeCounts[mode] || 0) + 1;
      }
    }

    // Count queries
    if (metadata?.query) {
      const q = metadata.query.toLowerCase().trim();
      queryCounts[q] = (queryCounts[q] || 0) + 1;
    }

    // Track zero-result searches
    if (metadata?.resultsCount === 0) {
      const key = `${metadata.query || ""}|${metadata.filters?.state || ""}`;
      if (!zeroResults[key]) {
        zeroResults[key] = { state: metadata.filters?.state || null, count: 0 };
      }
      zeroResults[key].count++;
    }
  }

  return {
    success: true,
    data: {
      byState: Object.entries(stateCounts)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      byInsurance: Object.entries(insuranceCounts)
        .map(([insurance, count]) => ({ insurance, count }))
        .sort((a, b) => b.count - a.count),
      byServiceMode: Object.entries(serviceModeCounts)
        .map(([mode, count]) => ({ mode, count }))
        .sort((a, b) => b.count - a.count),
      topQueries: Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      zeroResultSearches: Object.entries(zeroResults)
        .map(([key, data]) => ({
          query: key.split("|")[0] || "(no query)",
          state: data.state,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    },
  };
}

/**
 * Get time series analytics data (admin only)
 */
export async function getAnalyticsTimeSeries(
  dateRange?: DateRange,
  granularity: "day" | "week" | "month" = "day"
): Promise<ActionResult<AnalyticsTimeSeries>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  // Use admin client to read audit_events (RLS only allows service_role access)
  const adminClient = await createAdminClient();

  // Default to last 30 days if no range provided
  const end = dateRange?.end || new Date();
  const start = dateRange?.start || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch events
  const { data: events, error: eventsError } = await adminClient
    .from("audit_events")
    .select("event_type, created_at")
    .in("event_type", ["listing_view", "search_performed"])
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (eventsError) {
    return { success: false, error: eventsError.message };
  }

  // Fetch inquiries
  const { data: inquiries, error: inquiriesError } = await supabase
    .from("inquiries")
    .select("created_at")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (inquiriesError) {
    return { success: false, error: inquiriesError.message };
  }

  // Fetch signups
  const { data: signups, error: signupsError } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("is_seeded", false)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  if (signupsError) {
    return { success: false, error: signupsError.message };
  }

  // Helper to get date key based on granularity
  const getDateKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (granularity === "day") {
      return date.toISOString().split("T")[0];
    } else if (granularity === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split("T")[0];
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  };

  // Aggregate data
  const viewsByDate: Record<string, number> = {};
  const searchesByDate: Record<string, number> = {};
  const inquiriesByDate: Record<string, number> = {};
  const signupsByDate: Record<string, number> = {};

  for (const event of events || []) {
    const key = getDateKey(event.created_at);
    if (event.event_type === "listing_view") {
      viewsByDate[key] = (viewsByDate[key] || 0) + 1;
    } else if (event.event_type === "search_performed") {
      searchesByDate[key] = (searchesByDate[key] || 0) + 1;
    }
  }

  for (const inq of inquiries || []) {
    const key = getDateKey(inq.created_at);
    inquiriesByDate[key] = (inquiriesByDate[key] || 0) + 1;
  }

  for (const signup of signups || []) {
    const key = getDateKey(signup.created_at);
    signupsByDate[key] = (signupsByDate[key] || 0) + 1;
  }

  // Get all unique dates and sort
  const allDates = new Set([
    ...Object.keys(viewsByDate),
    ...Object.keys(searchesByDate),
    ...Object.keys(inquiriesByDate),
    ...Object.keys(signupsByDate),
  ]);
  const sortedDates = Array.from(allDates).sort();

  return {
    success: true,
    data: {
      views: sortedDates.map((date) => ({ date, count: viewsByDate[date] || 0 })),
      searches: sortedDates.map((date) => ({ date, count: searchesByDate[date] || 0 })),
      inquiries: sortedDates.map((date) => ({ date, count: inquiriesByDate[date] || 0 })),
      signups: sortedDates.map((date) => ({ date, count: signupsByDate[date] || 0 })),
    },
  };
}

/**
 * Get conversion metrics (admin only)
 */
export async function getConversionMetrics(
  dateRange?: DateRange
): Promise<ActionResult<ConversionMetrics>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  // Use admin client to read audit_events (RLS only allows service_role access)
  const adminClient = await createAdminClient();

  // Build base query helper (uses admin client for audit_events)
  const buildQuery = (eventType: string) => {
    let query = adminClient
      .from("audit_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", eventType);

    if (dateRange) {
      query = query
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    return query;
  };

  // Build query for search_performed with source filter
  const buildSearchQuery = (source?: "user" | "bot") => {
    let query = adminClient
      .from("audit_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "search_performed");

    if (source) {
      query = query.filter("metadata->>source", "eq", source);
    }

    if (dateRange) {
      query = query
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    return query;
  };

  // Fetch counts in parallel
  const [
    { count: searches },
    { count: userSearches },
    { count: botSearches },
    { count: impressions },
    { count: clicks },
    { count: views },
    { count: inquiries },
  ] = await Promise.all([
    buildQuery("search_performed"),
    buildSearchQuery("user"),
    buildSearchQuery("bot"),
    buildQuery("search_impression"),
    buildQuery("search_click"),
    buildQuery("listing_view"),
    supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dateRange?.start.toISOString() || "1970-01-01")
      .lte("created_at", dateRange?.end.toISOString() || new Date().toISOString()),
  ]);

  const searchCount = searches || 0;
  const userSearchCount = userSearches || 0;
  const botSearchCount = botSearches || 0;
  const impressionCount = impressions || 0;
  const clickCount = clicks || 0;
  const viewCount = views || 0;
  const inquiryCount = inquiries || 0;

  return {
    success: true,
    data: {
      searches: searchCount,
      userSearches: userSearchCount,
      botSearches: botSearchCount,
      impressions: impressionCount,
      clicks: clickCount,
      views: viewCount,
      inquiries: inquiryCount,
      searchToClickRate: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
      viewToInquiryRate: viewCount > 0 ? (inquiryCount / viewCount) * 100 : 0,
    },
  };
}

// ============================================
// CUSTOMER LIST AND CONVERSION ANALYTICS
// ============================================

export interface CustomerListItem {
  id: string;
  agencyName: string;
  contactEmail: string;
  planTier: string;
  billingInterval: string | null;
  hasFeaturedAddon: boolean;
  createdAt: string;
  onboardingCompletedAt: string | null;
  locationCount: number;
  listingCount: number;
  states: string[];
  // Computed
  hasPublishedListing: boolean;
  daysSinceSignup: number;
}

export interface CustomerListResult {
  customers: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerConversionFunnel {
  // Signup funnel
  totalSignups: number;
  completedOnboarding: number;
  createdListing: number;
  publishedListing: number;
  addedLocation: number;
  paidCustomers: number;
  // Conversion rates
  onboardingRate: number;
  listingCreationRate: number;
  publishRate: number;
  paidConversionRate: number;
  // Time-based cohorts
  signupsLast7Days: number;
  signupsLast30Days: number;
  signupsLast90Days: number;
  // Churn indicators
  staleAccounts: number; // signed up > 30 days ago, no listing
  incompleteOnboarding: number; // started but not finished
}

/**
 * Get paginated list of customers with details (admin only)
 */
export async function getCustomerList(options?: {
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "agency_name" | "plan_tier" | "location_count";
  sortOrder?: "asc" | "desc";
  tierFilter?: string;
  searchQuery?: string;
}): Promise<ActionResult<CustomerListResult>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 25;
  const sortBy = options?.sortBy || "created_at";
  const sortOrder = options?.sortOrder || "desc";
  const offset = (page - 1) * pageSize;

  // Get all profiles with their listings and locations
  let query = supabase
    .from("profiles")
    .select(
      `
      id,
      agency_name,
      contact_email,
      plan_tier,
      billing_interval,
      has_featured_addon,
      created_at,
      onboarding_completed_at,
      listings (
        id,
        status,
        locations (
          id,
          state
        )
      )
    `,
      { count: "exact" }
    )
    .eq("is_seeded", false);

  // Apply tier filter
  if (options?.tierFilter && options.tierFilter !== "all") {
    query = query.eq("plan_tier", options.tierFilter);
  }

  // Apply search filter
  if (options?.searchQuery) {
    query = query.or(
      `agency_name.ilike.%${options.searchQuery}%,contact_email.ilike.%${options.searchQuery}%`
    );
  }

  // Apply sorting (limited to direct columns)
  if (sortBy === "created_at" || sortBy === "agency_name" || sortBy === "plan_tier") {
    query = query.order(sortBy, { ascending: sortOrder === "asc" });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data: profiles, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const now = new Date();

  // Transform data
  const customers: CustomerListItem[] = (profiles || []).map((profile) => {
    const listings = (profile.listings || []) as Array<{
      id: string;
      status: string;
      locations: Array<{ id: string; state: string }>;
    }>;

    // Collect all states from all locations
    const allStates = new Set<string>();
    let totalLocations = 0;

    for (const listing of listings) {
      const locations = listing.locations || [];
      totalLocations += locations.length;
      for (const loc of locations) {
        if (loc.state) {
          allStates.add(loc.state.toUpperCase());
        }
      }
    }

    const hasPublishedListing = listings.some((l) => l.status === "published");
    const createdAt = new Date(profile.created_at);
    const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: profile.id,
      agencyName: profile.agency_name,
      contactEmail: profile.contact_email,
      planTier: profile.plan_tier || "free",
      billingInterval: profile.billing_interval,
      hasFeaturedAddon: profile.has_featured_addon || false,
      createdAt: profile.created_at,
      onboardingCompletedAt: profile.onboarding_completed_at,
      locationCount: totalLocations,
      listingCount: listings.length,
      states: Array.from(allStates).sort(),
      hasPublishedListing,
      daysSinceSignup,
    };
  });

  // Sort by location count if needed (can't do this in SQL due to aggregation)
  if (sortBy === "location_count") {
    customers.sort((a, b) => {
      const diff = a.locationCount - b.locationCount;
      return sortOrder === "asc" ? diff : -diff;
    });
  }

  return {
    success: true,
    data: {
      customers,
      total: count || 0,
      page,
      pageSize,
    },
  };
}

/**
 * Get customer conversion funnel metrics (admin only)
 */
export async function getCustomerConversionFunnel(): Promise<ActionResult<CustomerConversionFunnel>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const now = new Date();
  const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Get all profiles with their listings
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      plan_tier,
      created_at,
      onboarding_completed_at,
      stripe_subscription_id,
      listings (
        id,
        status,
        locations (id)
      )
    `
    )
    .eq("is_seeded", false);

  if (error) {
    return { success: false, error: error.message };
  }

  const allProfiles = profiles || [];

  // Calculate funnel metrics
  let totalSignups = 0;
  let completedOnboarding = 0;
  let createdListing = 0;
  let publishedListing = 0;
  let addedLocation = 0;
  let paidCustomers = 0;
  let signupsLast7Days = 0;
  let signupsLast30Days = 0;
  let signupsLast90Days = 0;
  let staleAccounts = 0;
  let incompleteOnboarding = 0;

  for (const profile of allProfiles) {
    totalSignups++;

    const listings = (profile.listings || []) as Array<{
      id: string;
      status: string;
      locations: Array<{ id: string }>;
    }>;

    const hasListing = listings.length > 0;
    const hasPublished = listings.some((l) => l.status === "published");
    const hasLocation = listings.some((l) => (l.locations?.length || 0) > 0);
    const isPaid = profile.plan_tier !== "free" && profile.stripe_subscription_id;
    const hasCompletedOnboarding = !!profile.onboarding_completed_at;

    if (hasCompletedOnboarding) completedOnboarding++;
    if (hasListing) createdListing++;
    if (hasPublished) publishedListing++;
    if (hasLocation) addedLocation++;
    if (isPaid) paidCustomers++;

    // Time-based cohorts
    const createdAt = profile.created_at;
    if (createdAt >= days7Ago) signupsLast7Days++;
    if (createdAt >= days30Ago) signupsLast30Days++;
    if (createdAt >= days90Ago) signupsLast90Days++;

    // Churn indicators
    if (createdAt < days30Ago && !hasListing) staleAccounts++;
    if (!hasCompletedOnboarding && hasListing) incompleteOnboarding++;
  }

  return {
    success: true,
    data: {
      totalSignups,
      completedOnboarding,
      createdListing,
      publishedListing,
      addedLocation,
      paidCustomers,
      onboardingRate: totalSignups > 0 ? (completedOnboarding / totalSignups) * 100 : 0,
      listingCreationRate: totalSignups > 0 ? (createdListing / totalSignups) * 100 : 0,
      publishRate: createdListing > 0 ? (publishedListing / createdListing) * 100 : 0,
      paidConversionRate: totalSignups > 0 ? (paidCustomers / totalSignups) * 100 : 0,
      signupsLast7Days,
      signupsLast30Days,
      signupsLast90Days,
      staleAccounts,
      incompleteOnboarding,
    },
  };
}

/**
 * Export analytics data as CSV (admin only)
 */
export async function exportAnalyticsCSV(
  dataType: "customers" | "searches" | "timeseries" | "states" | "customer_list",
  dateRange?: DateRange
): Promise<ActionResult<string>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  let csvContent = "";

  switch (dataType) {
    case "customers": {
      const result = await getCustomerMetrics();
      if (!result.success || !result.data) {
        return { success: false, error: result.error || "Failed to get data" };
      }
      const data = result.data;

      csvContent = "Metric,Value\n";
      csvContent += `Total Customers,${data.totalCustomers}\n`;
      csvContent += `Today Signups,${data.todaySignups}\n`;
      csvContent += `Week Signups,${data.weekSignups}\n`;
      csvContent += `Month Signups,${data.monthSignups}\n\n`;
      csvContent += "Tier,Count\n";
      for (const tier of data.byTier) {
        csvContent += `${tier.tier},${tier.count}\n`;
      }
      break;
    }

    case "searches": {
      const result = await getSearchAnalytics(dateRange);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || "Failed to get data" };
      }
      const data = result.data;

      csvContent = "Searches by State\nState,Count\n";
      for (const item of data.byState) {
        csvContent += `${item.state},${item.count}\n`;
      }
      csvContent += "\nSearches by Insurance\nInsurance,Count\n";
      for (const item of data.byInsurance) {
        csvContent += `${item.insurance},${item.count}\n`;
      }
      csvContent += "\nTop Queries\nQuery,Count\n";
      for (const item of data.topQueries) {
        csvContent += `"${item.query}",${item.count}\n`;
      }
      csvContent += "\nZero Result Searches\nQuery,State,Count\n";
      for (const item of data.zeroResultSearches) {
        csvContent += `"${item.query}",${item.state || ""},${item.count}\n`;
      }
      break;
    }

    case "timeseries": {
      const result = await getAnalyticsTimeSeries(dateRange);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || "Failed to get data" };
      }
      const data = result.data;

      csvContent = "Date,Views,Searches,Inquiries,Signups\n";
      const allDates = data.views.map((v) => v.date);
      for (const date of allDates) {
        const views = data.views.find((v) => v.date === date)?.count || 0;
        const searches = data.searches.find((s) => s.date === date)?.count || 0;
        const inquiries = data.inquiries.find((i) => i.date === date)?.count || 0;
        const signups = data.signups.find((s) => s.date === date)?.count || 0;
        csvContent += `${date},${views},${searches},${inquiries},${signups}\n`;
      }
      break;
    }

    case "states": {
      const result = await getCustomersByState();
      if (!result.success || !result.data) {
        return { success: false, error: result.error || "Failed to get data" };
      }
      const data = result.data;

      csvContent = "State,Customers,Listings,Featured Locations\n";
      for (const item of data) {
        csvContent += `${item.state},${item.customers},${item.listings},${item.featuredLocations}\n`;
      }
      break;
    }

    case "customer_list": {
      const result = await getCustomerList({ pageSize: 10000 });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || "Failed to get data" };
      }
      const data = result.data;

      csvContent = "Agency Name,Email,Tier,Billing,Locations,States,Created,Onboarding Completed,Has Published Listing\n";
      for (const customer of data.customers) {
        csvContent += `"${customer.agencyName}","${customer.contactEmail}",${customer.planTier},${customer.billingInterval || "N/A"},${customer.locationCount},"${customer.states.join(", ")}",${customer.createdAt},${customer.onboardingCompletedAt || ""},${customer.hasPublishedListing}\n`;
      }
      break;
    }
  }

  return { success: true, data: csvContent };
}
