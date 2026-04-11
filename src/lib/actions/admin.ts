"use server";

export interface RemovalRequestWithDetails {
  id: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  googlePlacesListing: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
  };
  profile: {
    id: string;
    agencyName: string;
    contactEmail: string;
  };
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

export interface StateListingCounts {
  state: string;
  realListings: number;
  scrapedListings: number;
  total: number;
}

export interface ApplicationAnalytics {
  totalViews: number;
  totalSearches: number;
  totalUserSearches: number;
  totalAiSearches: number;
  totalBotSearches: number;
  totalInquiries: number;
  totalContactClicks: number;
  todayViews: number;
  todaySearches: number;
  todayInquiries: number;
  todayContactClicks: number;
  weekViews: number;
  weekSearches: number;
  weekInquiries: number;
  weekContactClicks: number;
  monthViews: number;
  monthSearches: number;
  monthInquiries: number;
  monthContactClicks: number;
}

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
  userSearches: number;
  botSearches: number;
  impressions: number;
  clicks: number;
  views: number;
  inquiries: number;
  searchToClickRate: number;
  viewToInquiryRate: number;
}

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
  totalSignups: number;
  completedOnboarding: number;
  createdListing: number;
  publishedListing: number;
  addedLocation: number;
  paidCustomers: number;
  onboardingRate: number;
  listingCreationRate: number;
  publishRate: number;
  paidConversionRate: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  signupsLast90Days: number;
  staleAccounts: number;
  incompleteOnboarding: number;
}

export interface BotAnalytics {
  summary: {
    totalBotImpressions: number;
    totalAiImpressions: number;
    totalBotSearches: number;
    totalAiSearches: number;
    botToHumanRatio: number;
  };
  timeSeries: Array<{
    date: string;
    botImpressions: number;
    aiImpressions: number;
    botSearches: number;
    aiSearches: number;
  }>;
  botBreakdown: {
    searchEngine: number;
    aiAssistant: number;
    socialMedia: number;
    seo: number;
    other: number;
  };
}

function toIsoRange(dateRange?: DateRange) {
  if (!dateRange) {
    return {};
  }

  return {
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
  };
}

async function queryAdmin<T>(
  name: `admin:${string}`,
  args: Record<string, unknown> = {},
): Promise<ActionResult<T>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<T>(name, args);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Admin query failed",
    };
  }
}

async function mutateAdmin<T = void>(
  name: `admin:${string}`,
  args: Record<string, unknown> = {},
): Promise<ActionResult<T>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<T>(name, args);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Admin mutation failed",
    };
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const result = await queryAdmin<boolean>("admin:isCurrentUserAdmin");
  return result.success ? (result.data ?? false) : false;
}

export async function getRemovalRequests(filters: {
  status?: "pending" | "approved" | "denied";
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ requests: RemovalRequestWithDetails[]; total: number }>> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;
  return queryAdmin("admin:getRemovalRequests", {
    status: filters.status,
    limit,
    offset,
  });
}

export async function approveRemovalRequest(
  requestId: string,
  adminNotes?: string,
): Promise<ActionResult> {
  return mutateAdmin("admin:approveRemovalRequest", { requestId, adminNotes });
}

export async function denyRemovalRequest(
  requestId: string,
  adminNotes?: string,
): Promise<ActionResult> {
  return mutateAdmin("admin:denyRemovalRequest", { requestId, adminNotes });
}

export async function getAdminStats(): Promise<
  ActionResult<{
    totalGooglePlacesListings: number;
    activeGooglePlacesListings: number;
    removedGooglePlacesListings: number;
    pendingRemovalRequests: number;
    totalRemovalRequests: number;
  }>
> {
  return queryAdmin("admin:getAdminStats");
}

export async function getListingsPerState(): Promise<ActionResult<StateListingCounts[]>> {
  return queryAdmin("admin:getListingsPerState");
}

export async function getApplicationAnalytics(): Promise<ActionResult<ApplicationAnalytics>> {
  return queryAdmin("admin:getApplicationAnalytics");
}

export async function getCustomerMetrics(): Promise<ActionResult<CustomerMetrics>> {
  return queryAdmin("admin:getCustomerMetrics");
}

export async function getOnboardingMetrics(): Promise<ActionResult<OnboardingMetrics>> {
  return queryAdmin("admin:getOnboardingMetrics");
}

export async function getCustomersByState(): Promise<ActionResult<CustomersByState[]>> {
  return queryAdmin("admin:getCustomersByState");
}

export async function getSearchAnalytics(
  dateRange?: DateRange,
): Promise<ActionResult<SearchAnalytics>> {
  return queryAdmin("admin:getSearchAnalytics", toIsoRange(dateRange));
}

export async function getAnalyticsTimeSeries(
  dateRange?: DateRange,
  granularity: "day" | "week" | "month" = "day",
): Promise<ActionResult<AnalyticsTimeSeries>> {
  return queryAdmin("admin:getAnalyticsTimeSeries", {
    ...toIsoRange(dateRange),
    granularity,
  });
}

export async function getConversionMetrics(
  dateRange?: DateRange,
): Promise<ActionResult<ConversionMetrics>> {
  return queryAdmin("admin:getConversionMetrics", toIsoRange(dateRange));
}

export async function getCustomerList(options?: {
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "agency_name" | "plan_tier" | "location_count";
  sortOrder?: "asc" | "desc";
  tierFilter?: string;
  searchQuery?: string;
}): Promise<ActionResult<CustomerListResult>> {
  return queryAdmin("admin:getCustomerList", options ?? {});
}

export async function getCustomerConversionFunnel(): Promise<ActionResult<CustomerConversionFunnel>> {
  return queryAdmin("admin:getCustomerConversionFunnel");
}

export async function exportAnalyticsCSV(
  dataType: "customers" | "searches" | "timeseries" | "states" | "customer_list",
  dateRange?: DateRange,
): Promise<ActionResult<string>> {
  return queryAdmin("admin:exportAnalyticsCSV", {
    dataType,
    ...toIsoRange(dateRange),
  });
}

export async function getBotAnalytics(
  dateRange?: DateRange,
): Promise<ActionResult<BotAnalytics>> {
  return queryAdmin("admin:getBotAnalytics", toIsoRange(dateRange));
}
