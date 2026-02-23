"use client";

import Link from "next/link";
import { Settings, Globe, LayoutDashboard } from "lucide-react";
import { BwMotion } from "@/components/marketing/bw-motion";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

const steps = [
  {
    number: "1",
    icon: Settings,
    title: "Set up your agency",
    description:
      "Create your profile, add your locations, insurances, and team info. Live in under 5 minutes.",
    color: "#5788FF",
  },
  {
    number: "2",
    icon: Globe,
    title: "Families find you",
    description:
      "Your directory listing, branded pages, and contact forms start capturing real inquiries.",
    color: "#FFDC33",
  },
  {
    number: "3",
    icon: LayoutDashboard,
    title: "Manage your caseload",
    description:
      "Track every lead, automate intake, and manage active clients from one dashboard.",
    color: "#10B981",
  },
] as const;

export function BwHowItWorks() {
  return (
    <BwSectionWrapper background="white" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <BwMotion
                key={step.number}
                variant="fade-up"
                delay={i * 0.12}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Numbered circle */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-md"
                    style={{
                      backgroundColor: step.color,
                      boxShadow: `0 4px 14px ${step.color}30`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Step number label */}
                  <span
                    className="mt-4 text-[10px] font-extrabold uppercase tracking-widest"
                    style={{ color: step.color }}
                  >
                    Step {step.number}
                  </span>

                  <h3 className="mt-1.5 text-base font-extrabold text-[#1A2744]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </BwMotion>
            );
          })}
        </div>

        {/* CTA */}
        <BwMotion variant="fade-up" delay={0.4}>
          <div className="mt-10 flex justify-center">
            <Link
              href="/behaviorwork/get-started"
              onClick={() =>
                trackBehaviorWorkCtaClick({
                  section: "how_it_works",
                  ctaLabel: "Get Started Free",
                  destination: "/behaviorwork/get-started",
                })
              }
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#FFDC33] px-8 text-sm font-extrabold text-[#1A2744] shadow-md shadow-amber-200/40 transition-all hover:bg-[#F5CF1B] hover:shadow-lg hover:shadow-amber-200/50 active:scale-[0.97]"
            >
              Get Started Free &rarr;
            </Link>
          </div>
        </BwMotion>
      </div>
    </BwSectionWrapper>
  );
}
