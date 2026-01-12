import type { Metadata } from "next";
import Link from "next/link";
import React, { Suspense } from "react";
import { Briefcase, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/job-card";
import { JobSearchTracker } from "@/components/jobs/job-search-tracker";
import { JobImpressionTracker } from "@/components/jobs/job-impression-tracker";
import { JobFilters, ActiveJobFilters } from "@/components/jobs/job-filters";
import { searchJobs, type JobSearchFilters as DbJobSearchFilters } from "@/lib/queries/jobs";
import { jobsConfig } from "@/config/jobs";
import { JobSearchHeader } from "@/components/jobs/job-search-header";
import {
  parseJobFiltersFromParams,
  parseJobOptionsFromParams,
  mapSearchPositionToDbTypes,
  getPositionLabel,
} from "@/lib/search/job-filters";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate dynamic metadata based on search filters
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;

  // Convert to URLSearchParams for parsing
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      urlParams.set(key, value);
    }
  }

  const filters = parseJobFiltersFromParams(urlParams);
  const state = filters.state;
  const city = filters.city;
  const query = typeof params.q === "string" ? params.q : undefined;
  const pageNum = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  // Get position label from unified position filter
  const positionLabel = filters.position ? getPositionLabel(filters.position) : null;

  let title = "Find ABA Jobs";
  let description = "Search ABA therapy jobs including BCBA, RBT, and behavior technician positions from top providers nationwide.";

  // Build title and description based on filters
  if (positionLabel && city && state) {
    title = `${positionLabel} Jobs in ${city}, ${state}`;
    description = `Find ${positionLabel} jobs in ${city}, ${state}. Search open positions from verified ABA therapy providers.`;
  } else if (positionLabel && state) {
    title = `${positionLabel} Jobs in ${state}`;
    description = `Find ${positionLabel} jobs in ${state}. Browse behavior analyst and technician positions from top ABA providers.`;
  } else if (positionLabel) {
    title = `${positionLabel} Jobs - ABA Therapy Careers`;
    description = `Search ${positionLabel} jobs nationwide. Find open positions at verified ABA therapy providers.`;
  } else if (city && state) {
    title = `ABA Jobs in ${city}, ${state}`;
    description = `Find ABA therapy jobs in ${city}, ${state}. BCBA, RBT, and behavior technician positions available.`;
  } else if (state) {
    title = `ABA Jobs in ${state}`;
    description = `Browse ABA therapy jobs in ${state}. Find BCBA, RBT, and behavior analyst positions.`;
  } else if (query) {
    title = `Search Results for "${query}" | ABA Jobs`;
    description = `Search results for "${query}". Find matching ABA therapy positions.`;
  }

  // Add page number to title if not first page
  if (pageNum > 1) {
    title = `${title} - Page ${pageNum}`;
  }

  // Add site name to title
  title = `${title} | ${jobsConfig.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

// Convert URL filters to database filters
function convertToDbFilters(urlParams: URLSearchParams): DbJobSearchFilters {
  const urlFilters = parseJobFiltersFromParams(urlParams);
  const dbFilters: DbJobSearchFilters = {};

  // Convert single-select position to position types array for database
  if (urlFilters.position) {
    dbFilters.positionTypes = mapSearchPositionToDbTypes(urlFilters.position);
  }

  // Employment type (single-select in URL, array in DB)
  if (urlFilters.employment) {
    dbFilters.employmentTypes = [urlFilters.employment];
  }

  // Remote filter
  if (urlFilters.remote) {
    dbFilters.remote = true;
  }

  // Posted within
  if (urlFilters.postedWithin) {
    dbFilters.postedWithin = urlFilters.postedWithin;
  }

  // Location filters
  if (urlFilters.state) {
    dbFilters.state = urlFilters.state;
  }
  if (urlFilters.city) {
    dbFilters.city = urlFilters.city;
  }

  // Proximity search
  if (urlFilters.lat !== undefined && urlFilters.lng !== undefined) {
    dbFilters.lat = urlFilters.lat;
    dbFilters.lng = urlFilters.lng;
  }
  if (urlFilters.radius !== undefined) {
    dbFilters.radius = urlFilters.radius;
  }

  return dbFilters;
}

async function JobSearchResults({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const filters = convertToDbFilters(searchParams);
  const urlFilters = parseJobFiltersFromParams(searchParams);
  const options = parseJobOptionsFromParams(searchParams);
  const page = options.page || 1;
  const sort = options.sort || "relevance";

  const result = await searchJobs({
    filters,
    page,
    limit: options.limit || 20,
    sort,
  });

  const { jobs, total, totalPages } = result;

  // Prepare impression data for tracking
  const impressions = jobs.map((job, index) => ({
    id: job.id,
    position: (page - 1) * 20 + index + 1,
  }));

  if (jobs.length === 0) {
    return (
      <>
        {/* Track search even with no results */}
        <JobSearchTracker
          state={urlFilters.state}
          city={urlFilters.city}
          positionTypes={urlFilters.position ? [urlFilters.position] : undefined}
          employmentTypes={urlFilters.employment ? [urlFilters.employment] : undefined}
          remoteOnly={urlFilters.remote}
          postedWithin={urlFilters.postedWithin}
          resultsCount={0}
          page={page}
        />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No jobs found</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              We couldn&apos;t find any jobs matching your criteria. Try adjusting your filters or search terms.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/jobs/search">Clear all filters</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client-side tracking - only fires for real users, not bots */}
      <JobSearchTracker
        state={urlFilters.state}
        city={urlFilters.city}
        positionTypes={urlFilters.position ? [urlFilters.position] : undefined}
        employmentTypes={urlFilters.employment ? [urlFilters.employment] : undefined}
        remoteOnly={urlFilters.remote}
        postedWithin={urlFilters.postedWithin}
        resultsCount={total}
        page={page}
      />
      <JobImpressionTracker impressions={impressions} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{jobs.length}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> jobs
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {jobs.map((job, index) => (
          <JobCard key={job.id} job={job} index={index} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/jobs/search?${new URLSearchParams({
                  ...Object.fromEntries(searchParams),
                  page: String(page - 1),
                }).toString()}`}
              >
                Previous
              </Link>
            </Button>
          )}
          <span className="px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/jobs/search?${new URLSearchParams({
                  ...Object.fromEntries(searchParams),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function JobSearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="flex gap-4 p-4">
              <div className="h-14 w-14 flex-shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/3 rounded bg-muted" />
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-16 rounded bg-muted" />
                  <div className="h-5 w-20 rounded bg-muted" />
                  <div className="h-5 w-20 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Convert searchParams to URLSearchParams
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      urlParams.set(key, value);
    } else if (Array.isArray(value)) {
      urlParams.set(key, value.join(","));
    }
  }

  // Parse filters using centralized utility
  const filters = parseJobFiltersFromParams(urlParams);

  // Extract location info for header
  const defaultLocation =
    filters.lat !== undefined && filters.lng !== undefined
      ? {
          lat: filters.lat,
          lng: filters.lng,
          city: filters.city,
          state: filters.state,
        }
      : undefined;

  // Build heading with emerald highlight (similar to Therapy pattern)
  let heading: React.ReactNode = <>Search <span className="text-emerald-600">ABA Jobs</span></>;

  // Get position label from unified position filter
  const positionLabel = filters.position ? getPositionLabel(filters.position) : null;
  const city = filters.city;
  const state = filters.state;

  const hasProximitySearch = filters.lat !== undefined && filters.lng !== undefined;

  if (hasProximitySearch) {
    if (positionLabel && city && state) {
      heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs near {city}, {state}</>;
    } else if (positionLabel && state) {
      heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs near {state}</>;
    } else if (positionLabel) {
      heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs</>;
    } else if (city && state) {
      heading = <>ABA Jobs near <span className="text-emerald-600">{city}, {state}</span></>;
    } else if (state) {
      heading = <>ABA Jobs near <span className="text-emerald-600">{state}</span></>;
    }
  } else if (positionLabel && city && state) {
    heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs in {city}, {state}</>;
  } else if (positionLabel && state) {
    heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs in {state}</>;
  } else if (positionLabel) {
    heading = <><span className="text-emerald-600">{positionLabel}</span> Jobs</>;
  } else if (city && state) {
    heading = <>ABA Jobs in <span className="text-emerald-600">{city}, {state}</span></>;
  } else if (state) {
    heading = <>ABA Jobs in <span className="text-emerald-600">{state}</span></>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50/50">
      {/* Search Header with Location Autocomplete */}
      <BubbleBackground
        interactive
        transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
        className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 py-4 sm:py-5"
        colors={{
          first: "255,255,255",
          second: "167,243,208",
          third: "110,231,183",
          fourth: "209,250,229",
          fifth: "153,246,228",
          sixth: "240,253,250",
        }}
      >
        <Suspense fallback={<div className="h-24" />}>
          <JobSearchHeader
            heading={heading}
            defaultPosition={filters.position}
            defaultLocation={defaultLocation}
            transparent
          />
        </Suspense>
      </BubbleBackground>

      {/* Main Content with Sidebar */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Filters */}
          <aside className="w-full flex-shrink-0 lg:w-64">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
              <JobFilters />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {/* Active Filters */}
            <Suspense fallback={null}>
              <ActiveJobFilters />
            </Suspense>

            {/* Job Results */}
            <Suspense fallback={<JobSearchSkeleton />}>
              <JobSearchResults searchParams={urlParams} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Employer CTA */}
      <div className="border-t border-border/60 bg-white py-12">
        <div className="container mx-auto px-4 text-center sm:px-6">
          <h2 className="text-xl font-semibold">Looking to hire?</h2>
          <p className="mt-2 text-muted-foreground">
            Post your ABA jobs and reach thousands of qualified candidates.
          </p>
          <Button asChild className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/employers/post" className="gap-2">
              Post a Job Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
