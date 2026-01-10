"use client";

import { useEffect, useRef } from "react";

interface ImpressionTrackerProps {
  /** Array of listings shown in search results */
  impressions: Array<{
    id: string;
    locationId?: string;
    position: number;
  }>;
  /** The search query that produced these results */
  searchQuery?: string;
}

/**
 * Client component to track search impressions to audit_events table
 * Renders nothing - just fires tracking on mount
 * This runs client-side only, so bots/crawlers won't trigger these events
 *
 * Events are tracked with source="user" to distinguish from server-side tracking
 * which uses source="unknown" (or "bot"/"ai" if detected)
 */
export function ImpressionTracker({
  impressions,
  searchQuery,
}: ImpressionTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Skip if already tracked or no impressions
    if (hasTracked.current || impressions.length === 0) return;
    hasTracked.current = true;

    // Track to audit_events table (for admin dashboard)
    // source="user" confirms this is a real browser visit (not a bot)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "search_impression",
        impressions,
        searchQuery,
      }),
    }).catch(() => {
      // Silently fail - don't disrupt user experience
    });
  }, [impressions, searchQuery]);

  return null;
}
