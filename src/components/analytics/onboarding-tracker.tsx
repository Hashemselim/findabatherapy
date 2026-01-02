"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  trackOnboardingStarted,
  trackOnboardingStepViewed,
  trackOnboardingStepCompleted,
  trackOnboardingFieldCompleted,
  trackOnboardingLocationAdded,
  trackOnboardingPhotoUploaded,
  trackOnboardingVideoAdded,
  trackOnboardingPlanViewed,
  trackOnboardingPlanSelected,
  trackOnboardingCompleted,
  trackOnboardingSkippedStep,
} from "@/lib/posthog/events";

interface OnboardingTrackerProps {
  step: string;
  stepNumber: number;
  totalSteps: number;
  isComplete?: boolean;
  planSelected?: string;
  locationsCount?: number;
  photosCount?: number;
  hasVideo?: boolean;
}

/**
 * Client component to track onboarding progress
 * Invisible - just fires tracking on mount
 */
export function OnboardingTracker({
  step,
  stepNumber,
  totalSteps,
  isComplete = false,
  planSelected,
  locationsCount,
  photosCount,
  hasVideo,
}: OnboardingTrackerProps) {
  const hasTracked = useRef(false);
  const stepStartTime = useRef(Date.now());

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    if (stepNumber === 1) {
      // First step - track onboarding started
      trackOnboardingStarted();
    }

    // Track step view
    trackOnboardingStepViewed({
      step,
      stepNumber,
      totalSteps,
    });

    // Track step completion with time spent
    trackOnboardingStepCompleted({
      step,
      stepNumber,
      totalSteps,
      timeOnStepSeconds: Math.round((Date.now() - stepStartTime.current) / 1000),
    });

    if (isComplete) {
      trackOnboardingCompleted({
        planSelected,
        locationsCount,
        photosCount,
        hasVideo,
      });
    }
  }, [step, stepNumber, totalSteps, isComplete, planSelected, locationsCount, photosCount, hasVideo]);

  return null;
}

/**
 * Hook to track granular onboarding interactions
 */
export function useOnboardingTracking(step: string) {
  const trackField = useCallback(
    (field: string, hasValue: boolean) => {
      trackOnboardingFieldCompleted({
        step,
        field,
        hasValue,
      });
    },
    [step]
  );

  const trackLocation = useCallback(
    (locationIndex: number, city?: string, state?: string, hasAddress?: boolean) => {
      trackOnboardingLocationAdded({
        locationIndex,
        city,
        state,
        hasAddress: hasAddress ?? false,
      });
    },
    []
  );

  const trackPhoto = useCallback((photoCount: number) => {
    trackOnboardingPhotoUploaded({ photoCount });
  }, []);

  const trackVideo = useCallback(() => {
    trackOnboardingVideoAdded();
  }, []);

  const trackPlanView = useCallback((currentPlan?: string) => {
    trackOnboardingPlanViewed({ currentPlan });
  }, []);

  const trackPlanSelect = useCallback(
    (planTier: string, billingInterval: "monthly" | "annual", previousPlan?: string) => {
      trackOnboardingPlanSelected({
        planTier,
        billingInterval,
        previousPlan,
      });
    },
    []
  );

  const trackSkip = useCallback(
    (stepNumber: number) => {
      trackOnboardingSkippedStep({
        step,
        stepNumber,
      });
    },
    [step]
  );

  return {
    trackField,
    trackLocation,
    trackPhoto,
    trackVideo,
    trackPlanView,
    trackPlanSelect,
    trackSkip,
  };
}
