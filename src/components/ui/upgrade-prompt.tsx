"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, Check } from "lucide-react";

import { type PlanTier, getPlanConfig } from "@/lib/plans/features";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  /** The plan to upgrade to */
  targetPlan?: PlanTier;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Show plan highlights */
  showHighlights?: boolean;
  /** Variant styling */
  variant?: "default" | "compact" | "inline" | "banner";
  /** Optional class name */
  className?: string;
}

/**
 * Contextual upgrade CTA component
 * Shows upgrade prompts in different styles based on context
 */
export function UpgradePrompt({
  targetPlan = "pro",
  title,
  description,
  showHighlights = true,
  variant = "default",
  className,
}: UpgradePromptProps) {
  const planConfig = getPlanConfig(targetPlan);

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {title || `Upgrade to ${planConfig.displayName} for more features`}
          </p>
        </div>
        <Button asChild size="sm" variant="default">
          <a href={`/dashboard/billing/checkout?plan=${targetPlan}`}>
            Upgrade
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-sm text-muted-foreground">
          {description || `Available on ${planConfig.displayName}`}
        </span>
        <Button asChild size="sm" variant="link" className="h-auto p-0">
          <a href={`/dashboard/billing/checkout?plan=${targetPlan}`}>
            Upgrade
            <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4",
          className
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {title || `Unlock with ${planConfig.displayName}`}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link href="/dashboard/billing">Upgrade Now</Link>
        </Button>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {title || `Upgrade to ${planConfig.displayName}`}
          </CardTitle>
        </div>
        <CardDescription>
          {description || planConfig.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showHighlights && (
          <ul className="space-y-2">
            {planConfig.highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                {highlight}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button asChild className="rounded-full">
            <Link href="/dashboard/billing">
              Upgrade Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
