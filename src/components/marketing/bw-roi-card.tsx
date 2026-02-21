"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

export function BwRoiCard() {
  return (
    <BwSectionWrapper background="cream">
      <BwFadeUp>
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
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-extrabold text-white sm:text-3xl">
                    $60K+
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Revenue from one ABA client/year
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-extrabold text-white sm:text-3xl">
                    $948
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    BehaviorWork Pro per year
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFDC33]/15 p-4 text-center backdrop-blur-sm ring-1 ring-[#FFDC33]/20">
                  <p className="text-2xl font-extrabold text-[#FFDC33] sm:text-3xl">
                    63 yrs
                  </p>
                  <p className="mt-1 text-xs text-amber-200/80">
                    Paid for by a single client
                  </p>
                </div>
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
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
