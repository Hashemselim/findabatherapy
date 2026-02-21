"use client";

import { useEffect, useRef } from "react";

import {
  trackBehaviorWorkGetStartedViewed,
  trackBehaviorWorkSectionViewed,
} from "@/lib/posthog/events";

type TrackerMode = "lander" | "get-started";

const trackedSections: Array<{ id: string; event: "bw_hero_view" | "bw_engines_view" | "bw_funnel_view" | "bw_pricing_teaser_view" | "bw_faq_view" }> = [
  { id: "hero", event: "bw_hero_view" },
  { id: "platform", event: "bw_engines_view" },
  { id: "how-it-works", event: "bw_funnel_view" },
  { id: "pricing-teaser", event: "bw_pricing_teaser_view" },
  { id: "faq", event: "bw_faq_view" },
];

interface BehaviorWorkTrackerProps {
  mode: TrackerMode;
}

export function BehaviorWorkTracker({ mode }: BehaviorWorkTrackerProps) {
  const tracked = useRef<Set<string>>(new Set());
  const trackedGetStarted = useRef(false);

  useEffect(() => {
    if (mode !== "lander") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionId = entry.target.id;
          if (!sectionId || tracked.current.has(sectionId)) return;

          const section = trackedSections.find((item) => item.id === sectionId);
          if (!section) return;

          tracked.current.add(sectionId);
          trackBehaviorWorkSectionViewed({ sectionId: section.id, event: section.event, source: "behaviorwork" });
        });
      },
      { threshold: 0.35 }
    );

    trackedSections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode !== "get-started" || trackedGetStarted.current) return;
    trackedGetStarted.current = true;

    trackBehaviorWorkGetStartedViewed({ source: "behaviorwork" });
  }, [mode]);

  return null;
}
