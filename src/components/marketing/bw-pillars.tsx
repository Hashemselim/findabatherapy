"use client";

import { Search, Zap, LayoutGrid, Check } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

const pillars = [
  {
    icon: Search,
    title: "Get Found",
    subtitle: "Your agency, everywhere families are looking.",
    features: [
      "Priority placement for Pro+ plans",
      "Listed on FindABATherapy.org directory",
      "SEO-optimized provider profile",
      "Referral source tracking",
    ],
    placeholder: "Branded agency intake page preview",
    gradient: "from-blue-50 to-white",
  },
  {
    icon: Zap,
    title: "Convert Faster",
    subtitle: "Turn inquiries into active clients — automatically.",
    features: [
      "Digital intake forms families complete online",
      "Automated email follow-ups",
      "Pipeline dashboard showing every lead's status",
      "Communication templates for every stage",
    ],
    placeholder: "Pipeline dashboard with stage cards",
    gradient: "from-teal-50 to-white",
  },
  {
    icon: LayoutGrid,
    title: "Stay Organized",
    subtitle: "Every authorization, credential, and family — in one place.",
    features: [
      "Client records with full history",
      "Authorization tracking with expiry alerts",
      "Staff credential management",
      "Caseload analytics and reporting",
    ],
    placeholder: "Client detail page with records",
    gradient: "from-violet-50 to-white",
  },
] as const;

export function BwPillars() {
  return (
    <BwSectionWrapper background="white">
      <div className="grid gap-8 lg:grid-cols-3">
        {pillars.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <BwFadeUp key={pillar.title} delay={i * 0.1}>
              <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
                {/* Screenshot placeholder */}
                <div
                  className={`flex h-44 items-center justify-center bg-gradient-to-b ${pillar.gradient} px-6`}
                >
                  <div className="w-full rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-center shadow-sm backdrop-blur">
                    <Icon className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs text-slate-400">
                      {pillar.placeholder}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
                      <Icon className="h-4 w-4 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0F2B5B]">
                      {pillar.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {pillar.subtitle}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {pillar.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </BwFadeUp>
          );
        })}
      </div>
    </BwSectionWrapper>
  );
}
