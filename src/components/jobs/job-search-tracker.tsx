"use client";

import { useEffect, useRef } from "react";

interface JobSearchTrackerProps {
  query?: string;
  state?: string;
  city?: string;
  positionTypes?: string[];
  employmentTypes?: string[];
  remoteOnly?: boolean;
  postedWithin?: string;
  resultsCount: number;
  page?: number;
}

/**
 * Client component to track job search events
 * Renders nothing - just fires tracking on mount
 * This runs client-side only, so bots/crawlers won't trigger these events
 */
export function JobSearchTracker({
  query,
  state,
  city,
  positionTypes,
  employmentTypes,
  remoteOnly,
  postedWithin,
  resultsCount,
  page,
}: JobSearchTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Track to audit_events table (for admin dashboard)
    // searchSource="user" confirms this is a real browser visit (not a bot)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "job_search_performed",
        searchQuery: query,
        filters: {
          state,
          city,
          positionTypes,
          employmentTypes,
          remoteOnly,
          postedWithin,
        },
        resultsCount,
        page,
        searchSource: "user", // Client-side = confirmed real user
      }),
    }).catch(() => {
      // Silently fail - don't disrupt user experience
    });
  }, [query, state, city, positionTypes, employmentTypes, remoteOnly, postedWithin, resultsCount, page]);

  return null;
}
