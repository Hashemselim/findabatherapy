import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

async function requireIdentity(ctx: ConvexCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

async function findUserByClerkUserId(
  ctx: ConvexCtx,
  clerkUserId: string,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();

  return users[0] ?? null;
}

async function requireCurrentWorkspace(ctx: ConvexCtx) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  const memberships = await ctx.db
    .query("workspaceMemberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const activeMembership =
    memberships.find(
      (membership) =>
        membership.status === "active" &&
        membership.workspaceId === user.activeWorkspaceId,
    ) ?? memberships.find((membership) => membership.status === "active");

  if (!activeMembership) {
    throw new ConvexError("Not authenticated");
  }

  return {
    workspaceId: String(activeMembership.workspaceId),
    userId: user._id,
  };
}

function mapNotification(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    profileId: String(row.workspaceId),
    type: readString(row.notificationType) ?? "system",
    title: readString(payload.title) ?? "",
    body: readString(payload.body),
    link: readString(payload.link),
    entityId: readString(payload.entityId),
    entityType: readString(payload.entityType),
    isRead: row.status === "read",
    readAt: readString(payload.readAt),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

async function getWorkspaceNotificationRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("notificationRecords")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", asId<"workspaces">(workspaceId)))
    .collect();
}

function isNotificationMatch(
  row: ConvexDoc,
  args: { type?: string; isRead?: boolean },
) {
  if (args.type && row.notificationType !== args.type) {
    return false;
  }

  if (
    args.isRead !== undefined &&
    (row.status === "read") !== args.isRead
  ) {
    return false;
  }

  return true;
}

export const createNotification = mutation({
  args: {
    workspaceId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.optional(v.union(v.string(), v.null())),
    link: v.optional(v.union(v.string(), v.null())),
    entityId: v.optional(v.union(v.string(), v.null())),
    entityType: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("notificationRecords", {
      workspaceId: asId<"workspaces">(args.workspaceId),
      notificationType: args.type,
      status: "unread",
      payload: {
        title: args.title,
        body: args.body ?? null,
        link: args.link ?? null,
        entityId: args.entityId ?? null,
        entityType: args.entityType ?? null,
        readAt: null,
      },
      createdAt: now,
      updatedAt: now,
      legacyTable: "notifications",
    });

    return { id };
  },
});

export const getNotifications = query({
  args: {
    type: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const notifications: ConvexDoc[] = [];
    let matchingIndex = 0;
    let unreadCount = 0;

    for await (const row of ctx.db
      .query("notificationRecords")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )
      .order("desc")) {
      if (row.status !== "read") {
        unreadCount++;
      }

      if (!isNotificationMatch(row as ConvexDoc, args)) {
        continue;
      }

      if (matchingIndex >= offset && notifications.length < limit) {
        notifications.push(row as ConvexDoc);
      }

      matchingIndex++;
    }

    return {
      notifications: notifications.map(mapNotification),
      unreadCount,
    };
  },
});

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    let unreadCount = 0;

    for await (const row of ctx.db
      .query("notificationRecords")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )) {
      if (row.status !== "read") {
        unreadCount++;
      }
    }

    return unreadCount;
  },
});

export const getUnreadCountsByType = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const counts: Record<string, number> = {};

    for await (const row of ctx.db
      .query("notificationRecords")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )) {
      if (row.status === "read") {
        continue;
      }

      const type = readString(row.notificationType);
      if (!type) {
        continue;
      }

      counts[type] = (counts[type] ?? 0) + 1;
    }

    return counts;
  },
});

export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const notification = await ctx.db.get(asId<"notificationRecords">(args.notificationId));
    if (!notification || String(notification.workspaceId) !== workspaceId) {
      throw new ConvexError("Notification not found");
    }

    const payload = asRecord(notification.payload);
    await ctx.db.patch(asId<"notificationRecords">(notification._id), {
      status: "read",
      payload: {
        ...payload,
        readAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const markAllNotificationsAsRead = mutation({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceNotificationRows(ctx, workspaceId);

    for (const row of rows) {
      if (row.status === "read") {
        continue;
      }

      if (args.type && row.notificationType !== args.type) {
        continue;
      }

      const payload = asRecord(row.payload);
      await ctx.db.patch(asId<"notificationRecords">(row._id), {
        status: "read",
        payload: {
          ...payload,
          readAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});
