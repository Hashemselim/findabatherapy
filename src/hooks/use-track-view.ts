"use client";

import { useEffect, useRef } from "react";

import { EVENT_TYPES } from "@/lib/analytics/events";
import {
  trackListingViewed,
  trackListingContactClicked,
  trackSearchResultClicked,
} from "@/lib/posthog/events";

interface UseTrackViewOptions {
  listingId: string;
  listingSlug: string;
  listingName?: string;
  locationId?: string;
  city?: string;
  state?: string;
  planTier?: string;
  source?: "search" | "direct" | "state_page" | "city_page" | "homepage";
}

/**
 * Hook to track listing page views
 * Only tracks once per mount to avoid duplicate events
 * Sends to both Supabase (internal analytics) and PostHog
 */
export function useTrackView({
  listingId,
  listingSlug,
  listingName,
  locationId,
  city,
  state,
  planTier,
  source,
}: UseTrackViewOptions) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Track to PostHog (client-side)
    trackListingViewed({
      listingId,
      listingSlug,
      listingName: listingName || listingSlug,
      city,
      state,
      planTier,
      source: source || "direct",
    });

    // Track view via API (Supabase)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: EVENT_TYPES.LISTING_VIEW,
        listingId,
        listingSlug,
        locationId,
        source: source || "direct",
      }),
    }).catch(() => {
      // Silently fail - analytics tracking should not interrupt UX
    });
  }, [listingId, listingSlug, listingName, locationId, city, state, planTier, source]);
}

/**
 * Track a listing click (contact, phone, email, website)
 * Sends to both Supabase and PostHog
 */
export function trackListingClick(
  listingId: string,
  clickType: "contact" | "phone" | "email" | "website",
  listingName?: string,
  city?: string,
  state?: string
) {
  // Track to PostHog
  trackListingContactClicked({
    listingId,
    listingName: listingName || "Unknown",
    contactType: clickType === "contact" ? "inquiry_form" : clickType,
    city,
    state,
  });

  // Track to Supabase
  const eventType =
    clickType === "phone"
      ? EVENT_TYPES.LISTING_PHONE_CLICK
      : clickType === "email"
        ? EVENT_TYPES.LISTING_EMAIL_CLICK
        : clickType === "website"
          ? EVENT_TYPES.LISTING_WEBSITE_CLICK
          : EVENT_TYPES.LISTING_CONTACT_CLICK;

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      listingId,
      clickType,
    }),
  }).catch(() => {
    // Silently fail - analytics tracking should not interrupt UX
  });
}

/**
 * Track a search result click
 * Sends to both Supabase and PostHog
 */
export function trackSearchResultClick(
  listingId: string,
  position: number,
  searchQuery?: string,
  locationId?: string,
  listingName?: string,
  isFeatured?: boolean
) {
  // Track to PostHog
  trackSearchResultClicked({
    listingId,
    listingName: listingName || "Unknown",
    position,
    searchQuery,
    isFeatured,
  });

  // Track to Supabase
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: EVENT_TYPES.SEARCH_CLICK,
      listingId,
      locationId,
      position,
      searchQuery,
    }),
  }).catch(() => {
    // Silently fail - analytics tracking should not interrupt UX
  });
}
