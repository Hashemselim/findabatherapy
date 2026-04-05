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

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
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

async function getWorkspaceReferralRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("referralRecords")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function getWorkspaceReferralRowsByType(
  ctx: ConvexCtx,
  workspaceId: string,
  recordType: string,
) {
  return ctx.db
    .query("referralRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", recordType),
    )
    .collect();
}

function mapSource(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    workspaceId: String(row.workspaceId),
    name: readString(payload.name) ?? "",
    type: readString(payload.type) ?? "other",
    stage: readString(row.status) ?? "prospect",
    contactName: readString(payload.contactName),
    contactEmail: readString(payload.contactEmail),
    contactPhone: readString(payload.contactPhone),
    organization: readString(payload.organization),
    notes: readString(payload.notes),
    referralCount: readNumber(payload.referralCount) ?? 0,
    lastReferralAt: readString(payload.lastReferralAt),
    payload,
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt),
  };
}

function mapContact(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    sourceId: readString(payload.sourceId),
    name: readString(payload.name) ?? "",
    email: readString(payload.email),
    phone: readString(payload.phone),
    role: readString(payload.role),
    notes: readString(payload.notes),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapNote(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    sourceId: readString(payload.sourceId),
    content: readString(payload.content) ?? "",
    authorUserId: readString(payload.authorUserId),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapTask(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    sourceId: readString(payload.sourceId),
    title: readString(payload.title) ?? "",
    description: readString(payload.description),
    dueDate: readString(payload.dueDate),
    status: readString(row.status) ?? "pending",
    assigneeUserId: readString(payload.assigneeUserId),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapTouchpoint(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    sourceId: readString(payload.sourceId),
    type: readString(payload.type) ?? "other",
    summary: readString(payload.summary) ?? "",
    date: readString(payload.date) ?? readString(row.createdAt) ?? "",
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapTemplate(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    name: readString(payload.name) ?? "",
    subject: readString(payload.subject) ?? "",
    body: readString(payload.body) ?? "",
    category: readString(payload.category),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapCampaign(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    name: readString(payload.name) ?? "",
    description: readString(payload.description),
    status: readString(row.status) ?? "draft",
    templateId: readString(payload.templateId),
    sourceIds: payload.sourceIds ?? [],
    sentCount: readNumber(payload.sentCount) ?? 0,
    scheduledAt: readString(payload.scheduledAt),
    completedAt: readString(payload.completedAt),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  getReferralOverview - aggregate counts by source type and status   */
/* ------------------------------------------------------------------ */
export const getReferralOverview = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceReferralRowsByType(
      ctx,
      workspaceId,
      "source",
    );

    const byType: Record<string, number> = {};
    const byStage: Record<string, number> = {};

    for (const row of rows) {
      const payload = asRecord(row.payload);
      const type = readString(payload.type) ?? "other";
      const stage = readString(row.status) ?? "prospect";
      byType[type] = (byType[type] ?? 0) + 1;
      byStage[stage] = (byStage[stage] ?? 0) + 1;
    }

    const totalReferrals = rows.reduce((sum, row) => {
      const payload = asRecord(row.payload);
      return sum + (readNumber(payload.referralCount) ?? 0);
    }, 0);

    return {
      totalSources: rows.length,
      totalReferrals,
      byType,
      byStage,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  listReferralSources - list sources with pagination                */
/* ------------------------------------------------------------------ */
export const listReferralSources = query({
  args: {
    stage: v.optional(v.string()),
    type: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceReferralRowsByType(
      ctx,
      workspaceId,
      "source",
    );

    const filtered = rows
      .filter((row) => {
        if (args.stage && row.status !== args.stage) return false;
        const payload = asRecord(row.payload);
        if (args.type && readString(payload.type) !== args.type) return false;
        if (args.search) {
          const name = readString(payload.name) ?? "";
          const org = readString(payload.organization) ?? "";
          const term = args.search.toLowerCase();
          if (
            !name.toLowerCase().includes(term) &&
            !org.toLowerCase().includes(term)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      sources: filtered.slice(offset, offset + limit).map(mapSource),
      total: filtered.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getReferralSourceDetail - single source with related records      */
/* ------------------------------------------------------------------ */
export const getReferralSourceDetail = query({
  args: {
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"referralRecords">(args.sourceId));
    if (!row || String(row.workspaceId) !== workspaceId || row.recordType !== "source") {
      return null;
    }

    const allRows = await getWorkspaceReferralRows(ctx, workspaceId);

    const contacts = allRows
      .filter((r) => {
        if (r.recordType !== "contact") return false;
        const p = asRecord(r.payload);
        return readString(p.sourceId) === args.sourceId;
      })
      .map(mapContact);

    const notes = allRows
      .filter((r) => {
        if (r.recordType !== "note") return false;
        const p = asRecord(r.payload);
        return readString(p.sourceId) === args.sourceId;
      })
      .map(mapNote)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const tasks = allRows
      .filter((r) => {
        if (r.recordType !== "task") return false;
        const p = asRecord(r.payload);
        return readString(p.sourceId) === args.sourceId;
      })
      .map(mapTask);

    const touchpoints = allRows
      .filter((r) => {
        if (r.recordType !== "touchpoint") return false;
        const p = asRecord(r.payload);
        return readString(p.sourceId) === args.sourceId;
      })
      .map(mapTouchpoint)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

    return {
      source: mapSource(row as unknown as ConvexDoc),
      contacts,
      notes,
      tasks,
      touchpoints,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  saveReferralSource - create/update source                         */
/* ------------------------------------------------------------------ */
export const saveReferralSource = mutation({
  args: {
    sourceId: v.optional(v.string()),
    name: v.string(),
    type: v.optional(v.string()),
    stage: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    organization: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const payload = {
      name: args.name,
      type: args.type ?? "other",
      contactName: args.contactName ?? null,
      contactEmail: args.contactEmail ?? null,
      contactPhone: args.contactPhone ?? null,
      organization: args.organization ?? null,
      notes: args.notes ?? null,
    };

    if (args.sourceId) {
      const existing = await ctx.db.get(asId<"referralRecords">(args.sourceId));
      if (!existing || String(existing.workspaceId) !== workspaceId) {
        throw new ConvexError("Referral source not found");
      }

      const existingPayload = asRecord(existing.payload);
      await ctx.db.patch(asId<"referralRecords">(existing._id), {
        status: args.stage ?? readString(existing.status) ?? "prospect",
        payload: { ...existingPayload, ...payload },
        updatedAt: now,
      });

      return { id: existing._id };
    }

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "source",
      status: args.stage ?? "prospect",
      payload: { ...payload, referralCount: 0, lastReferralAt: null },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  updateReferralSourceStage                                         */
/* ------------------------------------------------------------------ */
export const updateReferralSourceStage = mutation({
  args: {
    sourceId: v.string(),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"referralRecords">(args.sourceId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Referral source not found");
    }

    await ctx.db.patch(asId<"referralRecords">(row._id), {
      status: args.stage,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  saveReferralContact                                               */
/* ------------------------------------------------------------------ */
export const saveReferralContact = mutation({
  args: {
    contactId: v.optional(v.string()),
    sourceId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const payload = {
      sourceId: args.sourceId,
      name: args.name,
      email: args.email ?? null,
      phone: args.phone ?? null,
      role: args.role ?? null,
      notes: args.notes ?? null,
    };

    if (args.contactId) {
      const existing = await ctx.db.get(asId<"referralRecords">(args.contactId));
      if (!existing || String(existing.workspaceId) !== workspaceId) {
        throw new ConvexError("Contact not found");
      }

      await ctx.db.patch(asId<"referralRecords">(existing._id), {
        payload: { ...asRecord(existing.payload), ...payload },
        updatedAt: now,
      });

      return { id: existing._id };
    }

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "contact",
      payload,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  addReferralNote                                                   */
/* ------------------------------------------------------------------ */
export const addReferralNote = mutation({
  args: {
    sourceId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId, userId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "note",
      payload: {
        sourceId: args.sourceId,
        content: args.content,
        authorUserId: userId,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  saveReferralTask                                                  */
/* ------------------------------------------------------------------ */
export const saveReferralTask = mutation({
  args: {
    taskId: v.optional(v.string()),
    sourceId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const payload = {
      sourceId: args.sourceId,
      title: args.title,
      description: args.description ?? null,
      dueDate: args.dueDate ?? null,
      assigneeUserId: args.assigneeUserId ?? null,
    };

    if (args.taskId) {
      const existing = await ctx.db.get(asId<"referralRecords">(args.taskId));
      if (!existing || String(existing.workspaceId) !== workspaceId) {
        throw new ConvexError("Task not found");
      }

      await ctx.db.patch(asId<"referralRecords">(existing._id), {
        payload: { ...asRecord(existing.payload), ...payload },
        updatedAt: now,
      });

      return { id: existing._id };
    }

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "task",
      status: "pending",
      payload,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  updateReferralTaskStatus                                          */
/* ------------------------------------------------------------------ */
export const updateReferralTaskStatus = mutation({
  args: {
    taskId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"referralRecords">(args.taskId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Task not found");
    }

    await ctx.db.patch(asId<"referralRecords">(row._id), {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  logReferralTouchpoint                                             */
/* ------------------------------------------------------------------ */
export const logReferralTouchpoint = mutation({
  args: {
    sourceId: v.string(),
    type: v.string(),
    summary: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "touchpoint",
      payload: {
        sourceId: args.sourceId,
        type: args.type,
        summary: args.summary,
        date: args.date ?? now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getReferralTemplates                                              */
/* ------------------------------------------------------------------ */
export const getReferralTemplates = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceReferralRowsByType(
      ctx,
      workspaceId,
      "template",
    );

    return rows
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      )
      .map(mapTemplate);
  },
});

/* ------------------------------------------------------------------ */
/*  saveReferralTemplate                                              */
/* ------------------------------------------------------------------ */
export const saveReferralTemplate = mutation({
  args: {
    templateId: v.optional(v.string()),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const payload = {
      name: args.name,
      subject: args.subject,
      body: args.body,
      category: args.category ?? null,
    };

    if (args.templateId) {
      const existing = await ctx.db.get(asId<"referralRecords">(args.templateId));
      if (!existing || String(existing.workspaceId) !== workspaceId) {
        throw new ConvexError("Template not found");
      }

      await ctx.db.patch(asId<"referralRecords">(existing._id), {
        payload: { ...asRecord(existing.payload), ...payload },
        updatedAt: now,
      });

      return { id: existing._id };
    }

    const id = await ctx.db.insert("referralRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "template",
      payload,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getReferralCampaigns                                              */
/* ------------------------------------------------------------------ */
export const getReferralCampaigns = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceReferralRowsByType(
      ctx,
      workspaceId,
      "campaign",
    );

    const filtered = rows
      .filter((row) => !args.status || row.status === args.status)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return filtered.map(mapCampaign);
  },
});

/* ------------------------------------------------------------------ */
/*  getReferralAnalytics - time-series analytics                      */
/* ------------------------------------------------------------------ */
export const getReferralAnalytics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    groupBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const allRows = await getWorkspaceReferralRows(ctx, workspaceId);

    const startDate = args.startDate
      ? new Date(args.startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = args.endDate ? new Date(args.endDate) : new Date();

    const sources = allRows.filter((r) => r.recordType === "source");
    const touchpoints = allRows.filter((r) => {
      if (r.recordType !== "touchpoint") return false;
      const created = readString(r.createdAt);
      if (!created) return false;
      const d = new Date(created);
      return d >= startDate && d <= endDate;
    });

    const newSources = sources.filter((r) => {
      const created = readString(r.createdAt);
      if (!created) return false;
      const d = new Date(created);
      return d >= startDate && d <= endDate;
    });

    const groupBy = args.groupBy ?? "week";
    const timeSeries: Record<string, { newSources: number; touchpoints: number }> = {};

    const getKey = (date: Date) => {
      if (groupBy === "day") return date.toISOString().slice(0, 10);
      if (groupBy === "month") return date.toISOString().slice(0, 7);
      // week
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    };

    for (const row of newSources) {
      const key = getKey(new Date(readString(row.createdAt) ?? ""));
      if (!timeSeries[key]) timeSeries[key] = { newSources: 0, touchpoints: 0 };
      timeSeries[key].newSources++;
    }

    for (const row of touchpoints) {
      const key = getKey(new Date(readString(row.createdAt) ?? ""));
      if (!timeSeries[key]) timeSeries[key] = { newSources: 0, touchpoints: 0 };
      timeSeries[key].touchpoints++;
    }

    const sortedKeys = Object.keys(timeSeries).sort();
    const series = sortedKeys.map((key) => ({
      period: key,
      ...timeSeries[key],
    }));

    return {
      totalSources: sources.length,
      newSourcesInPeriod: newSources.length,
      touchpointsInPeriod: touchpoints.length,
      series,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  deleteReferralSource                                              */
/* ------------------------------------------------------------------ */
export const deleteReferralSource = mutation({
  args: {
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"referralRecords">(args.sourceId));
    if (!row || String(row.workspaceId) !== workspaceId || row.recordType !== "source") {
      throw new ConvexError("Referral source not found");
    }

    // Also delete related contacts, notes, tasks, touchpoints
    const allRows = await getWorkspaceReferralRows(ctx, workspaceId);
    const relatedRows = allRows.filter((r) => {
      if (r.recordType === "source") return false;
      const p = asRecord(r.payload);
      return readString(p.sourceId) === args.sourceId;
    });

    for (const related of relatedRows) {
      await ctx.db.delete(asId<"referralRecords">(related._id));
    }

    await ctx.db.delete(asId<"referralRecords">(row._id));

    return { success: true, deletedRelated: relatedRows.length };
  },
});
