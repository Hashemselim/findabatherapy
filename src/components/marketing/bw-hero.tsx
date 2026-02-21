"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

export function BwHero() {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-12 sm:pb-24 sm:pt-20 lg:pb-32 lg:pt-28">
      {/* Decorative floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[#FFDC33]/10 blur-3xl" />
        <div className="absolute -left-16 top-1/2 h-56 w-56 rounded-full bg-[#5788FF]/8 blur-3xl" />
        <div className="absolute bottom-10 right-1/3 h-40 w-40 rounded-full bg-[#10B981]/8 blur-3xl" />
        {/* Scattered dots */}
        <svg className="absolute right-10 top-32 h-4 w-4 text-[#FFDC33]/40 sm:right-20" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="currentColor" /></svg>
        <svg className="absolute left-[15%] top-24 h-3 w-3 text-[#5788FF]/30" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="currentColor" /></svg>
        <svg className="absolute bottom-32 left-[10%] h-2.5 w-2.5 text-[#10B981]/30" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="currentColor" /></svg>
        <svg className="absolute right-[20%] top-1/2 h-2 w-2 text-[#FFDC33]/50" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="currentColor" /></svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Left — Copy */}
          <BwFadeUp>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-[#FFDC33]/15 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
                <Sparkles className="h-3 w-3" />
                The Growth Engine for ABA Agencies
              </span>

              <h1 className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#1A2744] sm:text-5xl lg:text-[3.5rem]">
                Fill your{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">ABA caseload</span>
                  <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/40 sm:h-4" />
                </span>
                .
                <br />
                Manage every family&apos;s{" "}
                <span className="text-[#5788FF]">journey</span>.
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl">
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
                  className="group inline-flex h-12 items-center justify-center rounded-full bg-[#FFDC33] px-7 text-sm font-bold text-[#1A2744] shadow-md shadow-amber-200/50 transition-all hover:bg-[#F5CF1B] hover:shadow-lg hover:shadow-amber-200/60 active:scale-[0.97]"
                >
                  Start Growing Your Caseload
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
                  className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200/80 bg-white/60 px-7 text-sm font-semibold text-[#1A2744] backdrop-blur-sm transition-all hover:border-amber-300 hover:bg-white"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </BwFadeUp>

          {/* Right — Product UI Mockup */}
          <BwFadeUp delay={0.15}>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-xl shadow-amber-100/50">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 border-b border-amber-100/60 bg-[#FFFBF0] px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-300/60" />
                  <span className="ml-3 text-[11px] font-medium text-slate-400">
                    app.behaviorwork.com/pipeline
                  </span>
                </div>
                <div className="p-5">
                  {/* Pipeline mock */}
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Client Pipeline
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "New Lead", count: 8, color: "bg-[#5788FF]" },
                      { label: "Intake Sent", count: 5, color: "bg-[#FFDC33]" },
                      { label: "Docs Received", count: 3, color: "bg-[#8B5CF6]" },
                      { label: "Insurance", count: 4, color: "bg-[#F59E0B]" },
                      { label: "Active", count: 12, color: "bg-[#10B981]" },
                    ].map((stage) => (
                      <div key={stage.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                          <span className="text-xs font-bold text-[#1A2744]">
                            {stage.count}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold leading-tight text-slate-500">
                          {stage.label}
                        </p>
                        {/* Mini cards */}
                        {Array.from({ length: Math.min(stage.count, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="h-6 rounded-lg border border-amber-100/80 bg-[#FFFBF0]"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Decorative glow */}
              <div className="pointer-events-none absolute -bottom-8 -right-8 -z-10 h-64 w-64 rounded-full bg-[#FFDC33]/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-6 -top-6 -z-10 h-48 w-48 rounded-full bg-[#5788FF]/10 blur-3xl" />
            </div>
          </BwFadeUp>
        </div>
      </div>
    </section>
  );
}
