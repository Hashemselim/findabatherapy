"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Must match the notification_type enum in migration 048
export type NotificationType =
  | "contact_form"
  | "intake_submission"
  | "job_application"
  | "task_overdue"
  | "auth_expiring"
  | "credential_expiring"
  | "status_change"
  | "system";

export interface Notification {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  entityId: string | null;
  entityType: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Create notification (uses admin client for public submission flows)
// ---------------------------------------------------------------------------

export async function createNotification(data: {
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entityId?: string;
  entityType?: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createAdminClient();

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      profile_id: data.profileId,
      type: data.type,
      title: data.title,
      body: data.body || null,
      link: data.link || null,
      entity_id: data.entityId || null,
      entity_type: data.entityType || null,
    })
    .select("id")
    .single();

  if (error) {
    // Don't fail the parent operation if notification insert fails
    // (e.g., duplicate entity constraint)
    console.error("[NOTIFICATIONS] Failed to create notification:", error);
    return { success: false, error: "Failed to create notification" };
  }

  return { success: true, data: { id: notification.id } };
}

// ---------------------------------------------------------------------------
// Get notifications for current user
// ---------------------------------------------------------------------------

export async function getNotifications(filter?: {
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ notifications: Notification[]; unreadCount: number }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const limit = filter?.limit ?? 50;
  const offset = filter?.offset ?? 0;

  // Build query
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter?.type) {
    query = query.eq("type", filter.type);
  }

  if (filter?.isRead !== undefined) {
    query = query.eq("is_read", filter.isRead);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[NOTIFICATIONS] Failed to fetch notifications:", error);
    return { success: false, error: "Failed to load notifications" };
  }

  // Get unread count (always unfiltered by type for the badge)
  const { count, error: countError } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (countError) {
    console.error("[NOTIFICATIONS] Failed to count unread:", countError);
  }

  const notifications: Notification[] = (rows || []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    entityId: row.entity_id,
    entityType: row.entity_type,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

  return {
    success: true,
    data: { notifications, unreadCount: count ?? 0 },
  };
}

// ---------------------------------------------------------------------------
// Get unread notification count (for sidebar badge)
// ---------------------------------------------------------------------------

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[NOTIFICATIONS] Failed to count unread:", error);
    return 0;
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Get unread counts per notification type (for filter tabs)
// ---------------------------------------------------------------------------

export async function getUnreadCountsByType(): Promise<
  ActionResult<Record<NotificationType, number>>
> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("type")
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[NOTIFICATIONS] Failed to get unread counts:", error);
    return { success: false, error: "Failed to load counts" };
  }

  // Count in JS since Supabase PostgREST doesn't support GROUP BY
  const counts: Record<string, number> = {};
  for (const row of rows || []) {
    counts[row.type] = (counts[row.type] || 0) + 1;
  }

  return {
    success: true,
    data: counts as Record<NotificationType, number>,
  };
}

// ---------------------------------------------------------------------------
// Mark notification as read
// ---------------------------------------------------------------------------

export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[NOTIFICATIONS] Failed to mark as read:", error);
    return { success: false, error: "Failed to update notification" };
  }

  revalidatePath("/dashboard/notifications");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark all notifications as read (optionally filter by type)
// ---------------------------------------------------------------------------

export async function markAllNotificationsAsRead(
  type?: NotificationType
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (type) {
    query = query.eq("type", type);
  }

  const { error } = await query;

  if (error) {
    console.error("[NOTIFICATIONS] Failed to mark all as read:", error);
    return { success: false, error: "Failed to update notifications" };
  }

  revalidatePath("/dashboard/notifications");
  return { success: true };
}
