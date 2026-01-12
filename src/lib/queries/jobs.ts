import { unstable_noStore as noStore } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import {
  type PositionType,
  type EmploymentType,
  type BenefitType,
  type JobTherapySetting,
  type JobScheduleType,
  type JobAgeGroup,
} from "@/lib/validations/jobs";
import type { PlanTier } from "@/lib/plans/features";
import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import {
  extractDbLocation,
  getStateCode,
  sortSearchResultsByRelevance,
  type DbLocation,
  type PlanTier as SharedPlanTier,
} from "@/lib/utils/location-utils";

// =============================================================================
// JOB DATA TYPES
// =============================================================================

export interface PublicJobPosting {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  positionType: PositionType;
  employmentTypes: EmploymentType[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: "hourly" | "annual" | null;
  remoteOption: boolean;
  requirements: string | null;
  benefits: BenefitType[];
  publishedAt: string;
  expiresAt: string | null;
  provider: {
    id: string;
    slug: string;
    agencyName: string;
    logoUrl: string | null;
    planTier: PlanTier;
    isVerified: boolean;
  };
  location: {
    id?: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  } | null;
}

export interface JobSearchResult {
  id: string;
  slug: string;
  title: string;
  /** Brief description/summary of the job for search result previews */
  description: string | null;
  positionType: PositionType;
  employmentTypes: EmploymentType[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: "hourly" | "annual" | null;
  remoteOption: boolean;
  publishedAt: string;
  /** Featured jobs appear at top of search results, above paid tier sorting */
  isFeatured: boolean;
  provider: {
    id: string;
    slug: string;
    agencyName: string;
    logoUrl: string | null;
    planTier: PlanTier;
    isVerified: boolean;
  };
  /**
   * Display location (resolved from custom location or agency location)
   * Priority: custom_city/custom_state > location relation > null
   */
  location: {
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  } | null;
  /**
   * Service states for remote/telehealth jobs
   * ['*'] = nationwide, ['NY', 'NJ'] = specific states, null = use location
   */
  serviceStates?: string[] | null;
  /** Distance in miles from search location (only when proximity search is used) */
  distance?: number;
  /** Formatted distance string for display (e.g., "5.2 mi") */
  distanceFormatted?: string;
}

export interface JobSearchFilters {
  positionTypes?: PositionType[];
  employmentTypes?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: "hourly" | "annual";
  remote?: boolean;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  postedWithin?: "24h" | "7d" | "30d";
  providerId?: string;
  /** Multi-select therapy settings (in_home, in_center, school_based, telehealth) */
  therapySettings?: JobTherapySetting[];
  /** Multi-select schedule types (daytime, after_school, evening) */
  scheduleTypes?: JobScheduleType[];
  /** Multi-select age groups (early_intervention, preschool, school_age, teens, adults) */
  ageGroups?: JobAgeGroup[];
}

export interface JobSearchParams {
  filters?: JobSearchFilters;
  page?: number;
  limit?: number;
  sort?: "relevance" | "date" | "salary" | "distance";
}

export interface JobSearchResponse {
  jobs: JobSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a job matches a state filter
 * Returns true if: service_states contains state (or '*') OR custom_state = state OR location.state = state
 */
function jobMatchesState(
  job: {
    service_states: string[] | null;
    custom_state: string | null;
    locations: DbLocation | DbLocation[] | null;
  },
  stateCode: string
): boolean {
  // 1. Check service_states (for remote/telehealth jobs)
  if (job.service_states && job.service_states.length > 0) {
    // '*' means nationwide - matches any state
    if (job.service_states.includes("*")) return true;
    if (job.service_states.includes(stateCode)) return true;
  }

  // 2. Check custom_state (for jobs with custom locations)
  if (job.custom_state && job.custom_state.toUpperCase() === stateCode) {
    return true;
  }

  // 3. Check location.state (existing behavior)
  const location = extractDbLocation(job.locations);
  if (location?.state && location.state.toUpperCase() === stateCode) {
    return true;
  }

  return false;
}

/**
 * Resolve display location for a job
 * Priority: custom_city/custom_state > location relation > null
 */
function resolveJobLocation(job: {
  custom_city: string | null;
  custom_state: string | null;
  locations: DbLocation | DbLocation[] | null;
}): { city: string; state: string; lat: number | null; lng: number | null } | null {
  // 1. Custom location takes priority (for jobs at different addresses than agency HQ)
  if (job.custom_city && job.custom_state) {
    return {
      city: job.custom_city,
      state: job.custom_state,
      lat: null, // Custom locations don't have coordinates yet
      lng: null,
    };
  }

  // 2. Fall back to location relation
  return extractDbLocation(job.locations);
}

// =============================================================================
// JOB QUERIES
// =============================================================================

/**
 * Get a single published job by slug
 */
export async function getPublishedJobBySlug(
  slug: string
): Promise<PublicJobPosting | null> {
  noStore();

  const supabase = await createAdminClient();

  const { data: job, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      requirements,
      benefits,
      published_at,
      expires_at,
      profile_id,
      location_id,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        id,
        city,
        state,
        latitude,
        longitude
      )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !job) {
    return null;
  }

  // Get logo URL and slug from listing
  const { data: listing } = await supabase
    .from("listings")
    .select("logo_url, slug")
    .eq("profile_id", job.profile_id)
    .single();

  const profile = job.profiles as unknown as {
    id: string;
    agency_name: string;
    plan_tier: string;
    subscription_status: string | null;
  };

  // Handle both array and single object cases for location relation
  const rawLocation = job.locations;
  const location = extractDbLocation(rawLocation);

  // Determine effective plan tier
  const isActiveSubscription =
    profile.subscription_status === "active" ||
    profile.subscription_status === "trialing";
  const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    positionType: job.position_type as PositionType,
    employmentTypes: (job.employment_type || []) as EmploymentType[],
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salaryType: job.salary_type as "hourly" | "annual" | null,
    remoteOption: job.remote_option,
    requirements: typeof job.requirements === "string" ? job.requirements : null,
    benefits: (job.benefits || []) as BenefitType[],
    publishedAt: job.published_at,
    expiresAt: job.expires_at,
    provider: {
      id: profile.id,
      slug: listing?.slug || "",
      agencyName: profile.agency_name,
      logoUrl: listing?.logo_url || null,
      planTier: effectiveTier,
      isVerified: effectiveTier !== "free",
    },
    location,
  };
}

/**
 * Search for published jobs with filters
 * Supports distance-based search when lat/lng are provided
 */
export async function searchJobs(
  params: JobSearchParams = {}
): Promise<JobSearchResponse> {
  noStore();

  const { filters = {}, page = 1, limit = 20, sort = "relevance" } = params;
  const offset = (page - 1) * limit;

  const supabase = await createAdminClient();

  // Check if this is a proximity search (has lat/lng)
  const isProximitySearch = filters.lat !== undefined && filters.lng !== undefined;
  // Only use radius when explicitly provided - don't default to 25 miles
  // This matches therapy search behavior: show all results in state, sorted by distance
  const searchRadius = filters.radius;

  // With service_states and custom_state, we need to handle state filtering in JS
  // to support OR logic: service_states contains state OR custom_state = state OR location.state = state
  // Use left join for locations to include remote jobs without physical locations
  const needsJsStateFilter = filters.state !== undefined;

  // Build base query - include lat/lng for distance calculation
  // Include new location flexibility columns
  let query = supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      published_at,
      is_featured,
      profile_id,
      service_states,
      custom_city,
      custom_state,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        city,
        state,
        latitude,
        longitude
      )
    `, { count: needsJsStateFilter || isProximitySearch ? undefined : "exact" })
    .eq("status", "published");

  // Apply filters
  if (filters.positionTypes && filters.positionTypes.length > 0) {
    query = query.in("position_type", filters.positionTypes);
  }

  if (filters.employmentTypes && filters.employmentTypes.length > 0) {
    query = query.overlaps("employment_type", filters.employmentTypes);
  }

  if (filters.remote === true) {
    query = query.eq("remote_option", true);
  }

  if (filters.providerId) {
    query = query.eq("profile_id", filters.providerId);
  }

  // NOTE: State filtering is done in JS to support OR logic:
  // service_states contains state OR custom_state = state OR location.state = state
  // This allows remote/telehealth jobs with service_states to appear in state searches
  // City is only used for display purposes (showing "near Edison, NJ")
  // All jobs in the state are shown and sorted by distance (matches therapy search behavior)

  // Posted within filter
  if (filters.postedWithin) {
    const now = new Date();
    let cutoffDate: Date;

    switch (filters.postedWithin) {
      case "24h":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    query = query.gte("published_at", cutoffDate.toISOString());
  }

  // Multi-select array filters
  if (filters.therapySettings && filters.therapySettings.length > 0) {
    query = query.overlaps("therapy_settings", filters.therapySettings);
  }

  if (filters.scheduleTypes && filters.scheduleTypes.length > 0) {
    query = query.overlaps("schedule_types", filters.scheduleTypes);
  }

  if (filters.ageGroups && filters.ageGroups.length > 0) {
    query = query.overlaps("age_groups", filters.ageGroups);
  }

  // For proximity search, we need to fetch all results to calculate distances
  // Then filter by radius and sort by distance
  if (isProximitySearch) {
    // Apply basic sorting first
    query = query.order("published_at", { ascending: false });

    // Fetch more results for proximity filtering (we'll filter by radius)
    const { data: jobs, error } = await query.limit(500);

    if (error) {
      console.error("[JOBS] Proximity search error:", JSON.stringify(error, null, 2));
      return { jobs: [], total: 0, page, totalPages: 0 };
    }

    // Get logo URLs and slugs for all providers
    const profileIds = [...new Set((jobs || []).map((j) => j.profile_id))];
    const { data: listings } = profileIds.length > 0 ? await supabase
      .from("listings")
      .select("profile_id, logo_url, slug")
      .in("profile_id", profileIds) : { data: [] };

    const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
    listings?.forEach((l) => {
      listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
    });

    // Filter by state first (if provided) using OR logic:
    // service_states contains state OR custom_state = state OR location.state = state
    let filteredJobs = jobs || [];
    if (filters.state) {
      const stateCode = getStateCode(filters.state) || filters.state.toUpperCase();
      filteredJobs = filteredJobs.filter((job) =>
        jobMatchesState(
          {
            service_states: job.service_states as string[] | null,
            custom_state: job.custom_state as string | null,
            locations: job.locations as DbLocation | DbLocation[] | null,
          },
          stateCode
        )
      );
    }

    // Transform and calculate distances
    const userLocation = { latitude: filters.lat!, longitude: filters.lng! };
    let results: JobSearchResult[] = filteredJobs.map((job) => {
      const profile = job.profiles as unknown as {
        id: string;
        agency_name: string;
        plan_tier: string;
        subscription_status: string | null;
      };
      const listingInfo = listingMap.get(job.profile_id);

      // Resolve display location (custom location > agency location)
      const location = resolveJobLocation({
        custom_city: job.custom_city as string | null,
        custom_state: job.custom_state as string | null,
        locations: job.locations as DbLocation | DbLocation[] | null,
      });

      // Calculate distance if location has coordinates
      // For custom locations without coordinates, we can't calculate distance
      let distance: number | undefined;
      let distanceFormatted: string | undefined;
      if (location?.lat && location?.lng) {
        distance = calculateDistance(userLocation, {
          latitude: location.lat,
          longitude: location.lng,
        });
        distanceFormatted = formatDistance(distance);
      }

      // Determine effective plan tier
      const isActiveSubscription =
        profile.subscription_status === "active" ||
        profile.subscription_status === "trialing";
      const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

      return {
        id: job.id,
        slug: job.slug,
        title: job.title,
        description: job.description,
        positionType: job.position_type as PositionType,
        employmentTypes: (job.employment_type || []) as EmploymentType[],
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryType: job.salary_type as "hourly" | "annual" | null,
        remoteOption: job.remote_option,
        publishedAt: job.published_at,
        isFeatured: job.is_featured || false,
        provider: {
          id: profile.id,
          slug: listingInfo?.slug || "",
          agencyName: profile.agency_name,
          logoUrl: listingInfo?.logo_url || null,
          planTier: effectiveTier,
          isVerified: effectiveTier !== "free",
        },
        location,
        serviceStates: job.service_states as string[] | null,
        distance,
        distanceFormatted,
      };
    });

    // Filter by radius only when explicitly provided
    // Otherwise show all jobs in state, sorted by distance (matching therapy search behavior)
    if (searchRadius !== undefined) {
      results = results.filter((job) => {
        // Include jobs without location coordinates (remote jobs) or within radius
        if (job.distance === undefined) return job.remoteOption;
        return job.distance <= searchRadius;
      });
    }

    // Sort: paid plans first (equal priority), then by distance
    // This matches therapy search: Featured → Paid (equal) → Free → Distance
    if (sort === "relevance" || sort === "distance") {
      // Use shared sorting utility by mapping to expected interface
      const sortableResults = results.map((job) => ({
        ...job,
        planTier: job.provider.planTier as SharedPlanTier,
        distanceMiles: job.distance,
      }));
      sortSearchResultsByRelevance(sortableResults);
      results = sortableResults;
    } else if (sort === "date") {
      results.sort((a, b) => {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    } else if (sort === "salary") {
      results.sort((a, b) => {
        const salaryA = a.salaryMax ?? 0;
        const salaryB = b.salaryMax ?? 0;
        return salaryB - salaryA;
      });
    }

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      jobs: paginatedResults,
      total,
      page,
      totalPages,
    };
  }

  // Non-proximity search
  // If we have a state filter, we need to fetch all and filter in JS for OR logic
  // Otherwise, we can use database pagination
  if (needsJsStateFilter) {
    // Fetch all results for JS filtering
    query = query.order("published_at", { ascending: false }).limit(500);
    const { data: jobs, error } = await query;

    if (error) {
      console.error("[JOBS] Search error:", JSON.stringify(error, null, 2));
      return { jobs: [], total: 0, page, totalPages: 0 };
    }

    // Get logo URLs and slugs for all providers
    const profileIds = [...new Set((jobs || []).map((j) => j.profile_id))];
    const { data: listings } = profileIds.length > 0 ? await supabase
      .from("listings")
      .select("profile_id, logo_url, slug")
      .in("profile_id", profileIds) : { data: [] };

    const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
    listings?.forEach((l) => {
      listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
    });

    // Filter by state using OR logic
    const stateCode = getStateCode(filters.state!) || filters.state!.toUpperCase();
    const filteredJobs = (jobs || []).filter((job) =>
      jobMatchesState(
        {
          service_states: job.service_states as string[] | null,
          custom_state: job.custom_state as string | null,
          locations: job.locations as DbLocation | DbLocation[] | null,
        },
        stateCode
      )
    );

    // Transform results
    const results: JobSearchResult[] = filteredJobs.map((job) => {
      const profile = job.profiles as unknown as {
        id: string;
        agency_name: string;
        plan_tier: string;
        subscription_status: string | null;
      };
      const listingInfo = listingMap.get(job.profile_id);

      // Resolve display location (custom location > agency location)
      const location = resolveJobLocation({
        custom_city: job.custom_city as string | null,
        custom_state: job.custom_state as string | null,
        locations: job.locations as DbLocation | DbLocation[] | null,
      });

      // Determine effective plan tier
      const isActiveSubscription =
        profile.subscription_status === "active" ||
        profile.subscription_status === "trialing";
      const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

      return {
        id: job.id,
        slug: job.slug,
        title: job.title,
        description: job.description,
        positionType: job.position_type as PositionType,
        employmentTypes: (job.employment_type || []) as EmploymentType[],
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryType: job.salary_type as "hourly" | "annual" | null,
        remoteOption: job.remote_option,
        publishedAt: job.published_at,
        isFeatured: job.is_featured || false,
        provider: {
          id: profile.id,
          slug: listingInfo?.slug || "",
          agencyName: profile.agency_name,
          logoUrl: listingInfo?.logo_url || null,
          planTier: effectiveTier,
          isVerified: effectiveTier !== "free",
        },
        location,
        serviceStates: job.service_states as string[] | null,
      };
    });

    // Apply sorting
    if (sort === "relevance") {
      results.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        const aIsPaid = a.provider.planTier !== "free";
        const bIsPaid = b.provider.planTier !== "free";
        if (aIsPaid && !bIsPaid) return -1;
        if (!aIsPaid && bIsPaid) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    } else if (sort === "salary") {
      results.sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0));
    }
    // date sort already applied via order()

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      jobs: paginatedResults,
      total,
      page,
      totalPages,
    };
  }

  // No state filter - use database pagination
  switch (sort) {
    case "date":
      query = query.order("published_at", { ascending: false });
      break;
    case "salary":
      query = query.order("salary_max", { ascending: false, nullsFirst: false });
      break;
    case "relevance":
    default:
      query = query.order("published_at", { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: jobs, error, count } = await query;

  if (error) {
    console.error("[JOBS] Search error:", JSON.stringify(error, null, 2));
    console.error("[JOBS] Error message:", error.message);
    console.error("[JOBS] Error code:", error.code);
    console.error("[JOBS] Error details:", error.details);
    return { jobs: [], total: 0, page, totalPages: 0 };
  }

  // Get logo URLs and slugs for all providers
  const profileIds = [...new Set((jobs || []).map((j) => j.profile_id))];
  const { data: listings } = profileIds.length > 0 ? await supabase
    .from("listings")
    .select("profile_id, logo_url, slug")
    .in("profile_id", profileIds) : { data: [] };

  const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
  listings?.forEach((l) => {
    listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
  });

  // Transform results
  const results: JobSearchResult[] = (jobs || []).map((job) => {
    const profile = job.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };
    const listingInfo = listingMap.get(job.profile_id);

    // Resolve display location (custom location > agency location)
    const location = resolveJobLocation({
      custom_city: job.custom_city as string | null,
      custom_state: job.custom_state as string | null,
      locations: job.locations as DbLocation | DbLocation[] | null,
    });

    // Determine effective plan tier
    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      publishedAt: job.published_at,
      isFeatured: job.is_featured || false,
      provider: {
        id: profile.id,
        slug: listingInfo?.slug || "",
        agencyName: profile.agency_name,
        logoUrl: listingInfo?.logo_url || null,
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
      },
      location,
      serviceStates: job.service_states as string[] | null,
    };
  });

  // Sort by plan tier for relevance: Featured → Paid (equal priority) → Free → then by date
  // This matches therapy search sorting logic
  if (sort === "relevance") {
    results.sort((a, b) => {
      // 1. Featured jobs first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      // 2. Paid tiers (Enterprise OR Pro) have equal priority over free
      const aIsPaid = a.provider.planTier !== "free";
      const bIsPaid = b.provider.planTier !== "free";
      if (aIsPaid && !bIsPaid) return -1;
      if (!aIsPaid && bIsPaid) return 1;
      // 3. Then by date
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    jobs: results,
    total,
    page,
    totalPages,
  };
}

/**
 * Get jobs by state
 * Includes jobs where: service_states contains state OR custom_state = state OR location.state = state
 */
export async function getJobsByState(
  stateSlug: string,
  limit = 50
): Promise<{ jobs: JobSearchResult[]; total: number }> {
  noStore();

  // Convert slug to state code (e.g., "new-jersey" -> "NJ")
  const stateCode = getStateCode(stateSlug);
  if (!stateCode) {
    return { jobs: [], total: 0 };
  }

  const supabase = await createAdminClient();

  // Fetch all jobs and filter in JS for OR logic
  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      published_at,
      is_featured,
      profile_id,
      service_states,
      custom_city,
      custom_state,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        city,
        state,
        latitude,
        longitude
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[JOBS] State search error:", JSON.stringify(error, null, 2));
    return { jobs: [], total: 0 };
  }

  // Filter by state using OR logic
  const filteredJobs = (jobs || []).filter((job) =>
    jobMatchesState(
      {
        service_states: job.service_states as string[] | null,
        custom_state: job.custom_state as string | null,
        locations: job.locations as DbLocation | DbLocation[] | null,
      },
      stateCode
    )
  );

  // Get logo URLs and slugs
  const profileIds = [...new Set(filteredJobs.map((j) => j.profile_id))];
  const { data: listings } = profileIds.length > 0 ? await supabase
    .from("listings")
    .select("profile_id, logo_url, slug")
    .in("profile_id", profileIds) : { data: [] };

  const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
  listings?.forEach((l) => {
    listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
  });

  const results: JobSearchResult[] = filteredJobs.slice(0, limit).map((job) => {
    const profile = job.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };
    const listingInfo = listingMap.get(job.profile_id);

    // Resolve display location (custom location > agency location)
    const location = resolveJobLocation({
      custom_city: job.custom_city as string | null,
      custom_state: job.custom_state as string | null,
      locations: job.locations as DbLocation | DbLocation[] | null,
    });

    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      publishedAt: job.published_at,
      isFeatured: job.is_featured || false,
      provider: {
        id: profile.id,
        slug: listingInfo?.slug || "",
        agencyName: profile.agency_name,
        logoUrl: listingInfo?.logo_url || null,
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
      },
      location,
      serviceStates: job.service_states as string[] | null,
    };
  });

  return { jobs: results, total: filteredJobs.length };
}

/**
 * Get jobs by city
 * Includes jobs where: custom_city matches OR location.city matches (within state)
 */
export async function getJobsByCity(
  stateSlug: string,
  citySlug: string,
  limit = 50
): Promise<{ jobs: JobSearchResult[]; total: number }> {
  noStore();

  const stateCode = getStateCode(stateSlug);
  if (!stateCode) {
    return { jobs: [], total: 0 };
  }

  // Convert city slug to city name (e.g., "new-york-city" -> "New York City")
  const cityName = citySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const supabase = await createAdminClient();

  // Fetch jobs and filter in JS to handle custom_city OR location.city
  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      published_at,
      is_featured,
      profile_id,
      service_states,
      custom_city,
      custom_state,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        city,
        state,
        latitude,
        longitude
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[JOBS] City search error:", error);
    return { jobs: [], total: 0 };
  }

  // Filter by city + state (custom location OR agency location)
  const filteredJobs = (jobs || []).filter((job) => {
    // Check custom location
    if (
      job.custom_city &&
      job.custom_state &&
      job.custom_city.toLowerCase() === cityName.toLowerCase() &&
      job.custom_state.toUpperCase() === stateCode
    ) {
      return true;
    }

    // Check agency location
    const location = extractDbLocation(job.locations as DbLocation | DbLocation[] | null);
    if (
      location?.city?.toLowerCase() === cityName.toLowerCase() &&
      location?.state?.toUpperCase() === stateCode
    ) {
      return true;
    }

    return false;
  });

  // Get logo URLs and slugs
  const profileIds = [...new Set(filteredJobs.map((j) => j.profile_id))];
  const { data: listings } = profileIds.length > 0 ? await supabase
    .from("listings")
    .select("profile_id, logo_url, slug")
    .in("profile_id", profileIds) : { data: [] };

  const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
  listings?.forEach((l) => {
    listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
  });

  const results: JobSearchResult[] = filteredJobs.slice(0, limit).map((job) => {
    const profile = job.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };
    const listingInfo = listingMap.get(job.profile_id);

    // Resolve display location (custom location > agency location)
    const location = resolveJobLocation({
      custom_city: job.custom_city as string | null,
      custom_state: job.custom_state as string | null,
      locations: job.locations as DbLocation | DbLocation[] | null,
    });

    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      publishedAt: job.published_at,
      isFeatured: job.is_featured || false,
      provider: {
        id: profile.id,
        slug: listingInfo?.slug || "",
        agencyName: profile.agency_name,
        logoUrl: listingInfo?.logo_url || null,
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
      },
      location,
      serviceStates: job.service_states as string[] | null,
    };
  });

  return { jobs: results, total: filteredJobs.length };
}

/**
 * Get jobs for a specific provider
 */
export async function getJobsByProvider(
  providerSlug: string
): Promise<JobSearchResult[]> {
  noStore();

  const supabase = await createAdminClient();

  // First, look up the listing by slug to get the profile_id
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("profile_id, logo_url, slug")
    .eq("slug", providerSlug)
    .single();

  if (listingError || !listing) {
    return [];
  }

  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      published_at,
      is_featured,
      profile_id,
      service_states,
      custom_city,
      custom_state,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        city,
        state,
        latitude,
        longitude
      )
    `)
    .eq("status", "published")
    .eq("profile_id", listing.profile_id)
    .order("published_at", { ascending: false });

  if (error || !jobs || jobs.length === 0) {
    return [];
  }

  return jobs.map((job) => {
    const profile = job.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };

    // Resolve display location (custom location > agency location)
    const location = resolveJobLocation({
      custom_city: job.custom_city as string | null,
      custom_state: job.custom_state as string | null,
      locations: job.locations as DbLocation | DbLocation[] | null,
    });

    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      publishedAt: job.published_at,
      isFeatured: job.is_featured || false,
      provider: {
        id: profile.id,
        slug: listing.slug,
        agencyName: profile.agency_name,
        logoUrl: listing.logo_url || null,
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
      },
      location,
      serviceStates: job.service_states as string[] | null,
    };
  });
}

/**
 * Get featured/recent jobs for homepage
 */
export async function getFeaturedJobs(limit = 6): Promise<JobSearchResult[]> {
  noStore();

  const supabase = await createAdminClient();

  // Get published jobs, prioritizing featured and paid plans
  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      slug,
      title,
      description,
      position_type,
      employment_type,
      salary_min,
      salary_max,
      salary_type,
      remote_option,
      published_at,
      is_featured,
      profile_id,
      service_states,
      custom_city,
      custom_state,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      ),
      locations (
        city,
        state,
        latitude,
        longitude
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit * 2); // Fetch more to allow sorting by tier

  if (error || !jobs) {
    return [];
  }

  // Get logo URLs and slugs from listings
  const profileIds = [...new Set(jobs.map((j) => j.profile_id))];
  const { data: listings } = await supabase
    .from("listings")
    .select("profile_id, logo_url, slug")
    .in("profile_id", profileIds);

  const listingMap = new Map<string, { logo_url: string | null; slug: string }>();
  listings?.forEach((l) => {
    listingMap.set(l.profile_id, { logo_url: l.logo_url, slug: l.slug });
  });

  const results: JobSearchResult[] = jobs.map((job) => {
    const profile = job.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };
    const listingInfo = listingMap.get(job.profile_id);

    // Resolve display location (custom location > agency location)
    const location = resolveJobLocation({
      custom_city: job.custom_city as string | null,
      custom_state: job.custom_state as string | null,
      locations: job.locations as DbLocation | DbLocation[] | null,
    });

    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      publishedAt: job.published_at,
      isFeatured: job.is_featured || false,
      provider: {
        id: profile.id,
        slug: listingInfo?.slug || "",
        agencyName: profile.agency_name,
        logoUrl: listingInfo?.logo_url || null,
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
      },
      location,
      serviceStates: job.service_states as string[] | null,
    };
  });

  // Sort: Featured → Paid (equal priority) → Free → then by date
  results.sort((a, b) => {
    // 1. Featured jobs first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    // 2. Paid tiers (Enterprise OR Pro) have equal priority over free
    const aIsPaid = a.provider.planTier !== "free";
    const bIsPaid = b.provider.planTier !== "free";
    if (aIsPaid && !bIsPaid) return -1;
    if (!aIsPaid && bIsPaid) return 1;
    // 3. Then by date
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return results.slice(0, limit);
}

/**
 * Get total count of published jobs
 */
export async function getTotalJobCount(): Promise<number> {
  noStore();

  const supabase = await createAdminClient();

  const { count } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  return count || 0;
}

/**
 * Get job counts by state
 * Counts jobs from service_states, custom_state, and location.state
 * Note: Nationwide jobs (service_states = ['*']) are counted once for display but will appear in all state searches
 */
export async function getJobCountsByState(): Promise<Map<string, number>> {
  noStore();

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select(`
      service_states,
      custom_state,
      locations (
        state
      )
    `)
    .eq("status", "published");

  if (error || !data) {
    return new Map();
  }

  const counts = new Map<string, number>();

  data.forEach((job) => {
    // Track which states this job has been counted for
    const jobStates = new Set<string>();

    // 1. Count from service_states (excluding '*' for per-state counts)
    const serviceStates = job.service_states as string[] | null;
    if (serviceStates && serviceStates.length > 0) {
      serviceStates.forEach((state) => {
        if (state !== "*") {
          jobStates.add(state.toUpperCase());
        }
      });
    }

    // 2. Count from custom_state
    const customState = job.custom_state as string | null;
    if (customState) {
      jobStates.add(customState.toUpperCase());
    }

    // 3. Count from location.state
    const location = extractDbLocation(job.locations as DbLocation | DbLocation[] | null);
    if (location?.state) {
      jobStates.add(location.state.toUpperCase());
    }

    // Add to counts
    jobStates.forEach((state) => {
      const currentCount = counts.get(state) || 0;
      counts.set(state, currentCount + 1);
    });
  });

  return counts;
}

// =============================================================================
// EMPLOYER TYPES & QUERIES
// =============================================================================

export interface EmployerListItem {
  id: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  headline: string | null;
  planTier: PlanTier;
  isVerified: boolean;
  primaryLocation: {
    city: string;
    state: string;
  } | null;
  locationCount: number;
  openJobCount: number;
}

/**
 * Get all employers with published listings
 * Optionally filter to only those with open job postings
 */
export async function getAllEmployers(options?: {
  hiringOnly?: boolean;
}): Promise<EmployerListItem[]> {
  noStore();

  const supabase = await createAdminClient();

  // Get all published listings with their profiles
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select(`
      profile_id,
      logo_url,
      headline,
      slug,
      profiles!inner (
        id,
        agency_name,
        plan_tier,
        subscription_status
      )
    `)
    .eq("status", "published");

  if (listingsError || !listings) {
    console.error("[EMPLOYERS] Error fetching employers:", listingsError);
    return [];
  }

  if (listings.length === 0) {
    return [];
  }

  const profileIds = listings.map((l) => l.profile_id);

  // Get job counts for each profile
  const { data: jobCounts } = await supabase
    .from("job_postings")
    .select("profile_id")
    .eq("status", "published")
    .in("profile_id", profileIds);

  const profileJobCounts = new Map<string, number>();
  jobCounts?.forEach((job) => {
    const count = profileJobCounts.get(job.profile_id) || 0;
    profileJobCounts.set(job.profile_id, count + 1);
  });

  // Get locations for each profile
  const { data: locations } = await supabase
    .from("locations")
    .select("profile_id, city, state, is_primary")
    .in("profile_id", profileIds)
    .order("is_primary", { ascending: false });

  // Group locations by profile
  const locationMap = new Map<string, { city: string; state: string }[]>();
  locations?.forEach((loc) => {
    const existing = locationMap.get(loc.profile_id) || [];
    existing.push({ city: loc.city, state: loc.state });
    locationMap.set(loc.profile_id, existing);
  });

  // Build employer list
  const employers: EmployerListItem[] = [];

  listings.forEach((listing) => {
    // Skip listings without a slug (required for routing)
    if (!listing.slug) {
      return;
    }

    const profile = listing.profiles as unknown as {
      id: string;
      agency_name: string;
      plan_tier: string;
      subscription_status: string | null;
    };

    const profileLocations = locationMap.get(listing.profile_id) || [];
    const jobCount = profileJobCounts.get(listing.profile_id) || 0;

    // If hiringOnly filter is set, skip employers with no jobs
    if (options?.hiringOnly && jobCount === 0) {
      return;
    }

    const isActiveSubscription =
      profile.subscription_status === "active" ||
      profile.subscription_status === "trialing";
    const effectiveTier = (isActiveSubscription ? profile.plan_tier : "free") as PlanTier;

    employers.push({
      id: listing.profile_id,
      slug: listing.slug,
      agencyName: profile.agency_name,
      logoUrl: listing.logo_url || null,
      headline: listing.headline || null,
      planTier: effectiveTier,
      isVerified: effectiveTier !== "free",
      primaryLocation: profileLocations.length > 0 ? profileLocations[0] : null,
      locationCount: profileLocations.length,
      openJobCount: jobCount,
    });
  });

  // Sort: paid tiers first (equal priority), then by job count, then alphabetically
  employers.sort((a, b) => {
    // Paid tiers (Enterprise OR Pro) have equal priority over free
    const aIsPaid = a.planTier !== "free";
    const bIsPaid = b.planTier !== "free";
    if (aIsPaid && !bIsPaid) return -1;
    if (!aIsPaid && bIsPaid) return 1;
    if (b.openJobCount !== a.openJobCount) return b.openJobCount - a.openJobCount;
    return a.agencyName.localeCompare(b.agencyName);
  });

  return employers;
}

/**
 * Get total count of employers with published jobs
 */
export async function getTotalEmployerCount(): Promise<number> {
  noStore();

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select("profile_id")
    .eq("status", "published");

  if (error || !data) {
    return 0;
  }

  const uniqueProfileIds = new Set(data.map((d) => d.profile_id));
  return uniqueProfileIds.size;
}

