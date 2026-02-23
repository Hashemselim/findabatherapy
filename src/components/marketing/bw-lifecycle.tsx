"use client";

import {
  Megaphone,
  Zap,
  ShieldCheck,
  TrendingUp,
  Check,
  type LucideIcon,
} from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";
import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Pillar {
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  color: string;
  lightBg: string;
  textColor: string;
  borderColor: string;
  features: string[];
  /** Which side the mockup appears on: left or right */
  mockupSide: "left" | "right";
}

const pillars: Pillar[] = [
  {
    number: "01",
    title: "Get Found",
    tagline: "Families are searching for ABA. Make sure they find you.",
    description:
      "Your agency gets a professional directory listing, branded pages, and a direct inquiry form — so families find you and start a real conversation.",
    icon: Megaphone,
    color: "#5788FF",
    lightBg: "bg-[#5788FF]/8",
    textColor: "text-[#5788FF]",
    borderColor: "border-[#5788FF]/25",
    features: [
      "FindABATherapy.org listing — found by insurance + location",
      "Branded agency page with logo, photos & CTA",
      "Branded contact form at your own URL",
      "Parent resources & ABA guides",
    ],
    mockupSide: "right",
  },
  {
    number: "02",
    title: "Convert Faster",
    tagline: "Stop losing families between inquiry and intake.",
    description:
      "Inquiries flow into your pipeline dashboard. Branded intake forms collect everything you need. Automated emails keep families engaged. No lead left behind.",
    icon: Zap,
    color: "#FFDC33",
    lightBg: "bg-[#FFDC33]/10",
    textColor: "text-amber-600",
    borderColor: "border-amber-300/30",
    features: [
      "Lead pipeline dashboard — see every inquiry at a glance",
      "Branded digital intake form",
      "22 email templates — welcome, follow-up, status updates",
      "Auto-create client records from submissions",
    ],
    mockupSide: "left",
  },
  {
    number: "03",
    title: "Manage & Retain",
    tagline: "Every client, authorization, and credential — in one place.",
    description:
      "Full client records, insurance tracking, auth expiration reminders, and lifecycle emails. A well-managed caseload retains families and creates referrals.",
    icon: ShieldCheck,
    color: "#10B981",
    lightBg: "bg-[#10B981]/8",
    textColor: "text-[#10B981]",
    borderColor: "border-[#10B981]/25",
    features: [
      "Full client records with communication history",
      "Insurance & authorization tracking",
      "Auto expiration alerts + task generation",
      "ABA lifecycle email automation",
    ],
    mockupSide: "right",
  },
];

/* ------------------------------------------------------------------ */
/*  Pillar Mockup (abstract UI illustration per pillar)                */
/* ------------------------------------------------------------------ */

function PillarMockup({ pillar }: { pillar: Pillar }) {
  if (pillar.number === "01") {
    // Agency profile card mockup
    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-white shadow-lg shadow-amber-100/40">
        {/* Header gradient */}
        <div
          className="px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${pillar.color}15, ${pillar.color}08)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl"
              style={{ backgroundColor: `${pillar.color}20` }}
            />
            <div className="flex-1">
              <div className="h-3 w-28 rounded-full bg-[#1A2744]/15" />
              <div className="mt-1.5 h-2 w-20 rounded-full bg-slate-200/80" />
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex gap-2">
            {["#5788FF", "#10B981", "#F59E0B"].map((c) => (
              <span
                key={c}
                className="rounded-full px-2.5 py-1 text-[9px] font-bold text-white"
                style={{ backgroundColor: c }}
              >
                {c === "#5788FF"
                  ? "3 Locations"
                  : c === "#10B981"
                    ? "In-Network"
                    : "Ages 2-18"}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {[85, 70, 55].map((w) => (
              <div
                key={w}
                className="h-2 rounded-full bg-slate-100"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#5788FF]/8 px-3 py-2.5">
            <span className="text-[10px] font-bold text-[#5788FF]">
              Contact This Agency
            </span>
            <span className="text-[10px] text-[#5788FF]/60">&rarr;</span>
          </div>
        </div>
      </div>
    );
  }

  if (pillar.number === "02") {
    // Pipeline dashboard mini-mockup
    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-white shadow-lg shadow-amber-100/40">
        <div className="border-b border-amber-100/50 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pipeline
            </span>
            <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[9px] font-bold text-[#10B981]">
              24 active
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            {[
              { label: "New", count: 8, c: "#5788FF" },
              { label: "Intake", count: 5, c: "#FFDC33" },
              { label: "Review", count: 4, c: "#8B5CF6" },
              { label: "Active", count: 7, c: "#10B981" },
            ].map((s) => (
              <div key={s.label} className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.c }}
                  />
                  <span className="text-[10px] font-bold text-[#1A2744]">
                    {s.count}
                  </span>
                </div>
                <p className="text-[8px] font-semibold text-slate-400">
                  {s.label}
                </p>
                {Array.from({ length: Math.min(s.count, 3) }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 rounded-md border border-amber-100/60 bg-[#FFFBF0]"
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Toast */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] font-semibold text-amber-700">
              Intake form completed &middot; 3m ago
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Pillar 03: Client record mockup
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-white shadow-lg shadow-amber-100/40">
      <div className="border-b border-amber-100/50 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981]/15 text-[10px] font-bold text-[#10B981]">
            MR
          </div>
          <div>
            <div className="h-2.5 w-24 rounded-full bg-[#1A2744]/15" />
            <div className="mt-1 h-2 w-16 rounded-full bg-slate-200/70" />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {/* Auth tracker */}
        <div className="rounded-xl bg-[#10B981]/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#10B981]">
              Authorization
            </span>
            <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[8px] font-bold text-[#10B981]">
              Active
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#10B981]/20">
              <div className="h-full w-[65%] rounded-full bg-[#10B981]" />
            </div>
            <span className="text-[9px] font-semibold text-slate-500">
              82h left
            </span>
          </div>
        </div>
        {/* Activity feed */}
        {["Email sent: Session reminder", "Task: Auth renewal due in 14d", "Note added by BCBA"].map(
          (item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-lg border border-amber-100/50 px-3 py-2"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
              <span className="text-[9px] font-medium text-slate-500">
                {item}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BwLifecycle() {
  return (
    <BwSectionWrapper id="lifecycle" background="cream">
      {/* Section header */}
      <BwFadeUp>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-[#FFDC33]/10 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            How It Works
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
            One platform. Every stage of the{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#5788FF]">client journey</span>
              <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/30" />
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            From the moment a family discovers your agency to the day you scale
            your team — BehaviorWork handles it all.
          </p>
        </div>
      </BwFadeUp>

      {/* Three Pillars */}
      <div className="mt-20 space-y-24 lg:space-y-32">
        {pillars.map((pillar, i) => {
          const Icon = pillar.icon;
          const isLeft = pillar.mockupSide === "left";

          return (
            <div key={pillar.title}>
              <div
                className={cn(
                  "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
                  isLeft && "lg:[direction:rtl]"
                )}
              >
                {/* Text side */}
                <BwMotion
                  variant={isLeft ? "fade-right" : "fade-left"}
                  delay={0.1}
                  className={cn(isLeft && "lg:[direction:ltr]")}
                >
                  <div className="max-w-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl border",
                          pillar.lightBg,
                          pillar.borderColor
                        )}
                      >
                        <Icon
                          className={cn("h-5 w-5", pillar.textColor)}
                        />
                      </div>
                      <div>
                        <span
                          className={cn(
                            "text-[10px] font-extrabold tracking-widest",
                            pillar.textColor
                          )}
                        >
                          STEP {pillar.number}
                        </span>
                        <h3 className="text-2xl font-extrabold tracking-tight text-[#1A2744] sm:text-3xl">
                          {pillar.title}
                        </h3>
                      </div>
                    </div>

                    <p className="mt-3 text-sm font-semibold italic text-slate-500">
                      &ldquo;{pillar.tagline}&rdquo;
                    </p>
                    <p className="mt-3 text-base leading-relaxed text-slate-500">
                      {pillar.description}
                    </p>

                    <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {pillar.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-[13px] leading-snug text-slate-600"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-3.5 w-3.5 shrink-0",
                              pillar.textColor
                            )}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </BwMotion>

                {/* Mockup side */}
                <BwMotion
                  variant={isLeft ? "fade-left" : "fade-right"}
                  delay={0.25}
                  className={cn(isLeft && "lg:[direction:ltr]")}
                >
                  <div className="relative mx-auto max-w-sm lg:max-w-none">
                    <PillarMockup pillar={pillar} />
                    {/* Decorative glow */}
                    <div
                      className="pointer-events-none absolute -bottom-6 -right-6 -z-10 h-48 w-48 rounded-full blur-3xl"
                      style={{ backgroundColor: `${pillar.color}10` }}
                    />
                  </div>
                </BwMotion>
              </div>

              {/* Connector arrow between pillars */}
              {i < pillars.length - 1 && (
                <BwMotion variant="fade-up" delay={0.1}>
                  <div className="mt-12 flex justify-center lg:mt-0">
                    <svg
                      className="h-8 w-8 text-amber-300/60"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <path
                        d="M16 4V28M16 28L8 20M16 28L24 20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </BwMotion>
              )}
            </div>
          );
        })}
      </div>

      {/* +Grow Your Team bonus strip */}
      <BwMotion variant="fade-up" delay={0.1} className="mt-20">
        <div className="overflow-hidden rounded-2xl border border-amber-200/40 bg-gradient-to-r from-[#10B981]/5 via-white to-[#5788FF]/5 shadow-sm">
          <div className="flex flex-col items-center gap-5 p-8 sm:flex-row sm:gap-8 sm:p-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#10B981]/10 ring-4 ring-[#10B981]/10">
              <TrendingUp className="h-6 w-6 text-[#10B981]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-extrabold text-[#1A2744]">
                Plus: Grow Your Team
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Post jobs on FindABAJobs.org, manage a branded careers page,
                track applicants and employee credentials — client growth +
                team growth, one platform.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#10B981]/10 px-4 py-1.5 text-xs font-bold text-[#10B981]">
              Included with Pro
            </span>
          </div>
        </div>
      </BwMotion>
    </BwSectionWrapper>
  );
}
