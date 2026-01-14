import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Filter, MapPin, HelpCircle, Briefcase } from "lucide-react";

import { JobCard } from "@/components/jobs/job-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCitiesForState,
  getCity,
  STATE_SLUG_TO_ABBREV,
  STATE_NAMES,
} from "@/lib/data/cities";
import { getJobsByCity } from "@/lib/queries/jobs";
import { SEARCH_POSITION_OPTIONS } from "@/lib/validations/jobs";
import { JsonLd } from "@/components/seo/json-ld";
import {
  generateFAQSchema,
  generateItemListSchema,
  generateMedicalWebPageSchema,
} from "@/lib/seo/schemas";
import { generateJobCityFAQs } from "@/lib/seo/job-faqs";

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

const BASE_URL = "https://www.findabajobs.org";

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;

  const stateAbbrev = getStateAbbrev(stateSlug);

  if (!stateAbbrev) return {};

  const city = getCity(stateAbbrev, citySlug);
  if (!city) return {};

  const title = `ABA Jobs in ${city.name}, ${stateAbbrev}`;
  const description = `Find ABA therapy jobs in ${city.name}, ${city.stateName}. Browse BCBA, RBT, and behavior analyst positions from top providers. Compare opportunities and apply today.`;

  // Build OG image URL with jobs brand
  const ogImageUrl = `${BASE_URL}/api/og?brand=jobs&location=${encodeURIComponent(`${city.name}, ${stateAbbrev}`)}&subtitle=${encodeURIComponent("Find ABA therapy careers")}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Find ABA Jobs`,
      description,
      url: `${BASE_URL}/jobs/${stateSlug}/${citySlug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `ABA Jobs in ${city.name}, ${stateAbbrev}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Find ABA Jobs`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/jobs/${stateSlug}/${citySlug}`,
    },
    // Geo meta tags for local SEO
    other: {
      "geo.region": `US-${stateAbbrev}`,
      "geo.placename": city.name,
    },
  };
}

export default async function CityJobsPage({ params }: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;

  const stateAbbrev = getStateAbbrev(stateSlug);

  if (!stateAbbrev) {
    notFound();
  }

  const city = getCity(stateAbbrev, citySlug);
  if (!city) {
    notFound();
  }

  // Fetch jobs for this city
  const { jobs, total } = await getJobsByCity(stateSlug, citySlug, 50);

  // Get nearby cities for internal linking
  const otherCities = getCitiesForState(stateAbbrev)
    .filter((c) => c.slug !== citySlug)
    .slice(0, 8);

  // Top position types for quick filters
  const topPositions = SEARCH_POSITION_OPTIONS.slice(0, 6);

  // Generate FAQs for this city
  const faqs = generateJobCityFAQs(city.name, city.stateName, stateAbbrev, total);

  // Generate structured data
  const itemListSchema = jobs.length > 0
    ? generateItemListSchema(
        jobs.map((job, i) => ({
          name: job.title,
          slug: `/job/${job.slug}`,
          position: i + 1,
        })),
        `ABA Jobs in ${city.name}, ${city.stateName}`
      )
    : null;

  const faqSchema = generateFAQSchema(faqs);

  const medicalPageSchema = generateMedicalWebPageSchema({
    title: `ABA Jobs in ${city.name}, ${city.stateName}`,
    description: `Find ABA therapy jobs in ${city.name}, ${city.stateName}. Browse BCBA, RBT, and behavior analyst positions from top providers.`,
    url: `${BASE_URL}/jobs/${stateSlug}/${citySlug}`,
    lastReviewed: new Date().toISOString().split("T")[0],
  });

  // Format last updated date for display
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="container px-4 py-12 sm:px-6">
      {/* Structured Data */}
      <JsonLd
        data={[faqSchema, medicalPageSchema, ...(itemListSchema ? [itemListSchema] : [])]}
      />

      {/* Breadcrumb with JSON-LD schema */}
      <Breadcrumbs
        items={[
          { label: "Jobs", href: "/jobs/search" },
          { label: city.stateName, href: `/jobs/${stateSlug}` },
          { label: city.name, href: `/jobs/${stateSlug}/${citySlug}` },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Badge variant="secondary" className="w-fit uppercase bg-emerald-100 text-emerald-700">
            {city.state}
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">
            ABA Jobs in <span className="text-emerald-600">{city.name}, {city.state}</span>
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Find BCBA, RBT, and behavior analyst jobs in {city.name} and surrounding areas.
            Browse positions from top ABA therapy providers.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" aria-hidden />
              {total} {total === 1 ? "job" : "jobs"} available
            </span>
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4 text-emerald-600" aria-hidden />
              Filter by position type
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
        <Button asChild size="lg" className="w-full md:w-auto bg-emerald-600 text-white hover:bg-emerald-700">
          <Link
            href={`/jobs/search?city=${encodeURIComponent(city.name)}&state=${stateAbbrev}`}
          >
            Search with filters
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Position Type Quick Filters */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by Position Type
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topPositions.map((position) => (
            <Link
              key={position.value}
              href={`/jobs/search?city=${encodeURIComponent(city.name)}&state=${stateAbbrev}&position=${position.value}`}
            >
              <Badge
                variant="outline"
                className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
              >
                {position.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-10 space-y-8">
        {jobs.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold">
                Jobs in {city.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Showing {jobs.length} jobs in the {city.name}, {city.stateName} area.
                Featured employers appear first.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {jobs.map((job, index) => (
                <JobCard key={job.id} job={job} index={index} />
              ))}
            </div>

            {total > jobs.length && (
              <div className="flex justify-center pt-4">
                <Button asChild variant="outline" size="lg">
                  <Link href={`/jobs/search?city=${encodeURIComponent(city.name)}&state=${stateAbbrev}`}>
                    View all {total} jobs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">
              No jobs yet in {city.name}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try searching nearby cities or the entire state.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link href={`/jobs/${stateSlug}`}>
                  View all {city.stateName} jobs
                </Link>
              </Button>
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/employers/post">Post a Job</Link>
              </Button>
            </div>
          </div>
        )}

        {/* About ABA Jobs in City */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">
            About ABA Careers in {city.name}
          </h2>
          <div className="mt-4 space-y-4 text-muted-foreground">
            <p>
              {city.name}, {city.stateName} offers rewarding career opportunities for ABA professionals.
              Whether you&apos;re a Board Certified Behavior Analyst (BCBA), Registered Behavior
              Technician (RBT), or looking to start your career in the field, the {city.name} area
              has positions to match your skills and goals.
            </p>
            <p>
              ABA therapy employers in {city.name} typically offer competitive compensation packages
              including health insurance, paid time off, CEU stipends for professional development,
              and supervision hours for those pursuing BCBA certification. Many providers offer
              flexible scheduling and opportunities for career advancement.
            </p>
            <p>
              When applying for ABA jobs in {city.name}, highlight your relevant certifications,
              experience with specific populations, and commitment to evidence-based practice.
              Employers value candidates who demonstrate strong communication skills and a
              passion for helping individuals with autism and developmental disabilities.
            </p>
          </div>
        </section>

        {/* FAQs Section */}
        <section>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Common questions about ABA jobs in {city.name}, {city.stateName}.
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
              Explore ABA jobs in other {city.stateName} cities.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {otherCities.map((otherCity) => (
                <Link
                  key={otherCity.slug}
                  href={`/jobs/${stateSlug}/${otherCity.slug}`}
                  className="rounded-lg border border-border p-3 transition-colors hover:border-emerald-500 hover:bg-emerald-500/5"
                >
                  <p className="font-medium text-foreground">{otherCity.name}</p>
                  <p className="text-xs text-muted-foreground">{otherCity.state}</p>
                </Link>
              ))}
            </div>

            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href={`/jobs/${stateSlug}`}>
                  View all {city.stateName} cities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Related Resources */}
        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold">Explore More ABA Careers</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Resources to help you find the right ABA position.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/bcba-jobs">
              <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                BCBA Jobs
              </Badge>
            </Link>
            <Link href="/rbt-jobs">
              <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                RBT Jobs
              </Badge>
            </Link>
            <Link href="/jobs/search?remote=true">
              <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                Remote Jobs
              </Badge>
            </Link>
            <Link href="/employers">
              <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                Browse Employers
              </Badge>
            </Link>
          </div>
        </section>

        {/* CTA Card */}
        <Card className="border-dashed border-emerald-500/50 bg-emerald-500/[0.04]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Are you hiring in {city.name}?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Post your ABA jobs on Find ABA Jobs and connect with qualified
              candidates searching for opportunities in {city.name}, {city.stateName}.
            </p>
            <Button asChild variant="default" className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/employers/post">Post a Job</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
