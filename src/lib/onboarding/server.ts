"use server";

import { evaluateOnboardingFlow, type OnboardingFlowSnapshot } from "./flow";

export async function getOnboardingFlow(): Promise<OnboardingFlowSnapshot> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const state = await queryConvex<{
      onboardingCompleted: boolean;
      selectedPlan: string | null;
      billingInterval: string | null;
      subscriptionStatus: string | null;
      hasAgencyStep: boolean;
      hasLocationStep: boolean;
      hasServicesStep: boolean;
    } | null>("workspaces:getOnboardingFlowState");

    if (!state) {
      return evaluateOnboardingFlow({
        onboardingCompleted: false,
        selectedPlan: "free",
        billingInterval: "month",
        subscriptionStatus: null,
        hasAgencyStep: false,
        hasLocationStep: false,
        hasServicesStep: false,
      });
    }

    return evaluateOnboardingFlow({
      onboardingCompleted: state.onboardingCompleted,
      selectedPlan: state.selectedPlan,
      billingInterval: state.billingInterval,
      subscriptionStatus: state.subscriptionStatus,
      hasAgencyStep: state.hasAgencyStep,
      hasLocationStep: state.hasLocationStep,
      hasServicesStep: state.hasServicesStep,
    });
  } catch {
    return evaluateOnboardingFlow({
      onboardingCompleted: false,
      selectedPlan: "free",
      billingInterval: "month",
      subscriptionStatus: null,
      hasAgencyStep: false,
      hasLocationStep: false,
      hasServicesStep: false,
    });
  }
}
