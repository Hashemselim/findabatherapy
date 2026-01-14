import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle, MapPin, HelpCircle, Briefcase } from "lucide-react";

import { JobCard } from "@/components/jobs/job-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import {
  getCitiesForState,
  STATE_SLUG_TO_ABBREV,
  STATE_NAMES,
} from "@/lib/data/cities";
import { getJobsByState } from "@/lib/queries/jobs";
import { SEARCH_POSITION_OPTIONS } from "@/lib/validations/jobs";
import { generateJobStateFAQs } from "@/lib/seo/job-faqs";
import {
  generateItemListSchema,
  generateFAQSchema,
  generateMedicalWebPageSchema,
} from "@/lib/seo/schemas";

// Revalidate every hour (ISR) - pages are rendered on-demand and cached
export const revalidate = 3600;

type StatePageParams = {
  state: string;
};

type StatePageProps = {
  params: Promise<StatePageParams>;
};

// Helper to convert state slug to state info
function getStateInfo(stateSlug: string): { name: string; abbrev: string } | null {
  // Try direct lookup first
  const abbrev = STATE_SLUG_TO_ABBREV[stateSlug.toLowerCase()];
  if (abbrev && STATE_NAMES[abbrev]) {
    return { name: STATE_NAMES[abbrev], abbrev };
  }

  // Try matching state names
  for (const [ab, name] of Object.entries(STATE_NAMES)) {
    if (name.toLowerCase().replace(/\s+/g, "-") === stateSlug.toLowerCase()) {
      return { name, abbrev: ab };
    }
  }
  return null;
}

const BASE_URL = "https://www.findabajobs.org";

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state: stateSlug } = await params;

  const stateInfo = getStateInfo(stateSlug);

  if (!stateInfo) {
    return {};
  }

  const title = `ABA Jobs in ${stateInfo.name}`;
  const description = `Find ABA therapy jobs in ${stateInfo.name}. Browse BCBA, RBT, and behavior analyst positions from top providers. Filter by city, position type, and employment type.`;

  // Build OG image URL with jobs brand
  const ogImageUrl = `${BASE_URL}/api/og?brand=jobs&location=${encodeURIComponent(stateInfo.name)}&subtitle=${encodeURIComponent("Find ABA therapy careers")}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Find ABA Jobs`,
      description,
      url: `${BASE_URL}/jobs/${stateSlug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `ABA Jobs in ${stateInfo.name}`,
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
      canonical: `/jobs/${stateSlug}`,
    },
  };
}

export default async function StateJobsPage({ params }: StatePageProps) {
  const { state: stateSlug } = await params;

  const stateInfo = getStateInfo(stateSlug);

  if (!stateInfo) {
    notFound();
  }

  // Fetch jobs for this state
  const { jobs, total } = await getJobsByState(stateSlug, 50);

  // Get cities for this state
  const cities = getCitiesForState(stateInfo.abbrev);

  // Top position types for quick filters
  const topPositions = SEARCH_POSITION_OPTIONS.slice(0, 6);

  // Generate FAQs for this state
  const faqs = generateJobStateFAQs(stateInfo.name, stateInfo.abbrev, total, cities.length);

  // Generate schemas for SEO
  const listSchema = jobs.length > 0
    ? generateItemListSchema(
        jobs.map((job, index) => ({
          name: job.title,
          slug: `/job/${job.slug}`,
          position: index + 1,
        })),
        `ABA Jobs in ${stateInfo.name}`
      )
    : null;

  const faqSchema = generateFAQSchema(faqs);

  const medicalPageSchema = generateMedicalWebPageSchema({
    title: `ABA Jobs in ${stateInfo.name}`,
    description: `Find ABA therapy jobs in ${stateInfo.name}. Browse BCBA, RBT, and behavior analyst positions from top providers.`,
    url: `${BASE_URL}/jobs/${stateSlug}`,
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
      <JsonLd data={[...(listSchema ? [listSchema] : []), faqSchema, medicalPageSchema]} />

      <div className="space-y-10 pb-16">
        {/* Hero Section */}
        <section className="px-0 pt-0">
          <BubbleBackground
            interactive
            transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
            className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-slate-50/50 py-8 sm:py-12"
            colors={{
              first: "255,255,255",
              second: "167,243,208",
              third: "134,239,172",
              fourth: "209,250,229",
              fifth: "187,247,208",
              sixth: "236,253,245",
            }}
          >
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              {/* Breadcrumb with JSON-LD schema */}
              <Breadcrumbs
                items={[
                  { label: "Jobs", href: "/jobs/search" },
                  { label: stateInfo.name, href: `/jobs/${stateSlug}` },
                ]}
                className="mb-6"
              />

              <div className="flex flex-col items-center text-center">
                <Badge className="mb-4 gap-2 bg-emerald-100 text-emerald-700 uppercase">
                  {stateInfo.abbrev}
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  ABA Jobs in <span className="text-emerald-600">{stateInfo.name}</span>
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                  Find BCBA, RBT, and behavior analyst jobs in {stateInfo.name}. Browse positions
                  from top ABA therapy providers and advance your career.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    {total} {total === 1 ? "job" : "jobs"} available
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {cities.length} cities covered
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Last updated: {lastUpdated}
                </p>
                <Button asChild size="lg" className="mt-8 bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href={`/jobs/search?state=${stateInfo.abbrev}`}>
                    Search {stateInfo.name} Jobs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </BubbleBackground>
        </section>

        <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6">
          {/* Browse by Position Type */}
          <section>
            <h2 className="text-2xl font-semibold">Browse by Position</h2>
            <p className="mt-2 text-muted-foreground">
              Find {stateInfo.name} jobs by position type.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {topPositions.map((position) => (
                <Link
                  key={position.value}
                  href={`/jobs/search?state=${stateInfo.abbrev}&position=${position.value}`}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                  >
                    {position.label} Jobs
                  </Badge>
                </Link>
              ))}
            </div>
          </section>

          {/* Cities Section */}
          {cities.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">
                Browse Cities in {stateInfo.name}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Click on a city to view ABA jobs in that area.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cities.slice(0, 16).map((city) => (
                  <Link
                    key={city.slug}
                    href={`/jobs/${stateSlug}/${city.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-muted-foreground transition hover:border-emerald-500 hover:text-foreground"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{city.name}</span>
                      <span className="block text-xs text-muted-foreground">{stateInfo.abbrev}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {cities.length > 16 && (
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/jobs/search?state=${stateInfo.abbrev}`}>
                      View all {cities.length} cities
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Results */}
          <div className="space-y-8">
            {jobs.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  <h2 className="text-2xl font-semibold">Latest Jobs in {stateInfo.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Showing {jobs.length} of {total} jobs. Featured employers appear first.
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
                      <Link href={`/jobs/search?state=${stateInfo.abbrev}`}>
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
                <p className="text-lg font-medium text-foreground">No jobs yet in {stateInfo.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon or browse remote positions.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild variant="outline">
                    <Link href="/jobs/search?remote=true">
                      Browse Remote Jobs
                    </Link>
                  </Button>
                  <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href="/employers/post">Post a Job</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* About ABA Jobs in State */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">
                About ABA Careers in {stateInfo.name}
              </h2>
              <div className="mt-4 space-y-4 text-muted-foreground">
                <p>
                  {stateInfo.name} offers diverse career opportunities for ABA professionals.
                  Whether you&apos;re a Board Certified Behavior Analyst (BCBA), Registered Behavior
                  Technician (RBT), or looking to enter the field, you&apos;ll find positions that
                  match your experience and career goals.
                </p>
                <p>
                  ABA therapy providers in {stateInfo.name} serve children and adults with autism
                  spectrum disorder and other developmental disabilities. Many positions offer
                  competitive salaries, comprehensive benefits, and opportunities for professional
                  growth including CEU stipends and supervision for those pursuing certification.
                </p>
                <p>
                  The demand for ABA professionals in {stateInfo.name} continues to grow as autism
                  diagnoses increase and insurance coverage expands. Entry-level Behavior Technician
                  roles provide a path into the field, while experienced BCBAs can advance to
                  clinical director and leadership positions.
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
                Common questions about ABA jobs in {stateInfo.name}.
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
              <h2 className="text-lg font-semibold">Explore More ABA Careers</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Resources to help you advance your ABA career.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/bcba-jobs">
                  <Badge variant="secondary" className="cursor-pointer bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                    BCBA Jobs Nationwide
                  </Badge>
                </Link>
                <Link href="/rbt-jobs">
                  <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                    RBT Jobs
                  </Badge>
                </Link>
                <Link href="/jobs/search?remote=true">
                  <Badge variant="outline" className="cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600">
                    Remote ABA Jobs
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
            <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
                <div className="flex-1 space-y-1">
                  <p className="text-lg font-semibold text-foreground">Are you hiring in {stateInfo.name}?</p>
                  <p className="text-sm text-muted-foreground">
                    Post your ABA jobs and connect with qualified candidates searching in {stateInfo.name}.
                  </p>
                </div>
                <Button asChild className="shrink-0 rounded-full border border-emerald-600 bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                  <Link href="/employers/post">Post a Job Free</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
