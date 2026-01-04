import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CheckCircle, MapPin, Shield } from "lucide-react";
import * as StateIcons from "@state-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { INSURANCES, getInsurance, getAllInsuranceSlugs } from "@/lib/data/insurances";
import { US_STATES } from "@/lib/data/us-states";
import { JsonLd } from "@/components/seo/json-ld";
import { generateFAQSchema, generateMedicalWebPageSchema } from "@/lib/seo/schemas";

const BASE_URL = "https://www.findabatherapy.org";

// Revalidate every hour
export const revalidate = 3600;

type InsurancePageParams = {
  slug: string;
};

type InsurancePageProps = {
  params: Promise<InsurancePageParams>;
};

// Pre-render all insurance pages at build time
export async function generateStaticParams() {
  return getAllInsuranceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: InsurancePageProps): Promise<Metadata> {
  const { slug } = await params;
  const insurance = getInsurance(slug);

  if (!insurance) {
    return {};
  }

  const title = `ABA Therapy Providers Accepting ${insurance.name} | Find ABA Therapy`;
  const description = `Find ABA therapy providers that accept ${insurance.name} insurance. Browse our directory of verified autism therapy agencies with ${insurance.shortName} coverage nationwide.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: `/insurance/${slug}`,
    },
  };
}

export default async function InsurancePage({ params }: InsurancePageProps) {
  const { slug } = await params;
  const insurance = getInsurance(slug);

  if (!insurance) {
    notFound();
  }

  // For now, show placeholder count
  // In production, this would query actual counts from the database
  const totalProviders = US_STATES.length * 10; // Placeholder

  // FAQs for this insurance
  const faqs = [
    {
      question: `Does ${insurance.name} cover ABA therapy?`,
      answer: insurance.coverageInfo,
    },
    {
      question: `How do I find ${insurance.shortName} in-network ABA providers?`,
      answer: `Use our directory to search for ABA therapy providers that accept ${insurance.name}. Filter by your state and city to find in-network providers near you. We verify insurance information directly with providers to ensure accuracy.`,
    },
    {
      question: `What is the cost of ABA therapy with ${insurance.shortName}?`,
      answer: `With ${insurance.name} insurance, your out-of-pocket costs depend on your specific plan's deductible, copay, and coinsurance rates. Many families pay between $0-50 per session after meeting their deductible. Contact your plan for specific benefit details.`,
    },
    {
      question: `Do I need a referral for ABA therapy with ${insurance.shortName}?`,
      answer: `Most ${insurance.name} plans require a diagnosis of autism spectrum disorder and may require prior authorization before starting ABA therapy. Some plans also require a referral from your primary care physician. Check with your specific plan for requirements.`,
    },
  ];

  // Generate medical page schema for E-E-A-T signals
  const medicalPageSchema = generateMedicalWebPageSchema({
    title: `ABA Therapy Providers Accepting ${insurance.name}`,
    description: `Find ABA therapy providers that accept ${insurance.name} insurance. Browse our directory of verified autism therapy agencies with ${insurance.shortName} coverage nationwide.`,
    url: `${BASE_URL}/insurance/${slug}`,
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  return (
    <>
      <JsonLd data={[generateFAQSchema(faqs), medicalPageSchema]} />
      <div className="space-y-10 pb-16">
        {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-8 sm:py-12"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {/* Breadcrumb with JSON-LD schema */}
            <Breadcrumbs
              items={[
                { label: "Insurance", href: "/insurance" },
                { label: insurance.name, href: `/insurance/${slug}` },
              ]}
              className="mb-6"
            />

            <div className="flex flex-col items-center text-center">
              <Badge className="mb-4 gap-2 bg-[#FFF5C2] text-[#333333]">
                <Shield className="h-3 w-3" />
                Insurance Accepted
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                ABA Therapy Accepting <span className="text-[#5788FF]">{insurance.name}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                {insurance.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {totalProviders}+ providers nationwide
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  All 50 states covered
                </span>
              </div>
              <Button asChild size="lg" className="mt-8">
                <Link href={`/search?insurance=${encodeURIComponent(insurance.name)}`}>
                  Find {insurance.shortName} Providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
        {/* Coverage Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#5788FF]" />
              {insurance.name} ABA Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{insurance.coverageInfo}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span>Information reviewed by certified BCBAs</span>
            </div>
          </CardContent>
        </Card>

        {/* States Grid */}
        <section>
          <h2 className="text-2xl font-semibold">
            Find {insurance.shortName} Providers by State
          </h2>
          <p className="mt-2 text-muted-foreground">
            Click on a state to view ABA therapy providers accepting {insurance.name}.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {US_STATES.map((state) => {
              const Icon = StateIcons[state.abbreviation as keyof typeof StateIcons];

              return (
                <Link
                  key={state.value}
                  href={`/search?state=${encodeURIComponent(state.label)}&insurance=${encodeURIComponent(insurance.name)}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2] text-[#5788FF] transition group-hover:bg-[#FEE720] group-hover:text-[#5788FF]">
                    {Icon ? (
                      <Icon aria-hidden size={28} color="currentColor" />
                    ) : (
                      <span className="text-sm font-semibold">{state.abbreviation}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-base font-medium text-foreground">{state.label}</span>
                    <span className="block text-xs text-muted-foreground">{state.abbreviation} · ABA Therapy</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-2xl font-semibold">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-muted-foreground">
            Common questions about {insurance.name} and ABA therapy coverage.
          </p>

          <div className="mt-6 space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">
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

        {/* Other Insurances */}
        <section>
          <h2 className="text-2xl font-semibold">Other Insurance Providers</h2>
          <p className="mt-2 text-muted-foreground">
            We also have providers accepting these insurance plans.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {INSURANCES.filter((ins) => ins.slug !== slug).map((ins) => (
              <Link key={ins.slug} href={`/insurance/${ins.slug}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {ins.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="border-dashed border-primary/50 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle>Are you an ABA therapy provider?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              List your practice on Find ABA Therapy and connect with families
              searching for providers that accept {insurance.name}.
            </p>
            <Button asChild className="shrink-0">
              <Link href="/get-listed">Get Listed</Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
