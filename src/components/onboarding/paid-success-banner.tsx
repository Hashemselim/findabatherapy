"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

import { PLAN_CONFIGS, type PlanTier } from "@/lib/plans/features";

interface PaidSuccessBannerProps {
  /** The user's current plan tier */
  planTier: PlanTier;
  /** Whether payment has been completed (true) or just selected (false) */
  isPaid?: boolean;
}

/**
 * Success banner shown on the Enhanced Details step.
 * Shows different messaging based on whether payment is complete or pending.
 */
export function PaidSuccessBanner({ planTier, isPaid = false }: PaidSuccessBannerProps) {
  const planConfig = PLAN_CONFIGS[planTier];

  if (isPaid) {
    // Payment complete - show active status
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Premium features included with your {planConfig.displayName} plan
          </p>
        </div>
      </div>
    );
  }

  // Plan selected but not yet paid - show info about completing payment
  return (
    <div className="rounded-xl border border-[#5788FF]/30 bg-[#5788FF]/10 p-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-[#5788FF]" />
        <p className="text-sm font-medium text-[#5788FF]">
          You selected {planConfig.displayName} — complete payment on the next step to activate premium features
        </p>
      </div>
    </div>
  );
}
