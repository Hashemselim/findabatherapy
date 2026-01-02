"use client";

import { useEffect, useRef } from "react";
import {
  trackCheckoutCompleted,
  trackSubscriptionChange,
  setUserProperties,
} from "@/lib/posthog/events";

interface CheckoutTrackerProps {
  type: "new" | "upgrade" | "downgrade";
  planTier?: string;
  billingInterval?: "month" | "year";
}

/**
 * Client component to track checkout completion events
 * Invisible - just fires tracking on mount
 */
export function CheckoutTracker({ type, planTier, billingInterval }: CheckoutTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    if (type === "new") {
      trackCheckoutCompleted({
        planTier: planTier || "pro",
        billingInterval: billingInterval || "month",
      });
    } else if (type === "upgrade") {
      trackSubscriptionChange({
        type: "upgraded",
        toPlan: planTier,
      });
    } else if (type === "downgrade") {
      trackSubscriptionChange({
        type: "downgraded",
        toPlan: planTier,
      });
    }

    // Update user properties
    if (planTier) {
      setUserProperties({
        plan_tier: planTier,
        billing_interval: billingInterval,
      });
    }
  }, [type, planTier, billingInterval]);

  return null;
}
