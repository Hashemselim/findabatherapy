"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

export function BwRoiCard() {
  return (
    <BwSectionWrapper background="slate">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl bg-[#0F2B5B] p-8 shadow-2xl sm:p-12">
            <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              One new client pays for BehaviorWork for{" "}
              <span className="text-teal-400">63 years</span>.
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white sm:text-3xl">
                  $60K+
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Revenue from one ABA client/year
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white sm:text-3xl">
                  $948
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  BehaviorWork Pro per year
                </p>
              </div>
              <div className="rounded-xl bg-teal-500/20 p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-teal-400 sm:text-3xl">
                  63 yrs
                </p>
                <p className="mt-1 text-xs text-teal-300">
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-teal-500 px-7 text-sm font-semibold text-white transition-all hover:bg-teal-400 active:scale-[0.98]"
              >
                Start Growing Your Caseload
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
