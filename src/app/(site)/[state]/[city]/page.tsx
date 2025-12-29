import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Filter, MapPin, HelpCircle } from "lucide-react";

import { SearchResults } from "@/components/search/search-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCitiesForState,
  getCity,
  STATE_SLUG_TO_ABBREV,
  STATE_NAMES,
} from "@/lib/data/cities";
import { INSURANCES } from "@/lib/data/insurances";
import { trackSearchImpressions } from "@/lib/analytics/track";
import { searchProviderLocationsWithGooglePlaces } from "@/lib/actions/search";
import { geocodeCityState } from "@/lib/geo/geocode";
import { JsonLd } from "@/components/seo/json-ld";
import {
  generateFAQSchema,
  generateItemListSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/schemas";
import { generateCityFAQs } from "@/lib/seo/city-faqs";

// Revalidate every hour
export const revalidate = 3600;

type CityPageParams = {
  state: string;
  city: string;
};

type CityPageProps = {
  params: Promise<CityPageParams>;
};

// Helper to convert state name to slug
function stateNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Get state abbreviation from URL slug
function getStateAbbrev(stateSlug: string): string | undefined {
  // Try direct lookup first
  const abbrev = STATE_SLUG_TO_ABBREV[stateSlug.toLowerCase()];
  if (abbrev) return abbrev;

  // Try matching state names
  for (const [ab, name] of Object.entries(STATE_NAMES)) {
    if (stateNameToSlug(name) === stateSlug.toLowerCase()) {
      return ab;
    }
  }
  return undefined;
}

const BASE_URL = "https://www.findabatherapy.com";

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const stateAbbrev = getStateAbbrev(stateSlug);

  if (!stateAbbrev) return {};

  const city = getCity(stateAbbrev, citySlug);
  if (!city) return {};

  const title = `ABA Therapy in ${city.name}, ${stateAbbrev}`;
  const description = `Find ABA therapy providers in ${city.name}, ${city.stateName}. Browse verified autism therapy agencies offering in-home, center-based, and telehealth ABA services. Compare providers and filter by insurance.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Find ABA Therapy`,
      description,
      url: `${BASE_URL}/${stateSlug}/${citySlug}`,
      images: [
        {
          url: `${BASE_URL}/api/og?location=${encodeURIComponent(`${city.name}, ${stateAbbrev}`)}&subtitle=${encodeURIComponent("Find verified ABA therapy providers")}`,
          width: 1200,
          height: 630,
          alt: `ABA Therapy in ${city.name}, ${stateAbbrev}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Find ABA Therapy`,
      description,
      images: [
        `${BASE_URL}/api/og?location=${encodeURIComponent(`${city.name}, ${stateAbbrev}`)}&subtitle=${encodeURIComponent("Find verified ABA therapy providers")}`,
      ],
    },
    alternates: {
      canonical: `/${stateSlug}/${citySlug}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;
  const stateAbbrev = getStateAbbrev(stateSlug);

  if (!stateAbbrev) {
    notFound();
  }

  const city = getCity(stateAbbrev, citySlug);
  if (!city) {
    notFound();
  }

  // Geocode the city to get coordinates for proximity search
  const cityCoords = await geocodeCityState(city.name, city.stateName);

  // Search for providers in the state, sorted by proximity to this city
  // NOTE: We intentionally do NOT pass the city filter - we want ALL state providers
  // sorted by distance to this city, not filtered to only this city
  const result = await searchProviderLocationsWithGooglePlaces(
    {
      state: city.stateName,
      // Don't pass city - it would filter results instead of just sorting
      userLat: cityCoords?.latitude,
      userLng: cityCoords?.longitude,
    },
    {
      limit: 50, // Show more results on city pages
      sortBy: "distance",
    }
  );

  const { results: locations, total } = result.success
    ? result.data
    : { results: [], total: 0 };

  // Track search impressions (non-blocking) - only for real listings
  const realListingsForTracking = locations
    .filter((loc) => !loc.isPrePopulated)
    .map((r, index) => {
      // Type assertion for real listings which have listingId and locationId
      const loc = r as { listingId: string; locationId: string };
      return {
        id: loc.listingId,
        locationId: loc.locationId,
        position: index + 1,
      };
    });
  if (realListingsForTracking.length > 0) {
    trackSearchImpressions(realListingsForTracking, `${city.name}, ${city.state}`).catch(() => {
      // Silently fail - don't block page render
    });
  }

  // Get nearby cities for internal linking
  const otherCities = getCitiesForState(stateAbbrev)
    .filter((c) => c.slug !== citySlug)
    .slice(0, 8);

  // Common insurances for quick filters
  const topInsurances = INSURANCES.slice(0, 6);

  // Generate FAQs for this city
  const faqs = generateCityFAQs(city.name, city.stateName, stateAbbrev, total);

  // Generate structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: city.stateName, url: `/${stateSlug}` },
    { name: city.name, url: `/${stateSlug}/${citySlug}` },
  ]);

  const itemListSchema = locations.length > 0
    ? generateItemListSchema(
        locations.map((loc, i) => ({
          name: loc.isPrePopulated ? loc.name : loc.agencyName,
          slug: loc.slug,
          position: i + 1,
        })),
        `ABA Therapy Providers in ${city.name}, ${city.stateName}`
      )
    : null;

  const faqSchema = generateFAQSchema(faqs);

  return (
    <div className="container px-4 py-12 sm:px-6">
      {/* Structured Data */}
      <JsonLd
        data={[breadcrumbSchema, faqSchema, ...(itemListSchema ? [itemListSchema] : [])]}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href={`/${stateSlug}`} className="hover:text-foreground">
          {city.stateName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{city.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Badge variant="secondary" className="w-fit uppercase">
            {city.state}
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">
            ABA Therapy in <span className="text-[#5788FF]">{city.name}, {city.state}</span>
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Find ABA therapy providers serving {city.name} and surrounding areas.
            Compare in-home, center-based, and telehealth ABA services.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {total} {total === 1 ? "provider" : "providers"} found
            </span>
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" aria-hidden />
              Filter by insurance
            </span>
          </div>
        </div>
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link
            href={`/search?city=${encodeURIComponent(city.name)}&state=${encodeURIComponent(city.stateName)}`}
          >
            Search with filters
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Insurance Quick Filters */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by Insurance
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topInsurances.map((insurance) => (
            <Link
              key={insurance.slug}
              href={`/search?city=${encodeURIComponent(city.name)}&state=${encodeURIComponent(city.stateName)}&insurance=${encodeURIComponent(insurance.name)}`}
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
      </div>

      {/* Results */}
      <div className="mt-10 space-y-8">
        {locations.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold">
                Providers near {city.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Showing {locations.length} providers in {city.stateName}, sorted by proximity.
                Premium listings appear first.
              </p>
            </div>

            <SearchResults results={locations} />
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-lg font-medium text-foreground">
              No providers yet in {city.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try searching nearby cities or the entire state.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link href={`/${stateSlug}`}>
                  View all {city.stateName} providers
                </Link>
              </Button>
              <Button asChild>
                <Link href="/get-listed">Get Listed</Link>
              </Button>
            </div>
          </div>
        )}

        {/* About ABA in City - Unique Content Section */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">
            About ABA Therapy in {city.name}
          </h2>
          <div className="mt-4 space-y-4 text-muted-foreground">
            <p>
              Applied Behavior Analysis (ABA) therapy is the most widely recognized and evidence-based
              treatment for autism spectrum disorder. Families in {city.name}, {city.stateName} have
              access to ABA therapy providers offering various service delivery models tailored to
              each child&apos;s unique needs.
            </p>
            <p>
              When choosing an ABA provider in {city.name}, consider factors such as insurance
              acceptance, service availability (in-home, center-based, or telehealth), therapist
              qualifications (BCBA and RBT credentials), and proximity to your home. Many providers
              in the {city.name} area accept major insurance carriers including Medicaid, Blue Cross
              Blue Shield, Aetna, UnitedHealthcare, and Cigna.
            </p>
            <p>
              ABA therapy in {city.stateName} is typically covered by insurance under autism insurance
              mandates. Contact providers directly to verify coverage with your specific plan and
              learn about any prior authorization requirements.
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
            Common questions about ABA therapy in {city.name}, {city.stateName}.
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

        {/* Nearby Cities */}
        {otherCities.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold">
              Nearby Cities in {city.stateName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore ABA therapy providers in other {city.stateName} cities.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {otherCities.map((otherCity) => (
                <Link
                  key={otherCity.slug}
                  href={`/${stateSlug}/${otherCity.slug}`}
                  className="rounded-lg border border-border p-3 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <p className="font-medium text-foreground">{otherCity.name}</p>
                  <p className="text-xs text-muted-foreground">{otherCity.state}</p>
                </Link>
              ))}
            </div>

            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href={`/${stateSlug}`}>
                  View all {city.stateName} cities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Related Resources - Internal Links to Articles */}
        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold">Learn More About ABA Therapy</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Resources to help you understand ABA therapy and make informed decisions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
        <Card className="border-dashed border-primary/50 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Are you an ABA provider in {city.name}?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              List your practice on Find ABA Therapy and connect with families
              searching for ABA services in {city.name}, {city.stateName}.
            </p>
            <Button asChild variant="default" className="shrink-0">
              <Link href="/get-listed">Get Listed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
