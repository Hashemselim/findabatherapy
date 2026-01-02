"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser, getProfile } from "@/lib/supabase/server";
import { type FeedbackStatus, type FeedbackCategory } from "@/lib/validations/feedback";
import { sendFeedbackNotification } from "@/lib/email/notifications";
import { isCurrentUserAdmin } from "@/lib/actions/admin";

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

/**
 * Submit feedback from an authenticated provider
 * User info is pulled from their profile
 */
export async function submitFeedbackAuthenticated(
  data: AuthenticatedFeedbackInput,
  pageUrl?: string
): Promise<ActionResult> {
  // Get authenticated user
  const user = await getUser();
  if (!user) {
    return { success: false, error: "You must be logged in to submit feedback" };
  }

  // Get profile info
  const profile = await getProfile();
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  // Validate message
  if (!data.message || data.message.length < 10) {
    return { success: false, error: "Message must be at least 10 characters" };
  }
  if (data.message.length > 5000) {
    return { success: false, error: "Message must be less than 5000 characters" };
  }

  const supabase = await createAdminClient();

  // Insert feedback with profile info
  const { error: insertError } = await supabase.from("feedback").insert({
    profile_id: user.id,
    name: profile.contact_name || profile.agency_name || "Unknown",
    email: profile.contact_email || user.email || "",
    phone: profile.contact_phone || null,
    company: profile.agency_name || null,
    category: data.category,
    rating: data.rating || null,
    message: data.message,
    status: "unread",
    page_url: pageUrl || null,
    user_agent: null, // We could pass this from client if needed
  });

  if (insertError) {
    console.error("[FEEDBACK] Insert error:", insertError);
    return { success: false, error: "Failed to submit feedback. Please try again." };
  }

  // Send email notification to support
  await sendFeedbackNotification({
    name: profile.contact_name || profile.agency_name || "Unknown",
    email: profile.contact_email || user.email || "",
    phone: profile.contact_phone,
    company: profile.agency_name,
    category: data.category,
    rating: data.rating,
    message: data.message,
    pageUrl: pageUrl,
  });

  return { success: true };
}

/**
 * Get all feedback (admin only)
 */
export async function getFeedback(
  filter?: { status?: FeedbackStatus; category?: FeedbackCategory }
): Promise<ActionResult<{ feedback: Feedback[]; unreadCount: number }>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("feedback")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  if (filter?.category) {
    query = query.eq("category", filter.category);
  }

  const { data: feedbackData, error } = await query;

  if (error) {
    console.error("[FEEDBACK] Fetch error:", error);
    return { success: false, error: "Failed to fetch feedback" };
  }

  // Get unread count
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  return {
    success: true,
    data: {
      feedback: feedbackData.map((f) => ({
        id: f.id,
        profileId: f.profile_id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        company: f.company,
        category: f.category as FeedbackCategory,
        rating: f.rating,
        message: f.message,
        status: f.status as FeedbackStatus,
        createdAt: f.created_at,
        readAt: f.read_at,
        repliedAt: f.replied_at,
        pageUrl: f.page_url,
        userAgent: f.user_agent,
      })),
      unreadCount: count || 0,
    },
  };
}

/**
 * Get a single feedback by ID (admin only)
 */
export async function getFeedbackById(
  feedbackId: string
): Promise<ActionResult<Feedback>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();

  const { data: f, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("id", feedbackId)
    .single();

  if (error || !f) {
    return { success: false, error: "Feedback not found" };
  }

  return {
    success: true,
    data: {
      id: f.id,
      profileId: f.profile_id,
      name: f.name,
      email: f.email,
      phone: f.phone,
      company: f.company,
      category: f.category as FeedbackCategory,
      rating: f.rating,
      message: f.message,
      status: f.status as FeedbackStatus,
      createdAt: f.created_at,
      readAt: f.read_at,
      repliedAt: f.replied_at,
      pageUrl: f.page_url,
      userAgent: f.user_agent,
    },
  };
}

/**
 * Mark feedback as read (admin only)
 */
export async function markFeedbackAsRead(
  feedbackId: string
): Promise<ActionResult> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("feedback")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", feedbackId)
    .eq("status", "unread");

  if (error) {
    return { success: false, error: "Failed to update feedback" };
  }

  revalidatePath("/admin/feedback");
  return { success: true };
}

/**
 * Mark feedback as replied (admin only)
 */
export async function markFeedbackAsReplied(
  feedbackId: string
): Promise<ActionResult> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("feedback")
    .update({
      status: "replied",
      replied_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  if (error) {
    return { success: false, error: "Failed to update feedback" };
  }

  revalidatePath("/admin/feedback");
  return { success: true };
}

/**
 * Archive feedback (admin only)
 */
export async function archiveFeedback(
  feedbackId: string
): Promise<ActionResult> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Not authorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status: "archived" })
    .eq("id", feedbackId);

  if (error) {
    return { success: false, error: "Failed to archive feedback" };
  }

  revalidatePath("/admin/feedback");
  return { success: true };
}

/**
 * Get unread feedback count (admin only, for sidebar badge)
 */
export async function getUnreadFeedbackCount(): Promise<ActionResult<number>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: true, data: 0 };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  return { success: true, data: count || 0 };
}
