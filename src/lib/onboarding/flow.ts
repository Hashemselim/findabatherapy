export type OnboardingStepId =
  | "welcome"
  | "details"
  | "location"
  | "services"
  | "branded-preview"
  | "dashboard"
  | "plan";

export interface OnboardingStepConfig {
  id: OnboardingStepId;
  label: string;
  path: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: "welcome", label: "Welcome", path: "/dashboard/onboarding" },
  { id: "details", label: "Agency", path: "/dashboard/onboarding/details" },
  { id: "location", label: "Locations", path: "/dashboard/onboarding/location" },
  { id: "services", label: "Services", path: "/dashboard/onboarding/services" },
  { id: "branded-preview", label: "Preview", path: "/dashboard/onboarding/branded-preview" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard/onboarding/dashboard" },
  { id: "plan", label: "Plan", path: "/dashboard/onboarding/plan" },
];

export const LEGACY_ONBOARDING_REDIRECTS: Record<string, string> = {
  "/dashboard/onboarding/basics": "/dashboard/onboarding/details",
  "/dashboard/onboarding/enhanced": "/dashboard/onboarding/services",
  "/dashboard/onboarding/review": "/dashboard/onboarding/plan",
  "/dashboard/onboarding/success": "/dashboard?welcome=1",
};

export const PRE_ONBOARDING_ALLOWED_ROUTES = [
  "/dashboard/account",
  "/dashboard/billing/checkout",
  "/dashboard/billing/success",
  "/dashboard/billing/cancel",
] as const;

export type DashboardAccessMode = "pre_onboarding" | "free_preview" | "pro_live";

export interface OnboardingFlowSnapshot {
  isComplete: boolean;
  selectedPlan: "free" | "pro";
  billingInterval: "month" | "year";
  accessMode: DashboardAccessMode;
  completedSteps: OnboardingStepId[];
  currentStep: OnboardingStepId;
  firstIncompletePath: string;
}

interface EvaluateInput {
  onboardingCompleted: boolean;
  selectedPlan: string | null | undefined;
  billingInterval: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  hasAgencyStep: boolean;
  hasLocationStep: boolean;
  hasServicesStep: boolean;
}

function normalizePlan(plan: string | null | undefined): "free" | "pro" {
  return plan === "pro" ? "pro" : "free";
}

function normalizeInterval(interval: string | null | undefined): "month" | "year" {
  return interval === "annual" || interval === "year" ? "year" : "month";
}

export function isAllowedPreOnboardingPath(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/onboarding")) {
    return true;
  }

  return PRE_ONBOARDING_ALLOWED_ROUTES.some((route) => pathname.startsWith(route));
}

export function resolveLegacyOnboardingRedirect(pathname: string): string | null {
  return LEGACY_ONBOARDING_REDIRECTS[pathname] ?? null;
}

export function evaluateOnboardingFlow(input: EvaluateInput): OnboardingFlowSnapshot {
  const selectedPlan = normalizePlan(input.selectedPlan);
  const billingInterval = normalizeInterval(input.billingInterval);
  const isActiveSubscription =
    input.subscriptionStatus === "active" || input.subscriptionStatus === "trialing";
  const accessMode: DashboardAccessMode = input.onboardingCompleted
    ? selectedPlan === "pro" && isActiveSubscription
      ? "pro_live"
      : "free_preview"
    : "pre_onboarding";

  if (input.onboardingCompleted) {
    return {
      isComplete: true,
      selectedPlan,
      billingInterval,
      accessMode,
      completedSteps: ONBOARDING_STEPS.map((step) => step.id),
      currentStep: "plan",
      firstIncompletePath: "/dashboard",
    };
  }

  const completedSteps: OnboardingStepId[] = ["welcome"];
  if (input.hasAgencyStep) {
    completedSteps.push("details");
  }
  if (input.hasAgencyStep && input.hasLocationStep) {
    completedSteps.push("location");
  }
  if (input.hasAgencyStep && input.hasLocationStep && input.hasServicesStep) {
    completedSteps.push("services");
    completedSteps.push("branded-preview");
    completedSteps.push("dashboard");
  }

  if (!input.hasAgencyStep) {
    return {
      isComplete: false,
      selectedPlan,
      billingInterval,
      accessMode,
      completedSteps,
      currentStep: "details",
      firstIncompletePath: "/dashboard/onboarding/details",
    };
  }

  if (!input.hasLocationStep) {
    return {
      isComplete: false,
      selectedPlan,
      billingInterval,
      accessMode,
      completedSteps,
      currentStep: "location",
      firstIncompletePath: "/dashboard/onboarding/location",
    };
  }

  if (!input.hasServicesStep) {
    return {
      isComplete: false,
      selectedPlan,
      billingInterval,
      accessMode,
      completedSteps,
      currentStep: "services",
      firstIncompletePath: "/dashboard/onboarding/services",
    };
  }

  return {
    isComplete: false,
    selectedPlan,
    billingInterval,
    accessMode,
    completedSteps,
    currentStep: "branded-preview",
    firstIncompletePath: "/dashboard/onboarding/branded-preview",
  };
}
