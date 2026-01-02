"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  trackSignupPageViewed,
  trackSignupMethodSelected,
  trackSignupFormStarted,
  trackSignupFormFieldCompleted,
  trackSignupTermsAccepted,
  trackSignupCaptchaCompleted,
  trackSignupFormSubmitted,
  trackSignupFormError,
  trackSignupEmailSent,
  trackSignupCompleted,
} from "@/lib/posthog/events";

interface SignupTrackerProps {
  selectedPlan?: string | null;
  billingInterval?: string;
}

/**
 * Client component to track signup page view
 * Renders nothing - just fires tracking on mount
 */
export function SignupPageTracker({ selectedPlan, billingInterval }: SignupTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackSignupPageViewed({
      selectedPlan: selectedPlan || undefined,
      billingInterval: billingInterval || undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });
  }, [selectedPlan, billingInterval]);

  return null;
}

/**
 * Hook to track signup form interactions
 */
export function useSignupTracking(selectedPlan?: string | null) {
  const formStartedRef = useRef(false);
  const emailCompletedRef = useRef(false);
  const passwordCompletedRef = useRef(false);

  const trackMethodSelected = useCallback(
    (method: "google" | "microsoft" | "email") => {
      trackSignupMethodSelected({
        method,
        selectedPlan: selectedPlan || undefined,
      });
    },
    [selectedPlan]
  );

  const trackFormStarted = useCallback(() => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackSignupFormStarted({
      selectedPlan: selectedPlan || undefined,
    });
  }, [selectedPlan]);

  const trackFieldCompleted = useCallback(
    (field: "email" | "password") => {
      // Only track each field once
      if (field === "email" && emailCompletedRef.current) return;
      if (field === "password" && passwordCompletedRef.current) return;

      if (field === "email") emailCompletedRef.current = true;
      if (field === "password") passwordCompletedRef.current = true;

      trackSignupFormFieldCompleted({
        field,
        selectedPlan: selectedPlan || undefined,
      });
    },
    [selectedPlan]
  );

  const trackTermsAccepted = useCallback(() => {
    trackSignupTermsAccepted({
      selectedPlan: selectedPlan || undefined,
    });
  }, [selectedPlan]);

  const trackCaptchaCompleted = useCallback(() => {
    trackSignupCaptchaCompleted({
      selectedPlan: selectedPlan || undefined,
    });
  }, [selectedPlan]);

  const trackFormSubmitted = useCallback(
    (method: "email" | "google" | "microsoft", billingInterval?: string) => {
      trackSignupFormSubmitted({
        method,
        selectedPlan: selectedPlan || undefined,
        billingInterval,
      });
    },
    [selectedPlan]
  );

  const trackError = useCallback(
    (errorMessage: string, field?: string) => {
      trackSignupFormError({
        errorMessage,
        field,
        selectedPlan: selectedPlan || undefined,
      });
    },
    [selectedPlan]
  );

  const trackEmailSent = useCallback(() => {
    trackSignupEmailSent({
      selectedPlan: selectedPlan || undefined,
    });
  }, [selectedPlan]);

  const trackCompleted = useCallback(
    (method: "email" | "google" | "microsoft", billingInterval?: string) => {
      trackSignupCompleted({
        method,
        selectedPlan: selectedPlan || undefined,
        billingInterval,
      });
    },
    [selectedPlan]
  );

  return {
    trackMethodSelected,
    trackFormStarted,
    trackFieldCompleted,
    trackTermsAccepted,
    trackCaptchaCompleted,
    trackFormSubmitted,
    trackError,
    trackEmailSent,
    trackCompleted,
  };
}
