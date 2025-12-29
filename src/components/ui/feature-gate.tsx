"use client";

import { type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";

import { type PlanFeatures, type PlanTier, FEATURE_METADATA, getPlanConfig } from "@/lib/plans/features";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  /** The feature to check access for */
  feature: keyof PlanFeatures;
  /** Content to show when feature is accessible */
  children: ReactNode;
  /** Optional: Custom fallback when feature is not accessible */
  fallback?: ReactNode;
  /** Optional: Minimum plan required (for non-boolean features) */
  minimumPlan?: PlanTier;
  /** Optional: Hide completely instead of showing upgrade prompt */
  hideWhenLocked?: boolean;
  /** Optional: Custom class for the wrapper */
  className?: string;
}

/**
 * Feature gating component that conditionally renders content
 * based on the user's plan tier
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  minimumPlan,
  hideWhenLocked = false,
  className,
}: FeatureGateProps) {
  const { canAccess, isLoading, tier } = usePlanFeatures();

  // While loading, show a subtle loading state or the children
  if (isLoading) {
    return <div className={cn("animate-pulse", className)}>{children}</div>;
  }

  const hasAccess = minimumPlan
    ? compareTiers(tier, minimumPlan) >= 0
    : canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // If hideWhenLocked, return null
  if (hideWhenLocked) {
    return null;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show default locked state
  const metadata = FEATURE_METADATA[feature];
  const requiredPlan = minimumPlan || getRequiredPlan(feature);

  return (
    <LockedFeatureCard
      featureName={metadata.name}
      upgradeMessage={metadata.upgradeMessage}
      requiredPlan={requiredPlan}
      className={className}
    />
  );
}

interface LockedFeatureCardProps {
  featureName: string;
  upgradeMessage: string;
  requiredPlan: PlanTier;
  className?: string;
}

function LockedFeatureCard({
  featureName,
  upgradeMessage,
  requiredPlan,
  className,
}: LockedFeatureCardProps) {
  const planConfig = getPlanConfig(requiredPlan);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/30 p-6",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{featureName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{upgradeMessage}</p>
        <Button asChild size="sm" className="mt-4">
          <a href={`/dashboard/billing/checkout?plan=${requiredPlan}`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to {planConfig.displayName}
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * Get the required plan for a feature
 */
function getRequiredPlan(feature: keyof PlanFeatures): PlanTier {
  // Most features require Pro
  const enterpriseFeatures: (keyof PlanFeatures)[] = ["hasHomepagePlacement"];

  if (enterpriseFeatures.includes(feature)) {
    return "enterprise";
  }

  return "pro";
}

/**
 * Compare two plan tiers
 */
function compareTiers(a: PlanTier, b: PlanTier): number {
  const order: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };
  return order[a] - order[b];
}
