"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { PLAN_CONFIGS } from "@/lib/plans/features";
import {
  trackBehaviorWorkPlanCtaClick,
  trackBehaviorWorkPlanSelect,
} from "@/lib/posthog/events";
import { cn } from "@/lib/utils";

type BillingInterval = "annual" | "monthly";

const plans = [
  {
    tier: "free" as const,
    tagline: "Get listed. Get started.",
    features: [
      "FindABATherapy directory listing",
      "Basic provider profile",
      "Up to 10 client records",
      "1 job posting",
      "Email support",
    ],
    ctaLabel: "Get Started",
    ctaStyle: "outline" as const,
  },
  {
    tier: "pro" as const,
    tagline: "The full growth engine.",
    badge: "Most Popular",
    features: [
      "Everything in Free, plus:",
      "Branded agency intake page",
      "Unlimited client records (250)",
      "Pipeline dashboard",
      "Communication templates & automation",
      "Authorization & credential tracking",
      "Referral source analytics",
      "Up to 5 job postings on FindABAJobs",
      "Priority support",
    ],
    ctaLabel: "Start Growing Your Caseload",
    ctaStyle: "primary" as const,
  },
  {
    tier: "enterprise" as const,
    tagline: "For multi-location agencies.",
    features: [
      "Everything in Pro, plus:",
      "Unlimited locations",
      "Unlimited job postings",
      "Unlimited client records",
      "Advanced analytics & reporting",
      "Dedicated account manager",
    ],
    ctaLabel: "Contact Us",
    ctaStyle: "outline" as const,
  },
] as const;

function getSignupUrl(
  tier: "free" | "pro" | "enterprise",
  interval: BillingInterval
) {
  if (tier === "free") return "/auth/sign-up?plan=free&intent=behaviorwork";
  if (tier === "enterprise") return "mailto:sales@behaviorwork.com";
  return interval === "annual"
    ? "/auth/sign-up?plan=pro&interval=annual&intent=behaviorwork"
    : "/auth/sign-up?plan=pro&interval=monthly&intent=behaviorwork";
}

interface BwPricingCardsProps {
  defaultInterval?: BillingInterval;
}

export function BwPricingCards({
  defaultInterval = "annual",
}: BwPricingCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);

  return (
    <div>
      {/* Billing toggle */}
      <BwFadeUp>
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-amber-200/60 bg-white p-1">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                interval === "monthly"
                  ? "bg-[#1A2744] text-white"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                interval === "annual"
                  ? "bg-[#1A2744] text-white"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Annual
            </button>
          </div>
          {interval === "annual" && (
            <span className="rounded-full border border-amber-200 bg-[#FFDC33]/10 px-3 py-1 text-xs font-semibold text-amber-700">
              Save up to {PLAN_CONFIGS.pro.pricing.annual.savingsPercent}% with
              annual billing
            </span>
          )}
        </div>
      </BwFadeUp>

      {/* Cards */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const config = PLAN_CONFIGS[plan.tier];
          const price =
            plan.tier === "free"
              ? 0
              : interval === "annual"
                ? config.pricing.annual.price
                : config.pricing.monthly.price;
          const href = getSignupUrl(plan.tier, interval);
          const isPro = plan.tier === "pro";

          return (
            <BwFadeUp key={plan.tier} delay={i * 0.1}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6 sm:p-8",
                  isPro
                    ? "border-amber-300 bg-white shadow-xl shadow-amber-100/50 ring-1 ring-amber-200"
                    : "border-amber-200/40 bg-white"
                )}
              >
                {"badge" in plan && plan.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#FFDC33] px-3 py-1 text-xs font-bold text-[#1A2744]">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-[#1A2744]">
                    {config.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
                </div>

                <div className="mt-5">
                  <span className="text-4xl font-bold text-[#1A2744]">
                    ${price}
                  </span>
                  <span className="text-sm text-slate-400">
                    {plan.tier === "free"
                      ? " forever"
                      : `/mo${interval === "annual" ? ", billed annually" : ""}`}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    href={href}
                    onClick={() => {
                      trackBehaviorWorkPlanSelect({
                        plan: plan.tier,
                        billingInterval: interval,
                      });
                      trackBehaviorWorkPlanCtaClick({
                        plan: plan.tier,
                        billingInterval: interval,
                        destination: href,
                      });
                    }}
                    className={cn(
                      "flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all active:scale-[0.98]",
                      plan.ctaStyle === "primary"
                        ? "bg-[#FFDC33] text-[#1A2744] shadow-lg shadow-amber-500/20 hover:bg-[#F5CF1B] hover:shadow-xl hover:shadow-amber-500/25"
                        : "border border-amber-200/60 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/30"
                    )}
                  >
                    {plan.ctaLabel}
                    {plan.ctaStyle === "primary" && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Link>
                </div>

                {plan.tier === "enterprise" && (
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Need procurement help?{" "}
                    <Link
                      href="mailto:sales@behaviorwork.com"
                      className="font-medium text-slate-600 hover:underline"
                    >
                      Contact sales
                    </Link>
                  </p>
                )}
              </div>
            </BwFadeUp>
          );
        })}
      </div>
    </div>
  );
}
