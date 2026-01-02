"use client";

import { usePathname } from "next/navigation";

import {
  OnboardingProgress,
  ONBOARDING_STEPS,
} from "@/components/onboarding/onboarding-progress";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine current step from pathname
  const currentStepIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.path === pathname
  );
  const currentStep =
    ONBOARDING_STEPS[currentStepIndex]?.id || ONBOARDING_STEPS[0].id;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="-mx-4 -mt-4 mb-6 border-b border-border/60 bg-muted/30 px-4 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <OnboardingProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  );
}
