"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Crown,
  Globe,
  Megaphone,
  Plus,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { PLAN_CONFIGS } from "@/lib/plans/features";
import {
  trackBehaviorWorkPlanCtaClick,
  trackBehaviorWorkPlanSelect,
} from "@/lib/posthog/events";
import { cn } from "@/lib/utils";

type BillingInterval = "annual" | "monthly";

/* ------------------------------------------------------------------ */
/*  Bold formatter — wraps **text** in <strong>                       */
/* ------------------------------------------------------------------ */
function BoldText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[#1A2744]">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Pro card — grouped features (single column, bold key words)       */
/* ------------------------------------------------------------------ */
const proFeatureGroups = [
  {
    label: "Capture Families",
    icon: Megaphone,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    features: [
      "**Priority listing** on GoodABA provider directory",
      "**Branded contact form** & **intake form** with your logo",
      "**Inquiry inbox** with instant email notifications",
      "**Referral source tracking** to see where families find you",
    ],
    ctaLabel: "Start Free Preview",
    ctaStyle: "outline-solid" as const,
  },
  {
    label: "Manage Every Client",
    icon: Users,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    features: [
      "**Unlimited client profiles** — contact, parent info, therapy history",
      "**Status tracking** from Inquiry to Active to Discharge",
      "**Insurance verification** & **authorization tracking** per client",
      "**Document storage** — upload assessments, consents, insurance cards (5 GB)",
    ],
  },
  {
    label: "Grow Your Agency",
    icon: Zap,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    features: [
      "**22 email templates** for every lifecycle stage, ready to send",
      "**Task management** with automated reminders & follow-ups",
      "**Branded agency page** & **parent resource center**",
      "**Analytics dashboard** — views, inquiries, conversions, referrals",
    ],
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Free card features                                                */
/* ------------------------------------------------------------------ */
const freeFeatures = [
  "**Directory listing** on GoodABA",
  "Professional **provider profile** with your details",
  "Up to **3 locations** & **3 photos**",
  "Ages, languages & specialties displayed",
  "**Preview branded pages** — contact forms, intake forms, brochure & more",
] as const;

/* ------------------------------------------------------------------ */
/*  "Included" platform cards data                                    */
/* ------------------------------------------------------------------ */
const includedPlatforms = {
  free: [
    {
      name: "GoodABA Directory",
      description: "Live directory listing — families can discover your agency",
      color: "border-blue-200 bg-blue-50/40",
      textColor: "text-blue-700",
      dotColor: "bg-blue-400",
    },
  ],
  pro: [
    {
      name: "GoodABA Directory",
      description: "Priority listing with verified badge & Google rating",
      color: "border-blue-200 bg-blue-50/40",
      textColor: "text-blue-700",
      dotColor: "bg-blue-400",
    },
    {
      name: "GoodABA Jobs",
      description: "Post jobs & recruit BCBAs and RBTs from the ABA job board",
      color: "border-emerald-200 bg-emerald-50/40",
      textColor: "text-emerald-700",
      dotColor: "bg-emerald-400",
    },
  ],
} as const;

/* ------------------------------------------------------------------ */
/*  Tool replacement strip                                            */
/* ------------------------------------------------------------------ */
const toolsReplaced = [
  { tool: "Google Forms", cost: "Disconnected" },
  { tool: "Spreadsheet CRM", cost: "Manual & messy" },
  { tool: "Website builder", cost: "$16-33/mo" },
  { tool: "Indeed job posts", cost: "$250-500/mo" },
  { tool: "Email marketing", cost: "$20-50/mo" },
  { tool: "Task manager", cost: "$10-25/mo" },
] as const;

/* ------------------------------------------------------------------ */
/*  Add-ons                                                           */
/* ------------------------------------------------------------------ */
const addons = [
  { name: "User seats", price: "$20/mo each", desc: "Invite shared account users" },
  { name: "Location 5-pack", price: "$15/mo", desc: "5 additional service locations" },
  { name: "Job 5-pack", price: "$15/mo", desc: "5 additional job postings" },
  { name: "Storage 10 GB", price: "$5/mo", desc: "Extra file storage for documents" },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getSignupUrl(tier: "free" | "pro", interval: BillingInterval) {
  if (tier === "free") return "/auth/sign-up?plan=free&intent=behaviorwork";
  return interval === "annual"
    ? "/auth/sign-up?plan=pro&interval=annual&intent=behaviorwork"
    : "/auth/sign-up?plan=pro&interval=monthly&intent=behaviorwork";
}

/* ================================================================== */
/*  Component                                                         */
/* ================================================================== */
interface BwPricingCardsProps {
  defaultInterval?: BillingInterval;
}

export function BwPricingCards({
  defaultInterval = "monthly",
}: BwPricingCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);

  const proConfig = PLAN_CONFIGS.pro;
  const proPrice =
    interval === "annual"
      ? proConfig.pricing.annual.price
      : proConfig.pricing.monthly.price;
  const proHref = getSignupUrl("pro", interval);
  const freeHref = getSignupUrl("free", interval);

  return (
    <div className="space-y-16">
      {/* ---- Billing toggle ---- */}
      <BwFadeUp>
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-amber-200/60 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
                interval === "monthly"
                  ? "bg-[#1A2744] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={cn(
                "rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
                interval === "annual"
                  ? "bg-[#1A2744] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Annual
            </button>
          </div>
          {interval === "monthly" && (
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Switch to annual billing and save{" "}
              <strong>{proConfig.pricing.annual.savingsPercent}%</strong>{" "}
              <span className="text-xs text-slate-400">
                (${proConfig.pricing.annual.price}/mo)
              </span>
            </button>
          )}
          {interval === "annual" && (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                You save ${proConfig.pricing.annual.savings}/year
              </span>
            </div>
          )}
        </div>
      </BwFadeUp>

      {/* ---- Pricing cards — Pro-dominant layout ---- */}
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        {/* ---- Free card ---- */}
        <BwFadeUp>
          <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
            <div>
              <h3 className="text-lg font-bold text-slate-700">Free</h3>
              <p className="mt-1 text-sm text-slate-500">
                Upload your logo & details to preview branded forms, intake
                pages, and more — upgrade when you&apos;re ready to go live.
              </p>
            </div>

            <div className="mt-5">
              <span className="text-4xl font-bold text-slate-700">$0</span>
              <span className="text-sm text-slate-400"> forever</span>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-slate-600"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    <BoldText text={feature} />
                  </span>
                </li>
              ))}
            </ul>

            {/* Included platform — Free */}
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Included
              </p>
              {includedPlatforms.free.map((platform) => (
                <div
                  key={platform.name}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3",
                    platform.color
                  )}
                >
                  <Globe className={cn("mt-0.5 h-4 w-4 shrink-0", platform.textColor)} />
                  <div>
                    <p className={cn("text-sm font-semibold", platform.textColor)}>
                      {platform.name}
                    </p>
                    <p className="text-xs text-slate-500">{platform.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href={freeHref}
                onClick={() => {
                  trackBehaviorWorkPlanSelect({ plan: "free", billingInterval: interval });
                  trackBehaviorWorkPlanCtaClick({ plan: "free", billingInterval: interval, destination: freeHref });
                }}
                className="flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                Explore Free Plan
              </Link>
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">
              No credit card required
            </p>
          </div>
        </BwFadeUp>

        {/* ---- Pro card (dominant) ---- */}
        <BwFadeUp delay={0.1}>
          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-xl shadow-amber-100/60 ring-1 ring-amber-200/50">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FFCF40] via-amber-400 to-[#FFCF40]" />

            {/* Badge */}
            <div className="absolute -top-0 right-6 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-b-lg bg-[#1A2744] px-4 py-1.5 text-xs font-bold text-[#FFCF40] shadow-lg">
                <Crown className="h-3.5 w-3.5" />
                Recommended
              </span>
            </div>

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div>
                <h3 className="text-xl font-bold text-[#1A2744]">
                  Pro — The ABA Growth Toolkit
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Everything between your first parent inquiry and your next hire. One platform.
                </p>
              </div>

              {/* Price */}
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-[#1A2744]">
                  ${proPrice}
                </span>
                <span className="text-sm text-slate-500">
                  /mo{interval === "annual" ? ", billed annually" : ""}
                </span>
              </div>

              {/* Primary CTA */}
              <div className="mt-6">
                <Link
                  href={proHref}
                  onClick={() => {
                    trackBehaviorWorkPlanSelect({ plan: "pro", billingInterval: interval });
                    trackBehaviorWorkPlanCtaClick({ plan: "pro", billingInterval: interval, destination: proHref });
                  }}
                  className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0866FF] text-base font-bold text-white shadow-lg shadow-[#0866FF]/25 transition-all hover:bg-[#0866FF]/92 hover:shadow-xl hover:shadow-[#0866FF]/30 active:scale-[0.98]"
                >
                  Start Free — Upgrade Anytime
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="mt-2 text-center text-xs text-slate-400">
                  10 min setup &middot; No credit card &middot; Cancel anytime
                </p>
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-amber-100/80" />

              {/* Grouped features — single column with bold keywords */}
              <div className="space-y-6">
                {proFeatureGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.label}>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg",
                            group.iconBg
                          )}
                        >
                          <Icon className={cn("h-4 w-4", group.iconColor)} />
                        </div>
                        <span className="text-sm font-semibold text-[#1A2744]">
                          {group.label}
                        </span>
                      </div>
                      <ul className="space-y-2.5 pl-[38px]">
                        {group.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm text-slate-600"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <span>
                              <BoldText text={feature} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Included platforms — Pro */}
              <div className="mt-8 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Included with Pro
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {includedPlatforms.pro.map((platform) => (
                    <div
                      key={platform.name}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-4 py-3",
                        platform.color
                      )}
                    >
                      <Globe className={cn("mt-0.5 h-4 w-4 shrink-0", platform.textColor)} />
                      <div>
                        <p className={cn("text-sm font-semibold", platform.textColor)}>
                          {platform.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {platform.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-amber-100/80 pt-6">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span>HIPAA compliant</span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>500+ ABA agencies</span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Zap className="h-4 w-4 text-slate-400" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </BwFadeUp>
      </div>

      {/* ---- "What you're replacing" section ---- */}
      <BwFadeUp delay={0.15}>
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-amber-200/40 bg-gradient-to-br from-white to-amber-50/30 p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-bold text-[#1A2744]">
                Replace $500+/month in disconnected tools
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Everything your agency cobbles together today — in one integrated platform.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {toolsReplaced.map((item) => (
                <div
                  key={item.tool}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/80 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700 line-through decoration-slate-300">
                    {item.tool}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {item.cost}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200/60" />
              <span className="rounded-full bg-[#1A2744] px-5 py-2 text-sm font-bold text-[#FFCF40]">
                All replaced by GoodABA — ${proPrice}/mo
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200/60" />
            </div>
          </div>
        </div>
      </BwFadeUp>

      {/* ---- Add-ons (compact) ---- */}
      <BwFadeUp delay={0.2}>
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-[#1A2744]">
                Need more? Scale without switching plans.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {addons.map((addon, i) => (
                <span key={addon.name} className="flex items-center gap-1">
                  <span className="font-medium text-slate-700">{addon.name}</span>
                  <span className="text-slate-400">{addon.price}</span>
                  {i < addons.length - 1 && (
                    <span className="ml-3 hidden h-3 w-px bg-slate-200 sm:block" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </BwFadeUp>
    </div>
  );
}
