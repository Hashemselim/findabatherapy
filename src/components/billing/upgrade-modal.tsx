"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";

import { type PlanTier, PLAN_CONFIGS, getPlanConfig } from "@/lib/plans/features";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onOpenChange: (open: boolean) => void;
  /** Optional: Pre-select a specific plan */
  defaultPlan?: PlanTier;
  /** Optional: Feature that triggered the upgrade */
  triggerFeature?: string;
}

/**
 * Upgrade flow modal with plan comparison
 */
export function UpgradeModal({
  open,
  onOpenChange,
  defaultPlan,
  triggerFeature,
}: UpgradeModalProps) {
  const { tier: currentTier } = usePlanFeatures();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(
    defaultPlan || (currentTier === "free" ? "pro" : "enterprise")
  );

  // Only show plans that are upgrades from current
  const availablePlans = (Object.keys(PLAN_CONFIGS) as PlanTier[]).filter(
    (plan) => compareTiers(plan, currentTier) > 0
  );

  if (availablePlans.length === 0) {
    return null; // Already on highest plan
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            {triggerFeature
              ? `Upgrade to access ${triggerFeature} and more premium features.`
              : "Unlock premium features and grow your business."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {availablePlans.map((plan) => {
            const config = getPlanConfig(plan);
            const isSelected = selectedPlan === plan;

            return (
              <div
                key={plan}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 p-4 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan === "pro" && (
                  <div className="absolute -top-3 left-4 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {config.displayName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">
                    ${config.pricing.monthly.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-2">
                  {config.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-primary" />
                      {highlight}
                    </li>
                  ))}
                </ul>

                {/* Selection indicator */}
                <div
                  className={cn(
                    "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button asChild>
            <a href={`/dashboard/billing/checkout?plan=${selectedPlan}`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to {getPlanConfig(selectedPlan).displayName}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage upgrade modal state
 */
export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerFeature, setTriggerFeature] = useState<string | undefined>();
  const [defaultPlan, setDefaultPlan] = useState<PlanTier | undefined>();

  const openUpgradeModal = (options?: { feature?: string; plan?: PlanTier }) => {
    setTriggerFeature(options?.feature);
    setDefaultPlan(options?.plan);
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
    setTriggerFeature(undefined);
    setDefaultPlan(undefined);
  };

  return {
    isOpen,
    triggerFeature,
    defaultPlan,
    openUpgradeModal,
    closeUpgradeModal,
    setIsOpen,
  };
}

/**
 * Compare two plan tiers
 */
function compareTiers(a: PlanTier, b: PlanTier): number {
  const order: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };
  return order[a] - order[b];
}
