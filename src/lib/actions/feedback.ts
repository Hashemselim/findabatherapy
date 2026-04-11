"use server";

import { revalidatePath } from "next/cache";

import { sendFeedbackNotification } from "@/lib/email/notifications";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";
import { getProfile } from "@/lib/platform/workspace/server";
import { type FeedbackCategory, type FeedbackStatus } from "@/lib/validations/feedback";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface Feedback {
  id: string;
  profileId: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  readAt: string | null;
  repliedAt: string | null;
  pageUrl: string | null;
  userAgent: string | null;
}

interface AuthenticatedFeedbackInput {
  category: FeedbackCategory;
  rating?: number;
  message: string;
}

function buildFeedbackSubmitterName(params: {
  firstName?: string | null;
  lastName?: string | null;
  agencyName?: string | null;
  email?: string | null;
}) {
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ").trim();
  return fullName || params.agencyName || params.email || "Authenticated User";
}

/**
 * Submit feedback from an authenticated provider.
 * User info is derived from Clerk and the active Convex workspace.
 */
export async function submitFeedbackAuthenticated(
  data: AuthenticatedFeedbackInput,
  pageUrl?: string
): Promise<ActionResult> {
  if (!data.message || data.message.length < 10) {
    return { success: false, error: "Message must be at least 10 characters" };
  }
  if (data.message.length > 5000) {
    return { success: false, error: "Message must be less than 5000 characters" };
  }

  try {
    const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
    if (!user || !profile) {
      return { success: false, error: "You must be logged in to submit feedback" };
    }

    const name = buildFeedbackSubmitterName({
      firstName: user.firstName,
      lastName: user.lastName,
      agencyName: profile.agency_name,
      email: user.email ?? profile.contact_email,
    });
    const email = user.email ?? profile.contact_email ?? "";
    const company = profile.agency_name ?? null;
    const phone = profile.contact_phone ?? null;

    await mutateConvex("inquiries:submitAuthenticatedFeedback", {
      category: data.category,
      rating: data.rating ?? null,
      message: data.message,
      pageUrl: pageUrl ?? null,
      name,
      email,
      phone,
      company,
      userAgent: null,
    });

    await sendFeedbackNotification({
      name,
      email,
      phone,
      company,
      category: data.category,
      rating: data.rating,
      message: data.message,
      pageUrl: pageUrl,
    });

    return { success: true };
  } catch (error) {
    console.error("[FEEDBACK] submitFeedbackAuthenticated error:", error);
    return { success: false, error: "Failed to submit feedback. Please try again." };
  }
}

/**
 * Get all feedback (admin only)
 */
export async function getFeedback(
  filter?: { status?: FeedbackStatus; category?: FeedbackCategory }
): Promise<ActionResult<{ feedback: Feedback[]; unreadCount: number }>> {
  try {
    const result = await queryConvex<{ feedback: Feedback[]; unreadCount: number }>(
      "admin:getFeedback",
      {
        status: filter?.status,
        category: filter?.category,
      },
    );
    return { success: true, data: result };
  } catch (error) {
    console.error("[FEEDBACK] getFeedback error:", error);
    return { success: false, error: "Failed to fetch feedback" };
  }
}

/**
 * Get a single feedback by ID (admin only)
 */
export async function getFeedbackById(
  feedbackId: string
): Promise<ActionResult<Feedback>> {
  try {
    const result = await queryConvex<Feedback | null>("admin:getFeedbackById", {
      feedbackId,
    });
    if (!result) {
      return { success: false, error: "Feedback not found" };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("[FEEDBACK] getFeedbackById error:", error);
    return { success: false, error: "Feedback not found" };
  }
}

/**
 * Mark feedback as read (admin only)
 */
export async function markFeedbackAsRead(
  feedbackId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("admin:markFeedbackAsRead", { feedbackId });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("[FEEDBACK] markFeedbackAsRead error:", error);
    return { success: false, error: "Failed to update feedback" };
  }
}

/**
 * Mark feedback as replied (admin only)
 */
export async function markFeedbackAsReplied(
  feedbackId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("admin:markFeedbackAsReplied", { feedbackId });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("[FEEDBACK] markFeedbackAsReplied error:", error);
    return { success: false, error: "Failed to update feedback" };
  }
}

/**
 * Archive feedback (admin only)
 */
export async function archiveFeedback(
  feedbackId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("admin:archiveFeedback", { feedbackId });
    revalidatePath("/admin/feedback");
    return { success: true };
  } catch (error) {
    console.error("[FEEDBACK] archiveFeedback error:", error);
    return { success: false, error: "Failed to archive feedback" };
  }
}

/**
 * Get unread feedback count (admin only, for sidebar badge)
 */
export async function getUnreadFeedbackCount(): Promise<ActionResult<number>> {
  try {
    const count = await queryConvex<number>("admin:getUnreadFeedbackCount");
    return { success: true, data: count };
  } catch {
    return { success: true, data: 0 };
  }
}
