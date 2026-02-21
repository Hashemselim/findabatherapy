"use client";

import {
  FileText,
  ClipboardList,
  Building2,
  BookOpen,
  Briefcase,
  Users,
  Mail,
} from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { cn } from "@/lib/utils";

const brandedPages = [
  {
    icon: FileText,
    title: "Contact Form",
    path: "/contact/your-agency",
    description:
      "A branded inquiry form families fill out in under 60 seconds.",
    comingSoon: false,
    accent: "bg-[#5788FF]/10 text-[#5788FF]",
  },
  {
    icon: ClipboardList,
    title: "Client Intake Form",
    path: "/intake/your-agency/client",
    description:
      "Collect child details, parent info, insurance, and availability before the first call.",
    comingSoon: false,
    accent: "bg-[#FFDC33]/15 text-amber-600",
  },
  {
    icon: Building2,
    title: "Agency Page",
    path: "/p/your-agency",
    description:
      "A public-facing page with your logo, locations, services, photos, and a direct CTA.",
    comingSoon: false,
    accent: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  },
  {
    icon: BookOpen,
    title: "Parent Resources",
    path: "/resources/your-agency",
    description:
      "FAQ, ABA glossary, and parent guides branded to your agency.",
    comingSoon: false,
    accent: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  {
    icon: Briefcase,
    title: "Careers Page",
    path: "/careers/your-agency",
    description:
      "A branded job board for your agency. List BCBA and RBT positions.",
    comingSoon: false,
    accent: "bg-[#10B981]/10 text-[#10B981]",
  },
  {
    icon: Mail,
    title: "Branded Emails",
    path: "Auto-sent from your pipeline",
    description:
      "22 email templates with your agency name, logo, and merge fields — sent automatically at every stage.",
    comingSoon: false,
    accent: "bg-[#5788FF]/10 text-[#5788FF]",
  },
  {
    icon: Users,
    title: "Employee Resources",
    path: "/team/your-agency",
    description:
      "Training materials, onboarding docs, and credential tracking.",
    comingSoon: true,
    accent: "bg-slate-100 text-slate-400",
  },
] as const;

export function BwBrandedPages() {
  return (
    <BwSectionWrapper background="cream">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-[#FFDC33]/10 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            Your Brand, Everywhere
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl">
            Seven branded touchpoints.{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Zero coding</span>
              <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/30" />
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Every page and email carries your agency name, logo, and colors.
            Families and candidates see your brand from first click to
            conversion.
          </p>
        </div>
      </BwFadeUp>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {brandedPages.map((page, i) => {
          const Icon = page.icon;
          return (
            <BwFadeUp key={page.title} delay={i * 0.07}>
              <div
                className={cn(
                  "group relative flex h-full flex-col rounded-2xl p-6 transition-all",
                  page.comingSoon
                    ? "border-2 border-dashed border-amber-200/50 bg-[#FFF7E1]/50"
                    : "border border-amber-200/40 bg-white shadow-sm hover:shadow-md hover:shadow-amber-100/50"
                )}
              >
                {page.comingSoon && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Coming Soon
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                      page.accent.split(" ")[0]
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        page.accent.split(" ")[1]
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1A2744]">
                      {page.title}
                    </h3>
                    <p className="font-mono text-[11px] text-slate-400">
                      {page.path}
                    </p>
                  </div>
                </div>

                <p
                  className={cn(
                    "mt-3 flex-1 text-sm leading-relaxed",
                    page.comingSoon ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  {page.description}
                </p>
              </div>
            </BwFadeUp>
          );
        })}
      </div>
    </BwSectionWrapper>
  );
}
