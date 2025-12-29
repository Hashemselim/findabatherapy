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
    <div className="min-h-screen bg-background">
      {/* Progress */}
      <div className="border-b border-border/60 bg-muted/30 py-4">
        <div className="mx-auto max-w-4xl px-4">
          <OnboardingProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
