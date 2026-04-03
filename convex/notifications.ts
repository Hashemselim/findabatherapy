import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };

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

async function requireIdentity(ctx: {
  auth: { getUserIdentity(): Promise<Identity | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

async function findUserByClerkUserId(
  ctx: {
    db: {
      query(table: "users"): {
        withIndex(
          index: "by_clerk_user_id",
          cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  clerkUserId: string,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();

  return users[0] ?? null;
}

async function requireCurrentWorkspace(ctx: {
  auth: { getUserIdentity(): Promise<Identity | null> };
  db: {
    query(table: "users"): {
      withIndex(
        index: "by_clerk_user_id",
        cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "workspaceMemberships"): {
      withIndex(
        index: "by_user",
        cb: (q: { eq(field: "userId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
  };
}) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx as never, identity.subject);
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
  ctx: {
    db: {
      query(table: "notificationRecords"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspaceId: string,
) {
  return ctx.db
    .query("notificationRecords")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", asId<"workspaces">(workspaceId)))
    .collect();
}

export const createNotification = mutationGeneric({
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

export const getNotifications = queryGeneric({
  args: {
    type: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx as never);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceNotificationRows(ctx as never, workspaceId);
    const filtered = rows
      .filter((row) => !args.type || row.notificationType === args.type)
      .filter((row) => args.isRead === undefined || (row.status === "read") === args.isRead)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );
    const unreadCount = rows.filter((row) => row.status !== "read").length;

    return {
      notifications: filtered.slice(offset, offset + limit).map(mapNotification),
      unreadCount,
    };
  },
});

export const getUnreadNotificationCount = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx as never);
    const rows = await getWorkspaceNotificationRows(ctx as never, workspaceId);
    return rows.filter((row) => row.status !== "read").length;
  },
});

export const getUnreadCountsByType = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx as never);
    const rows = await getWorkspaceNotificationRows(ctx as never, workspaceId);

    const counts: Record<string, number> = {};
    for (const row of rows) {
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

export const markNotificationAsRead = mutationGeneric({
  args: {
    notificationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx as never);
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

export const markAllNotificationsAsRead = mutationGeneric({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx as never);
    const rows = await getWorkspaceNotificationRows(ctx as never, workspaceId);

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
