import type { Metadata } from "next";

import { BehaviorWorkTracker } from "@/components/marketing/behaviorwork-tracker";
import { BehaviorWorkHeader } from "@/components/marketing/behaviorwork-header";
import { BehaviorWorkFooter } from "@/components/marketing/behaviorwork-footer";
import { BwHero } from "@/components/marketing/bw-hero";
import { BwTrustBar } from "@/components/marketing/bw-trust-bar";
import { BwHowItWorks } from "@/components/marketing/bw-how-it-works";
import { BwProblem } from "@/components/marketing/bw-problem";
import { BwLifecycle } from "@/components/marketing/bw-lifecycle";
import { BwFeatures } from "@/components/marketing/bw-features";
import { BwBrandedPages } from "@/components/marketing/bw-branded-pages";
import { BwDistributionChannels } from "@/components/marketing/bw-distribution-channels";
import { BwRoiCard } from "@/components/marketing/bw-roi-card";
import { BwTestimonials } from "@/components/marketing/bw-testimonials";
import { BwFaq } from "@/components/marketing/bw-faq";
import { BwDarkCta } from "@/components/marketing/bw-dark-cta";

const BASE_URL = "https://www.behaviorwork.com";

export const metadata: Metadata = {
  title:
    "BehaviorWork | Attract, Intake & Manage ABA Families — One Platform",
  description:
    "The ABA client management platform with built-in tools to attract families, capture their information, and manage your caseload. Set up in 5 minutes.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "BehaviorWork | The Growth Engine for ABA Agencies",
    description:
      "Branded intake pages, client pipeline, communication automation, and hiring tools — one platform for ABA agencies.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BehaviorWork | Fill Your ABA Caseload",
    description:
      "Branded pages, intake forms, CRM, and hiring tools — one platform for ABA agencies.",
  },
};

export default function BehaviorWorkPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF0] text-slate-900">
      <BehaviorWorkTracker mode="lander" />
      <BehaviorWorkHeader />
      {/* Spacer for fixed header */}
      <div className="h-16" />

      <main>
        <BwHero />
        <BwTrustBar />
        <BwHowItWorks />
        <BwProblem />
        <BwLifecycle />
        <BwFeatures />
        <BwBrandedPages />
        <BwDistributionChannels />
        <BwTestimonials />
        <BwRoiCard />
        <BwFaq />
        <BwDarkCta />
      </main>

      <BehaviorWorkFooter />
    </div>
  );
}
