"use client";

import { useEffect, useRef } from "react";
import { trackSearch } from "@/lib/posthog/events";

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
 * Client component to track search events to PostHog
 * Renders nothing - just fires tracking on mount
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

    trackSearch({
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
  }, [query, location, state, city, serviceTypes, insurances, languages, agesServedMin, agesServedMax, acceptingClients, resultsCount, page]);

  return null;
}
