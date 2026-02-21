import type { Metadata } from "next";

import { BehaviorWorkTracker } from "@/components/marketing/behaviorwork-tracker";
import { BehaviorWorkHeader } from "@/components/marketing/behaviorwork-header";
import { BehaviorWorkFooter } from "@/components/marketing/behaviorwork-footer";
import { BwHero } from "@/components/marketing/bw-hero";
import { BwIdentityBanner } from "@/components/marketing/bw-identity-banner";
import { BwTrustBar } from "@/components/marketing/bw-trust-bar";
import { BwProblem } from "@/components/marketing/bw-problem";
import { BwLifecycle } from "@/components/marketing/bw-lifecycle";
import { BwBrandedPages } from "@/components/marketing/bw-branded-pages";
import { BwPillars } from "@/components/marketing/bw-pillars";
import { BwDistributionChannels } from "@/components/marketing/bw-distribution-channels";
import { BwRoiCard } from "@/components/marketing/bw-roi-card";
import { BwTestimonials } from "@/components/marketing/bw-testimonials";
import { BwDarkCta } from "@/components/marketing/bw-dark-cta";

const BASE_URL = "https://www.behaviorwork.com";

export const metadata: Metadata = {
  title:
    "BehaviorWork | Fill Your ABA Caseload & Manage Every Family's Journey",
  description:
    "From first inquiry to active services — one platform that captures leads, automates intake, and keeps families engaged. Built for ABA agencies.",
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
    <div className="min-h-screen bg-white text-slate-900">
      <BehaviorWorkTracker mode="lander" />
      <BehaviorWorkHeader />

      <main>
        <BwHero />
        <BwIdentityBanner />
        <BwTrustBar />
        <BwProblem />
        <BwLifecycle />
        <BwBrandedPages />
        <BwPillars />
        <BwDistributionChannels />
        <BwRoiCard />
        <BwTestimonials />
        <BwDarkCta />
      </main>

      <BehaviorWorkFooter />
    </div>
  );
}
