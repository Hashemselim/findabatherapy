"use client";

import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { PLAN_CONFIGS } from "@/lib/plans/features";

type Plan = "free" | "pro";

type PlanOption = {
  id: Plan;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  icon?: React.ReactNode;
};

const PLANS: PlanOption[] = [
  {
    id: "free",
    name: "Start with Preview",
    price: `$${PLAN_CONFIGS.free.pricing.monthly.price}`,
    period: "forever",
    description: "Set up in 10 minutes. Preview everything. Go Live when ready.",
    features: [
      "Up to 3 locations & 3 photos",
      "Professional listing on FindABATherapy.org",
      "Ages, languages, diagnoses & specialties",
      "10 client records",
      "1 job posting on FindABAJobs.org",
    ],
  },
  {
    id: "pro",
    name: "Go Live Now",
    price: `$${PLAN_CONFIGS.pro.pricing.monthly.price}`,
    period: "/month",
    description: "One plan. $79/month. Everything included.",
    features: [
      "All branded pages & forms go live",
      "Unlimited CRM clients",
      "Communication templates & automation",
      "Up to 10 locations & 10 photos",
      "Priority search placement & verified badge",
      "Analytics dashboard",
      "Up to 10 job postings",
    ],
    highlight: true,
    icon: <Sparkles className="h-5 w-5 text-primary" />,
  },
];

type PlanSelectorProps = {
  selectedPlan: Plan;
  onSelectPlan: (plan: Plan) => void;
  disabled?: boolean;
};

export function PlanSelector({
  selectedPlan,
  onSelectPlan,
  disabled = false,
}: PlanSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PLANS.map((plan) => {
        const isSelected = selectedPlan === plan.id;

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col rounded-2xl border-2 p-5 text-left transition-all",
              "hover:border-primary/60 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900",
              disabled && "cursor-not-allowed opacity-50",
              isSelected
                ? "border-primary bg-primary/10"
                : plan.highlight
                  ? "border-primary/40 bg-white/5"
                  : "border-white/10 bg-white/5"
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            {/* Popular badge */}
            {plan.highlight && (
              <div className="absolute -top-3 left-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2">
              {plan.icon}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            </div>

            {/* Price */}
            <div className="mt-3">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-slate-400">{plan.period}</span>
            </div>

            {/* Description */}
            <p className="mt-2 text-sm text-slate-300">{plan.description}</p>

            {/* Features */}
            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
