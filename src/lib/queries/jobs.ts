import { unstable_noStore as noStore } from "next/cache";

import { calculateDistance, formatDistance } from "@/lib/geo/distance";
import type { PlanTier } from "@/lib/plans/features";
import { queryConvexUnauthenticated } from "@/lib/platform/convex/server";
import {
  type BenefitType,
  type EmploymentType,
  type JobAgeGroup,
  type JobScheduleType,
  type JobTherapySetting,
  type PositionType,
} from "@/lib/validations/jobs";
import {
  getStateCode,
  sortSearchResultsByRelevance,
  type PlanTier as SharedPlanTier,
} from "@/lib/utils/location-utils";

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
  description: string | null;
  positionType: PositionType;
  employmentTypes: EmploymentType[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: "hourly" | "annual" | null;
  remoteOption: boolean;
  publishedAt: string;
  isFeatured: boolean;
  provider: {
    id: string;
    slug: string;
    agencyName: string;
    logoUrl: string | null;
    planTier: PlanTier;
    isVerified: boolean;
  };
  location: {
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  } | null;
  serviceStates?: string[] | null;
  distance?: number;
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
  radius?: number;
  postedWithin?: "24h" | "7d" | "30d";
  providerId?: string;
  therapySettings?: JobTherapySetting[];
  scheduleTypes?: JobScheduleType[];
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

interface ConvexPublicJob {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  positionType: string;
  employmentTypes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  remoteOption: boolean;
  requirements: string | null;
  benefits: string[];
  therapySettings: string[];
  scheduleTypes: string[];
  ageGroups: string[];
  publishedAt: string;
  expiresAt: string | null;
  isFeatured: boolean;
  provider: {
    id: string;
    slug: string;
    agencyName: string;
    logoUrl: string | null;
    planTier: string;
    isVerified: boolean;
  };
  location: {
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  } | null;
  serviceStates: string[] | null;
}

interface ConvexPublicEmployer {
  id: string;
  slug: string;
  agencyName: string;
  logoUrl: string | null;
  headline: string | null;
  planTier: string;
  isVerified: boolean;
  primaryLocation: { city: string; state: string } | null;
  locationCount: number;
  openJobCount: number;
}

function mapConvexJobToSearchResult(job: ConvexPublicJob): JobSearchResult {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    positionType: job.positionType as PositionType,
    employmentTypes: job.employmentTypes as EmploymentType[],
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType as "hourly" | "annual" | null,
    remoteOption: job.remoteOption,
    publishedAt: job.publishedAt,
    isFeatured: job.isFeatured,
    provider: {
      ...job.provider,
      planTier: job.provider.planTier as PlanTier,
    },
    location: job.location,
    serviceStates: job.serviceStates,
  };
}

function mapConvexEmployerToListItem(
  employer: ConvexPublicEmployer,
): EmployerListItem {
  return {
    id: employer.id,
    slug: employer.slug,
    agencyName: employer.agencyName,
    logoUrl: employer.logoUrl,
    headline: employer.headline,
    planTier: employer.planTier as PlanTier,
    isVerified: employer.isVerified,
    primaryLocation: employer.primaryLocation,
    locationCount: employer.locationCount,
    openJobCount: employer.openJobCount,
  };
}

function convexJobMatchesState(job: ConvexPublicJob, stateCode: string): boolean {
  if (job.serviceStates && job.serviceStates.length > 0) {
    if (job.serviceStates.includes("*")) return true;
    if (job.serviceStates.includes(stateCode)) return true;
  }
  if (job.location?.state?.toUpperCase() === stateCode) return true;
  return false;
}

function citySlugToName(citySlug: string) {
  return citySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function applyDistance(
  job: JobSearchResult,
  filters: JobSearchFilters,
): JobSearchResult {
  if (
    typeof filters.lat !== "number" ||
    typeof filters.lng !== "number" ||
    job.location?.lat == null ||
    job.location.lng == null
  ) {
    return job;
  }

  const distance = calculateDistance(
    { latitude: filters.lat, longitude: filters.lng },
    { latitude: job.location.lat, longitude: job.location.lng },
  );

  return {
    ...job,
    distance,
    distanceFormatted: formatDistance(distance),
  };
}

function filterJobs(
  jobs: ConvexPublicJob[],
  filters: JobSearchFilters,
): JobSearchResult[] {
  let filtered = jobs;

  if (filters.positionTypes?.length) {
    filtered = filtered.filter((job) =>
      filters.positionTypes!.includes(job.positionType as PositionType),
    );
  }
  if (filters.employmentTypes?.length) {
    filtered = filtered.filter((job) =>
      job.employmentTypes.some((entry) =>
        filters.employmentTypes!.includes(entry as EmploymentType),
      ),
    );
  }
  if (filters.salaryType) {
    filtered = filtered.filter((job) => job.salaryType === filters.salaryType);
  }
  if (typeof filters.salaryMin === "number") {
    filtered = filtered.filter((job) => (job.salaryMax ?? 0) >= filters.salaryMin!);
  }
  if (typeof filters.salaryMax === "number") {
    filtered = filtered.filter((job) => (job.salaryMin ?? 0) <= filters.salaryMax!);
  }
  if (filters.remote === true) {
    filtered = filtered.filter((job) => job.remoteOption);
  }
  if (filters.providerId) {
    filtered = filtered.filter((job) => job.provider.id === filters.providerId);
  }
  if (filters.state) {
    const stateCode = getStateCode(filters.state) || filters.state.toUpperCase();
    filtered = filtered.filter((job) => convexJobMatchesState(job, stateCode));
  }
  if (filters.city) {
    const city = filters.city.trim().toLowerCase();
    filtered = filtered.filter((job) => job.location?.city.toLowerCase() === city);
  }
  if (filters.postedWithin) {
    const now = Date.now();
    const cutoff =
      filters.postedWithin === "24h"
        ? now - 24 * 60 * 60 * 1000
        : filters.postedWithin === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((job) => new Date(job.publishedAt).getTime() >= cutoff);
  }
  if (filters.therapySettings?.length) {
    filtered = filtered.filter((job) =>
      job.therapySettings.some((entry) =>
        (filters.therapySettings as string[]).includes(entry),
      ),
    );
  }
  if (filters.scheduleTypes?.length) {
    filtered = filtered.filter((job) =>
      job.scheduleTypes.some((entry) =>
        (filters.scheduleTypes as string[]).includes(entry),
      ),
    );
  }
  if (filters.ageGroups?.length) {
    filtered = filtered.filter((job) =>
      job.ageGroups.some((entry) =>
        (filters.ageGroups as string[]).includes(entry),
      ),
    );
  }

  return filtered.map((job) => applyDistance(mapConvexJobToSearchResult(job), filters));
}

function sortJobs(
  jobs: JobSearchResult[],
  sort: JobSearchParams["sort"],
): JobSearchResult[] {
  const results = [...jobs];

  if (sort === "date") {
    results.sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );
    return results;
  }

  if (sort === "salary") {
    results.sort((left, right) => (right.salaryMax ?? 0) - (left.salaryMax ?? 0));
    return results;
  }

  const sortable = results.map((job) => ({
    ...job,
    planTier: job.provider.planTier as SharedPlanTier,
    distanceMiles: job.distance,
  }));
  sortSearchResultsByRelevance(sortable);
  return sortable;
}

async function getAllPublicJobs() {
  return queryConvexUnauthenticated<ConvexPublicJob[]>("jobs:getPublicJobs", {});
}

export async function getPublishedJobBySlug(
  slug: string,
): Promise<PublicJobPosting | null> {
  noStore();

  const job = await queryConvexUnauthenticated<ConvexPublicJob | null>(
    "jobs:getPublicJobBySlug",
    { slug },
  );
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    positionType: job.positionType as PositionType,
    employmentTypes: job.employmentTypes as EmploymentType[],
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType as "hourly" | "annual" | null,
    remoteOption: job.remoteOption,
    requirements: job.requirements,
    benefits: job.benefits as BenefitType[],
    publishedAt: job.publishedAt,
    expiresAt: job.expiresAt,
    provider: {
      ...job.provider,
      planTier: job.provider.planTier as PlanTier,
    },
    location: job.location,
  };
}

export async function searchJobs(
  params: JobSearchParams = {},
): Promise<JobSearchResponse> {
  noStore();

  const { filters = {}, page = 1, limit = 20, sort = "relevance" } = params;
  const offset = (page - 1) * limit;

  let results = filterJobs(await getAllPublicJobs(), filters);

  if (
    typeof filters.lat === "number" &&
    typeof filters.lng === "number" &&
    typeof filters.radius === "number"
  ) {
    results = results.filter((job) => {
      if (job.distance === undefined) {
        return job.remoteOption;
      }
      return job.distance <= filters.radius!;
    });
  }

  results = sortJobs(results, sort);

  const total = results.length;
  const totalPages = Math.ceil(total / limit);

  return {
    jobs: results.slice(offset, offset + limit),
    total,
    page,
    totalPages,
  };
}

export async function getJobsByState(
  stateSlug: string,
  limit = 50,
): Promise<{ jobs: JobSearchResult[]; total: number }> {
  noStore();

  const stateCode = getStateCode(stateSlug);
  if (!stateCode) {
    return { jobs: [], total: 0 };
  }

  const jobs = (await getAllPublicJobs()).filter((job) =>
    convexJobMatchesState(job, stateCode),
  );
  return {
    jobs: jobs.slice(0, limit).map(mapConvexJobToSearchResult),
    total: jobs.length,
  };
}

export async function getJobsByCity(
  stateSlug: string,
  citySlug: string,
  limit = 50,
): Promise<{ jobs: JobSearchResult[]; total: number }> {
  noStore();

  const stateCode = getStateCode(stateSlug);
  if (!stateCode) {
    return { jobs: [], total: 0 };
  }

  const cityName = citySlugToName(citySlug).toLowerCase();
  const jobs = (await getAllPublicJobs()).filter((job) => {
    if (!job.location) {
      return false;
    }
    return (
      job.location.city.toLowerCase() === cityName &&
      job.location.state.toUpperCase() === stateCode
    );
  });

  return {
    jobs: jobs.slice(0, limit).map(mapConvexJobToSearchResult),
    total: jobs.length,
  };
}

export async function getJobsByProvider(
  providerSlug: string,
): Promise<JobSearchResult[]> {
  noStore();

  const jobs = await queryConvexUnauthenticated<ConvexPublicJob[]>(
    "jobs:getPublicJobsByProvider",
    { providerSlug },
  );
  return jobs.map(mapConvexJobToSearchResult);
}

export async function getFeaturedJobs(limit = 6): Promise<JobSearchResult[]> {
  noStore();

  const results = (await getAllPublicJobs()).map(mapConvexJobToSearchResult);
  results.sort((left, right) => {
    if (left.isFeatured && !right.isFeatured) return -1;
    if (!left.isFeatured && right.isFeatured) return 1;
    const leftIsPaid = left.provider.planTier !== "free";
    const rightIsPaid = right.provider.planTier !== "free";
    if (leftIsPaid && !rightIsPaid) return -1;
    if (!leftIsPaid && rightIsPaid) return 1;
    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });
  return results.slice(0, limit);
}

export async function getTotalJobCount(): Promise<number> {
  noStore();
  return (await getAllPublicJobs()).length;
}

export async function getJobCountsByState(): Promise<Map<string, number>> {
  noStore();

  const counts = new Map<string, number>();
  for (const job of await getAllPublicJobs()) {
    const jobStates = new Set<string>();
    if (job.serviceStates?.length) {
      job.serviceStates.forEach((state) => {
        if (state !== "*") {
          jobStates.add(state.toUpperCase());
        }
      });
    }
    if (job.location?.state) {
      jobStates.add(job.location.state.toUpperCase());
    }
    jobStates.forEach((state) => {
      counts.set(state, (counts.get(state) || 0) + 1);
    });
  }
  return counts;
}

export async function getAllEmployers(options?: {
  hiringOnly?: boolean;
}): Promise<EmployerListItem[]> {
  noStore();

  const employers = await queryConvexUnauthenticated<ConvexPublicEmployer[]>(
    "jobs:getPublicEmployers",
    { hiringOnly: options?.hiringOnly ?? false },
  );
  return employers.map(mapConvexEmployerToListItem);
}

export async function getTotalEmployerCount(): Promise<number> {
  noStore();
  return queryConvexUnauthenticated<number>("jobs:getPublicEmployerCount", {});
}
