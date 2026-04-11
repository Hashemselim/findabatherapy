"use server";

import { revalidatePath } from "next/cache";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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

export async function createNotification(data: {
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entityId?: string;
  entityType?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await mutateConvexUnauthenticated<{ id: string }>(
      "notifications:createNotification",
      {
        workspaceId: data.profileId,
        type: data.type,
        title: data.title,
        body: data.body || null,
        link: data.link || null,
        entityId: data.entityId || null,
        entityType: data.entityType || null,
      },
    );
    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[NOTIFICATIONS] Convex createNotification error:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

export async function getNotifications(filter?: {
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ notifications: Notification[]; unreadCount: number }>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const result = await queryConvex<{
      notifications: Notification[];
      unreadCount: number;
    }>("notifications:getNotifications", {
      type: filter?.type,
      isRead: filter?.isRead,
      limit: filter?.limit,
      offset: filter?.offset,
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[NOTIFICATIONS] Convex getNotifications error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    return await queryConvex<number>("notifications:getUnreadNotificationCount");
  } catch {
    return 0;
  }
}

export async function getUnreadCountsByType(): Promise<
  ActionResult<Record<NotificationType, number>>
> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const counts = await queryConvex<Record<string, number>>(
      "notifications:getUnreadCountsByType",
    );
    return { success: true, data: counts as Record<NotificationType, number> };
  } catch (error) {
    console.error("[NOTIFICATIONS] Convex getUnreadCountsByType error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("notifications:markNotificationAsRead", {
      notificationId,
    });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    console.error("[NOTIFICATIONS] Convex markNotificationAsRead error:", error);
    return { success: false, error: "Failed to update notification" };
  }
}

export async function markAllNotificationsAsRead(
  type?: NotificationType
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("notifications:markAllNotificationsAsRead", {
      type: type ?? undefined,
    });
    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    console.error("[NOTIFICATIONS] Convex markAllNotificationsAsRead error:", error);
    return { success: false, error: "Failed to update notifications" };
  }
}
