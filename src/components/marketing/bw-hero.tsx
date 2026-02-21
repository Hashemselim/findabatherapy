"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

export function BwHero() {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-12 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Left — Copy */}
          <BwFadeUp>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-teal-700">
                The Growth Engine for ABA Agencies
              </span>

              <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-[#0F2B5B] sm:text-5xl lg:text-6xl">
                Fill your <span className="text-teal-600">ABA</span> caseload.
                <br />
                Manage every family&apos;s{" "}
                <span className="text-teal-600">journey</span>.
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
                From first inquiry to active services — one platform that
                captures leads, automates intake, and keeps families engaged. So
                you can focus on therapy.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/behaviorwork/get-started"
                  onClick={() =>
                    trackBehaviorWorkCtaClick({
                      section: "hero",
                      ctaLabel: "Start Growing Your Caseload",
                      destination: "/behaviorwork/get-started",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full bg-teal-600 px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md active:scale-[0.98]"
                >
                  Start Growing Your Caseload
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="#lifecycle"
                  onClick={() =>
                    trackBehaviorWorkCtaClick({
                      section: "hero",
                      ctaLabel: "See How It Works",
                      destination: "#lifecycle",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </BwFadeUp>

          {/* Right — Product UI Placeholder */}
          <BwFadeUp delay={0.15}>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <span className="ml-3 text-[11px] font-medium text-slate-400">
                    app.behaviorwork.com/dashboard/pipeline
                  </span>
                </div>
                <div className="p-5">
                  {/* Pipeline mock */}
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Client Pipeline
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "New Lead", count: 8, color: "bg-blue-500" },
                      { label: "Intake Sent", count: 5, color: "bg-amber-500" },
                      { label: "Docs Received", count: 3, color: "bg-violet-500" },
                      { label: "Insurance", count: 4, color: "bg-teal-500" },
                      { label: "Active", count: 12, color: "bg-emerald-500" },
                    ].map((stage) => (
                      <div key={stage.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`h-1.5 w-1.5 rounded-full ${stage.color}`} />
                          <span className="text-xs font-bold text-slate-700">
                            {stage.count}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium leading-tight text-slate-500">
                          {stage.label}
                        </p>
                        {/* Mini bars */}
                        {Array.from({ length: Math.min(stage.count, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="h-6 rounded border border-slate-200 bg-white"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Decorative gradient blob behind */}
              <div className="pointer-events-none absolute -bottom-8 -right-8 -z-10 h-64 w-64 rounded-full bg-teal-100/60 blur-3xl" />
              <div className="pointer-events-none absolute -left-6 -top-6 -z-10 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
            </div>
          </BwFadeUp>
        </div>
      </div>
    </section>
  );
}
