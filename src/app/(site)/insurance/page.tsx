import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowRight, CheckCircle, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { InsuranceSearchInput } from "@/components/insurance/insurance-search-input";
import { generateFAQSchema } from "@/lib/seo/schemas";
import { INSURANCES } from "@/lib/data/insurances";

const BASE_URL = "https://www.findabatherapy.com";

export const metadata: Metadata = {
  title: "ABA Therapy by Insurance | Find ABA Therapy",
  description:
    "Find ABA therapy providers by insurance coverage. Browse providers accepting Medicaid, Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna, Tricare, and more major insurance carriers.",
  alternates: {
    canonical: "/insurance",
  },
  openGraph: {
    title: "Find ABA Therapy Providers by Insurance | Find ABA Therapy",
    description:
      "Search for ABA therapy providers that accept your insurance. Compare coverage options and find in-network autism therapy services.",
    url: `${BASE_URL}/insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ABA Therapy by Insurance | Find ABA Therapy",
    description:
      "Find ABA therapy providers that accept your insurance. Compare Medicaid, BCBS, Aetna, UHC, Cigna, and more.",
  },
};

// FAQs for the insurance hub page
const insuranceFaqs = [
  {
    question: "Does insurance cover ABA therapy?",
    answer:
      "Yes, most health insurance plans cover ABA therapy due to autism insurance mandates in all 50 states. Coverage varies by plan, so it's important to verify your specific benefits with your insurance provider and the ABA therapy agency.",
  },
  {
    question: "How do I find ABA providers that accept my insurance?",
    answer:
      "Use our directory to search by insurance type. Select your insurance carrier from the list, and you'll see ABA therapy providers that accept that insurance. You can also filter by location to find in-network providers near you.",
  },
  {
    question: "What if my insurance doesn't cover ABA therapy?",
    answer:
      "If your insurance doesn't cover ABA therapy, you may have options including appealing the decision, seeking state Medicaid coverage, using out-of-pocket payment plans, or exploring grants and scholarships for autism services. Many providers offer sliding scale fees or payment plans.",
  },
  {
    question: "Do I need prior authorization for ABA therapy?",
    answer:
      "Most insurance plans require prior authorization before starting ABA therapy. This typically involves a diagnostic evaluation, treatment plan review, and approval from your insurance company. Your ABA provider usually handles the authorization process.",
  },
];

// CollectionPage schema for SEO
function generateCollectionPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ABA Therapy by Insurance",
    description:
      "Browse ABA therapy providers by insurance coverage. Find providers accepting Medicaid, BCBS, Aetna, UHC, Cigna, and more.",
    url: `${BASE_URL}/insurance`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: INSURANCES.length,
      itemListElement: INSURANCES.map((insurance, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: `ABA Therapy Providers Accepting ${insurance.name}`,
          url: `${BASE_URL}/insurance/${insurance.slug}`,
        },
      })),
    },
  };
}

export default function InsurancePage() {
  const collectionSchema = generateCollectionPageSchema();
  const faqSchema = generateFAQSchema(insuranceFaqs);

  return (
    <div className="container px-4 py-12 sm:px-6">
      {/* Structured Data */}
      <JsonLd data={[collectionSchema, faqSchema]} />

      {/* Breadcrumb */}
      <Breadcrumbs
        items={[{ label: "Insurance", href: "/insurance" }]}
        className="mb-6"
      />

      {/* Header */}
      <div className="space-y-4 border-b border-border pb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
            <Shield className="h-6 w-6 text-violet-600" />
          </div>
          <Badge variant="secondary" className="uppercase">
            Insurance Coverage
          </Badge>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Find ABA Therapy by{" "}
          <span className="text-violet-600">Insurance</span>
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Browse ABA therapy providers by the insurance they accept. Find
          in-network providers for your coverage and verify benefits before
          starting treatment.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span>{INSURANCES.length} major insurance carriers covered</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold">Search for Your Insurance</h2>
        <p className="mt-2 text-muted-foreground">
          Type your insurance name to quickly find it.
        </p>
        <div className="mt-4 max-w-md">
          <InsuranceSearchInput />
        </div>
      </div>

      {/* Insurance Cards Grid */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold">Or Browse All Insurances</h2>
        <p className="mt-2 text-muted-foreground">
          Click on your insurance provider to find ABA therapy agencies that
          accept your coverage.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSURANCES.map((insurance) => (
            <Link key={insurance.slug} href={`/insurance/${insurance.slug}`}>
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                      <Shield className="h-5 w-5 text-violet-600" />
                    </div>
                    <CardTitle className="text-lg">{insurance.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {insurance.description}
                  </CardDescription>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-600">
                    View providers
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* FAQs Section */}
      <section className="mt-16">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            Insurance Coverage FAQs
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Common questions about insurance coverage for ABA therapy.
        </p>

        <div className="mt-6 space-y-4">
          {insuranceFaqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Learn More Section */}
      <section className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">
          Learn More About ABA Insurance Coverage
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Resources to help you navigate insurance coverage for ABA therapy.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/learn/insurance-coverage-aba">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
            >
              Insurance Coverage Guide
            </Badge>
          </Link>
          <Link href="/learn/aba-therapy-cost">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
            >
              ABA Therapy Cost Guide
            </Badge>
          </Link>
          <Link href="/learn/how-to-choose-aba-provider">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
            >
              How to Choose a Provider
            </Badge>
          </Link>
        </div>
      </section>

      {/* CTA Card */}
      <Card className="mt-12 border-dashed border-primary/50 bg-primary/[0.04]">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1 space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Are you an ABA therapy provider?
            </p>
            <p className="text-sm text-muted-foreground">
              List your practice and let families know which insurances you
              accept.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/get-listed">Get Listed Free</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
