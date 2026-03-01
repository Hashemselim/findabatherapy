"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_CONFIGS } from "@/lib/plans/features";

interface UpgradeBannerProps {
  /** Called when "Upgrade to Pro" is clicked */
  onUpgradePro: () => void;
  /** Whether buttons should be disabled */
  disabled?: boolean;
}

/**
 * Banner shown to unpaid users on the Enhanced Details step.
 * Encourages upgrade to Pro plan.
 */
export function UpgradeBanner({
  onUpgradePro,
  disabled = false,
}: UpgradeBannerProps) {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Unlock Premium Features
          </h3>
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro for premium placement in search results, a premium profile, and convert more leads to clients.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={onUpgradePro}
            disabled={disabled}
            className="rounded-full border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]"
          >
            Upgrade to Pro (${PLAN_CONFIGS.pro.pricing.monthly.price}/mo)
          </Button>
        </div>
      </div>
    </div>
  );
}
