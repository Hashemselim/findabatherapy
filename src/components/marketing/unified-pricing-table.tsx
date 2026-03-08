"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { Check, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  behaviorWorkFeatureMatrix,
  behaviorWorkPlanFit,
  behaviorWorkPlanHighlights,
  type BehaviorWorkPlanTier,
} from "@/content/behaviorwork";
import { PLAN_CONFIGS } from "@/lib/plans/features";
import {
  trackBehaviorWorkPlanCtaClick,
  trackBehaviorWorkPlanSelect,
} from "@/lib/posthog/events";
import { cn } from "@/lib/utils";

type BillingInterval = "annual" | "monthly";

const planOrder: BehaviorWorkPlanTier[] = ["free", "pro"];

const planIcons: Record<BehaviorWorkPlanTier, ComponentType<{ className?: string }>> = {
  free: Check,
  pro: Sparkles,
};

const planCta: Record<BehaviorWorkPlanTier, (interval: BillingInterval) => string> = {
  free: () => "/auth/sign-up?plan=free&intent=both",
  pro: (interval) =>
    interval === "annual"
      ? "/auth/sign-up?plan=pro&interval=annual&intent=both"
      : "/auth/sign-up?plan=pro&interval=monthly&intent=both",
};

interface UnifiedPricingTableProps {
  defaultInterval?: BillingInterval;
}

export function UnifiedPricingTable({ defaultInterval = "annual" }: UnifiedPricingTableProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(defaultInterval);
  const [selectedPlan, setSelectedPlan] = useState<BehaviorWorkPlanTier>("pro");

  const annualSavingsLabel = useMemo(
    () => `Save up to ${PLAN_CONFIGS.pro.pricing.annual.savingsPercent}% with annual billing`,
    []
  );

  const handleSelectPlan = (plan: BehaviorWorkPlanTier) => {
    setSelectedPlan(plan);
    trackBehaviorWorkPlanSelect({
      plan,
      billingInterval,
      source: "behaviorwork",
    });
  };

  const handleClickPlanCta = (plan: BehaviorWorkPlanTier, href: string) => {
    trackBehaviorWorkPlanCtaClick({
      plan,
      billingInterval,
      destination: href,
      source: "behaviorwork",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-border/70 bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              billingInterval === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              billingInterval === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
        </div>
        {billingInterval === "annual" && (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-emerald-700">
            {annualSavingsLabel}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:max-w-3xl lg:mx-auto">
        {planOrder.map((plan) => {
          const config = PLAN_CONFIGS[plan];
          const Icon = planIcons[plan];
          const isSelected = selectedPlan === plan;
          const price =
            plan === "free"
              ? config.pricing.monthly.price
              : billingInterval === "annual"
                ? config.pricing.annual.price
                : config.pricing.monthly.price;
          const href = planCta[plan](billingInterval);

          return (
            <Card
              key={plan}
              className={cn(
                "relative cursor-pointer border-2 transition-all",
                isSelected ? "border-primary shadow-lg" : "border-border/70 hover:border-primary/50"
              )}
              onClick={() => handleSelectPlan(plan)}
            >
              {plan === "pro" && (
                <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground">Most Popular</Badge>
              )}
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle>{config.displayName}</CardTitle>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">${price}</p>
                  <p className="text-sm text-muted-foreground">{plan === "free" ? "forever" : `per month, billed ${billingInterval}`}</p>
                </div>
                <CardDescription>{behaviorWorkPlanFit[plan]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {behaviorWorkPlanHighlights[plan].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full rounded-full"
                    variant={plan === "free" ? "outline-solid" : "default"}
                    onClick={() => handleClickPlanCta(plan, href)}
                  >
                    <Link href={href}>
                      {plan === "free" ? "Start Free Preview" : "Go Live Now"}
                    </Link>
                  </Button>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-white">
        <div className="hidden grid-cols-3 border-b border-border/70 bg-muted/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <p>Feature</p>
          <p className="text-center">Free</p>
          <p className="text-center">Pro</p>
        </div>

        {behaviorWorkFeatureMatrix.map((group, groupIndex) => (
          <div key={group.group} className={cn(groupIndex > 0 && "border-t border-border/70")}>
            <div className="bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{group.group}</p>
            </div>
            <div className="divide-y divide-border/60">
              {group.rows.map((row) => (
                <div key={row.label}>
                  <div className="space-y-3 px-4 py-3 md:hidden">
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Free</p>
                        <p className="mt-1 text-xs text-foreground">{row.values.free}</p>
                      </div>
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pro</p>
                        <p className="mt-1 text-xs font-medium text-foreground">{row.values.pro}</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden grid-cols-3 items-center px-4 py-3 text-sm md:grid">
                    <p className="font-medium text-foreground">{row.label}</p>
                    <p className="text-center text-muted-foreground">{row.values.free}</p>
                    <p className="text-center font-medium text-foreground">{row.values.pro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add-ons */}
      <div className="rounded-xl border border-border/70 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">Optional Add-ons</p>
          <Badge variant="outline" className="text-xs">Pro only</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { name: "User seats", price: "$20/mo", desc: "Add shared account users" },
            { name: "Location pack", price: "$15/mo", desc: "5 additional service locations" },
            { name: "Job pack", price: "$15/mo", desc: "5 additional job postings" },
            { name: "Storage pack", price: "$5/mo", desc: "10 GB additional file storage" },
          ].map((addon) => (
            <div key={addon.name} className="flex items-start justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{addon.name}</p>
                <p className="text-xs text-muted-foreground">{addon.desc}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-foreground">{addon.price}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-linear-to-r from-white via-emerald-50/40 to-blue-50/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">Ready to launch both growth engines?</p>
            <p className="text-sm text-muted-foreground">Start with {PLAN_CONFIGS[selectedPlan].displayName} and upgrade anytime.</p>
          </div>
          <Button
            asChild
            className="rounded-full"
            onClick={() => handleClickPlanCta(selectedPlan, planCta[selectedPlan](billingInterval))}
          >
            <Link href={planCta[selectedPlan](billingInterval)}>
              Start with {PLAN_CONFIGS[selectedPlan].displayName}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
