"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { ONBOARDING_STEPS } from "@/lib/onboarding/flow";
import { cn } from "@/lib/utils";

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
      {/* Desktop: Connected dot stepper */}
      <div className="hidden items-center md:flex">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted =
            completedSteps.includes(step.id) || index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isLast = index === ONBOARDING_STEPS.length - 1;

          return (
            <div key={step.id} className="flex flex-1 items-center last:flex-none">
              {/* Step circle + label */}
              <div className="group relative flex items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500",
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                      : isCurrent
                        ? "bg-[#0866FF] text-white shadow-[0_0_0_3px_rgba(8,102,255,0.15)]"
                        : "bg-amber-100/60 text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <span>{index + 1}</span>
                  )}

                  {/* Current step pulse */}
                  {isCurrent && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#0866FF]/20" style={{ animationDuration: "2s" }} />
                  )}
                </div>

                <span
                  className={cn(
                    "hidden text-xs font-medium transition-colors lg:block",
                    isCurrent
                      ? "text-[#1A2744]"
                      : isCompleted
                        ? "text-emerald-600"
                        : "text-slate-400"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="mx-2 h-px flex-1 lg:mx-3">
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-amber-200/60">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
                      initial={false}
                      animate={{
                        width: isCompleted ? "100%" : isCurrent ? "50%" : "0%",
                      }}
                      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact stepper */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0866FF] text-[10px] font-bold text-white">
              {currentIndex + 1}
            </div>
            <span className="text-sm font-semibold text-[#1A2744]">
              {ONBOARDING_STEPS[currentIndex]?.label}
            </span>
          </div>
          <span className="text-xs tabular-nums text-slate-400">
            {currentIndex + 1}/{ONBOARDING_STEPS.length}
          </span>
        </div>

        {/* Progress track */}
        <div className="flex gap-1">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCompleted =
              completedSteps.includes(step.id) || index < currentIndex;
            const isCurrent = step.id === currentStep;

            return (
              <motion.div
                key={step.id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  isCompleted
                    ? "bg-emerald-400"
                    : isCurrent
                      ? "bg-[#0866FF]"
                      : "bg-amber-200/60"
                )}
                initial={false}
                animate={{
                  opacity: isCurrent || isCompleted ? 1 : 0.4,
                }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
