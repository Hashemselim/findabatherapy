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
import {
  GOODABA_ICONS,
  GOODABA_NAME,
  GOODABA_OG_IMAGE,
} from "@/lib/seo/goodaba-metadata";
import { getCurrentUser } from "@/lib/platform/auth/server";

const BASE_URL = "https://www.goodaba.com";

export const metadata: Metadata = {
  title:
    "GoodABA | Attract, Intake & Manage ABA Families - One Platform",
  description:
    "The ABA client management platform with built-in tools to attract families, capture their information, and manage your caseload. Set up in 5 minutes.",
  icons: GOODABA_ICONS,
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "GoodABA | The Growth Engine for ABA Agencies",
    description:
      "Branded intake pages, client pipeline, communication automation, and hiring tools - one platform for ABA agencies.",
    url: BASE_URL,
    type: "website",
    siteName: GOODABA_NAME,
    images: [
      {
        url: GOODABA_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: GOODABA_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoodABA | Fill Your ABA Caseload",
    description:
      "Branded pages, intake forms, CRM, and hiring tools - one platform for ABA agencies.",
    site: "@goodaba",
    creator: "@goodaba",
    images: [GOODABA_OG_IMAGE],
  },
};

export async function GoodabaLandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="goodaba-theme min-h-screen overflow-x-clip bg-[#FFFBF0] text-slate-900">
      <BehaviorWorkTracker mode="lander" />
      <BehaviorWorkHeader isLoggedIn={Boolean(user)} />
      <div className="h-16" aria-hidden="true" />

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

export default GoodabaLandingPage;
