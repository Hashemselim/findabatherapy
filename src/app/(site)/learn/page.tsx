import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { JsonLd } from "@/components/seo/json-ld";
import { generateBreadcrumbSchema } from "@/lib/seo/schemas";
import { ArticleList } from "@/components/content/article-list";

const BASE_URL = "https://www.findabatherapy.com";

export const metadata: Metadata = {
  title: "Learn About ABA Therapy | Guides & Resources",
  description: "Expert guides and resources about Applied Behavior Analysis (ABA) therapy. Learn how to choose a provider, understand insurance coverage, and navigate the ABA therapy process.",
  openGraph: {
    title: "Learn About ABA Therapy | Find ABA Therapy",
    description: "Expert guides and resources about Applied Behavior Analysis (ABA) therapy for families.",
    url: `${BASE_URL}/learn`,
    images: [
      {
        url: `${BASE_URL}/api/og?title=${encodeURIComponent("ABA Therapy Resources")}&subtitle=${encodeURIComponent("Guides and resources for families")}`,
        width: 1200,
        height: 630,
        alt: "Learn About ABA Therapy",
      },
    ],
  },
  alternates: {
    canonical: "/learn",
  },
};

export default function LearnPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Learn", url: "/learn" },
  ]);

  return (
    <div className="space-y-10 pb-16">
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-purple-50/50 to-blue-50/50 py-8 sm:py-12"
          colors={{
            first: "255,255,255",
            second: "233,213,255",
            third: "191,219,254",
            fourth: "243,232,255",
            fifth: "219,234,254",
            sixth: "245,243,255",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Learn</span>
            </nav>

            <div className="flex flex-col items-center text-center">
              <Badge className="mb-4 gap-2 bg-purple-100 text-purple-800">
                <BookOpen className="h-3 w-3" />
                Resources
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Learn About <span className="text-[#5788FF]">ABA Therapy</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Expert guides and resources to help families understand ABA therapy, choose providers,
                navigate insurance, and make informed decisions for their child.
              </p>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 sm:px-6">
        {/* Article List with Filters */}
        <ArticleList />

        {/* CTA */}
        <section className="rounded-xl border border-border bg-gradient-to-br from-purple-50 to-blue-50 p-8 text-center">
          <h2 className="text-xl font-semibold">Ready to find an ABA provider?</h2>
          <p className="mt-2 text-muted-foreground">
            Search our directory of verified ABA therapy providers across all 50 states.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search Providers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
