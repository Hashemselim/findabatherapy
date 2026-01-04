import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle, MapPin, HelpCircle } from "lucide-react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { SearchResults } from "@/components/search/search-results";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { type StateValue, US_STATES } from "@/lib/data/us-states";
import { getCitiesForState, STATE_SLUG_TO_ABBREV, STATE_NAMES } from "@/lib/data/cities";
import { INSURANCES } from "@/lib/data/insurances";
import { searchProviderLocationsWithGooglePlaces } from "@/lib/actions/search";
import { trackSearchImpressions } from "@/lib/analytics/track";
import {
  generateItemListSchema,
  generateFAQSchema,
  generateMedicalWebPageSchema,
} from "@/lib/seo/schemas";
import { generateStateFAQs } from "@/lib/seo/state-faqs";

const stateLookup = new Map(US_STATES.map((state) => [state.value, state]));

// Revalidate every hour (ISR) - pages are rendered on-demand and cached
export const revalidate = 3600;

type StatePageParams = {
  state: StateValue;
};

type StatePageProps = {
  params: Promise<StatePageParams>;
};

const BASE_URL = "https://www.findabatherapy.org";

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state: stateValue } = await params;
  const state = stateLookup.get(stateValue);

  if (!state) {
    return {};
  }

  const title = `ABA Therapy in ${state.label}`;
  const description = `Find ABA therapy providers in ${state.label}. Browse verified autism therapy agencies offering in-home, center-based, and telehealth ABA services. Filter by insurance, city, and specialties.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Find ABA Therapy`,
      description,
      url: `${BASE_URL}/${stateValue}`,
      images: [
        {
          url: `${BASE_URL}/api/og?location=${encodeURIComponent(state.label)}&subtitle=${encodeURIComponent("Find verified ABA therapy providers")}`,
          width: 1200,
          height: 630,
          alt: `ABA Therapy in ${state.label}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Find ABA Therapy`,
      description,
      images: [
        `${BASE_URL}/api/og?location=${encodeURIComponent(state.label)}&subtitle=${encodeURIComponent("Find verified ABA therapy providers")}`,
      ],
    },
    alternates: {
      canonical: `/${stateValue}`,
    },
  };
}

export default async function StatePage({ params }: StatePageProps) {
  const { state: stateValue } = await params;
  const state = stateLookup.get(stateValue);

  if (!state) {
    notFound();
  }

  // Fetch providers for this state (includes both real listings and Google Places)
  // Note: State pages don't have user coordinates, so all results go into "other" section
  const result = await searchProviderLocationsWithGooglePlaces(
    { state: state.label },
    { limit: 50 }  // Match default limit
  );
  const locations = result.success ? result.data.results : [];
  const total = result.success ? result.data.total : 0;
  const radiusMiles = result.success ? result.data.radiusMiles : 25;

  // Track search impressions for real listings only (non-blocking)
  const realListingsForTracking = locations
    .filter((loc) => !loc.isPrePopulated)
    .map((r, index) => {
      // Type assertion for real listings which have listingId
      const loc = r as { listingId: string };
      return {
        id: loc.listingId,
        position: index + 1,
      };
    });
  if (realListingsForTracking.length > 0) {
    trackSearchImpressions(realListingsForTracking, state.label).catch(() => {
      // Silently fail - don't block page render
    });
  }

  // Get state abbreviation for city lookup
  const stateAbbrev = STATE_SLUG_TO_ABBREV[stateValue] ||
    Object.entries(STATE_NAMES).find(([, name]) =>
      name.toLowerCase().replace(/\s+/g, "-") === stateValue
    )?.[0];

  // Get cities for this state
  const cities = stateAbbrev ? getCitiesForState(stateAbbrev) : [];

  // Top insurances for quick filters
  const topInsurances = INSURANCES.slice(0, 6);

  // Generate FAQs for this state
  const faqs = generateStateFAQs(state.label, state.abbreviation, total, cities.length);

  // Generate schemas for SEO
  const listSchema = generateItemListSchema(
    locations.map((loc, index) => ({
      name: loc.isPrePopulated ? loc.name : loc.agencyName,
      slug: loc.slug,
      position: index + 1,
    })),
    `ABA Therapy Providers in ${state.label}`
  );

  const faqSchema = generateFAQSchema(faqs);

  const medicalPageSchema = generateMedicalWebPageSchema({
    title: `ABA Therapy in ${state.label}`,
    description: `Find ABA therapy providers in ${state.label}. Browse verified autism therapy agencies offering in-home, center-based, and telehealth ABA services.`,
    url: `${BASE_URL}/${stateValue}`,
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  // Format last updated date for display
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
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
            {/* Breadcrumb with JSON-LD schema */}
            <Breadcrumbs
              items={[{ label: state.label, href: `/${stateValue}` }]}
              className="mb-6"
            />

            <div className="flex flex-col items-center text-center">
              <Badge className="mb-4 gap-2 bg-[#FFF5C2] text-[#333333] uppercase">
                {state.abbreviation}
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                ABA Therapy in <span className="text-[#5788FF]">{state.label}</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Find ABA therapy providers in {state.label}. Compare agencies offering in-home,
                center-based, and telehealth autism therapy services.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {total} {total === 1 ? "provider" : "providers"} found
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {cities.length} cities covered
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href={`/search?state=${encodeURIComponent(state.label)}`}>
                  Search {state.label} Providers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </BubbleBackground>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
        {/* Search Card for Other Cities */}
        <section>
          <h2 className="text-2xl font-semibold">Search Another City</h2>
          <p className="mt-2 text-muted-foreground">
            Looking for a specific city in {state.label}? Enter it below.
          </p>
          <div className="mt-4">
            <HomeSearchCard
              defaultLocation={`${state.label}`}
            />
          </div>
        </section>

        {/* Cities Section */}
        {cities.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">
              Browse Cities in {state.label}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Click on a city to view ABA therapy providers in that area.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${stateValue}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF5C2] text-[#5788FF] transition group-hover:bg-[#FEE720] group-hover:text-[#5788FF]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{city.name}</span>
                    <span className="block text-xs text-muted-foreground">{state.abbreviation}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Insurance Quick Filters */}
        <section>
          <h2 className="text-2xl font-semibold">Filter by Insurance</h2>
          <p className="mt-2 text-muted-foreground">
            Find providers in {state.label} that accept your insurance.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topInsurances.map((insurance) => (
              <Link
                key={insurance.slug}
                href={`/search?state=${encodeURIComponent(state.label)}&insurance=${encodeURIComponent(insurance.name)}`}
              >
                <Badge
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {insurance.shortName}
                </Badge>
              </Link>
            ))}
          </div>
        </section>

        {/* Results */}
        <div className="space-y-8">
          {locations.length > 0 ? (
            <>
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold">Providers in {state.label}</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {locations.length} of {total} providers. Premium listings appear first.
                </p>
              </div>

              <SearchResults results={locations} radiusMiles={radiusMiles} hasProximitySearch={false} />

              {total > locations.length && (
                <div className="flex justify-center pt-4">
                  <Button asChild variant="outline" size="lg">
                    <Link href={`/search?state=${encodeURIComponent(state.label)}`}>
                      View all {total} providers
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg font-medium text-foreground">No providers yet in {state.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Be the first ABA therapy provider to list your services here.
              </p>
              <Button asChild className="mt-6">
                <Link href="/get-listed">Get Listed</Link>
              </Button>
            </div>
          )}

          {/* About ABA in State - Unique Content Section */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">
              About ABA Therapy in {state.label}
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              <p>
                Applied Behavior Analysis (ABA) therapy is the gold standard treatment for autism
                spectrum disorder, backed by decades of research and clinical evidence. {state.label} families
                have access to numerous ABA therapy providers offering comprehensive services tailored
                to each child&apos;s unique developmental needs.
              </p>
              <p>
                {state.label} has autism insurance mandates that require most private health insurance
                plans to cover ABA therapy as a medically necessary treatment. This includes coverage
                from major carriers such as Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna,
                and Anthem. {state.label} Medicaid also provides ABA therapy coverage for eligible children.
              </p>
              <p>
                When selecting an ABA provider in {state.label}, consider factors like the provider&apos;s
                experience with your child&apos;s age group and specific needs, their staff credentials
                (BCBA and RBT certifications), service delivery options (in-home, center-based, or
                telehealth), and insurance acceptance.
              </p>
            </div>
          </section>

          {/* FAQs Section */}
          <section>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                Frequently Asked Questions
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Common questions about ABA therapy in {state.label}.
            </p>

            <div className="mt-6 space-y-4">
              {faqs.slice(0, 4).map((faq, index) => (
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

          {/* Related Resources */}
          <section className="rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="text-lg font-semibold">Learn More About ABA Therapy</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Resources to help you understand ABA therapy and make informed decisions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/${stateValue}/guide`}>
                <Badge variant="secondary" className="cursor-pointer bg-[#FFF5C2] text-[#333333] hover:bg-[#FEE720]">
                  {state.label} ABA Guide
                </Badge>
              </Link>
              <Link href="/learn/what-is-aba-therapy">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  What is ABA Therapy?
                </Badge>
              </Link>
              <Link href="/learn/how-to-choose-aba-provider">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  How to Choose a Provider
                </Badge>
              </Link>
              <Link href="/learn/aba-therapy-cost">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  ABA Therapy Cost Guide
                </Badge>
              </Link>
              <Link href="/learn/insurance-coverage-aba">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  Insurance Coverage
                </Badge>
              </Link>
            </div>
          </section>

          {/* CTA Card */}
          <Card className="border border-[#5788FF]/30 bg-gradient-to-br from-[#5788FF]/5 to-[#5788FF]/10">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <div className="flex-1 space-y-1">
                <p className="text-lg font-semibold text-foreground">Are you an ABA provider in {state.label}?</p>
                <p className="text-sm text-muted-foreground">
                  List your practice and connect with families searching for ABA services.
                </p>
              </div>
              <Button asChild className="shrink-0 rounded-full border border-[#5788FF] bg-[#5788FF] px-6 text-white hover:bg-[#5A84E6]">
                <Link href="/get-listed">Get Listed Free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
