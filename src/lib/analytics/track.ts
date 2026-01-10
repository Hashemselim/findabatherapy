"use server";

import { headers } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  EVENT_TYPES,
  type EventType,
  type EventMetadata,
  type ListingViewMetadata,
  type ListingClickMetadata,
  type SearchEventMetadata,
  type SearchImpressionMetadata,
  type InquiryEventMetadata,
} from "./events";

/**
 * AI assistant user agent patterns - these are valuable as they represent
 * real users asking AI to find information (e.g., "find me a therapist in NYC")
 */
const AI_ASSISTANT_PATTERNS = [
  /gptbot/i,           // OpenAI's crawler
  /chatgpt/i,          // ChatGPT browsing for users
  /claudebot/i,        // Anthropic's crawler
  /anthropic/i,        // Anthropic
  /perplexity/i,       // Perplexity AI
  /cohere/i,           // Cohere AI
  /ai2bot/i,           // Allen Institute for AI
  /google-extended/i,  // Google Gemini/Bard crawler
  /gemini/i,           // Google Gemini
  /meta-externalagent/i, // Meta AI
];

/**
 * SEO and other bot/crawler user agent patterns - these are not direct user traffic
 */
const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
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
  /ccbot/i,            // Common Crawl (training data)
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

/**
 * Detect the source type from user agent
 * Returns: "ai" for AI assistants, "bot" for SEO/crawlers, or null for unknown
 */
function detectBotType(userAgent: string | null | undefined): "ai" | "bot" | null {
  // No user agent = likely automated traffic
  if (!userAgent) return "bot";

  // Check AI assistants first (more specific)
  if (AI_ASSISTANT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return "ai";
  }

  // Check general bots
  if (BOT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return "bot";
  }

  return null;
}

/**
 * Detect if the user agent is a bot/crawler (includes AI assistants)
 */
function isBot(userAgent: string | null | undefined): boolean {
  return detectBotType(userAgent) !== null;
}

/**
 * Generate a simple session ID from request headers
 * Used for deduplication of events
 */
function generateSessionId(headersList: Headers): string {
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";
  // Create a simple hash for the session
  const sessionString = `${ip}-${userAgent}-${new Date().toDateString()}`;
  return Buffer.from(sessionString).toString("base64").slice(0, 32);
}

/**
 * Get base metadata from request headers
 */
async function getBaseMetadata(): Promise<Partial<EventMetadata>> {
  const headersList = await headers();
  return {
    timestamp: new Date().toISOString(),
    userAgent: headersList.get("user-agent") || undefined,
    referrer: headersList.get("referer") || undefined,
    sessionId: generateSessionId(headersList),
  };
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  eventType: EventType,
  metadata: EventMetadata,
  listingId?: string,
  profileId?: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createAdminClient();
    const baseMetadata = await getBaseMetadata();

    const { error } = await supabase.from("audit_events").insert({
      event_type: eventType,
      listing_id: listingId || null,
      profile_id: profileId || null,
      metadata: { ...baseMetadata, ...metadata },
    });

    if (error) {
      console.error(`[Analytics] Failed to track ${eventType}:`, error.message);
      return { success: false };
    }

    return { success: true };
  } catch (e) {
    console.error(`[Analytics] Exception tracking ${eventType}:`, e);
    return { success: false };
  }
}

/**
 * Track a listing view
 */
export async function trackListingView(
  listingId: string,
  listingSlug: string,
  source?: "search" | "direct" | "state_page" | "homepage",
  locationId?: string
): Promise<{ success: boolean }> {
  const metadata: ListingViewMetadata = {
    listingId,
    listingSlug,
    locationId,
    source,
  };

  return trackEvent(EVENT_TYPES.LISTING_VIEW, metadata, listingId);
}

/**
 * Track a listing contact click
 */
export async function trackListingClick(
  listingId: string,
  clickType: "contact" | "phone" | "email" | "website"
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

/**
 * Track a search performed
 * @param source - "user" for client-side tracking, "bot" for detected bots, "unknown" for server-side without detection
 */
export async function trackSearch(
  query: string | undefined,
  filters: Record<string, unknown>,
  resultsCount: number,
  page?: number,
  source?: "user" | "ai" | "bot" | "unknown"
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

/**
 * Track a search performed with automatic bot detection (server-side)
 * Uses request headers to detect if the request is from a bot/crawler or AI assistant
 */
export async function trackSearchWithBotDetection(
  query: string | undefined,
  filters: Record<string, unknown>,
  resultsCount: number,
  page?: number
): Promise<{ success: boolean }> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const botType = detectBotType(userAgent);
  const source = botType || "unknown";

  return trackSearch(query, filters, resultsCount, page, source);
}

/**
 * Track search impressions (listings shown in results)
 * @param source - "user" for client-side, "bot" for detected bots, "unknown" for server-side
 */
export async function trackSearchImpressions(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string,
  source?: "user" | "ai" | "bot" | "unknown"
): Promise<{ success: boolean }> {
  try {
    const supabase = await createAdminClient();
    const baseMetadata = await getBaseMetadata();

    const events = listings.map((listing) => ({
      event_type: EVENT_TYPES.SEARCH_IMPRESSION,
      listing_id: listing.id,
      metadata: {
        ...baseMetadata,
        listingId: listing.id,
        locationId: listing.locationId,
        position: listing.position,
        searchQuery,
        source: source || "unknown",
      } as SearchImpressionMetadata,
    }));

    const { error } = await supabase.from("audit_events").insert(events);

    if (error) {
      console.error("[Analytics] Failed to track search impressions:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (e) {
    console.error("[Analytics] Exception tracking search impressions:", e);
    return { success: false };
  }
}

/**
 * Track search impressions with automatic bot detection (server-side)
 */
export async function trackSearchImpressionsWithBotDetection(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string
): Promise<{ success: boolean }> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const botType = detectBotType(userAgent);
  const source = botType || "unknown";

  return trackSearchImpressions(listings, searchQuery, source);
}

/**
 * Track search impressions from client-side API calls (source already confirmed as "user")
 * This bypasses the headers() call since it's called from an API route handler
 */
export async function trackSearchImpressionsFromClient(
  listings: Array<{ id: string; locationId?: string; position: number }>,
  searchQuery?: string
): Promise<{ success: boolean }> {
  try {
    const supabase = await createAdminClient();

    const events = listings.map((listing) => ({
      event_type: EVENT_TYPES.SEARCH_IMPRESSION,
      listing_id: listing.id,
      metadata: {
        timestamp: new Date().toISOString(),
        listingId: listing.id,
        locationId: listing.locationId,
        position: listing.position,
        searchQuery,
        source: "user", // Client-side = confirmed real user
      } as SearchImpressionMetadata,
    }));

    const { error } = await supabase.from("audit_events").insert(events);

    if (error) {
      console.error("[Analytics] Failed to track client impressions:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (e) {
    console.error("[Analytics] Exception tracking client impressions:", e);
    return { success: false };
  }
}

/**
 * Track a search result click
 */
export async function trackSearchClick(
  listingId: string,
  position: number,
  searchQuery?: string,
  locationId?: string
): Promise<{ success: boolean }> {
  const metadata: SearchImpressionMetadata = {
    listingId,
    locationId,
    position,
    searchQuery,
  };

  return trackEvent(EVENT_TYPES.SEARCH_CLICK, metadata, listingId);
}

/**
 * Track an inquiry submission
 */
export async function trackInquirySubmitted(
  listingId: string,
  inquiryId: string
): Promise<{ success: boolean }> {
  const metadata: InquiryEventMetadata = {
    listingId,
    inquiryId,
  };

  return trackEvent(EVENT_TYPES.INQUIRY_SUBMITTED, metadata, listingId);
}

/**
 * Check if an event was already tracked in this session
 * Used for deduplication
 */
export async function wasEventTracked(
  eventType: EventType,
  listingId: string
): Promise<boolean> {
  try {
    const headersList = await headers();
    const sessionId = generateSessionId(headersList);

    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("audit_events")
      .select("id")
      .eq("event_type", eventType)
      .eq("listing_id", listingId)
      .gte("created_at", `${today}T00:00:00`)
      .contains("metadata", { sessionId })
      .limit(1);

    if (error) {
      return false;
    }

    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}
