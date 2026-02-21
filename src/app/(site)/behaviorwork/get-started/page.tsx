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
    <div className="min-h-screen bg-white text-slate-900">
      <BehaviorWorkTracker mode="get-started" />
      <BehaviorWorkHeader />

      <main>
        {/* Pricing Hero */}
        <BwSectionWrapper
          background="white"
          className="pb-8 pt-16 sm:pb-12 sm:pt-24 lg:pt-28"
        >
          <BwFadeUp>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl lg:text-5xl">
                Simple pricing that{" "}
                <span className="text-teal-600">grows with you</span>.
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                Start free. Upgrade when you&apos;re ready to unlock the full
                growth engine.
              </p>
            </div>
          </BwFadeUp>
        </BwSectionWrapper>

        {/* Pricing Cards */}
        <BwSectionWrapper background="white" className="py-8 sm:py-12">
          <BwPricingCards defaultInterval="annual" />
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
