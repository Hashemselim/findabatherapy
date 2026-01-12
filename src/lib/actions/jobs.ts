"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  updateJobStatusSchema,
  type CreateJobPostingData,
  type UpdateJobPostingData,
  type JobStatus,
  type PositionType,
  type EmploymentType,
  type BenefitType,
  type JobTherapySetting,
  type JobScheduleType,
  type JobAgeGroup,
  JOB_LIMITS,
} from "@/lib/validations/jobs";
import { getEffectivePlanTier, type PlanTier } from "@/lib/plans/features";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// =============================================================================
// JOB POSTING DATA TYPES
// =============================================================================

export interface JobPostingData {
  id: string;
  profileId: string;
  locationId: string | null;
  /** Custom city for job location (alternative to locationId) */
  customCity: string | null;
  /** Custom state for job location (alternative to locationId) */
  customState: string | null;
  /**
   * Service states for remote/telehealth jobs
   * ['*'] = nationwide, ['NY', 'NJ'] = specific states, null = use location
   */
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a URL-friendly slug from job title and agency name
 */
function generateSlug(title: string, agencyName: string): string {
  const base = `${title}-${agencyName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
  return base;
}

/**
 * Check if a slug is unique
 */
async function isSlugUnique(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("job_postings")
    .select("id")
    .eq("slug", slug);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data } = await query.single();
  return !data;
}

// =============================================================================
// JOB POSTING CRUD
// =============================================================================

/**
 * Get all job postings for the current user
 */
export async function getJobPostings(): Promise<ActionResult<JobPostingSummary[]>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get jobs with application counts
  const { data: jobs, error } = await supabase
    .from("job_postings")
    .select(`
      id,
      title,
      slug,
      position_type,
      status,
      published_at,
      created_at,
      location_id,
      locations (
        city,
        state
      )
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  // Get application counts per job
  const jobIds = jobs?.map((j) => j.id) || [];
  const applicationCounts: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: counts } = await supabase
      .from("job_applications")
      .select("job_posting_id")
      .in("job_posting_id", jobIds);

    if (counts) {
      counts.forEach((c) => {
        applicationCounts[c.job_posting_id] = (applicationCounts[c.job_posting_id] || 0) + 1;
      });
    }
  }

  return {
    success: true,
    data: (jobs || []).map((job) => {
      // Handle both array and single object cases for location relation
      const rawLocation = job.locations;
      const location = Array.isArray(rawLocation)
        ? (rawLocation[0] as { city: string; state: string } | undefined)
        : (rawLocation as { city: string; state: string } | null);
      return {
        id: job.id,
        title: job.title,
        slug: job.slug,
        positionType: job.position_type as PositionType,
        status: job.status as JobStatus,
        publishedAt: job.published_at,
        createdAt: job.created_at,
        applicationCount: applicationCounts[job.id] || 0,
        location: location ? { city: location.city, state: location.state } : null,
      };
    }),
  };
}

/**
 * Get a single job posting by ID (for edit page)
 */
export async function getJobPosting(id: string): Promise<ActionResult<JobPostingWithRelations>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("job_postings")
    .select(`
      *,
      profiles!inner (
        agency_name,
        contact_email,
        plan_tier,
        subscription_status
      ),
      locations (
        id,
        city,
        state,
        street
      )
    `)
    .eq("id", id)
    .eq("profile_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: false, error: "Job posting not found" };
    }
    return { success: false, error: error.message };
  }

  // Get application count
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("job_posting_id", id);

  const profile = job.profiles as unknown as {
    agency_name: string;
    contact_email: string;
    plan_tier: string;
    subscription_status: string | null;
  };

  // Get logo URL from listing
  const { data: listing } = await supabase
    .from("listings")
    .select("logo_url")
    .eq("profile_id", user.id)
    .single();

  const location = job.locations as { id: string; city: string; state: string; street: string | null } | null;

  return {
    success: true,
    data: {
      id: job.id,
      profileId: job.profile_id,
      locationId: job.location_id,
      customCity: job.custom_city as string | null,
      customState: job.custom_state as string | null,
      serviceStates: job.service_states as string[] | null,
      title: job.title,
      slug: job.slug,
      description: job.description,
      positionType: job.position_type as PositionType,
      employmentTypes: (job.employment_type || []) as EmploymentType[],
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryType: job.salary_type as "hourly" | "annual" | null,
      remoteOption: job.remote_option,
      requirements: typeof job.requirements === "string" ? job.requirements : null,
      benefits: (job.benefits || []) as BenefitType[],
      therapySettings: (job.therapy_settings || []) as JobTherapySetting[],
      scheduleTypes: (job.schedule_types || []) as JobScheduleType[],
      ageGroups: (job.age_groups || []) as JobAgeGroup[],
      status: job.status as JobStatus,
      publishedAt: job.published_at,
      expiresAt: job.expires_at,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      profile: {
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
        logoUrl: listing?.logo_url || null,
        planTier: getEffectivePlanTier(profile.plan_tier, profile.subscription_status),
        subscriptionStatus: profile.subscription_status,
      },
      location: location,
      applicationCount: count || 0,
    },
  };
}

/**
 * Create a new job posting
 */
export async function createJobPosting(data: CreateJobPostingData): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const parsed = createJobPostingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createClient();

  // Get profile to check plan limits
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_name, plan_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" };
  }

  const effectiveTier = getEffectivePlanTier(profile.plan_tier, profile.subscription_status);

  // Check job posting limit
  const { count: jobCount } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  const limit = JOB_LIMITS[effectiveTier];
  if ((jobCount || 0) >= limit) {
    return {
      success: false,
      error: `You've reached the maximum of ${limit} job posting${limit > 1 ? "s" : ""} for your plan. Please upgrade to post more jobs.`,
    };
  }

  // Generate unique slug
  let slug = generateSlug(parsed.data.title, profile.agency_name);
  let slugSuffix = 0;

  while (!(await isSlugUnique(supabase, slug))) {
    slugSuffix++;
    slug = `${generateSlug(parsed.data.title, profile.agency_name)}-${slugSuffix}`;
  }

  // Prepare insert data
  const insertData = {
    profile_id: user.id,
    location_id: parsed.data.locationId || null,
    custom_city: parsed.data.customCity || null,
    custom_state: parsed.data.customState || null,
    service_states: parsed.data.serviceStates || null,
    title: parsed.data.title,
    slug,
    description: parsed.data.description,
    position_type: parsed.data.positionType,
    employment_type: parsed.data.employmentTypes,
    salary_min: parsed.data.showSalary ? parsed.data.salaryMin : null,
    salary_max: parsed.data.showSalary ? parsed.data.salaryMax : null,
    salary_type: parsed.data.showSalary ? parsed.data.salaryType : null,
    remote_option: parsed.data.remoteOption,
    requirements: parsed.data.requirements || null,
    benefits: parsed.data.benefits || [],
    therapy_settings: parsed.data.therapySettings || [],
    schedule_types: parsed.data.scheduleTypes || [],
    age_groups: parsed.data.ageGroups || [],
    status: parsed.data.status,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
    expires_at: parsed.data.expiresAt || null,
  };

  const { data: job, error: insertError } = await supabase
    .from("job_postings")
    .insert(insertData)
    .select("id, slug")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/dashboard/jobs");
  return { success: true, data: { id: job.id, slug: job.slug } };
}

/**
 * Update a job posting
 */
export async function updateJobPosting(
  id: string,
  data: UpdateJobPostingData
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const parsed = updateJobPostingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: existingJob, error: fetchError } = await supabase
    .from("job_postings")
    .select("id, profile_id, status, published_at")
    .eq("id", id)
    .single();

  if (fetchError || !existingJob) {
    return { success: false, error: "Job posting not found" };
  }

  if (existingJob.profile_id !== user.id) {
    return { success: false, error: "Not authorized to edit this job posting" };
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.positionType !== undefined) updateData.position_type = parsed.data.positionType;
  if (parsed.data.employmentTypes !== undefined) updateData.employment_type = parsed.data.employmentTypes;
  if (parsed.data.locationId !== undefined) updateData.location_id = parsed.data.locationId;
  if (parsed.data.customCity !== undefined) updateData.custom_city = parsed.data.customCity;
  if (parsed.data.customState !== undefined) updateData.custom_state = parsed.data.customState;
  if (parsed.data.serviceStates !== undefined) updateData.service_states = parsed.data.serviceStates;
  if (parsed.data.remoteOption !== undefined) updateData.remote_option = parsed.data.remoteOption;
  if (parsed.data.requirements !== undefined) updateData.requirements = parsed.data.requirements;
  if (parsed.data.benefits !== undefined) updateData.benefits = parsed.data.benefits;
  if (parsed.data.therapySettings !== undefined) updateData.therapy_settings = parsed.data.therapySettings;
  if (parsed.data.scheduleTypes !== undefined) updateData.schedule_types = parsed.data.scheduleTypes;
  if (parsed.data.ageGroups !== undefined) updateData.age_groups = parsed.data.ageGroups;
  if (parsed.data.expiresAt !== undefined) updateData.expires_at = parsed.data.expiresAt;

  // Handle salary fields
  if (parsed.data.showSalary !== undefined) {
    if (parsed.data.showSalary) {
      updateData.salary_min = parsed.data.salaryMin ?? null;
      updateData.salary_max = parsed.data.salaryMax ?? null;
      updateData.salary_type = parsed.data.salaryType ?? null;
    } else {
      updateData.salary_min = null;
      updateData.salary_max = null;
      updateData.salary_type = null;
    }
  }

  // Handle status changes
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "published" && !existingJob.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { error: updateError } = await supabase
    .from("job_postings")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${id}`);
  return { success: true };
}

/**
 * Update job posting status
 */
export async function updateJobStatus(
  id: string,
  status: JobStatus
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate status
  const parsed = updateJobStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: existingJob, error: fetchError } = await supabase
    .from("job_postings")
    .select("id, profile_id, published_at")
    .eq("id", id)
    .single();

  if (fetchError || !existingJob) {
    return { success: false, error: "Job posting not found" };
  }

  if (existingJob.profile_id !== user.id) {
    return { success: false, error: "Not authorized to edit this job posting" };
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  // Set published_at when first publishing
  if (parsed.data.status === "published" && !existingJob.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("job_postings")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${id}`);
  return { success: true };
}

/**
 * Delete a job posting
 */
export async function deleteJobPosting(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: existingJob, error: fetchError } = await supabase
    .from("job_postings")
    .select("id, profile_id")
    .eq("id", id)
    .single();

  if (fetchError || !existingJob) {
    return { success: false, error: "Job posting not found" };
  }

  if (existingJob.profile_id !== user.id) {
    return { success: false, error: "Not authorized to delete this job posting" };
  }

  const { error: deleteError } = await supabase
    .from("job_postings")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/dashboard/jobs");
  return { success: true };
}

/**
 * Publish a job posting
 */
export async function publishJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "published");
}

/**
 * Unpublish a job posting (set to draft)
 */
export async function unpublishJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "draft");
}

/**
 * Close a job posting (no longer accepting applications)
 */
export async function closeJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "closed");
}

/**
 * Mark a job posting as filled (position was successfully hired)
 */
export async function markJobAsFilled(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "filled");
}

/**
 * Reopen a closed or filled job posting (set back to published)
 */
export async function reopenJobPosting(id: string): Promise<ActionResult> {
  return updateJobStatus(id, "published");
}

/**
 * Get the current user's job count and limit
 */
export async function getJobCountAndLimit(): Promise<ActionResult<{ count: number; limit: number; canCreate: boolean }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get profile for plan tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const effectiveTier = getEffectivePlanTier(profile.plan_tier, profile.subscription_status);
  const limit = JOB_LIMITS[effectiveTier];

  // Get current job count
  const { count } = await supabase
    .from("job_postings")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id);

  return {
    success: true,
    data: {
      count: count || 0,
      limit,
      canCreate: (count || 0) < limit,
    },
  };
}
