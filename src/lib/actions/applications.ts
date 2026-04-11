"use server";

import { revalidatePath } from "next/cache";

import {
  sendJobApplicationConfirmation,
  sendProviderNewApplicationNotification,
} from "@/lib/email/notifications";
import {
  mutateConvex,
  mutateConvexUnauthenticated,
  queryConvex,
} from "@/lib/platform/convex/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  applicationFormSchema,
  updateApplicationDetailsSchema,
  updateApplicationStatusSchema,
  type ApplicationFormData,
  type ApplicationSource,
  type ApplicationStatus,
  isValidResumeSize,
  isValidResumeType,
} from "@/lib/validations/jobs";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
  const parsed = applicationFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: true };
  }

  if (!turnstileToken) {
    return { success: false, error: "Security verification required" };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return { success: false, error: "Security verification failed. Please try again." };
  }

  try {
    let resume: {
      storageId: string;
      filename: string;
      mimeType: string;
      byteSize: number;
    } | undefined;

    if (resumeFile) {
      if (!isValidResumeType(resumeFile.type)) {
        return { success: false, error: "Resume must be a PDF, DOC, or DOCX file" };
      }
      if (!isValidResumeSize(resumeFile.size)) {
        return { success: false, error: "Resume must be less than 10MB" };
      }

      const uploadUrl = await mutateConvexUnauthenticated<string>(
        "jobs:generateResumeUploadUrl",
        {},
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": resumeFile.type },
        body: resumeFile.arrayBuffer,
      });

      if (!uploadResponse.ok) {
        return { success: false, error: "Failed to upload resume. Please try again." };
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: string };
      resume = {
        storageId,
        filename: resumeFile.name,
        mimeType: resumeFile.type,
        byteSize: resumeFile.size,
      };
    }

    const result = await mutateConvexUnauthenticated<{
      applicationId: string;
      jobTitle: string;
      jobSlug: string;
      providerName: string;
      providerEmail: string;
      hasResume: boolean;
    }>("jobs:submitApplication", {
      jobPostingId,
      applicantName: parsed.data.applicantName,
      applicantEmail: parsed.data.applicantEmail.toLowerCase(),
      applicantPhone: parsed.data.applicantPhone || null,
      coverLetter: parsed.data.coverLetter || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      source: parsed.data.source || "direct",
      resume,
    });

    const jobUrl = `https://www.goodaba.com/jobs/post/${result.jobSlug}`;

    sendJobApplicationConfirmation({
      to: parsed.data.applicantEmail,
      applicantName: parsed.data.applicantName,
      jobTitle: result.jobTitle,
      providerName: result.providerName,
      jobUrl,
    }).catch((err) => {
      console.error("[APPLICATION] Failed to send applicant confirmation email:", err);
    });

    sendProviderNewApplicationNotification({
      to: result.providerEmail,
      providerName: result.providerName,
      jobTitle: result.jobTitle,
      applicantName: parsed.data.applicantName,
      applicantEmail: parsed.data.applicantEmail,
      applicantPhone: parsed.data.applicantPhone || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      coverLetter: parsed.data.coverLetter || null,
      hasResume: result.hasResume,
      applicationId: result.applicationId,
    }).catch((err) => {
      console.error("[APPLICATION] Failed to send provider notification email:", err);
    });

    return { success: true };
  } catch (error) {
    console.error("[APPLICATION] submitApplication error:", error);
    return { success: false, error: "Failed to submit application. Please try again." };
  }
}

/**
 * Get all applications for the current user's jobs
 */
export async function getApplications(filter?: {
  status?: ApplicationStatus;
  jobId?: string;
}): Promise<ActionResult<{ applications: ApplicationSummary[]; newCount: number }>> {
  try {
    const result = await queryConvex<{
      applications: ApplicationSummary[];
      newCount: number;
    }>("jobs:getWorkspaceApplications", {
      status: filter?.status ?? undefined,
      jobId: filter?.jobId ?? undefined,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[APPLICATION] getApplications error:", error);
    return { success: false, error: "Failed to fetch applications" };
  }
}

/**
 * Get a single application by ID
 */
export async function getApplication(id: string): Promise<ActionResult<ApplicationWithJob>> {
  try {
    const result = await queryConvex<ApplicationWithJob | null>(
      "jobs:getWorkspaceApplication",
      { id },
    );
    if (!result) {
      return { success: false, error: "Application not found" };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("[APPLICATION] getApplication error:", error);
    return { success: false, error: "Application not found" };
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<ActionResult> {
  const parsed = updateApplicationStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status" };
  }

  try {
    await mutateConvex("jobs:updateWorkspaceApplicationStatus", {
      id,
      status: parsed.data.status,
    });
    revalidatePath("/dashboard/applications");
    revalidatePath(`/dashboard/applications/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[APPLICATION] updateApplicationStatus error:", error);
    return { success: false, error: "Failed to update application status" };
  }
}

/**
 * Update application notes and rating
 */
export async function updateApplicationDetails(
  id: string,
  data: { notes?: string | null; rating?: number | null }
): Promise<ActionResult> {
  const parsed = updateApplicationDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    await mutateConvex("jobs:updateWorkspaceApplicationDetails", {
      id,
      notes: parsed.data.notes !== undefined ? parsed.data.notes : undefined,
      rating: parsed.data.rating !== undefined ? parsed.data.rating : undefined,
    });
    revalidatePath("/dashboard/applications");
    revalidatePath(`/dashboard/applications/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[APPLICATION] updateApplicationDetails error:", error);
    return { success: false, error: "Failed to update application" };
  }
}

/**
 * Get resume download URL
 */
export async function getResumeDownloadUrl(
  applicationId: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const result = await queryConvex<{ url: string }>(
      "jobs:getWorkspaceApplicationResumeUrl",
      { applicationId },
    );
    return { success: true, data: result };
  } catch (error) {
    console.error("[APPLICATION] getResumeDownloadUrl error:", error);
    return { success: false, error: "Failed to generate resume download link" };
  }
}

/**
 * Get new application count (for sidebar badge)
 */
export async function getNewApplicationCount(): Promise<ActionResult<number>> {
  try {
    const count = await queryConvex<number>("jobs:getNewWorkspaceApplicationCount", {});
    return { success: true, data: count };
  } catch (error) {
    console.error("[APPLICATION] getNewApplicationCount error:", error);
    return { success: true, data: 0 };
  }
}

/**
 * Mark application as reviewed
 */
export async function markApplicationAsReviewed(id: string): Promise<ActionResult> {
  return updateApplicationStatus(id, "reviewed");
}
