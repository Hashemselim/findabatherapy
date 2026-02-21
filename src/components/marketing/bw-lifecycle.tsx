"use client";

import {
  Megaphone,
  ClipboardList,
  Mail,
  LayoutDashboard,
  TrendingUp,
  Check,
} from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { cn } from "@/lib/utils";

const stages = [
  {
    number: "01",
    title: "Contact",
    subtitle: "Get found. Capture every lead.",
    icon: Megaphone,
    color: "bg-[#5788FF]",
    lightColor: "bg-[#5788FF]/10",
    textColor: "text-[#5788FF]",
    borderColor: "border-[#5788FF]/30",
    ringColor: "ring-[#5788FF]/20",
    features: [
      "Listed on FindABATherapy.org directory",
      "SEO-optimized provider profile",
      "Branded contact form at your own URL",
      "Branded agency page with logo, photos & CTA",
      "Inquiry inbox with status tracking",
      "Email notifications for new inquiries",
    ],
  },
  {
    number: "02",
    title: "Intake",
    subtitle: "Convert inquiries into clients — automatically.",
    icon: ClipboardList,
    color: "bg-[#FFDC33]",
    lightColor: "bg-[#FFDC33]/10",
    textColor: "text-amber-600",
    borderColor: "border-amber-300/40",
    ringColor: "ring-amber-200/40",
    features: [
      "Branded digital intake form",
      "Collect child details, parent info & insurance",
      "Availability & scheduling preferences",
      "Auto-create client records from submissions",
      "Pipeline dashboard with stage cards",
      "Client status tracking (Inquiry → Active)",
    ],
  },
  {
    number: "03",
    title: "Nurture",
    subtitle: "Keep families engaged at every stage.",
    icon: Mail,
    color: "bg-[#8B5CF6]",
    lightColor: "bg-[#8B5CF6]/10",
    textColor: "text-[#8B5CF6]",
    borderColor: "border-[#8B5CF6]/30",
    ringColor: "ring-[#8B5CF6]/20",
    features: [
      "22 branded email templates",
      "Merge fields for personalization",
      "Auto-send from your pipeline",
      "Communication history per client",
      "Branded parent resources & ABA guides",
      "Attention alerts for stale leads",
    ],
  },
  {
    number: "04",
    title: "Manage",
    subtitle: "Every authorization, credential & family — in one place.",
    icon: LayoutDashboard,
    color: "bg-[#F59E0B]",
    lightColor: "bg-[#F59E0B]/10",
    textColor: "text-[#F59E0B]",
    borderColor: "border-amber-400/30",
    ringColor: "ring-amber-300/20",
    features: [
      "Client records with full history",
      "Insurance & authorization tracking",
      "Expiration alerts with auto-generated tasks",
      "Staff credential management",
      "Document storage per client",
      "Multi-location caseload management",
    ],
  },
  {
    number: "05",
    title: "Grow",
    subtitle: "Scale your agency with data and talent.",
    icon: TrendingUp,
    color: "bg-[#10B981]",
    lightColor: "bg-[#10B981]/10",
    textColor: "text-[#10B981]",
    borderColor: "border-[#10B981]/30",
    ringColor: "ring-[#10B981]/20",
    features: [
      "Referral source analytics",
      "Listing views, clicks & CTR reporting",
      "Job postings on FindABAJobs.org",
      "Branded careers page",
      "Applicant tracking pipeline",
      "Caseload & pipeline analytics",
    ],
  },
] as const;

export function BwLifecycle() {
  return (
    <BwSectionWrapper id="lifecycle" background="golden">
      <BwFadeUp>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            The Client Funnel
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
            One platform. Every stage of the{" "}
            <span className="relative inline-block">
              <span className="relative z-10">client journey</span>
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

      {/* Vertical funnel timeline */}
      <div className="mx-auto mt-16 max-w-3xl">
        <div className="relative">
          {/* Vertical connecting line — warm gradient */}
          <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-[#5788FF]/40 via-[#FFDC33]/40 to-[#10B981]/40 sm:left-8" />

          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isLast = i === stages.length - 1;
            return (
              <BwFadeUp key={stage.title} delay={i * 0.1}>
                <div className={cn("relative pb-12", isLast && "pb-0")}>
                  {/* Stage node */}
                  <div className="flex gap-5 sm:gap-7">
                    {/* Left: icon node */}
                    <div className="relative z-10 flex shrink-0 flex-col items-center">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-sm ring-4 sm:h-16 sm:w-16",
                          stage.borderColor,
                          stage.ringColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", stage.textColor)} />
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 text-[10px] font-extrabold tracking-widest",
                          stage.textColor
                        )}
                      >
                        {stage.number}
                      </span>
                    </div>

                    {/* Right: Content card */}
                    <div className="flex-1 pt-1">
                      <div className="overflow-hidden rounded-2xl border border-amber-200/40 bg-white shadow-sm transition-all hover:shadow-md hover:shadow-amber-100/50">
                        {/* Header */}
                        <div className="border-b border-amber-100/50 px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-wider",
                                stage.title === "Intake"
                                  ? "bg-[#FFDC33] text-[#1A2744]"
                                  : cn(stage.color, "text-white")
                              )}
                            >
                              {stage.title}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-600 sm:text-base">
                            {stage.subtitle}
                          </p>
                        </div>

                        {/* Feature list */}
                        <div className="px-5 py-4 sm:px-6">
                          <ul className="grid gap-2.5 sm:grid-cols-2">
                            {stage.features.map((feature) => (
                              <li
                                key={feature}
                                className="flex items-start gap-2 text-[13px] leading-snug text-slate-600 sm:text-sm"
                              >
                                <Check
                                  className={cn(
                                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                                    stage.textColor
                                  )}
                                />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow between stages */}
                  {!isLast && (
                    <div className="ml-[1.35rem] mt-3 flex items-center gap-3 sm:ml-[1.85rem]">
                      <svg
                        className="h-3 w-3 text-amber-300"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M6 2L6 10M6 10L2 6M6 10L10 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </BwFadeUp>
            );
          })}
        </div>
      </div>
    </BwSectionWrapper>
  );
}
