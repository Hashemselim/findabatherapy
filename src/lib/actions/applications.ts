"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createNotification } from "@/lib/actions/notifications";
import {
  applicationFormSchema,
  updateApplicationStatusSchema,
  updateApplicationDetailsSchema,
  type ApplicationFormData,
  type ApplicationStatus,
  type ApplicationSource,
  generateResumePath,
  isValidResumeType,
  isValidResumeSize,
} from "@/lib/validations/jobs";
import {
  sendJobApplicationConfirmation,
  sendProviderNewApplicationNotification,
} from "@/lib/email/notifications";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// =============================================================================
// APPLICATION DATA TYPES
// =============================================================================

export interface ApplicationData {
  id: string;
  jobPostingId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string | null;
  resumePath: string | null;
  coverLetter: string | null;
  linkedinUrl: string | null;
  status: ApplicationStatus;
  rating: number | null;
  notes: string | null;
  source: ApplicationSource | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ApplicationWithJob extends ApplicationData {
  job: {
    id: string;
    title: string;
    slug: string;
    positionType: string;
  };
}

export interface ApplicationSummary {
  id: string;
  applicantName: string;
  applicantEmail: string;
  status: ApplicationStatus;
  rating: number | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
}

// =============================================================================
// PUBLIC APPLICATION SUBMISSION
// =============================================================================

/**
 * Submit a job application (public - no auth required)
 */
export async function submitApplication(
  jobPostingId: string,
  data: ApplicationFormData,
  turnstileToken: string,
  resumeFile?: {
    name: string;
    type: string;
    size: number;
    arrayBuffer: ArrayBuffer;
  }
): Promise<ActionResult> {
  // Validate input
  const parsed = applicationFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Check honeypot field (spam protection)
  if (parsed.data.website && parsed.data.website.length > 0) {
    // Bot detected - silently succeed to not give feedback to spammer
    return { success: true };
  }

  // Verify Turnstile token
  if (!turnstileToken) {
    return { success: false, error: "Security verification required" };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return { success: false, error: "Security verification failed. Please try again." };
  }

  const supabase = await createAdminClient();

  // Verify job posting exists and is published
  const { data: job, error: jobError } = await supabase
    .from("job_postings")
    .select("id, title, slug, profile_id, profiles!inner(contact_email, agency_name)")
    .eq("id", jobPostingId)
    .eq("status", "published")
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job posting not found or no longer accepting applications" };
  }

  // Type assertion for the joined profile
  const profile = job.profiles as unknown as { contact_email: string; agency_name: string };

  // Check for duplicate application
  const { data: existingApp } = await supabase
    .from("job_applications")
    .select("id")
    .eq("job_posting_id", jobPostingId)
    .eq("applicant_email", parsed.data.applicantEmail.toLowerCase())
    .single();

  if (existingApp) {
    return { success: false, error: "You have already applied to this position" };
  }

  // Handle resume upload if provided
  let resumePath: string | null = null;

  if (resumeFile) {
    // Validate file
    if (!isValidResumeType(resumeFile.type)) {
      return { success: false, error: "Resume must be a PDF, DOC, or DOCX file" };
    }

    if (!isValidResumeSize(resumeFile.size)) {
      return { success: false, error: "Resume must be less than 10MB" };
    }

    // Generate storage path
    resumePath = generateResumePath(
      jobPostingId,
      parsed.data.applicantEmail,
      resumeFile.name
    );

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("job-resumes")
      .upload(resumePath, resumeFile.arrayBuffer, {
        contentType: resumeFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[APPLICATION] Resume upload failed:", uploadError);
      return { success: false, error: "Failed to upload resume. Please try again." };
    }
  }

  // Insert application
  const { data: insertedApp, error: insertError } = await supabase
    .from("job_applications")
    .insert({
      job_posting_id: jobPostingId,
      applicant_name: parsed.data.applicantName,
      applicant_email: parsed.data.applicantEmail.toLowerCase(),
      applicant_phone: parsed.data.applicantPhone || null,
      resume_path: resumePath,
      cover_letter: parsed.data.coverLetter || null,
      linkedin_url: parsed.data.linkedinUrl || null,
      source: parsed.data.source || "direct",
      status: "new",
    })
    .select("id")
    .single();

  if (insertError || !insertedApp) {
    // If insert failed and we uploaded a resume, try to clean it up
    if (resumePath) {
      await supabase.storage.from("job-resumes").remove([resumePath]);
    }

    // Check for duplicate constraint violation
    if (insertError?.code === "23505") {
      return { success: false, error: "You have already applied to this position" };
    }

    return { success: false, error: "Failed to submit application. Please try again." };
  }

  // Create in-app notification for the provider
  createNotification({
    profileId: job.profile_id,
    type: "job_application",
    title: `New application from ${parsed.data.applicantName}`,
    body: `Applied for ${job.title}`,
    link: "/dashboard/team/applicants",
    entityId: insertedApp.id,
    entityType: "job_application",
  }).catch((err) => {
    console.error("[APPLICATION] Failed to create notification:", err);
  });

  // Send email notifications (fire and forget - don't block on email delivery)
  const jobUrl = `https://www.findabajobs.org/job/${job.slug}`;

  // Send confirmation email to applicant
  sendJobApplicationConfirmation({
    to: parsed.data.applicantEmail,
    applicantName: parsed.data.applicantName,
    jobTitle: job.title,
    providerName: profile.agency_name,
    jobUrl,
  }).catch((err) => {
    console.error("[APPLICATION] Failed to send applicant confirmation email:", err);
  });

  // Send notification email to provider
  sendProviderNewApplicationNotification({
    to: profile.contact_email,
    providerName: profile.agency_name,
    jobTitle: job.title,
    applicantName: parsed.data.applicantName,
    applicantEmail: parsed.data.applicantEmail,
    applicantPhone: parsed.data.applicantPhone || null,
    linkedinUrl: parsed.data.linkedinUrl || null,
    coverLetter: parsed.data.coverLetter || null,
    hasResume: !!resumePath,
    applicationId: insertedApp.id,
  }).catch((err) => {
    console.error("[APPLICATION] Failed to send provider notification email:", err);
  });

  return { success: true };
}

// =============================================================================
// PROVIDER APPLICATION MANAGEMENT
// =============================================================================

/**
 * Get all applications for the current user's jobs
 */
export async function getApplications(filter?: {
  status?: ApplicationStatus;
  jobId?: string;
}): Promise<ActionResult<{ applications: ApplicationSummary[]; newCount: number }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get user's job IDs first
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("id")
    .eq("profile_id", user.id);

  const jobIds = jobs?.map((j) => j.id) || [];

  if (jobIds.length === 0) {
    return {
      success: true,
      data: { applications: [], newCount: 0 },
    };
  }

  // Build query
  let query = supabase
    .from("job_applications")
    .select(`
      id,
      applicant_name,
      applicant_email,
      status,
      rating,
      created_at,
      job_posting_id,
      job_postings!inner (
        id,
        title
      )
    `)
    .in("job_posting_id", jobIds)
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  if (filter?.jobId) {
    query = query.eq("job_posting_id", filter.jobId);
  }

  const { data: applications, error } = await query;

  if (error) {
    return { success: false, error: "Failed to fetch applications" };
  }

  // Get new application count
  const { count: newCount } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .in("job_posting_id", jobIds)
    .eq("status", "new");

  return {
    success: true,
    data: {
      applications: (applications || []).map((app) => {
        const job = app.job_postings as unknown as { id: string; title: string };
        return {
          id: app.id,
          applicantName: app.applicant_name,
          applicantEmail: app.applicant_email,
          status: app.status as ApplicationStatus,
          rating: app.rating,
          createdAt: app.created_at,
          job: { id: job.id, title: job.title },
        };
      }),
      newCount: newCount || 0,
    },
  };
}

/**
 * Get a single application by ID
 */
export async function getApplication(id: string): Promise<ActionResult<ApplicationWithJob>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("job_applications")
    .select(`
      *,
      job_postings!inner (
        id,
        title,
        slug,
        position_type,
        profile_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !application) {
    return { success: false, error: "Application not found" };
  }

  // Verify ownership
  const job = application.job_postings as unknown as {
    id: string;
    title: string;
    slug: string;
    position_type: string;
    profile_id: string;
  };

  if (job.profile_id !== user.id) {
    return { success: false, error: "Not authorized to view this application" };
  }

  return {
    success: true,
    data: {
      id: application.id,
      jobPostingId: application.job_posting_id,
      applicantName: application.applicant_name,
      applicantEmail: application.applicant_email,
      applicantPhone: application.applicant_phone,
      resumePath: application.resume_path,
      coverLetter: application.cover_letter,
      linkedinUrl: application.linkedin_url,
      status: application.status as ApplicationStatus,
      rating: application.rating,
      notes: application.notes,
      source: application.source as ApplicationSource | null,
      reviewedAt: application.reviewed_at,
      createdAt: application.created_at,
      job: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        positionType: job.position_type,
      },
    },
  };
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate status
  const parsed = updateApplicationStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status" };
  }

  const supabase = await createClient();

  // Get application and verify ownership
  const { data: application } = await supabase
    .from("job_applications")
    .select(`
      id,
      status,
      job_postings!inner (
        profile_id
      )
    `)
    .eq("id", id)
    .single();

  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const job = application.job_postings as unknown as { profile_id: string };
  if (job.profile_id !== user.id) {
    return { success: false, error: "Not authorized to update this application" };
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };

  // Set reviewed_at if moving from "new" status
  if (application.status === "new" && parsed.data.status !== "new") {
    updateData.reviewed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("job_applications")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return { success: false, error: "Failed to update application status" };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${id}`);
  return { success: true };
}

/**
 * Update application notes and rating
 */
export async function updateApplicationDetails(
  id: string,
  data: { notes?: string | null; rating?: number | null }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const parsed = updateApplicationDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createClient();

  // Get application and verify ownership
  const { data: application } = await supabase
    .from("job_applications")
    .select(`
      id,
      job_postings!inner (
        profile_id
      )
    `)
    .eq("id", id)
    .single();

  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const job = application.job_postings as unknown as { profile_id: string };
  if (job.profile_id !== user.id) {
    return { success: false, error: "Not authorized to update this application" };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.rating !== undefined) updateData.rating = parsed.data.rating;

  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }

  const { error: updateError } = await supabase
    .from("job_applications")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return { success: false, error: "Failed to update application" };
  }

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${id}`);
  return { success: true };
}

/**
 * Get resume download URL (signed URL for private bucket)
 */
export async function getResumeDownloadUrl(
  applicationId: string
): Promise<ActionResult<{ url: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get application and verify ownership
  const { data: application } = await supabase
    .from("job_applications")
    .select(`
      resume_path,
      job_postings!inner (
        profile_id
      )
    `)
    .eq("id", applicationId)
    .single();

  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const job = application.job_postings as unknown as { profile_id: string };
  if (job.profile_id !== user.id) {
    return { success: false, error: "Not authorized to access this resume" };
  }

  if (!application.resume_path) {
    return { success: false, error: "No resume attached to this application" };
  }

  // Generate signed URL (valid for 1 hour)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("job-resumes")
    .createSignedUrl(application.resume_path, 3600);

  if (urlError || !urlData?.signedUrl) {
    return { success: false, error: "Failed to generate resume download link" };
  }

  return { success: true, data: { url: urlData.signedUrl } };
}

/**
 * Get new application count (for sidebar badge)
 */
export async function getNewApplicationCount(): Promise<ActionResult<number>> {
  const user = await getUser();
  if (!user) {
    return { success: true, data: 0 };
  }

  const supabase = await createClient();

  // Get user's job IDs
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("id")
    .eq("profile_id", user.id);

  const jobIds = jobs?.map((j) => j.id) || [];

  if (jobIds.length === 0) {
    return { success: true, data: 0 };
  }

  // Get new application count
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .in("job_posting_id", jobIds)
    .eq("status", "new");

  return { success: true, data: count || 0 };
}

/**
 * Mark application as reviewed
 */
export async function markApplicationAsReviewed(id: string): Promise<ActionResult> {
  return updateApplicationStatus(id, "reviewed");
}
