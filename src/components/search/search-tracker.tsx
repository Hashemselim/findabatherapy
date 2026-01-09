"use client";

import { useEffect, useRef } from "react";
import { trackSearch as trackSearchPostHog } from "@/lib/posthog/events";

interface SearchTrackerProps {
  query?: string;
  location?: string;
  state?: string;
  city?: string;
  serviceTypes?: string[];
  insurances?: string[];
  languages?: string[];
  agesServedMin?: number;
  agesServedMax?: number;
  acceptingClients?: boolean;
  resultsCount: number;
  page?: number;
}

/**
 * Client component to track search events to PostHog and audit_events table
 * Renders nothing - just fires tracking on mount
 * This runs client-side only, so bots/crawlers won't trigger these events
 */
export function SearchTracker({
  query,
  location,
  state,
  city,
  serviceTypes,
  insurances,
  languages,
  agesServedMin,
  agesServedMax,
  acceptingClients,
  resultsCount,
  page,
}: SearchTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Track to PostHog (client-side analytics)
    trackSearchPostHog({
      query,
      location,
      state,
      city,
      serviceTypes,
      insurances,
      languages,
      agesServedMin,
      agesServedMax,
      acceptingClients,
      resultsCount,
      page,
    });

    // Track to audit_events table (for admin dashboard)
    // source="user" confirms this is a real browser visit (not a bot)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "search_performed",
        searchQuery: query,
        filters: {
          state,
          city,
          serviceTypes,
          insurances,
          languages,
          agesServedMin,
          agesServedMax,
          acceptingClients,
        },
        resultsCount,
        page,
        searchSource: "user", // Client-side = confirmed real user
      }),
    }).catch(() => {
      // Silently fail - don't disrupt user experience
    });
  }, [query, location, state, city, serviceTypes, insurances, languages, agesServedMin, agesServedMax, acceptingClients, resultsCount, page]);

  return null;
}
