import type { Metadata } from "next";

import { BehaviorWorkTracker } from "@/components/marketing/behaviorwork-tracker";
import { BehaviorWorkHeader } from "@/components/marketing/behaviorwork-header";
import { BehaviorWorkFooter } from "@/components/marketing/behaviorwork-footer";
import { BwPricingCards } from "@/components/marketing/bw-pricing-cards";
import { BwFeatureMatrix } from "@/components/marketing/bw-feature-matrix";
import { BwFaq } from "@/components/marketing/bw-faq";
import { BwDarkCta } from "@/components/marketing/bw-dark-cta";
import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

const BASE_URL = "https://www.behaviorwork.com/get-started";

export const metadata: Metadata = {
  title: "Pricing | BehaviorWork — Plans for ABA Agencies",
  description:
    "Simple pricing that grows with you. Start free, upgrade when you're ready to unlock the full growth engine for your ABA agency.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "BehaviorWork Pricing | Plans for ABA Agencies",
    description:
      "Branded pages, intake forms, CRM, and hiring tools. One account for your ABA agency.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BehaviorWork Pricing",
    description:
      "One platform for branded pages, client intake, CRM, and hiring.",
  },
};

export default function BehaviorWorkGetStartedPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF0] text-slate-900">
      <BehaviorWorkTracker mode="get-started" />
      <BehaviorWorkHeader />

      <main>
        {/* Pricing Hero + Cards — single section to avoid double padding */}
        <BwSectionWrapper
          background="white"
          className="pb-16 pt-16 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28"
        >
          <BwFadeUp>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
                Simple pricing that{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">grows with you</span>
                  <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/30" />
                </span>
                .
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Start free. Upgrade when you&apos;re ready to unlock the full
                growth engine.
              </p>
            </div>
          </BwFadeUp>

          <div className="mt-10 sm:mt-12">
            <BwPricingCards defaultInterval="annual" />
          </div>
        </BwSectionWrapper>

        {/* Feature Matrix */}
        <BwFeatureMatrix />

        {/* FAQ */}
        <BwFaq />

        {/* Final CTA */}
        <BwDarkCta
          headline="Ready to grow your agency"
          accentWord="?"
          subheadline="Set up your agency on BehaviorWork in minutes. No credit card required to start."
          ctaLabel="Start Growing Your Caseload"
          ctaHref="/auth/sign-up?plan=free&intent=behaviorwork"
          section="pricing_footer"
          footnote="Free plan available. Upgrade anytime."
        />
      </main>

      <BehaviorWorkFooter />
    </div>
  );
}
