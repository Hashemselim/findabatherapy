import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, CheckCircle, Sparkles, GraduationCap, Users, HelpCircle, BookText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { JsonLd } from "@/components/seo/json-ld";
import { generateBreadcrumbSchema } from "@/lib/seo/schemas";
import { ArticleList } from "@/components/content/article-list";

const BASE_URL = "https://www.findabatherapy.org";

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
    <>
      <JsonLd data={breadcrumbSchema} />

      <div className="space-y-16 pb-16">
        {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-8 sm:py-16"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 sm:gap-8 sm:px-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="transition-colors duration-300 hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Learn</span>
            </nav>

            <div className="space-y-3 text-center sm:space-y-5">
              {/* Trust badge */}
              <div className="hidden justify-center sm:flex">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-[#5788FF]/50 bg-[#5788FF]/10 px-4 py-1.5 text-[#5788FF] transition-all duration-300 ease-premium hover:scale-[1.02] hover:bg-[#5788FF]/15 hover:shadow-[0_2px_8px_rgba(87,136,255,0.2)]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Expert-reviewed resources
                </Badge>
              </div>
              <h1 className="text-[28px] font-semibold leading-[1.2] text-foreground sm:text-[48px]">
                Learn About{" "}
                <span className="bg-gradient-to-r from-[#5788FF] to-[#7BA3FF] bg-clip-text text-transparent">ABA Therapy</span>
              </h1>
              <p className="mx-auto hidden max-w-2xl text-lg text-muted-foreground sm:block">
                Expert guides and resources to help families understand ABA therapy, choose providers,
                navigate insurance, and make informed decisions for their child.
              </p>
            </div>
          </div>
        </BubbleBackground>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border/60 bg-gradient-to-r from-white via-yellow-50/30 to-white py-5 !mt-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm sm:px-6">
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
              <BookOpen className="h-4 w-4 text-[#5788FF]" aria-hidden />
            </div>
            <span className="font-medium text-foreground">Comprehensive guides</span>
          </div>
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
              <GraduationCap className="h-4 w-4 text-[#5788FF]" aria-hidden />
            </div>
            <span className="font-medium text-foreground">Expert-written content</span>
          </div>
          <div className="group flex items-center gap-2.5 transition-all duration-300 ease-premium hover:scale-[1.02]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF5C2] transition-all duration-300 ease-premium group-hover:bg-[#FEE720]/40 group-hover:scale-[1.05]">
              <Users className="h-4 w-4 text-[#333333]" aria-hidden />
            </div>
            <span className="font-medium text-foreground">Family-focused</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-4 !mt-6 sm:!mt-8 sm:px-6">
        {/* Quick Access Cards - Compact rows on mobile, full cards on desktop */}
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <Link
            href="/faq"
            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 transition-all duration-300 hover:border-[#5788FF]/30 hover:shadow-[0_4px_20px_rgba(87,136,255,0.1)] sm:gap-4 sm:rounded-2xl sm:p-5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 group-hover:bg-[#5788FF]/15 sm:h-12 sm:w-12">
              <HelpCircle className="h-4 w-4 text-[#5788FF] sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">FAQ</h3>
              <p className="hidden text-sm text-muted-foreground sm:block">Quick answers to common ABA therapy questions</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#5788FF] sm:h-5 sm:w-5" />
          </Link>
          <Link
            href="/learn/glossary"
            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 transition-all duration-300 hover:border-[#5788FF]/30 hover:shadow-[0_4px_20px_rgba(87,136,255,0.1)] sm:gap-4 sm:rounded-2xl sm:p-5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2] transition-all duration-300 group-hover:bg-[#FEE720]/40 sm:h-12 sm:w-12">
              <BookText className="h-4 w-4 text-[#333333] sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Glossary</h3>
              <p className="hidden text-sm text-muted-foreground sm:block">Definitions of key ABA terms and concepts</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#5788FF] sm:h-5 sm:w-5" />
          </Link>
        </div>

        {/* Article List with Filters */}
        <ArticleList />

        {/* CTA */}
        <section className="group relative overflow-hidden rounded-3xl border border-[#5788FF]/20 bg-gradient-to-br from-[#5788FF]/[0.03] via-white to-[#5788FF]/[0.06] p-8 transition-all duration-500 ease-premium hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.12)]">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#5788FF]/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[#FEE720]/20 transition-transform duration-700 ease-premium group-hover:scale-150" />

          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-[#5788FF]/15">
              <Sparkles className="h-7 w-7 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Ready to find an ABA provider?</h2>
              <p className="text-muted-foreground">
                Search our directory of verified ABA therapy providers across all 50 states.
              </p>
            </div>
            <Button
              asChild
              className="group/btn shrink-0 rounded-full border border-[#FEE720] bg-[#FEE720] px-8 py-5 text-base font-semibold text-[#333333] shadow-[0_4px_14px_rgba(254,231,32,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-[#FFF5C2] hover:shadow-[0_8px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)]"
            >
              <Link href="/search">
                Search Providers
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </section>
        </div>
      </div>
    </>
  );
}
