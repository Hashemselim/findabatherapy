"use client";

import { useState } from "react";
import { Check, Sparkles, Zap } from "lucide-react";

import { type PlanTier } from "@/lib/plans/features";
import { STRIPE_PLANS, type BillingInterval } from "@/lib/stripe/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
 * Go Live upgrade modal — single focused Pro plan flow
 */
export function UpgradeModal({
  open,
  onOpenChange,
  triggerFeature,
}: UpgradeModalProps) {
  const [interval, setInterval] = useState<BillingInterval>("year");
  const plan = STRIPE_PLANS.pro;
  const price = interval === "year" ? plan.annual.price : plan.monthly.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Go Live with Pro
            </DialogTitle>
            <DialogDescription>
              {triggerFeature
                ? `Unlock ${triggerFeature} and take your practice live.`
                : "Take your practice live — everything you need to grow."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 pb-6">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                interval === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                interval === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge
                variant="secondary"
                className="ml-1.5 border-green-200 bg-green-100 px-1.5 py-0 text-[10px] text-green-700"
              >
                Save 40%
              </Badge>
            </button>
          </div>

          {/* Pricing */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">
                ${price}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            {interval === "year" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                ${plan.annual.totalPrice}/yr — save ${plan.annual.savings}/year
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Switch to annual to pay ${plan.annual.price}/mo
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-2">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2.5 text-sm text-foreground"
              >
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="space-y-2 pt-1">
            <Button asChild size="lg" className="w-full">
              <a
                href={`/dashboard/billing/checkout?plan=pro&interval=${interval}`}
              >
                <Zap className="mr-2 h-4 w-4" />
                Go Live — ${price}/mo
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Continue in Preview Mode
            </Button>
          </div>
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

  const openUpgradeModal = (options?: {
    feature?: string;
    plan?: PlanTier;
  }) => {
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
