/**
 * Analytics event type definitions
 */

export const EVENT_TYPES = {
  // Listing events
  LISTING_VIEW: "listing_view",
  LISTING_CONTACT_CLICK: "listing_contact_click",
  LISTING_PHONE_CLICK: "listing_phone_click",
  LISTING_EMAIL_CLICK: "listing_email_click",
  LISTING_WEBSITE_CLICK: "listing_website_click",

  // Search events
  SEARCH_PERFORMED: "search_performed",
  SEARCH_IMPRESSION: "search_impression",
  SEARCH_CLICK: "search_click",

  // Inquiry events
  INQUIRY_SUBMITTED: "inquiry_submitted",
  INQUIRY_VIEWED: "inquiry_viewed",

  // Subscription events
  SUBSCRIPTION_CREATED: "subscription_created",
  SUBSCRIPTION_UPDATED: "subscription_updated",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  PAYMENT_SUCCEEDED: "payment_succeeded",
  PAYMENT_FAILED: "payment_failed",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/**
 * Event metadata interfaces
 */
export interface BaseEventMetadata {
  timestamp?: string;
  userAgent?: string;
  referrer?: string;
  sessionId?: string;
}

export interface ListingViewMetadata extends BaseEventMetadata {
  listingId: string;
  listingSlug: string;
  locationId?: string;
  source?: "search" | "direct" | "state_page" | "homepage";
}

export interface ListingClickMetadata extends BaseEventMetadata {
  listingId: string;
  clickType: "contact" | "phone" | "email" | "website";
}

export interface SearchEventMetadata extends BaseEventMetadata {
  query?: string;
  filters?: Record<string, unknown>;
  resultsCount: number;
  page?: number;
  /** Distinguishes real user searches from bot/crawler traffic */
  source?: "user" | "bot" | "unknown";
}

export interface SearchImpressionMetadata extends BaseEventMetadata {
  listingId: string;
  locationId?: string;
  position: number;
  searchQuery?: string;
  /** Distinguishes real user impressions from bot/crawler traffic */
  source?: "user" | "bot" | "unknown";
}

export interface SearchClickMetadata extends BaseEventMetadata {
  listingId: string;
  locationId?: string;
  position: number;
  searchQuery?: string;
}

export interface InquiryEventMetadata extends BaseEventMetadata {
  listingId: string;
  inquiryId?: string;
}

export interface SubscriptionEventMetadata extends BaseEventMetadata {
  profileId: string;
  planTier: string;
  previousPlanTier?: string;
  stripeSubscriptionId?: string;
}

export type EventMetadata =
  | ListingViewMetadata
  | ListingClickMetadata
  | SearchEventMetadata
  | SearchImpressionMetadata
  | SearchClickMetadata
  | InquiryEventMetadata
  | SubscriptionEventMetadata
  | BaseEventMetadata;

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  eventType: EventType;
  listingId?: string;
  profileId?: string;
  metadata: EventMetadata;
  createdAt?: string;
}

/**
 * Aggregated metrics for dashboard
 */
export interface ListingMetrics {
  views: number;
  uniqueViews: number;
  searchImpressions: number;
  /** Impressions from confirmed real users (client-side tracking) */
  userImpressions: number;
  /** Impressions from detected bot/crawler traffic */
  botImpressions: number;
  searchClicks: number;
  contactClicks: number;
  inquiries: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface MetricsPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface DashboardMetrics {
  current: ListingMetrics;
  previous: ListingMetrics;
  timeSeries: {
    views: TimeSeriesDataPoint[];
    impressions: TimeSeriesDataPoint[];
    clicks: TimeSeriesDataPoint[];
  };
  topSources: Array<{ source: string; count: number }>;
}

/**
 * Time period options for analytics filtering
 */
export type TimePeriod = "all" | "month" | "quarter" | "year";

/**
 * Location-level analytics
 */
export interface LocationAnalytics {
  locationId: string;
  label: string | null;
  city: string;
  state: string;
  metrics: {
    views: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  timeSeries: {
    views: TimeSeriesDataPoint[];
    impressions: TimeSeriesDataPoint[];
    clicks: TimeSeriesDataPoint[];
  };
}
