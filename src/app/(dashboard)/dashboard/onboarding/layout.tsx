"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { GoodABALogo } from "@/components/brand/goodaba-logo";
import { ONBOARDING_STEPS } from "@/lib/onboarding/flow";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentStepIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.path === pathname
  );
  const currentStep =
    ONBOARDING_STEPS[currentStepIndex]?.id || ONBOARDING_STEPS[0].id;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-muted/50">
      {/* Subtle ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[300px] -top-[200px] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -right-[200px] top-[40%] h-[500px] w-[500px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      {/* Progress bar - sticky header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-muted/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Brand mark */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <GoodABALogo size="sm" priority />
              <span className="hidden text-sm font-semibold tracking-tight text-primary sm:inline">
                Setup
              </span>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-border/60" />

            {/* Progress stepper */}
            <div className="min-w-0 flex-1">
              <OnboardingProgress currentStep={currentStep} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const }}
          className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
