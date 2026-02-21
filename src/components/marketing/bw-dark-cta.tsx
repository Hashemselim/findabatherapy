"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
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
  subheadline = "Set up your agency on BehaviorWork in minutes. No credit card required to start.",
  ctaLabel = "Start Growing Your Caseload",
  ctaHref = "/behaviorwork/get-started",
  section = "final_cta",
  footnote = "Free plan available. Upgrade anytime.",
}: BwDarkCtaProps) {
  return (
    <section className="bg-slate-900 py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <BwFadeUp>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {headline}{" "}
              <span className="text-teal-400">{accentWord}</span>.
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-teal-500 px-8 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 hover:shadow-xl hover:shadow-teal-500/25 active:scale-[0.98]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {footnote && (
              <p className="mt-4 text-sm text-slate-500">{footnote}</p>
            )}
          </div>
        </BwFadeUp>
      </div>
    </section>
  );
}
