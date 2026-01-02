"use client";

import { useEffect, useRef } from "react";
import { trackDashboardViewed } from "@/lib/posthog/events";

interface DashboardTrackerProps {
  section: "overview" | "listing" | "locations" | "inbox" | "analytics" | "settings";
}

/**
 * Client component to track dashboard section views
 * Invisible - just fires tracking on mount
 */
export function DashboardTracker({ section }: DashboardTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackDashboardViewed({ section });
  }, [section]);

  return null;
}
