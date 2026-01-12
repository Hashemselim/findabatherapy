"use client";

import { useEffect, useRef } from "react";

interface JobImpressionTrackerProps {
  /** Array of jobs shown in search results */
  impressions: Array<{
    id: string;
    position: number;
  }>;
  /** The search query that produced these results */
  searchQuery?: string;
}

/**
 * Client component to track job search impressions
 * Renders nothing - just fires tracking on mount
 * This runs client-side only, so bots/crawlers won't trigger these events
 *
 * Events are tracked with source="user" to distinguish from server-side tracking
 */
export function JobImpressionTracker({
  impressions,
  searchQuery,
}: JobImpressionTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Skip if already tracked or no impressions
    if (hasTracked.current || impressions.length === 0) return;
    hasTracked.current = true;

    // Track to audit_events table (for admin dashboard)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "job_search_impression",
        jobImpressions: impressions,
        searchQuery,
      }),
    }).catch(() => {
      // Silently fail - don't disrupt user experience
    });
  }, [impressions, searchQuery]);

  return null;
}
