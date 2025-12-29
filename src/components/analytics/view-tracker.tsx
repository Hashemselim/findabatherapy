"use client";

import { useEffect, useRef } from "react";

import { EVENT_TYPES } from "@/lib/analytics/events";

interface ViewTrackerProps {
  listingId: string;
  listingSlug: string;
  locationId?: string;
  defaultSource?: "search" | "direct" | "state_page" | "homepage";
}

/**
 * Detect traffic source from referrer URL
 * - /search → "search"
 * - /[state-slug] (state pages like /new-jersey, /california) → "state_page"
 * - /[state]/[city] (city pages) → "state_page"
 * - / (homepage) → "homepage"
 * - default → "direct"
 */
function detectSource(referrer: string): "search" | "direct" | "state_page" | "homepage" {
  if (!referrer) return "direct";

  try {
    const url = new URL(referrer);
    const pathname = url.pathname;

    if (pathname.startsWith("/search")) {
      return "search";
    }

    if (pathname === "/") {
      return "homepage";
    }

    // State or city page patterns:
    // /new-jersey, /california (state slugs)
    // /new-jersey/newark (city pages)
    // Match: starts with /, has lowercase letters/hyphens, no other special chars
    if (/^\/[a-z-]+(?:\/[a-z-]+)?$/i.test(pathname) && !pathname.startsWith("/provider")) {
      return "state_page";
    }

    return "direct";
  } catch {
    return "direct";
  }
}

/**
 * Invisible component that tracks listing page views
 * Used to add client-side tracking to server components
 */
export function ViewTracker({ listingId, listingSlug, locationId, defaultSource = "direct" }: ViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Detect source from referrer synchronously before tracking
    const source = detectSource(document.referrer) || defaultSource;

    // Track view via API
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: EVENT_TYPES.LISTING_VIEW,
        listingId,
        listingSlug,
        locationId,
        source,
      }),
    }).catch((error) => {
      console.error("Failed to track view:", error);
    });
  }, [listingId, listingSlug, locationId, defaultSource]);

  return null;
}
