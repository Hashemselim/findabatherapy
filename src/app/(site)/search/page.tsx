import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Heart, ArrowRight, Users } from "lucide-react";

import { HomeSearchCard } from "@/components/home/home-search-card";
import { CompactSearchBar } from "@/components/search/compact-search-bar";
import { SearchFilters, ActiveFilters } from "@/components/search/search-filters";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";
import { SearchPagination } from "@/components/search/search-pagination";
import { SearchTracker } from "@/components/search/search-tracker";
import { ImpressionTracker } from "@/components/search/impression-tracker";
import { SortToggle } from "@/components/search/sort-toggle";
import { JsonLd } from "@/components/seo/json-ld";
import { BackToTop } from "@/components/ui/back-to-top";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchProviderLocationsWithGooglePlaces } from "@/lib/actions/search";
import { trackSearchImpressionsWithBotDetection } from "@/lib/analytics/track";
import { parseFiltersFromParams, parseOptionsFromParams } from "@/lib/search/filters";
import { generateItemListSchema } from "@/lib/seo/schemas";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate dynamic metadata based on search filters
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;

  const state = typeof params.state === "string" ? params.state : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;
  const insurance = typeof params.insurance === "string" ? params.insurance : undefined;
  const query = typeof params.query === "string" ? params.query : undefined;
  const pageNum = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  let title = "Find ABA Therapy Providers Near You";
  let description = "Search our directory of verified ABA therapy providers. Filter by location, insurance, service type, and more to find the right autism therapy services for your family.";

  // Build title and description based on filters
  if (insurance && city && state) {
    title = `ABA Therapy Accepting ${insurance} in ${city}, ${state}`;
    description = `Find ABA therapy providers in ${city}, ${state} that accept ${insurance} insurance. Compare in-home, center-based, and telehealth ABA services.`;
  } else if (insurance && state) {
    title = `ABA Therapy Accepting ${insurance} in ${state}`;
    description = `Find ABA therapy providers in ${state} that accept ${insurance} insurance. Browse verified agencies offering autism therapy services.`;
  } else if (insurance) {
    title = `ABA Therapy Providers Accepting ${insurance}`;
    description = `Find ABA therapy providers that accept ${insurance} insurance nationwide. Compare agencies and find in-network autism therapy services.`;
  } else if (city && state) {
    title = `ABA Therapy in ${city}, ${state}`;
    description = `Find ABA therapy providers in ${city}, ${state}. Compare in-home, center-based, and telehealth autism therapy services. Filter by insurance.`;
  } else if (state) {
    title = `ABA Therapy Providers in ${state}`;
    description = `Browse ABA therapy providers in ${state}. Find verified agencies offering in-home, center-based, and telehealth autism therapy services.`;
  } else if (query) {
    title = `Search Results for "${query}" | ABA Therapy`;
    description = `Search results for "${query}". Find ABA therapy providers matching your search criteria.`;
  }

  // Add page number to title if not first page
  if (pageNum > 1) {
    title = `${title} - Page ${pageNum}`;
  }

  // Add site name to title
  title = `${title} | Find ABA Therapy`;

  // Build base URL for pagination links
  const baseParams = new URLSearchParams();
  if (state) baseParams.set("state", state);
  if (city) baseParams.set("city", city);
  if (insurance) baseParams.set("insurance", insurance);
  if (query) baseParams.set("query", query);
  const baseSearch = baseParams.toString();
  const baseUrl = baseSearch ? `/search?${baseSearch}` : "/search";

  // Build canonical URL (page 1 should not have page param)
  const canonical = pageNum > 1 ? `${baseUrl}&page=${pageNum}` : baseUrl;

  // Build prev/next pagination links for SEO
  const prevUrl = pageNum > 1 ? (pageNum === 2 ? baseUrl : `${baseUrl}${baseSearch ? "&" : "?"}page=${pageNum - 1}`) : undefined;
  // Note: We can't know totalPages here without fetching, so we always include next for page > 0
  // The actual link validity is handled by the component
  const nextUrl = `${baseUrl}${baseSearch ? "&" : "?"}page=${pageNum + 1}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical,
    },
    other: {
      // SEO pagination hints
      ...(prevUrl && { "link-prev": prevUrl }),
      "link-next": nextUrl,
    },
  };
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

  const filters = parseFiltersFromParams(urlParams);
  const options = parseOptionsFromParams(urlParams);

  // Fetch results (combined location + Google Places search)
  const result = await searchProviderLocationsWithGooglePlaces(filters, options);
  const { results, total, page, totalPages, radiusMiles } = result.success
    ? result.data
    : { results: [], total: 0, page: 1, totalPages: 0, radiusMiles: 25 };

  // NOTE: Server-side search tracking removed to prevent double-counting
  // Client-side SearchTracker component (below) tracks searches with source="user"
  // This ensures accurate human-only search counts

  // Track search impressions for real listings only (non-blocking)
  // Server-side impression tracking is kept until client-side ImpressionTracker is added
  const realListingsForTracking = results
    .filter((r) => !r.isPrePopulated)
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
    trackSearchImpressionsWithBotDetection(realListingsForTracking, filters.query).catch(() => {
      // Silently fail - don't block page render
    });
  }

  // Build heading with blue highlight
  let heading: ReactNode = <>Search <span className="text-[#5788FF]">ABA Therapy</span> Providers</>;
  const hasProximitySearch = filters.userLat !== undefined && filters.userLng !== undefined;

  if (hasProximitySearch) {
    // Proximity search - show city/state if available
    if (filters.city && filters.state) {
      heading = <>ABA Therapy Providers near <span className="text-[#5788FF]">{filters.city}, {filters.state}</span></>;
    } else if (filters.state) {
      heading = <>ABA Therapy Providers near <span className="text-[#5788FF]">{filters.state}</span></>;
    } else {
      const radiusText = filters.radiusMiles ? `within ${filters.radiusMiles} miles` : "near you";
      heading = <>ABA Therapy Providers <span className="text-[#5788FF]">{radiusText}</span></>;
    }
  } else if (filters.city && filters.state) {
    heading = <>ABA Therapy Providers in <span className="text-[#5788FF]">{filters.city}, {filters.state}</span></>;
  } else if (filters.state) {
    heading = <>ABA Therapy Providers in <span className="text-[#5788FF]">{filters.state}</span></>;
  } else if (filters.query) {
    heading = <>ABA Therapy Providers in <span className="text-[#5788FF]">{filters.query}</span></>;
  }

  // Build default location string for the search card
  let defaultLocation = "";
  if (filters.city && filters.state) {
    defaultLocation = `${filters.city}, ${filters.state}`;
  } else if (filters.state) {
    defaultLocation = filters.state;
  } else if (filters.query) {
    defaultLocation = filters.query;
  }

  // Hero variant toggle: "compact" (default) or "full" for A/B testing
  const heroVariant = params.hero === "full" ? "full" : "compact";

  // Generate ItemList schema for search results (only for real listings)
  const realListings = results.filter((r) => !r.isPrePopulated);
  const itemListSchema = realListings.length > 0
    ? generateItemListSchema(
        realListings.map((loc, i) => ({
          // Real listings have agencyName, Google Places have name
          name: "agencyName" in loc ? loc.agencyName : loc.name,
          slug: loc.slug,
          position: i + 1,
        })),
        filters.city && filters.state
          ? `ABA Therapy Providers in ${filters.city}, ${filters.state}`
          : filters.state
            ? `ABA Therapy Providers in ${filters.state}`
            : "ABA Therapy Provider Search Results"
      )
    : null;

  return (
    <>
      {/* Structured Data */}
      {itemListSchema && <JsonLd data={itemListSchema} />}

      <div className="space-y-6 pb-16">
      {/* Hero Section with Search */}
      <section className="px-0 pt-0">
        {heroVariant === "compact" ? (
          <BubbleBackground
            interactive
            transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
            className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-4 sm:py-5"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <CompactSearchBar
                heading={heading}
                defaultLocation={defaultLocation}
                defaultServices={filters.serviceTypes?.length ? filters.serviceTypes : undefined}
                defaultInsurance={filters.insurances?.[0]}
              />
            </div>
          </BubbleBackground>
        ) : (
          <BubbleBackground
            interactive
            transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
            className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-6 sm:py-8"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 sm:px-6">
              <HomeSearchCard
                heading={heading}
                defaultLocation={defaultLocation}
                defaultServices={filters.serviceTypes?.length ? filters.serviceTypes : undefined}
                defaultInsurance={filters.insurances?.[0]}
              />
            </div>
          </BubbleBackground>
        )}
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Filters */}
          <aside className="w-full flex-shrink-0 lg:w-64">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
              <SearchFilters />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {/* Results Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
                  <Users className="h-4 w-4 text-[#5788FF]" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {total} {total === 1 ? "provider" : "providers"} found
                </p>
              </div>
              <Suspense fallback={null}>
                <SortToggle />
              </Suspense>
            </div>

            {/* Active Filters */}
            <Suspense fallback={null}>
              <ActiveFilters />
            </Suspense>

            {/* PostHog Search Tracking (client-side) */}
            <SearchTracker
              query={filters.query}
              state={filters.state}
              city={filters.city}
              serviceTypes={filters.serviceTypes}
              insurances={filters.insurances}
              languages={filters.languages}
              agesServedMin={filters.agesServed?.min}
              agesServedMax={filters.agesServed?.max}
              acceptingClients={filters.acceptingClients}
              resultsCount={total}
              page={page}
            />

            {/* Client-side Impression Tracking (source="user") */}
            <ImpressionTracker
              impressions={realListingsForTracking}
              searchQuery={filters.query}
            />

            {/* Results List */}
            <Suspense fallback={<SearchResultsSkeleton />}>
              <SearchResults results={results} searchQuery={filters.query} radiusMiles={radiusMiles} hasProximitySearch={hasProximitySearch} />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <Suspense fallback={null}>
                <SearchPagination
                  currentPage={page}
                  totalPages={totalPages}
                  total={total}
                  className="pt-6"
                />
              </Suspense>
            )}

            {/* CTA Card */}
            <Card className="group relative mt-8 overflow-hidden border border-[#5788FF]/20 bg-gradient-to-br from-[#5788FF]/[0.03] via-white to-[#5788FF]/[0.06] transition-all duration-500 ease-premium hover:border-[#5788FF]/30 hover:shadow-[0_8px_30px_rgba(87,136,255,0.12)]">
              {/* Decorative elements */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#5788FF]/5 transition-transform duration-700 ease-premium group-hover:scale-150" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-primary/10 transition-transform duration-700 ease-premium group-hover:scale-150" />
              <CardContent className="relative flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-premium group-hover:scale-[1.05] group-hover:bg-[#5788FF]/15">
                  <Heart className="h-6 w-6 text-[#5788FF] transition-transform duration-300 ease-bounce-sm group-hover:scale-110" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-lg font-semibold text-foreground">Are you an ABA therapy provider?</p>
                  <p className="text-sm text-muted-foreground">
                    List your practice and connect with families searching for ABA services in your area.
                  </p>
                </div>
                <Button asChild className="group/btn shrink-0 rounded-full bg-[#5788FF] px-6 py-5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(87,136,255,0.3)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-[#4A7AEE] hover:shadow-[0_8px_20px_rgba(87,136,255,0.4)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(87,136,255,0.2)]">
                  <Link href="/get-listed">
                    Get Listed Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-bounce-sm group-hover/btn:translate-x-0.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

        {/* Back to Top Button */}
        <BackToTop threshold={600} />
      </div>
    </>
  );
}
