import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, FileText, HelpCircle, MapPin, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { generateFAQSchema, generateMedicalWebPageSchema } from "@/lib/seo/schemas";
import { type StateValue, US_STATES } from "@/lib/data/us-states";
import { INSURANCES } from "@/lib/data/insurances";

const BASE_URL = "https://www.findabatherapy.org";

const stateLookup = new Map(US_STATES.map((state) => [state.value, state]));

// Revalidate every hour
export const revalidate = 3600;

type StateGuidePageParams = {
  state: string;
};

type StateGuidePageProps = {
  params: Promise<StateGuidePageParams>;
};

// Pre-render guide pages for all states
export async function generateStaticParams() {
  return US_STATES.map((state) => ({ state: state.value }));
}

// State-specific information (can be expanded with real data)
function getStateInfo(stateAbbrev: string, stateName: string) {
  // This could be expanded with a database of state-specific laws and programs
  const hasAutismMandate = true; // All 50 states have autism insurance mandates now

  return {
    hasAutismMandate,
    mandateYear: getMandateYear(stateAbbrev),
    medicaidProgram: getMedicaidProgram(stateAbbrev, stateName),
    earlyInterventionAge: "0-3 years",
    specialEducationAge: "3-21 years",
    bcbaLicensure: getBcbaLicensure(stateAbbrev),
  };
}

// Approximate mandate years (simplified)
function getMandateYear(stateAbbrev: string): string {
  const earlyStates: Record<string, string> = {
    IN: "2001", SC: "2007", TX: "2007", AZ: "2008", FL: "2008",
    LA: "2008", PA: "2008", IL: "2008", NJ: "2009", NV: "2009",
    CO: "2009", MT: "2009", NM: "2009", WI: "2009", CT: "2009",
  };
  return earlyStates[stateAbbrev] || "2010-2017";
}

// Medicaid waiver programs
function getMedicaidProgram(stateAbbrev: string, stateName: string): string {
  return `${stateName} Medicaid covers ABA therapy for eligible children with autism under the Early and Periodic Screening, Diagnostic and Treatment (EPSDT) benefit. Many states also have Home and Community-Based Services (HCBS) waivers that cover autism services for individuals who meet specific criteria.`;
}

// BCBA licensure status
function getBcbaLicensure(stateAbbrev: string): { required: boolean; note: string } {
  // Most states now require BCBA licensure
  const noLicensure = ["AL", "AK", "HI", "SD", "WY"];
  if (noLicensure.includes(stateAbbrev)) {
    return { required: false, note: "BCBA certification is recognized but state licensure is not required" };
  }
  return { required: true, note: "BCBAs must hold state licensure in addition to BACB certification" };
}

export async function generateMetadata({ params }: StateGuidePageProps): Promise<Metadata> {
  const { state: stateValue } = await params;
  const state = stateLookup.get(stateValue as StateValue);

  if (!state) return {};

  const title = `ABA Therapy in ${state.label}: Complete Guide | Find ABA Therapy`;
  const description = `Comprehensive guide to ABA therapy in ${state.label}. Learn about ${state.abbreviation} autism insurance laws, Medicaid coverage, provider requirements, and how to find services.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${stateValue}/guide`,
      type: "article",
    },
    alternates: {
      canonical: `/${stateValue}/guide`,
    },
  };
}

export default async function StateGuidePage({ params }: StateGuidePageProps) {
  const { state: stateValue } = await params;
  const state = stateLookup.get(stateValue as StateValue);

  if (!state) {
    notFound();
  }

  const stateInfo = getStateInfo(state.abbreviation, state.label);
  const topInsurances = INSURANCES.slice(0, 8);

  // Generate FAQs for this state
  const faqs = [
    {
      question: `Does insurance cover ABA therapy in ${state.label}?`,
      answer: `Yes, ${state.label} has an autism insurance mandate that requires most private health insurance plans to cover ABA therapy for individuals with autism spectrum disorder. Coverage requirements vary by plan type. ${state.label} Medicaid also covers ABA therapy under EPSDT for eligible children.`,
    },
    {
      question: `How do I find ABA therapy providers in ${state.label}?`,
      answer: `Use our directory to search for ABA therapy providers in ${state.label}. You can filter by city, insurance accepted, and service type (in-home, center-based, telehealth). We have providers listed across ${state.label} to help you find care close to home.`,
    },
    {
      question: `What are the requirements for ABA therapists in ${state.label}?`,
      answer: stateInfo.bcbaLicensure.required
        ? `${state.label} requires BCBAs to hold state licensure in addition to national certification through the BACB. Registered Behavior Technicians (RBTs) must work under BCBA supervision. Always verify your provider's credentials.`
        : `${state.label} recognizes BACB certification for BCBAs. While state licensure may not be required, verify that your provider holds current BCBA or BCaBA certification.`,
    },
    {
      question: `Does ${state.label} Medicaid cover ABA therapy?`,
      answer: `Yes, ${state.label} Medicaid covers ABA therapy for children with autism under the EPSDT benefit. Some individuals may also qualify for Home and Community-Based Services (HCBS) waiver programs. Contact your local Medicaid office for eligibility information.`,
    },
    {
      question: `What is the waiting list for ABA therapy in ${state.label}?`,
      answer: `Wait times for ABA therapy in ${state.label} vary by location and provider. High-demand areas may have waits of 3-12 months. We recommend contacting multiple providers and getting on several waitlists. Some areas of ${state.label} have more immediate availability.`,
    },
  ];

  const faqSchema = generateFAQSchema(faqs);
  const medicalPageSchema = generateMedicalWebPageSchema({
    title: `ABA Therapy in ${state.label}: Complete State Guide`,
    description: `Comprehensive guide to ABA therapy services, insurance coverage, and provider requirements in ${state.label}.`,
    url: `${BASE_URL}/${stateValue}/guide`,
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <JsonLd data={[faqSchema, medicalPageSchema]} />

      <div className="space-y-10 pb-16">
        {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-blue-50/50 py-8 sm:py-12"
          colors={{
            first: "255,255,255",
            second: "200,255,220",
            third: "135,176,255",
            fourth: "220,255,230",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Breadcrumbs
              items={[
                { label: state.label, href: `/${stateValue}` },
                { label: "Guide", href: `/${stateValue}/guide` },
              ]}
              className="mb-6"
            />

            <div className="flex flex-col items-center text-center">
              <Badge className="mb-4 gap-2 bg-emerald-100 text-emerald-800">
                <BookOpen className="h-3 w-3" />
                State Guide
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                ABA Therapy in{" "}
                <span className="text-emerald-600">{state.label}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Your complete guide to understanding ABA therapy services,
                insurance coverage, provider requirements, and resources in{" "}
                {state.label}.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Autism mandate since {stateInfo.mandateYear}
                </span>
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Medicaid coverage available
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6">
        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Button asChild size="lg" className="h-auto py-4">
            <Link href={`/${stateValue}`} className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Find Providers</div>
                <div className="text-xs opacity-80">
                  Browse {state.label} ABA agencies
                </div>
              </div>
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-auto py-4">
            <Link href="/learn" className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Learn About ABA</div>
                <div className="text-xs opacity-80">Read our guides</div>
              </div>
            </Link>
          </Button>
        </div>

        {/* Insurance Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Insurance Coverage in {state.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Private Insurance</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.label} enacted autism insurance legislation in{" "}
                {stateInfo.mandateYear}. Most private health insurance plans are
                required to cover ABA therapy as a treatment for autism spectrum
                disorder. Coverage details, including age limits and hour caps,
                vary by plan.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Medicaid</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {stateInfo.medicaidProgram}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                Insurance Carriers in {state.label}
              </h3>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                Find providers that accept your insurance:
              </p>
              <div className="flex flex-wrap gap-2">
                {topInsurances.map((insurance) => (
                  <Link key={insurance.slug} href={`/insurance/${insurance.slug}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      {insurance.shortName}
                    </Badge>
                  </Link>
                ))}
                <Link href="/insurance">
                  <Badge
                    variant="outline"
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    View all...
                  </Badge>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Provider Requirements in {state.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">BCBA Licensure</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {stateInfo.bcbaLicensure.note}. When choosing an ABA provider in{" "}
                {state.label}, verify that BCBAs hold current certification from
                the Behavior Analyst Certification Board (BACB).
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Supervision Requirements</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registered Behavior Technicians (RBTs) must work under the
                supervision of a certified BCBA. Industry standards recommend at
                least 10-15% BCBA supervision of direct therapy hours. Quality
                programs often exceed this minimum.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Verify Credentials</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You can verify BCBA and RBT credentials on the{" "}
                <a
                  href="https://www.bacb.com/find-a-certificant/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  BACB certificant registry
                </a>
                . This free tool confirms current certification status.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Early Intervention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Early Intervention in {state.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Birth to 3 Years</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.label}&apos;s Early Intervention program provides services to
                infants and toddlers with developmental delays or disabilities.
                Services are provided at no cost to families and may include
                developmental therapies. Contact your local Early Intervention
                office for evaluation.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Ages 3-21 (School-Based)</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Children ages 3-21 may receive special education services
                through the public school system under IDEA. An Individualized
                Education Program (IEP) can include autism-related services.
                School-based services supplement but typically don&apos;t replace
                private ABA therapy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
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

        {/* Resources */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Additional Resources
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/learn/what-is-aba-therapy">
              <Card className="h-full transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">What is ABA Therapy?</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete guide for families
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/learn/insurance-coverage-aba">
              <Card className="h-full transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Insurance Coverage Guide</h3>
                    <p className="text-sm text-muted-foreground">
                      Navigate insurance for ABA
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/learn/how-to-choose-aba-provider">
              <Card className="h-full transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Choosing a Provider</h3>
                    <p className="text-sm text-muted-foreground">
                      10 essential questions to ask
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/faq">
              <Card className="h-full transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <HelpCircle className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-medium">ABA Therapy FAQ</h3>
                    <p className="text-sm text-muted-foreground">
                      Common questions answered
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <Card className="border-dashed border-primary/50 bg-primary/[0.04]">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                Ready to find ABA therapy in {state.label}?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Search our directory of verified providers across {state.label}.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href={`/${stateValue}`}>
                Find Providers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
