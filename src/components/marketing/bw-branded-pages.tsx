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
  },
  {
    icon: ClipboardList,
    title: "Client Intake Form",
    path: "/intake/your-agency/client",
    description:
      "Collect child details, parent info, insurance, and availability before the first call.",
    comingSoon: false,
  },
  {
    icon: Building2,
    title: "Agency Page",
    path: "/p/your-agency",
    description:
      "A public-facing page with your logo, locations, services, photos, and a direct CTA.",
    comingSoon: false,
  },
  {
    icon: BookOpen,
    title: "Parent Resources",
    path: "/resources/your-agency",
    description:
      "FAQ, ABA glossary, and parent guides branded to your agency.",
    comingSoon: false,
  },
  {
    icon: Briefcase,
    title: "Careers Page",
    path: "/careers/your-agency",
    description:
      "A branded job board for your agency. List BCBA and RBT positions.",
    comingSoon: false,
  },
  {
    icon: Mail,
    title: "Branded Emails",
    path: "Auto-sent from your pipeline",
    description:
      "22 email templates with your agency name, logo, and merge fields — sent automatically at every stage.",
    comingSoon: false,
  },
  {
    icon: Users,
    title: "Employee Resources",
    path: "/team/your-agency",
    description:
      "Training materials, onboarding docs, and credential tracking.",
    comingSoon: true,
  },
] as const;

export function BwBrandedPages() {
  return (
    <BwSectionWrapper background="white">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-teal-700">
            Your Brand, Everywhere
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl">
            Seven branded touchpoints.{" "}
            <span className="text-teal-600">Zero coding</span>.
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
                  "relative flex h-full flex-col rounded-2xl p-6 transition-shadow hover:shadow-lg",
                  page.comingSoon
                    ? "border-2 border-dashed border-slate-200 bg-slate-50/60"
                    : "border border-slate-200 bg-white"
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
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      page.comingSoon ? "bg-slate-100" : "bg-teal-50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        page.comingSoon ? "text-slate-400" : "text-teal-600"
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F2B5B]">
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
