"use client";

import {
  Users,
  CheckSquare,
  FileText,
  ClipboardList,
  Building2,
  BookOpen,
  Search,
  Mail,
  Shield,
  UserCog,
  Briefcase,
  Globe,
  MessageSquare,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";
import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Category types & styling                                           */
/* ------------------------------------------------------------------ */

type Category = "Attract" | "Intake" | "Manage";

const categoryStyles: Record<
  Category,
  { bg: string; text: string; border: string; dot: string }
> = {
  Attract: {
    bg: "bg-[#5788FF]/10",
    text: "text-[#5788FF]",
    border: "border-[#5788FF]/20",
    dot: "bg-[#5788FF]",
  },
  Intake: {
    bg: "bg-[#FFDC33]/15",
    text: "text-amber-700",
    border: "border-amber-300/30",
    dot: "bg-[#FFDC33]",
  },
  Manage: {
    bg: "bg-[#10B981]/10",
    text: "text-[#10B981]",
    border: "border-[#10B981]/20",
    dot: "bg-[#10B981]",
  },
};

/* ------------------------------------------------------------------ */
/*  Feature data                                                       */
/* ------------------------------------------------------------------ */

interface Feature {
  title: string;
  icon: LucideIcon;
  category: Category;
  description: string;
}

const features: Feature[] = [
  {
    title: "Client Manager (CRM)",
    icon: Users,
    category: "Manage",
    description:
      "Full client records, family contacts, child details, and notes.",
  },
  {
    title: "Tasks & Reminders",
    icon: CheckSquare,
    category: "Manage",
    description:
      "Automated to-dos, auth expiration alerts, and follow-up reminders.",
  },
  {
    title: "Branded Contact Form",
    icon: FileText,
    category: "Attract",
    description:
      "A professional inquiry form families fill out in under 60 seconds.",
  },
  {
    title: "Client Intake Form",
    icon: ClipboardList,
    category: "Intake",
    description:
      "Collect parent, child, insurance, and availability before the first call.",
  },
  {
    title: "Agency Details Page",
    icon: Building2,
    category: "Attract",
    description:
      "A public page with your logo, locations, services, and a direct CTA.",
  },
  {
    title: "Parent Resources",
    icon: BookOpen,
    category: "Attract",
    description:
      "Branded FAQ, ABA glossary, and parent guides for your agency.",
  },
  {
    title: "FindABATherapy.org Listing",
    icon: Search,
    category: "Attract",
    description:
      "Included directory listing — families search by insurance + location.",
  },
  {
    title: "Email Templates",
    icon: Mail,
    category: "Intake",
    description:
      "22 branded templates for welcome, follow-up, status updates, and more.",
  },
  {
    title: "Insurance Tracking",
    icon: Shield,
    category: "Manage",
    description:
      "Track active insurances, authorizations, remaining hours, and expiration dates.",
  },
  {
    title: "Employee Manager",
    icon: UserCog,
    category: "Manage",
    description:
      "Track team credentials, certifications, and expiration reminders.",
  },
  {
    title: "Branded Careers Page",
    icon: Briefcase,
    category: "Attract",
    description:
      "A custom careers page to showcase open BCBA and RBT positions.",
  },
  {
    title: "FindABAJobs.org Posting",
    icon: Globe,
    category: "Attract",
    description:
      "Included job board listing — reach thousands of ABA professionals.",
  },
  {
    title: "Communication History",
    icon: MessageSquare,
    category: "Manage",
    description:
      "Full email and contact history per client and per lead.",
  },
  {
    title: "Pipeline Dashboard",
    icon: BarChart3,
    category: "Intake",
    description:
      "Visual dashboard showing every lead from inquiry to active client.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BwFeatures() {
  return (
    <BwSectionWrapper id="features" background="white">
      {/* Section header */}
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-[#10B981]/20 bg-[#10B981]/8 px-4 py-1.5 text-xs font-bold tracking-wide text-[#10B981]">
            All Included
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
            Everything you need &mdash;{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#5788FF]">all in one platform</span>
              <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/30" />
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Every feature. Every plan. No hidden add-ons.
          </p>
        </div>
      </BwFadeUp>

      {/* Category legend */}
      <BwFadeUp delay={0.1}>
        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-4">
          {(["Attract", "Intake", "Manage"] as const).map((cat) => {
            const style = categoryStyles[cat];
            return (
              <span
                key={cat}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold",
                  style.bg,
                  style.text,
                  style.border
                )}
              >
                <span
                  className={cn("h-2 w-2 rounded-full", style.dot)}
                />
                {cat}
              </span>
            );
          })}
        </div>
      </BwFadeUp>

      {/* Feature card grid */}
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          const style = categoryStyles[feature.category];

          return (
            <BwMotion
              key={feature.title}
              variant="fade-up"
              delay={Math.min(i * 0.05, 0.4)}
            >
              <div className="group flex h-full flex-col rounded-2xl border border-amber-200/40 bg-[#FFFBF0] p-5 transition-all hover:border-amber-200/70 hover:shadow-md hover:shadow-amber-100/40">
                {/* Icon + category pill row */}
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border",
                      style.bg,
                      style.border
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5", style.text)} />
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                      style.bg,
                      style.text,
                      style.border
                    )}
                  >
                    {feature.category}
                  </span>
                </div>

                {/* Title + description */}
                <h3 className="mt-4 text-sm font-extrabold text-[#1A2744]">
                  {feature.title}
                </h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            </BwMotion>
          );
        })}
      </div>
    </BwSectionWrapper>
  );
}
