"use client";

import { useEffect, useRef } from "react";

interface JobViewTrackerProps {
  jobId: string;
  jobSlug: string;
  profileId: string;
  positionType: string;
  companyName?: string;
  defaultSource?: "search" | "direct" | "state_page" | "homepage";
}

/**
 * Detect traffic source from referrer URL
 * - /jobs/search → "search"
 * - /jobs/[state] (state pages) → "state_page"
 * - /jobs (homepage) → "homepage"
 * - default → "direct"
 */
function detectSource(referrer: string): "search" | "direct" | "state_page" | "homepage" {
  if (!referrer) return "direct";

  try {
    const url = new URL(referrer);
    const pathname = url.pathname;

    if (pathname.startsWith("/jobs/search")) {
      return "search";
    }

    if (pathname === "/jobs" || pathname === "/jobs/") {
      return "homepage";
    }

    // State page patterns: /jobs/new-jersey, /jobs/california
    if (/^\/jobs\/[a-z-]+$/i.test(pathname)) {
      return "state_page";
    }

    return "direct";
  } catch {
    return "direct";
  }
}

/**
 * Invisible component that tracks job page views
 * Used to add client-side tracking to server components
 */
export function JobViewTracker({
  jobId,
  jobSlug,
  profileId,
  positionType,
  defaultSource = "direct",
}: JobViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    // Detect source from referrer synchronously before tracking
    const source = detectSource(document.referrer) || defaultSource;

    // Track view via API (Supabase)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "job_view",
        jobId,
        jobSlug,
        profileId,
        positionType,
        source,
      }),
    }).catch((error) => {
      console.error("Failed to track job view:", error);
    });
  }, [jobId, jobSlug, profileId, positionType, defaultSource]);

  return null;
}
