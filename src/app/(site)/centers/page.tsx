import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle, MapPin, Users } from "lucide-react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { US_STATES } from "@/lib/data/us-states";
import { searchProviderLocationsWithGooglePlaces } from "@/lib/actions/search";
import {
  generateItemListSchema,
  generateFAQSchema,
  generateMedicalWebPageSchema,
} from "@/lib/seo/schemas";

const BASE_URL = "https://www.findabatherapy.org";

// Revalidate every hour (ISR)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ABA Therapy Centers Near You | Find ABA Therapy",
  description:
    "Find ABA therapy centers and clinic-based autism treatment facilities near you. Browse center-based ABA providers offering structured environments, peer interaction, and specialized equipment.",
  openGraph: {
    title: "ABA Therapy Centers Near You | Find ABA Therapy",
    description:
      "Find ABA therapy centers and clinic-based autism treatment facilities. Browse center-based providers offering structured environments and peer interaction opportunities.",
    url: `${BASE_URL}/centers`,
    images: [
      {
        url: `${BASE_URL}/api/og?location=${encodeURIComponent("ABA Therapy Centers")}&subtitle=${encodeURIComponent("Find center-based ABA providers")}`,
        width: 1200,
        height: 630,
        alt: "ABA Therapy Centers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABA Therapy Centers Near You | Find ABA Therapy",
    description:
      "Find ABA therapy centers and clinic-based autism treatment facilities near you.",
    images: [
      `${BASE_URL}/api/og?location=${encodeURIComponent("ABA Therapy Centers")}&subtitle=${encodeURIComponent("Find center-based ABA providers")}`,
    ],
  },
  alternates: {
    canonical: "/centers",
  },
};

// FAQs for the centers page
const centersFAQs = [
  {
    question: "What is a center-based ABA therapy program?",
    answer:
      "A center-based ABA therapy program provides treatment at a dedicated clinic or facility rather than in the home. These centers offer structured environments with specialized equipment, trained staff, and opportunities for children to interact with peers. Sessions typically occur on a regular schedule at the center location.",
  },
  {
    question: "What are the benefits of center-based ABA therapy?",
    answer:
      "Center-based ABA offers several benefits: a structured learning environment designed for therapy, specialized equipment and materials, opportunities for socialization with peers, consistent routine separate from home, easier transition to school settings, and the ability to practice skills in a controlled setting before generalizing to other environments.",
  },
  {
    question: "How is center-based ABA different from in-home ABA?",
    answer:
      "Center-based ABA takes place at a clinic with other children present, offering peer interaction and a structured environment. In-home ABA occurs in the child's natural environment, making it easier to work on daily living skills and family routines. Many families choose a combination of both settings depending on their child's goals and needs.",
  },
  {
    question: "What should I look for when choosing an ABA center?",
    answer:
      "When evaluating ABA centers, consider: BCBA supervision ratios, staff training and turnover, cleanliness and safety of the facility, age-appropriate equipment and materials, how they handle transitions and challenging behaviors, parent involvement opportunities, and whether their philosophy aligns with your values regarding neurodiversity and child wellbeing.",
  },
  {
    question: "How many hours per week is typical for center-based ABA?",
    answer:
      "Center-based ABA programs typically range from 10 to 40 hours per week, depending on the child's needs and recommendations from their BCBA. Many centers offer full-day programs (6-8 hours) or half-day options. The appropriate intensity is determined through assessment and should be discussed with your treatment team.",
  },
];

export default async function CentersPage() {
  // Fetch center-based providers (we'll show general results and let users filter)
  const result = await searchProviderLocationsWithGooglePlaces(
    {},
    { limit: 20 }
  );
  const locations = result.success ? result.data.results : [];

  // Generate schemas for SEO
  const listSchema = generateItemListSchema(
    locations.slice(0, 10).map((loc, index) => ({
      name: loc.isPrePopulated ? loc.name : loc.agencyName,
      slug: loc.slug,
      position: index + 1,
    })),
    "ABA Therapy Centers"
  );

  const faqSchema = generateFAQSchema(centersFAQs);

  const medicalPageSchema = generateMedicalWebPageSchema({
    title: "ABA Therapy Centers Near You",
    description:
      "Find ABA therapy centers and clinic-based autism treatment facilities. Browse center-based providers offering structured environments and peer interaction.",
    url: `${BASE_URL}/centers`,
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  return (
    <>
      {/* JSON-LD Schemas */}
      <JsonLd data={[listSchema, faqSchema, medicalPageSchema]} />

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
              {/* Breadcrumb */}
              <Breadcrumbs
                items={[{ label: "ABA Centers", href: "/centers" }]}
                className="mb-6"
              />

              <div className="flex flex-col items-center text-center">
                <Badge className="mb-4 gap-2 bg-[#FFF5C2] text-[#333333] uppercase">
                  <Building2 className="h-3 w-3" />
                  Center-Based
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  ABA Therapy <span className="text-[#5788FF]">Centers</span>
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                  Find center-based ABA therapy programs near you. Browse clinics offering
                  structured environments, peer interaction, and specialized autism treatment.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Verified providers
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Peer interaction opportunities
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Nationwide coverage
                  </span>
                </div>
              </div>
            </div>
          </BubbleBackground>
        </section>

        <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
          {/* Search Card */}
          <section>
            <h2 className="text-2xl font-semibold">Find ABA Centers Near You</h2>
            <p className="mt-2 text-muted-foreground">
              Enter your location to find center-based ABA therapy providers in your area.
            </p>
            <div className="mt-4">
              <HomeSearchCard />
            </div>
          </section>

          {/* What is Center-Based ABA */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  What is Center-Based ABA Therapy?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Center-based ABA therapy takes place at a dedicated clinic or facility designed
                  specifically for autism treatment. Unlike in-home therapy, center-based programs
                  provide a structured learning environment with specialized equipment, trained
                  staff, and opportunities for peer interaction.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium text-foreground">Benefits of ABA Centers</h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Structured, distraction-free environment</li>
                      <li>• Specialized therapy equipment</li>
                      <li>• Peer socialization opportunities</li>
                      <li>• Easier transition to school settings</li>
                      <li>• Consistent daily routine</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium text-foreground">What to Expect</h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Individual and group therapy sessions</li>
                      <li>• BCBA-supervised treatment plans</li>
                      <li>• Regular parent training and updates</li>
                      <li>• Social skills groups</li>
                      <li>• Structured daily schedules</li>
                    </ul>
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/learn/in-home-vs-center-based-aba">
                    Learn More: In-Home vs Center-Based ABA
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Browse by State */}
          <section>
            <h2 className="text-2xl font-semibold">Browse ABA Centers by State</h2>
            <p className="mt-2 text-muted-foreground">
              Select your state to find ABA therapy centers in your area.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {US_STATES.map((state) => (
                <Link
                  key={state.value}
                  href={`/${state.value}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  <MapPin className="h-4 w-4 text-primary opacity-60 transition group-hover:opacity-100" />
                  <span>{state.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQs Section */}
          <section>
            <h2 className="text-2xl font-semibold">
              Frequently Asked Questions About ABA Centers
            </h2>
            <p className="mt-2 text-muted-foreground">
              Common questions about center-based ABA therapy programs.
            </p>
            <div className="mt-6 space-y-4">
              {centersFAQs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start gap-2 text-base">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        Q
                      </span>
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pl-11 text-sm text-muted-foreground">
                    {faq.answer}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center">
            <h2 className="text-2xl font-semibold">List Your ABA Center</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Are you an ABA provider offering center-based services? Get your clinic listed
              in our directory to connect with families searching for autism therapy services.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/get-listed">
                Get Listed Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
