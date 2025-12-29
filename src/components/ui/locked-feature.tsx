"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

import { type PlanTier, getPlanConfig } from "@/lib/plans/features";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LockedFeatureProps {
  /** Content to show with the overlay */
  children: ReactNode;
  /** The plan required to unlock */
  requiredPlan?: PlanTier;
  /** Custom message */
  message?: string;
  /** Blur intensity */
  blurIntensity?: "light" | "medium" | "heavy";
  /** Optional class name */
  className?: string;
}

/**
 * Locked feature overlay component
 * Blurs content and shows upgrade prompt
 */
export function LockedFeature({
  children,
  requiredPlan = "pro",
  message,
  blurIntensity = "medium",
  className,
}: LockedFeatureProps) {
  const planConfig = getPlanConfig(requiredPlan);

  const blurClasses = {
    light: "blur-[2px]",
    medium: "blur-sm",
    heavy: "blur-md",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content */}
      <div
        className={cn(
          "pointer-events-none select-none",
          blurClasses[blurIntensity]
        )}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px]">
        <div className="flex max-w-xs flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {planConfig.displayName} Feature
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {message || `Upgrade to ${planConfig.displayName} to unlock this feature`}
          </p>
          <Button asChild size="sm" className="mt-4 rounded-full">
            <Link href="/dashboard/billing">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade Now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface LockedFeatureInlineProps {
  /** The plan required to unlock */
  requiredPlan?: PlanTier;
  /** Feature name */
  featureName: string;
  /** Optional class name */
  className?: string;
}

/**
 * Inline locked feature indicator
 * Shows a small badge/pill indicating the feature is locked
 */
export function LockedFeatureInline({
  requiredPlan = "pro",
  featureName,
  className,
}: LockedFeatureInlineProps) {
  const planConfig = getPlanConfig(requiredPlan);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600",
        className
      )}
    >
      <Lock className="h-3 w-3" />
      <span>{featureName}</span>
      <span className="text-blue-600">({planConfig.displayName})</span>
    </div>
  );
}

interface LockedSectionProps {
  /** Title of the section */
  title: string;
  /** Description of what's locked */
  description: string;
  /** The plan required to unlock */
  requiredPlan?: PlanTier;
  /** Icon to display */
  icon?: ReactNode;
  /** Optional class name */
  className?: string;
}

/**
 * Locked section placeholder
 * Shows a placeholder card for a locked section
 */
export function LockedSection({
  title,
  description,
  requiredPlan = "pro",
  icon,
  className,
}: LockedSectionProps) {
  const planConfig = getPlanConfig(requiredPlan);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        {icon || <Lock className="h-6 w-6 text-slate-500" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      <Button asChild className="mt-6">
        <a href={`/dashboard/billing/checkout?plan=${requiredPlan}`}>
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade to {planConfig.displayName}
        </a>
      </Button>
    </div>
  );
}

interface LockedFeatureCardProps {
  /** Title of the feature */
  title: string;
  /** Description of what the feature offers */
  description: string;
  /** Icon to display */
  icon: ReactNode;
  /** The plan required to unlock */
  requiredPlan?: PlanTier;
  /** Feature benefits/highlights to display */
  benefits?: string[];
  /** Optional class name */
  className?: string;
}

/**
 * Premium locked feature card
 * A visually appealing card that showcases locked premium features
 */
export function LockedFeatureCard({
  title,
  description,
  icon,
  requiredPlan = "pro",
  benefits,
  className,
}: LockedFeatureCardProps) {
  const planConfig = getPlanConfig(requiredPlan);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-sm",
        className
      )}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)]" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                <Sparkles className="h-3 w-3" />
                {planConfig.displayName}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {/* Benefits list */}
        {benefits && benefits.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {benefits.map((benefit, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {benefit}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/dashboard/billing">
              Upgrade Now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
