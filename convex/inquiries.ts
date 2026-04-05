import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

const inquiryMetadataValidator = v.record(
  v.string(),
  v.union(
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.array(v.string()),
  ),
);

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

async function getWorkspaceInquiryRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("inquiryRecords")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", asId<"workspaces">(workspaceId)))
    .collect();
}

function mapInquiry(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    workspaceId: row.workspaceId ? String(row.workspaceId) : null,
    listingId: row.listingId ? String(row.listingId) : null,
    status: readString(row.status) ?? "unread",
    name: readString(payload.name) ?? "",
    email: readString(payload.email) ?? "",
    phone: readString(payload.phone),
    message: readString(payload.message) ?? "",
    source: readString(payload.source),
    type: readString(payload.type) ?? "inquiry",
    payload,
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/*  submitInquiry - public (no auth)                                  */
/* ------------------------------------------------------------------ */
export const submitInquiry = mutation({
  args: {
    workspaceId: v.optional(v.string()),
    listingId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    source: v.optional(v.string()),
    metadata: v.optional(inquiryMetadataValidator),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("inquiryRecords", {
      workspaceId: args.workspaceId ? asId<"workspaces">(args.workspaceId) : undefined,
      listingId: args.listingId ? asId<"listings">(args.listingId) : undefined,
      status: "unread",
      payload: {
        name: args.name,
        email: args.email,
        phone: args.phone ?? null,
        message: args.message,
        source: args.source ?? null,
        type: "inquiry",
        metadata: args.metadata ?? null,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getInquiries - list for workspace with status filter, pagination  */
/* ------------------------------------------------------------------ */
export const getInquiries = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceInquiryRows(ctx, workspaceId);
    const filtered = rows
      .filter((row) => {
        const payload = asRecord(row.payload);
        const type = readString(payload.type);
        return !type || type === "inquiry";
      })
      .filter((row) => !args.status || row.status === args.status)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      inquiries: filtered.slice(offset, offset + limit).map(mapInquiry),
      total: filtered.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getInquiry - single by ID                                         */
/* ------------------------------------------------------------------ */
export const getInquiry = query({
  args: {
    inquiryId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.inquiryId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      return null;
    }

    return mapInquiry(row as unknown as ConvexDoc);
  },
});

/* ------------------------------------------------------------------ */
/*  markInquiryAsRead                                                 */
/* ------------------------------------------------------------------ */
export const markInquiryAsRead = mutation({
  args: {
    inquiryId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.inquiryId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Inquiry not found");
    }

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "read",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  markInquiryAsReplied                                              */
/* ------------------------------------------------------------------ */
export const markInquiryAsReplied = mutation({
  args: {
    inquiryId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.inquiryId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Inquiry not found");
    }

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "replied",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  markInquiryAsConverted                                            */
/* ------------------------------------------------------------------ */
export const markInquiryAsConverted = mutation({
  args: {
    inquiryId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.inquiryId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Inquiry not found");
    }

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "converted",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  archiveInquiry                                                    */
/* ------------------------------------------------------------------ */
export const archiveInquiry = mutation({
  args: {
    inquiryId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.inquiryId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Inquiry not found");
    }

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "archived",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getUnreadInquiryCount                                             */
/* ------------------------------------------------------------------ */
export const getUnreadInquiryCount = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceInquiryRows(ctx, workspaceId);
    return rows.filter((row) => row.status === "unread").length;
  },
});

/* ------------------------------------------------------------------ */
/*  submitFeedback - public (no auth)                                 */
/* ------------------------------------------------------------------ */
export const submitFeedback = mutation({
  args: {
    workspaceId: v.optional(v.string()),
    listingId: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    rating: v.optional(v.number()),
    message: v.string(),
    source: v.optional(v.string()),
    metadata: v.optional(inquiryMetadataValidator),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("inquiryRecords", {
      workspaceId: args.workspaceId ? asId<"workspaces">(args.workspaceId) : undefined,
      listingId: args.listingId ? asId<"listings">(args.listingId) : undefined,
      status: "unread",
      payload: {
        name: args.name ?? null,
        email: args.email ?? null,
        rating: args.rating ?? null,
        message: args.message,
        source: args.source ?? null,
        type: "feedback",
        metadata: args.metadata ?? null,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getFeedback - list feedback submissions for workspace             */
/* ------------------------------------------------------------------ */
export const getFeedback = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceInquiryRows(ctx, workspaceId);
    const filtered = rows
      .filter((row) => {
        const payload = asRecord(row.payload);
        return readString(payload.type) === "feedback";
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      feedback: filtered.slice(offset, offset + limit).map(mapInquiry),
      total: filtered.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getFeedbackById                                                   */
/* ------------------------------------------------------------------ */
export const getFeedbackById = query({
  args: {
    feedbackId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"inquiryRecords">(args.feedbackId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      return null;
    }

    return mapInquiry(row as unknown as ConvexDoc);
  },
});
