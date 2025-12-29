"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  label: string;
  path: string;
};

// Onboarding flow:
// Step 1: Practice Details (agency info, headline, description, logo)
// Step 2: Location (location, service mode, insurances, accepting clients)
// Step 3: Premium Features (ages, languages, diagnoses, specialties, video, contact form - all gated for Pro+)
// Step 4: Go Live (preview and publish)
export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "details", label: "Practice Details", path: "/dashboard/onboarding/details" },
  { id: "location", label: "Location", path: "/dashboard/onboarding/location" },
  { id: "enhanced", label: "Premium Features", path: "/dashboard/onboarding/enhanced" },
  { id: "review", label: "Go Live", path: "/dashboard/onboarding/review" },
];

type OnboardingProgressProps = {
  currentStep: string;
  completedSteps?: string[];
};

export function OnboardingProgress({
  currentStep,
  completedSteps = [],
}: OnboardingProgressProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.id === currentStep
  );

  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px w-8 transition-colors",
                    index < currentIndex ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Progress */}
      <div className="flex md:hidden items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {ONBOARDING_STEPS[currentIndex]?.label}
        </span>
      </div>

      {/* Mobile Progress Bar */}
      <div className="mt-2 md:hidden">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${((currentIndex + 1) / ONBOARDING_STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
