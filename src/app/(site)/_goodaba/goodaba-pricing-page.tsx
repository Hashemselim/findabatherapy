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

const BASE_URL = "https://www.goodaba.com/pricing";

export const metadata: Metadata = {
  title: "Pricing | GoodABA — The ABA Growth Toolkit",
  description:
    "One platform replaces Google Forms, spreadsheets, and Indeed. Branded intake forms, CRM, automated emails, and job board — $79/mo. Start free.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "GoodABA Pricing | The ABA Growth Toolkit",
    description:
      "Stop running your ABA business on Google Forms. One platform. One price. Everything included.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoodABA Pricing — $79/mo for Everything",
    description:
      "Branded intake forms, CRM, automated emails, and job board for ABA agencies. Start free.",
  },
};

export function GoodabaPricingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF0] text-slate-900">
      <BehaviorWorkTracker mode="get-started" />
      <BehaviorWorkHeader />
      <div className="h-16" aria-hidden="true" />

      <main>
        <BwSectionWrapper
          background="white"
          className="pb-16 pt-16 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28"
        >
          <BwFadeUp>
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5">
                <span className="inline-flex items-center rounded-full border border-[#5788FF]/20 bg-[#5788FF]/8 px-4 py-1.5 text-xs font-bold tracking-wide text-[#5788FF]">
                  Purpose-built for ABA agencies
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
                Capture every inquiry. Convert every family.{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#5788FF]">
                    Nothing falls through the cracks.
                  </span>
                  <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/30 sm:h-4" />
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
                Replace the{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">
                    Google Forms, spreadsheets, and disconnected tools
                  </span>
                  <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/30" />
                </span>{" "}
                your agency runs on today with branded intake forms, client
                management, automated emails, and a job board — all connected.{" "}
                <strong className="font-semibold text-[#1A2744]">
                  Set up in 10 minutes.
                </strong>
              </p>
            </div>
          </BwFadeUp>

          <BwFadeUp delay={0.05}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1A2744]">500+</span> ABA
                agencies
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" />
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1A2744]">HIPAA</span>{" "}
                compliant
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" />
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1A2744]">10 min</span>{" "}
                average setup
              </span>
            </div>
          </BwFadeUp>

          <div className="mt-12 sm:mt-16">
            <BwPricingCards defaultInterval="monthly" />
          </div>
        </BwSectionWrapper>

        <BwFeatureMatrix />
        <BwFaq pageLocation="goodaba-pricing" />
        <BwDarkCta
          headline="Your next client is searching for an ABA provider"
          accentWord="right now"
          subheadline="Every day without a system means missed inquiries, lost families, and revenue left on the table. Set up in 10 minutes. No credit card required."
          ctaLabel="Start Your Free Setup"
          ctaHref="/auth/sign-up?plan=pro&interval=annual&intent=behaviorwork"
          section="pricing_footer"
          footnote="Free plan available. Upgrade when you're ready."
        />
      </main>

      <BehaviorWorkFooter />
    </div>
  );
}

export default GoodabaPricingPage;
