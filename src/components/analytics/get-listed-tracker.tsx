"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  trackGetListedPageViewed,
  trackGetListedPricingViewed,
  trackGetListedPlanCtaClicked,
  trackGetListedDemoClicked,
  trackGetListedFaqViewed,
} from "@/lib/posthog/events";

/**
 * Client component to track get-listed page events for CRO
 * Renders nothing - just fires tracking events
 */
export function GetListedPageTracker() {
  const hasTrackedPageView = useRef(false);
  const hasTrackedPricing = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;

    trackGetListedPageViewed({
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      utmSource: searchParams.get("utm_source") || undefined,
      utmMedium: searchParams.get("utm_medium") || undefined,
      utmCampaign: searchParams.get("utm_campaign") || undefined,
    });
  }, [searchParams]);

  // Track pricing section visibility using Intersection Observer
  useEffect(() => {
    const pricingSection = document.getElementById("pricing");
    if (!pricingSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedPricing.current) {
            hasTrackedPricing.current = true;
            trackGetListedPricingViewed();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(pricingSection);

    return () => observer.disconnect();
  }, []);

  return null;
}

/**
 * Hook to track CTA clicks on the get-listed page
 */
export function useGetListedTracking() {
  const trackPlanCta = useCallback(
    (params: {
      planTier: "free" | "pro" | "enterprise";
      billingInterval?: "monthly" | "annual";
      ctaText: string;
      ctaPosition: "hero" | "pricing" | "footer";
    }) => {
      trackGetListedPlanCtaClicked(params);
    },
    []
  );

  const trackDemo = useCallback(
    (ctaPosition: "hero" | "pricing" | "features") => {
      trackGetListedDemoClicked({ ctaPosition });
    },
    []
  );

  const trackFaq = useCallback((question: string, questionIndex: number) => {
    trackGetListedFaqViewed({ question, questionIndex });
  }, []);

  return { trackPlanCta, trackDemo, trackFaq };
}
