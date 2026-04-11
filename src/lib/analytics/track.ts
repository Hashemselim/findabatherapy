"use server";

import { headers } from "next/headers";

import {
  EVENT_TYPES,
  type EventType,
  type EventMetadata,
  type ListingViewMetadata,
  type ListingClickMetadata,
  type SearchEventMetadata,
  type SearchImpressionMetadata,
  type InquiryEventMetadata,
  type JobViewMetadata,
  type JobSearchEventMetadata,
  type JobSearchImpressionMetadata,
  type JobApplyClickMetadata,
  type ApplicationEventMetadata,
} from "./events";

const AI_ASSISTANT_PATTERNS = [
  /gptbot/i,
  /chatgpt/i,
  /claudebot/i,
  /anthropic/i,
  /perplexity/i,
  /cohere/i,
  /ai2bot/i,
  /google-extended/i,
  /gemini/i,
  /meta-externalagent/i,
];

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /ccbot/i,
  /crawler/i,
  /spider/i,
  /bot\b/i,
  /scraper/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
];

function detectBotType(userAgent: string | null | undefined): "ai" | "bot" | null {
  if (!userAgent) return "bot";
  if (AI_ASSISTANT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return "ai";
  }
  if (BOT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return "bot";
  }
  return null;
}

function generateSessionId(headersList: Headers): string {
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  const sessionString = `${ip}-${userAgent}-${new Date().toDateString()}`;
  return Buffer.from(sessionString).toString("base64").slice(0, 32);
}

async function getBaseMetadata(): Promise<Partial<EventMetadata>> {
  const headersList = await headers();
  return {
    timestamp: new Date().toISOString(),
    userAgent: headersList.get("user-agent") || undefined,
    referrer: headersList.get("referer") || undefined,
    sessionId: generateSessionId(headersList),
  };
}

async function trackMany(
  events: Array<{ eventType: EventType; metadata: EventMetadata; listingId?: string; profileId?: string }>,
): Promise<{ success: boolean }> {
  for (const event of events) {
    const result = await trackEvent(
      event.eventType,
      event.metadata,
      event.listingId,
      event.profileId,
    );
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}

export async function trackEvent(
  eventType: EventType,
  metadata: EventMetadata,
  listingId?: string,
  profileId?: string,
): Promise<{ success: boolean }> {
  try {
    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const baseMetadata = await getBaseMetadata();
    await mutateConvexUnauthenticated("analytics:trackEvent", {
      eventType,
      payload: {
        ...baseMetadata,
        ...metadata,
        ...(listingId ? { listingId } : {}),
        ...(profileId ? { profileId } : {}),
      },
    });
    return { success: true };
  } catch (error) {
    console.error(`[Analytics] Exception tracking ${eventType}:`, error);
    return { success: false };
  }
}

export async function trackListingView(
  listingId: string,
  listingSlug: string,
  source?: "search" | "direct" | "state_page" | "homepage",
  locationId?: string,
): Promise<{ success: boolean }> {
  const metadata: ListingViewMetadata = {
    listingId,
    listingSlug,
    locationId,
    source,
  };

  return trackEvent(EVENT_TYPES.LISTING_VIEW, metadata, listingId);
}

export async function trackListingClick(
  listingId: string,
  clickType: "contact" | "phone" | "email" | "website",
): Promise<{ success: boolean }> {
  const metadata: ListingClickMetadata = {
    listingId,
    clickType,
  };

  const eventType =
    clickType === "phone"
      ? EVENT_TYPES.LISTING_PHONE_CLICK
      : clickType === "email"
        ? EVENT_TYPES.LISTING_EMAIL_CLICK
        : clickType === "website"
          ? EVENT_TYPES.LISTING_WEBSITE_CLICK
          : EVENT_TYPES.LISTING_CONTACT_CLICK;

  return trackEvent(eventType, metadata, listingId);
}

export async function trackSearch(
  query: string | undefined,
  filters: Record<string, unknown>,
  resultsCount: number,
  page?: number,
  source?: "user" | "ai" | "bot" | "unknown",
): Promise<{ success: boolean }> {
  const metadata: SearchEventMetadata = {
    query,
    filters,
    resultsCount,
    page,
    source: source || "unknown",
  };

  return trackEvent(EVENT_TYPES.SEARCH_PERFORMED, metadata);
}

export async function trackSearchWithBotDetection(
  query: string | undefined,
  filters: Record<string, unknown>,
  resultsCount: number,
  page?: number,
): Promise<{ success: boolean }> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  return trackSearch(query, filters, resultsCount, page, detectBotType(userAgent) || "unknown");
}

export async function trackSearchImpressions(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string,
  source?: "user" | "ai" | "bot" | "unknown",
): Promise<{ success: boolean }> {
  return trackMany(
    listings.map((listing) => ({
      eventType: EVENT_TYPES.SEARCH_IMPRESSION,
      listingId: listing.id,
      metadata: {
        listingId: listing.id,
        locationId: listing.locationId,
        position: listing.position,
        searchQuery,
        source: source || "unknown",
      } as SearchImpressionMetadata,
    })),
  );
}

export async function trackSearchImpressionsWithBotDetection(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string,
): Promise<{ success: boolean }> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  return trackSearchImpressions(listings, searchQuery, detectBotType(userAgent) || "unknown");
}

export async function trackSearchImpressionsFromClient(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string,
): Promise<{ success: boolean }> {
  return trackSearchImpressions(listings, searchQuery, "user");
}

export async function trackSearchClick(
  listingId: string,
  position: number,
  searchQuery?: string,
  locationId?: string,
): Promise<{ success: boolean }> {
  const metadata: SearchImpressionMetadata = {
    listingId,
    locationId,
    position,
    searchQuery,
  };

  return trackEvent(EVENT_TYPES.SEARCH_CLICK, metadata, listingId);
}

export async function trackInquirySubmitted(
  listingId: string,
  inquiryId: string,
): Promise<{ success: boolean }> {
  const metadata: InquiryEventMetadata = {
    listingId,
    inquiryId,
  };

  return trackEvent(EVENT_TYPES.INQUIRY_SUBMITTED, metadata, listingId);
}

export async function wasEventTracked(
  eventType: EventType,
  listingId: string,
): Promise<boolean> {
  void eventType;
  void listingId;
  return false;
}

export async function trackJobView(
  jobId: string,
  jobSlug: string,
  profileId: string,
  positionType: string,
  source?: "search" | "direct" | "state_page" | "homepage",
): Promise<{ success: boolean }> {
  const metadata: JobViewMetadata = {
    jobId,
    jobSlug,
    profileId,
    positionType,
    source,
  };

  return trackEvent(EVENT_TYPES.JOB_VIEW, metadata);
}

export async function trackJobSearch(
  query: string | undefined,
  filters: Record<string, unknown>,
  resultsCount: number,
  page?: number,
  source?: "user" | "ai" | "bot" | "unknown",
): Promise<{ success: boolean }> {
  const metadata: JobSearchEventMetadata = {
    query,
    filters,
    resultsCount,
    page,
    source: source || "unknown",
  };

  return trackEvent(EVENT_TYPES.JOB_SEARCH_PERFORMED, metadata);
}

export async function trackJobSearchImpressions(
  jobs: Array<{ id: string; position: number }>,
  searchQuery?: string,
  source?: "user" | "ai" | "bot" | "unknown",
): Promise<{ success: boolean }> {
  return trackMany(
    jobs.map((job) => ({
      eventType: EVENT_TYPES.JOB_SEARCH_IMPRESSION,
      metadata: {
        jobId: job.id,
        position: job.position,
        searchQuery,
        source: source || "unknown",
      } as JobSearchImpressionMetadata,
    })),
  );
}

export async function trackJobSearchImpressionsFromClient(
  jobs: Array<{ id: string; position: number }>,
  searchQuery?: string,
): Promise<{ success: boolean }> {
  return trackJobSearchImpressions(jobs, searchQuery, "user");
}

export async function trackJobSearchClick(
  jobId: string,
  position: number,
  searchQuery?: string,
): Promise<{ success: boolean }> {
  const metadata: JobSearchImpressionMetadata = {
    jobId,
    position,
    searchQuery,
  };

  return trackEvent(EVENT_TYPES.JOB_SEARCH_CLICK, metadata);
}

export async function trackJobApplyClick(
  jobId: string,
  jobSlug: string,
  profileId: string,
  positionType: string,
): Promise<{ success: boolean }> {
  const metadata: JobApplyClickMetadata = {
    jobId,
    jobSlug,
    profileId,
    positionType,
  };

  return trackEvent(EVENT_TYPES.JOB_APPLY_CLICK, metadata);
}

export async function trackApplicationSubmitted(
  jobId: string,
  applicationId: string,
  profileId: string,
): Promise<{ success: boolean }> {
  const metadata: ApplicationEventMetadata = {
    jobId,
    applicationId,
    profileId,
  };

  return trackEvent(EVENT_TYPES.APPLICATION_SUBMITTED, metadata);
}

export async function trackApplicationViewed(
  jobId: string,
  applicationId: string,
  profileId: string,
): Promise<{ success: boolean }> {
  const metadata: ApplicationEventMetadata = {
    jobId,
    applicationId,
    profileId,
  };

  return trackEvent(EVENT_TYPES.APPLICATION_VIEWED, metadata);
}
