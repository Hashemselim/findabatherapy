"use client";

import { useEffect, useRef } from "react";

import { EVENT_TYPES } from "@/lib/analytics/events";

interface UseTrackViewOptions {
  listingId: string;
  listingSlug: string;
  locationId?: string;
  source?: "search" | "direct" | "state_page" | "homepage";
}

/**
 * Hook to track listing page views
 * Only tracks once per mount to avoid duplicate events
 */
export function useTrackView({ listingId, listingSlug, locationId, source }: UseTrackViewOptions) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Track view via API
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
  }, [listingId, listingSlug, locationId, source]);
}

/**
 * Track a listing click (contact, phone, email, website)
 */
export function trackListingClick(
  listingId: string,
  clickType: "contact" | "phone" | "email" | "website"
) {
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
 */
export function trackSearchResultClick(
  listingId: string,
  position: number,
  searchQuery?: string,
  locationId?: string
) {
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
