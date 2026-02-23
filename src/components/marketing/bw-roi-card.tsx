"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

function RoiMetric({
  end,
  prefix,
  suffix,
  label,
  highlight,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  label: string;
  highlight?: boolean;
}) {
  const counter = useAnimatedCounter({
    end,
    prefix,
    suffix,
    duration: 1600,
  });

  return (
    <div
      className={
        highlight
          ? "rounded-2xl bg-[#FFDC33]/15 p-4 text-center backdrop-blur-sm ring-1 ring-[#FFDC33]/20"
          : "rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm"
      }
    >
      <p
        ref={counter.ref as React.RefObject<HTMLParagraphElement>}
        className={`text-2xl font-extrabold sm:text-3xl ${highlight ? "text-[#FFDC33]" : "text-white"}`}
      >
        {counter.display}
      </p>
      <p
        className={`mt-1 text-xs ${highlight ? "text-amber-200/80" : "text-slate-300"}`}
      >
        {label}
      </p>
    </div>
  );
}

export function BwRoiCard() {
  return (
    <BwSectionWrapper background="golden">
      <BwMotion variant="scale-in">
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl bg-[#1A2744] p-8 shadow-2xl sm:p-12">
            {/* Decorative warm glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#FFDC33]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#5788FF]/10 blur-3xl" />

            <div className="relative">
              <h2 className="text-center text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
                One new client pays for BehaviorWork for{" "}
                <span className="text-[#FFDC33]">63 years</span>.
              </h2>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <RoiMetric
                  end={60}
                  prefix="$"
                  suffix="K+"
                  label="Revenue from one ABA client/year"
                />
                <RoiMetric
                  end={948}
                  prefix="$"
                  label="BehaviorWork Pro per year"
                />
                <RoiMetric
                  end={63}
                  suffix=" yrs"
                  label="Paid for by a single client"
                  highlight
                />
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/behaviorwork/get-started"
                  onClick={() =>
                    trackBehaviorWorkCtaClick({
                      section: "roi",
                      ctaLabel: "Start Growing Your Caseload",
                      destination: "/behaviorwork/get-started",
                    })
                  }
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FFDC33] px-7 text-sm font-bold text-[#1A2744] shadow-lg shadow-amber-500/20 transition-all hover:bg-[#F5CF1B] hover:shadow-xl hover:shadow-amber-500/25 active:scale-[0.97]"
                >
                  Start Growing Your Caseload
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </BwMotion>
    </BwSectionWrapper>
  );
}
