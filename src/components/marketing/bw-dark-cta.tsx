"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

interface BwDarkCtaProps {
  headline?: string;
  accentWord?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  section?: string;
  footnote?: string;
}

export function BwDarkCta({
  headline = "Your next client is looking for you",
  accentWord = "right now",
  subheadline = "Set up your agency on BehaviorWork in 5 minutes. No credit card required.",
  ctaLabel = "Start Growing Your Caseload",
  ctaHref = "/behaviorwork/get-started",
  section = "final_cta",
  footnote = "Free plan available. Upgrade anytime.",
}: BwDarkCtaProps) {
  return (
    <section className="relative overflow-hidden bg-[#1A2744] py-24 lg:py-32">
      {/* Decorative warm glow */}
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#FFDC33]/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-[#5788FF]/8 blur-3xl" />
      {/* Floating dots */}
      <svg
        className="pointer-events-none absolute left-[15%] top-20 h-2 w-2 text-[#FFDC33]/20"
        viewBox="0 0 8 8"
      >
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-24 right-[20%] h-3 w-3 text-[#5788FF]/15"
        viewBox="0 0 8 8"
      >
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      <svg
        className="pointer-events-none absolute right-[10%] top-[40%] h-1.5 w-1.5 text-[#FFDC33]/15"
        viewBox="0 0 8 8"
      >
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <BwMotion variant="blur-in">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {headline}{" "}
              <span className="text-[#FFDC33]">{accentWord}</span>.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
              {subheadline}
            </p>

            <div className="mt-8">
              <Link
                href={ctaHref}
                onClick={() =>
                  trackBehaviorWorkCtaClick({
                    section,
                    ctaLabel,
                    destination: ctaHref,
                  })
                }
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FFDC33] px-8 text-sm font-bold text-[#1A2744] shadow-lg shadow-amber-500/20 transition-all hover:bg-[#F5CF1B] hover:shadow-xl hover:shadow-amber-500/25 active:scale-[0.97]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {footnote && (
              <p className="mt-4 text-sm text-slate-500">{footnote}</p>
            )}
          </div>
        </BwMotion>
      </div>
    </section>
  );
}
