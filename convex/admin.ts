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

const ADMIN_EMAILS = [
  "hashem@behaviorwork.com",
  "hashem@findabatherapy.org",
  "admin@findabatherapy.org",
  "admin@behaviorwork.com",
];

async function requireAdmin(ctx: ConvexCtx) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  // Check admin flag on user record first
  if (user.isAdmin === true) {
    const email = readString(user.primaryEmail) ?? "";
    return { userId: user._id, email };
  }

  // Fall back to email whitelist
  const email = readString(user.primaryEmail);
  if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    throw new ConvexError("Not authorized: admin access required");
  }

  return { userId: user._id, email };
}

/* ------------------------------------------------------------------ */
/*  isCurrentUserAdmin                                                */
/* ------------------------------------------------------------------ */
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await findUserByClerkUserId(ctx, identity.subject);
    if (!user) return false;

    // Check admin flag on user record first
    if (user.isAdmin === true) return true;

    // Fall back to email whitelist
    const email = readString(user.primaryEmail);
    return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
  },
});

/* ------------------------------------------------------------------ */
/*  getAdminStats - aggregate counts across tables                    */
/* ------------------------------------------------------------------ */
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      workspaces,
      users,
      listings,
      locations,
      inquiries,
      jobPostings,
      jobApplications,
    ] = await Promise.all([
      ctx.db.query("workspaces").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("listings").collect(),
      ctx.db.query("locations").collect(),
      ctx.db.query("inquiryRecords").collect(),
      ctx.db.query("jobPostings").collect(),
      ctx.db.query("jobApplications").collect(),
    ]);

    const planCounts: Record<string, number> = {};
    for (const ws of workspaces) {
      const tier = readString(ws.planTier) ?? "free";
      planCounts[tier] = (planCounts[tier] ?? 0) + 1;
    }

    const onboardedCount = workspaces.filter(
      (ws) => readString(ws.onboardingCompletedAt) !== null,
    ).length;

    const activeListings = listings.filter(
      (l) => readString(l.status) === "active" || readString(l.status) === "published",
    ).length;

    return {
      totalWorkspaces: workspaces.length,
      totalUsers: users.length,
      totalListings: listings.length,
      activeListings,
      totalLocations: locations.length,
      totalInquiries: inquiries.length,
      totalJobPostings: jobPostings.length,
      totalJobApplications: jobApplications.length,
      planCounts,
      onboardedCount,
      onboardingRate:
        workspaces.length > 0 ? onboardedCount / workspaces.length : 0,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getRemovalRequests - list removal requests from publicReadModels  */
/* ------------------------------------------------------------------ */
export const getRemovalRequests = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await ctx.db
      .query("publicReadModels")
      .withIndex("by_model_type", (q) =>
        q.eq("modelType", "removal_request"),
      )
      .collect();

    const filtered = (rows as ConvexDoc[])
      .filter((row) => {
        if (!args.status) return true;
        const payload = asRecord(row.payload);
        return readString(payload.status) === args.status;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      requests: filtered.slice(offset, offset + limit).map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: row._id,
          workspaceId: row.workspaceId ? String(row.workspaceId) : null,
          listingId: row.listingId ? String(row.listingId) : null,
          status: readString(payload.status) ?? "pending",
          reason: readString(payload.reason),
          requestedBy: readString(payload.requestedBy),
          requestedEmail: readString(payload.requestedEmail),
          reviewedBy: readString(payload.reviewedBy),
          reviewedAt: readString(payload.reviewedAt),
          payload,
          createdAt: readString(row.createdAt) ?? new Date().toISOString(),
        };
      }),
      total: filtered.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  approveRemovalRequest                                             */
/* ------------------------------------------------------------------ */
export const approveRemovalRequest = mutation({
  args: {
    requestId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const row = await ctx.db.get(asId<"publicReadModels">(args.requestId));
    if (!row) {
      throw new ConvexError("Removal request not found");
    }

    const payload = asRecord(row.payload);
    await ctx.db.patch(asId<"publicReadModels">(row._id), {
      payload: {
        ...payload,
        status: "approved",
        reviewedBy: userId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: args.notes ?? null,
      },
      updatedAt: new Date().toISOString(),
    });

    // If the request is linked to a listing, archive it
    if (row.listingId) {
      await ctx.db.patch(asId<"listings">(String(row.listingId)), {
        status: "removed",
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  denyRemovalRequest                                                */
/* ------------------------------------------------------------------ */
export const denyRemovalRequest = mutation({
  args: {
    requestId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const row = await ctx.db.get(asId<"publicReadModels">(args.requestId));
    if (!row) {
      throw new ConvexError("Removal request not found");
    }

    const payload = asRecord(row.payload);
    await ctx.db.patch(asId<"publicReadModels">(row._id), {
      payload: {
        ...payload,
        status: "denied",
        reviewedBy: userId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: args.notes ?? null,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getListingsPerState - count listings per state                    */
/* ------------------------------------------------------------------ */
export const getListingsPerState = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const rows = await ctx.db
      .query("publicReadModels")
      .withIndex("by_model_type", (q) => q.eq("modelType", "listing"))
      .collect();

    const byState: Record<string, number> = {};
    for (const row of rows as ConvexDoc[]) {
      const state = readString(row.state) ?? "unknown";
      byState[state] = (byState[state] ?? 0) + 1;
    }

    const sorted = Object.entries(byState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    return { states: sorted, total: (rows as ConvexDoc[]).length };
  },
});

/* ------------------------------------------------------------------ */
/*  getCustomersByState                                               */
/* ------------------------------------------------------------------ */
export const getCustomersByState = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const locations = await ctx.db.query("locations").collect();

    const byState: Record<string, number> = {};
    for (const loc of locations) {
      const metadata = asRecord(loc.metadata);
      const state = readString(metadata.state) ?? "unknown";
      // Count unique workspaces per state
      byState[state] = (byState[state] ?? 0) + 1;
    }

    const sorted = Object.entries(byState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    return { states: sorted, total: locations.length };
  },
});

/* ------------------------------------------------------------------ */
/*  getOnboardingMetrics                                              */
/* ------------------------------------------------------------------ */
export const getOnboardingMetrics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const workspaces = await ctx.db.query("workspaces").collect();

    const startDate = args.startDate
      ? new Date(args.startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = args.endDate ? new Date(args.endDate) : new Date();

    const inRange = workspaces.filter((ws) => {
      const created = readString(ws.createdAt);
      if (!created) return false;
      const d = new Date(created);
      return d >= startDate && d <= endDate;
    });

    const completed = inRange.filter(
      (ws) => readString(ws.onboardingCompletedAt) !== null,
    );

    const byIntent: Record<string, number> = {};
    for (const ws of inRange) {
      const intent = readString(ws.primaryIntent) ?? "unknown";
      byIntent[intent] = (byIntent[intent] ?? 0) + 1;
    }

    // Time-series by week
    const byWeek: Record<string, { signups: number; completions: number }> = {};

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    };

    for (const ws of inRange) {
      const key = getWeekKey(new Date(readString(ws.createdAt) ?? ""));
      if (!byWeek[key]) byWeek[key] = { signups: 0, completions: 0 };
      byWeek[key].signups++;
    }

    for (const ws of completed) {
      const completedAt = readString(ws.onboardingCompletedAt);
      if (completedAt) {
        const key = getWeekKey(new Date(completedAt));
        if (!byWeek[key]) byWeek[key] = { signups: 0, completions: 0 };
        byWeek[key].completions++;
      }
    }

    const sortedKeys = Object.keys(byWeek).sort();
    const series = sortedKeys.map((key) => ({
      week: key,
      ...byWeek[key],
    }));

    return {
      totalSignups: inRange.length,
      totalCompleted: completed.length,
      completionRate: inRange.length > 0 ? completed.length / inRange.length : 0,
      byIntent,
      series,
    };
  },
});
