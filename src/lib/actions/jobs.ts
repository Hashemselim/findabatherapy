"use server";

import { revalidatePath } from "next/cache";

import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  updateJobStatusSchema,
  type BenefitType,
  type CreateJobPostingData,
  type EmploymentType,
  type JobAgeGroup,
  type JobScheduleType,
  type JobStatus,
  type JobTherapySetting,
  type PositionType,
  type UpdateJobPostingData,
} from "@/lib/validations/jobs";
import { type PlanTier } from "@/lib/plans/features";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface JobPostingData {
  id: string;
  profileId: string;
  locationId: string | null;
  customCity: string | null;
  customState: string | null;
  serviceStates: string[] | null;
  title: string;
  slug: string;
  description: string | null;
  positionType: PositionType;
  employmentTypes: EmploymentType[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: "hourly" | "annual" | null;
  remoteOption: boolean;
  requirements: string | null;
  benefits: BenefitType[];
  therapySettings: JobTherapySetting[];
  scheduleTypes: JobScheduleType[];
  ageGroups: JobAgeGroup[];
  status: JobStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostingWithRelations extends JobPostingData {
  profile: {
    agencyName: string;
    contactEmail: string;
    logoUrl: string | null;
    planTier: PlanTier;
    subscriptionStatus: string | null;
  };
  location: {
    id: string;
    city: string;
    state: string;
    street: string | null;
  } | null;
  applicationCount: number;
}

export interface JobPostingSummary {
  id: string;
  title: string;
  slug: string;
  positionType: PositionType;
  status: JobStatus;
  publishedAt: string | null;
  createdAt: string;
  applicationCount: number;
  location: {
    city: string;
    state: string;
  } | null;
}

async function getConvexJobRevalidationTargets(jobId?: string) {
  const [job, providerSlug] = await Promise.all([
    jobId
      ? queryConvex<JobPostingWithRelations | null>("jobs:getDashboardJobPosting", { id: jobId }).catch(() => null)
      : Promise.resolve(null),
    queryConvex<string | null>("listings:getCurrentListingSlug", {}).catch(() => null),
  ]);

  return {
    jobSlug: job?.slug ?? null,
    providerSlug,
  };
}

function revalidateConvexPublicJobPaths(params: {
  jobSlug?: string | null;
  providerSlug?: string | null;
}) {
  revalidatePath("/jobs/search");
  revalidatePath("/jobs/employers");

  if (params.jobSlug) {
    revalidatePath(`/job/${params.jobSlug}`);
  }

  if (params.providerSlug) {
    revalidatePath(`/jobs/employers/${params.providerSlug}`);
  }
}

/**
 * Get all job postings for the current user.
 */
export async function getJobPostings(): Promise<ActionResult<JobPostingSummary[]>> {
  try {
    const result = await queryConvex<JobPostingSummary[]>("jobs:getDashboardJobPostings", {});
    return { success: true, data: result };
  } catch (error) {
    console.error("[JOBS] getJobPostings error:", error);
    return { success: false, error: "We could not load your job postings." };
  }
}

/**
 * Get a single job posting by ID (for edit page).
 */
export async function getJobPosting(id: string): Promise<ActionResult<JobPostingWithRelations>> {
  try {
    const result = await queryConvex<JobPostingWithRelations | null>("jobs:getDashboardJobPosting", { id });
    if (!result) {
      return { success: false, error: "Job posting not found" };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("[JOBS] getJobPosting error:", error);
    return { success: false, error: "We could not load this job posting." };
  }
}

/**
 * Create a new job posting.
 */
export async function createJobPosting(data: CreateJobPostingData): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = createJobPostingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const result = await mutateConvex<{ id: string; slug: string }>("jobs:createDashboardJobPosting", {
      title: parsed.data.title,
      description: parsed.data.description,
      positionType: parsed.data.positionType,
      employmentTypes: parsed.data.employmentTypes,
      locationId: parsed.data.locationId || null,
      customCity: parsed.data.customCity || null,
      customState: parsed.data.customState || null,
      serviceStates: parsed.data.serviceStates || null,
      remoteOption: parsed.data.remoteOption,
      showSalary: parsed.data.showSalary,
      salaryType: parsed.data.salaryType ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
      requirements: parsed.data.requirements || null,
      benefits: parsed.data.benefits || [],
      therapySettings: parsed.data.therapySettings || [],
      scheduleTypes: parsed.data.scheduleTypes || [],
      ageGroups: parsed.data.ageGroups || [],
      status: parsed.data.status,
      expiresAt: parsed.data.expiresAt || null,
    });

    revalidatePath("/dashboard/jobs");
    revalidateConvexPublicJobPaths({
      jobSlug: result.slug,
      providerSlug: await queryConvex<string | null>("listings:getCurrentListingSlug", {}).catch(() => null),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("[JOBS] createJobPosting error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "We could not create your job posting. Please try again.",
    };
  }
}

/**
 * Update a job posting.
 */
export async function updateJobPosting(
  id: string,
  data: UpdateJobPostingData
): Promise<ActionResult> {
  const parsed = updateJobPostingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const targets = await getConvexJobRevalidationTargets(id);
    await mutateConvex("jobs:updateDashboardJobPosting", {
      id,
      ...parsed.data,
    });
    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${id}`);
    revalidateConvexPublicJobPaths(targets);
    return { success: true };
  } catch (error) {
    console.error("[JOBS] updateJobPosting error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "We could not save your job posting. Please try again.",
    };
  }
}

/**
 * Update job posting status.
 */
export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<ActionResult> {
  const parsed = updateJobStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status" };
  }

  try {
    const targets = await getConvexJobRevalidationTargets(id);
    await mutateConvex("jobs:updateDashboardJobStatus", {
      id,
      status: parsed.data.status,
    });
    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${id}`);
    revalidateConvexPublicJobPaths(targets);
    return { success: true };
  } catch (error) {
    console.error("[JOBS] updateJobStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "We could not update the job status. Please try again.",
    };
  }
}

/**
 * Delete a job posting.
 */
export async function deleteJobPosting(id: string): Promise<ActionResult> {
  try {
    const targets = await getConvexJobRevalidationTargets(id);
    await mutateConvex("jobs:deleteDashboardJobPosting", { id });
    revalidatePath("/dashboard/jobs");
    revalidateConvexPublicJobPaths(targets);
    return { success: true };
  } catch (error) {
    console.error("[JOBS] deleteJobPosting error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "We could not delete the job posting. Please try again.",
    };
  }
}

export async function publishJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "published");
}

export async function unpublishJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "draft");
}

export async function closeJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "closed");
}

export async function markJobAsFilled(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "filled");
}

export async function reopenJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "published");
}

/**
 * Get the current user's job count and limit.
 */
export async function getJobCountAndLimit(): Promise<ActionResult<{ count: number; limit: number; canCreate: boolean }>> {
  try {
    const result = await queryConvex<{ count: number; limit: number; canCreate: boolean }>("jobs:getJobCountAndLimit", {});
    return { success: true, data: result };
  } catch (error) {
    console.error("[JOBS] getJobCountAndLimit error:", error);
    return { success: false, error: "Could not load job limits." };
  }
}
