import { ConvexError, v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

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

function sortNullableDateAsc(
  left: string | null,
  right: string | null,
  leftFallback: string,
  rightFallback: string,
) {
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return rightFallback.localeCompare(leftFallback);
}

async function requireIdentity(ctx: ConvexCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

async function findUserByClerkUserId(ctx: ConvexCtx, clerkUserId: string) {
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

async function getWorkspaceCrmRowsByType(
  ctx: ConvexCtx,
  workspaceId: string,
  recordType: string,
) {
  return ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)).eq("recordType", recordType),
    )
    .collect();
}

function mapTeamMember(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    workspaceId: String(row.workspaceId),
    firstName: readString(payload.firstName) ?? "",
    lastName: readString(payload.lastName) ?? "",
    email: readString(payload.email),
    phone: readString(payload.phone),
    address: readString(payload.address),
    role: readString(payload.role),
    title: readString(payload.title),
    notes: readString(payload.notes),
    status: readString(row.status) ?? "active",
    hireDate: readString(payload.hireDate),
    npi: readString(payload.npi),
    licenseNumber: readString(payload.licenseNumber),
    licenseState: readString(payload.licenseState),
    imageUrl: readString(payload.imageUrl),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapCredential(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    memberId: readString(payload.memberId) ?? "",
    type: readString(payload.type) ?? "",
    name: readString(payload.name) ?? "",
    issuingBody: readString(payload.issuingBody),
    licenseNumber: readString(payload.licenseNumber),
    state: readString(payload.state),
    issuedDate: readString(payload.issuedDate),
    expirationDate: readString(payload.expirationDate),
    status: readString(row.status) ?? "active",
    notes: readString(payload.notes),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapDocument(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    memberId: readString(payload.memberId) ?? "",
    name: readString(payload.name) ?? "",
    fileId: readString(payload.fileId),
    fileUrl: readString(payload.fileUrl),
    mimeType: readString(payload.mimeType),
    category: readString(payload.category),
    notes: readString(payload.notes),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapTask(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    teamMemberId: readString(payload.teamMemberId) ?? "",
    title: readString(payload.title) ?? "",
    content: readString(payload.content) ?? readString(payload.description),
    status: readString(row.status) ?? "pending",
    dueDate: readString(payload.dueDate),
    autoGenerated:
      typeof payload.autoGenerated === "boolean" ? payload.autoGenerated : false,
    completedAt: readString(payload.completedAt),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
  };
}

async function requireWorkspaceRecord(
  ctx: ConvexCtx,
  workspaceId: string,
  recordId: string,
  recordType: string,
) {
  const row = await ctx.db.get(asId<"crmRecords">(recordId));
  if (!row || String(row.workspaceId) !== workspaceId || row.recordType !== recordType) {
    throw new ConvexError(
      recordType === "team_task"
        ? "Task not found"
        : recordType === "team_document"
          ? "Document not found"
          : recordType === "team_credential"
            ? "Credential not found"
            : "Team member not found",
    );
  }

  return row as unknown as ConvexDoc;
}

async function getWorkspaceTaskRows(ctx: ConvexCtx, workspaceId: string) {
  return getWorkspaceCrmRowsByType(ctx, workspaceId, "team_task");
}

export const getTeamMembers = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const memberRows = await getWorkspaceCrmRowsByType(ctx, workspaceId, "team_member");
    const credentialRows = await getWorkspaceCrmRowsByType(ctx, workspaceId, "team_credential");
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const credentialCounts = credentialRows.reduce(
      (acc, row) => {
        const payload = asRecord(row.payload);
        const memberId = readString(payload.memberId);
        if (!memberId) {
          return acc;
        }

        if (!acc[memberId]) {
          acc[memberId] = { total: 0, expiring: 0 };
        }

        acc[memberId].total += 1;
        const expirationDate = readString(payload.expirationDate);
        if (expirationDate && expirationDate <= thirtyDaysFromNow) {
          acc[memberId].expiring += 1;
        }

        return acc;
      },
      {} as Record<string, { total: number; expiring: number }>,
    );

    return memberRows
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => {
        if (!args.search) return true;
        const member = mapTeamMember(row as unknown as ConvexDoc);
        const term = args.search.toLowerCase();
        return (
          member.firstName.toLowerCase().includes(term) ||
          member.lastName.toLowerCase().includes(term) ||
          (member.email ?? "").toLowerCase().includes(term)
        );
      })
      .map((row) => {
        const member = mapTeamMember(row as unknown as ConvexDoc);
        return {
          ...member,
          credentialCount: credentialCounts[member.id]?.total ?? 0,
          expiringCredentialCount: credentialCounts[member.id]?.expiring ?? 0,
        };
      })
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      );
  },
});

export const getTeamMember = query({
  args: {
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.memberId));
    if (!row || String(row.workspaceId) !== workspaceId || row.recordType !== "team_member") {
      return null;
    }

    const credentialRows = await getWorkspaceCrmRowsByType(ctx, workspaceId, "team_credential");
    const documentRows = await getWorkspaceCrmRowsByType(ctx, workspaceId, "team_document");
    const taskRows = await getWorkspaceTaskRows(ctx, workspaceId);

    const credentials = credentialRows
      .filter((entry) => readString(asRecord(entry.payload).memberId) === args.memberId)
      .map((entry) => mapCredential(entry as unknown as ConvexDoc))
      .sort((a, b) =>
        sortNullableDateAsc(a.expirationDate, b.expirationDate, a.createdAt, b.createdAt),
      );

    const documents = documentRows
      .filter((entry) => readString(asRecord(entry.payload).memberId) === args.memberId)
      .map((entry) => mapDocument(entry as unknown as ConvexDoc))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const tasks = taskRows
      .filter((entry) => readString(asRecord(entry.payload).teamMemberId) === args.memberId)
      .map((entry) => mapTask(entry as unknown as ConvexDoc))
      .sort((a, b) => sortNullableDateAsc(a.dueDate, b.dueDate, a.createdAt, b.createdAt));

    return {
      member: mapTeamMember(row as unknown as ConvexDoc),
      credentials,
      documents,
      tasks,
    };
  },
});

export const createTeamMember = mutation({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    npi: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "team_member",
      status: "active",
      payload: {
        firstName: args.firstName,
        lastName: args.lastName ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        address: args.address ?? null,
        role: args.role ?? null,
        title: args.title ?? null,
        notes: args.notes ?? null,
        hireDate: args.hireDate ?? null,
        npi: args.npi ?? null,
        licenseNumber: args.licenseNumber ?? null,
        licenseState: args.licenseState ?? null,
        imageUrl: args.imageUrl ?? null,
      },
      relatedIds: {},
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateTeamMember = mutation({
  args: {
    memberId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    npi: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.memberId, "team_member");
    const existing = asRecord(row.payload);

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      ...(args.status !== undefined ? { status: args.status } : {}),
      payload: {
        ...existing,
        ...(args.firstName !== undefined ? { firstName: args.firstName } : {}),
        ...(args.lastName !== undefined ? { lastName: args.lastName } : {}),
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(args.phone !== undefined ? { phone: args.phone } : {}),
        ...(args.address !== undefined ? { address: args.address } : {}),
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.notes !== undefined ? { notes: args.notes } : {}),
        ...(args.hireDate !== undefined ? { hireDate: args.hireDate } : {}),
        ...(args.npi !== undefined ? { npi: args.npi } : {}),
        ...(args.licenseNumber !== undefined ? { licenseNumber: args.licenseNumber } : {}),
        ...(args.licenseState !== undefined ? { licenseState: args.licenseState } : {}),
        ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const deleteTeamMember = mutation({
  args: {
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.memberId, "team_member");

    const relatedTypes = ["team_credential", "team_document", "team_task"] as const;
    for (const recordType of relatedTypes) {
      const relatedRows = await getWorkspaceCrmRowsByType(ctx, workspaceId, recordType);
      for (const relatedRow of relatedRows) {
        const payload = asRecord(relatedRow.payload);
        const relatedMemberId =
          readString(payload.memberId) ?? readString(payload.teamMemberId);
        if (relatedMemberId === args.memberId) {
          await ctx.db.delete(asId<"crmRecords">(relatedRow._id));
        }
      }
    }

    await ctx.db.delete(asId<"crmRecords">(row._id));
    return { success: true };
  },
});

export const addTeamCredential = mutation({
  args: {
    memberId: v.string(),
    type: v.string(),
    name: v.string(),
    issuingBody: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    state: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await requireWorkspaceRecord(ctx, workspaceId, args.memberId, "team_member");
    const now = new Date().toISOString();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "team_credential",
      status: "active",
      payload: {
        memberId: args.memberId,
        type: args.type,
        name: args.name,
        issuingBody: args.issuingBody ?? null,
        licenseNumber: args.licenseNumber ?? null,
        state: args.state ?? null,
        issuedDate: args.issuedDate ?? null,
        expirationDate: args.expirationDate ?? null,
        notes: args.notes ?? null,
      },
      relatedIds: { memberId: args.memberId },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateTeamCredential = mutation({
  args: {
    credentialId: v.string(),
    type: v.optional(v.string()),
    name: v.optional(v.string()),
    issuingBody: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    state: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(
      ctx,
      workspaceId,
      args.credentialId,
      "team_credential",
    );
    const existing = asRecord(row.payload);

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      ...(args.status !== undefined ? { status: args.status } : {}),
      payload: {
        ...existing,
        ...(args.type !== undefined ? { type: args.type } : {}),
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.issuingBody !== undefined ? { issuingBody: args.issuingBody } : {}),
        ...(args.licenseNumber !== undefined
          ? { licenseNumber: args.licenseNumber }
          : {}),
        ...(args.state !== undefined ? { state: args.state } : {}),
        ...(args.issuedDate !== undefined ? { issuedDate: args.issuedDate } : {}),
        ...(args.expirationDate !== undefined
          ? { expirationDate: args.expirationDate }
          : {}),
        ...(args.notes !== undefined ? { notes: args.notes } : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const deleteTeamCredential = mutation({
  args: {
    credentialId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(
      ctx,
      workspaceId,
      args.credentialId,
      "team_credential",
    );
    await ctx.db.delete(asId<"crmRecords">(row._id));
    return { success: true };
  },
});

export const addTeamDocument = mutation({
  args: {
    memberId: v.string(),
    name: v.string(),
    fileId: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await requireWorkspaceRecord(ctx, workspaceId, args.memberId, "team_member");
    const now = new Date().toISOString();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "team_document",
      status: "active",
      payload: {
        memberId: args.memberId,
        name: args.name,
        fileId: args.fileId ?? null,
        fileUrl: args.fileUrl ?? null,
        mimeType: args.mimeType ?? null,
        category: args.category ?? null,
        notes: args.notes ?? null,
      },
      relatedIds: { memberId: args.memberId },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const deleteTeamDocument = mutation({
  args: {
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.documentId, "team_document");
    await ctx.db.delete(asId<"crmRecords">(row._id));
    return { success: true };
  },
});

export const getTeamMemberTasks = query({
  args: {
    teamMemberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceTaskRows(ctx, workspaceId);
    return rows
      .filter((row) => readString(asRecord(row.payload).teamMemberId) === args.teamMemberId)
      .map((row) => mapTask(row as unknown as ConvexDoc))
      .sort((a, b) => sortNullableDateAsc(a.dueDate, b.dueDate, a.createdAt, b.createdAt));
  },
});

export const createTeamTask = mutation({
  args: {
    teamMemberId: v.string(),
    title: v.string(),
    content: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    dueDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await requireWorkspaceRecord(ctx, workspaceId, args.teamMemberId, "team_member");
    const now = new Date().toISOString();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "team_task",
      status: args.status ?? "pending",
      payload: {
        teamMemberId: args.teamMemberId,
        title: args.title,
        content: args.content ?? null,
        description: args.content ?? null,
        dueDate: args.dueDate ?? null,
        autoGenerated: false,
        completedAt: null,
      },
      relatedIds: { teamMemberId: args.teamMemberId },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateTeamTask = mutation({
  args: {
    taskId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.taskId, "team_task");
    const existing = asRecord(row.payload);

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      ...(args.status !== undefined ? { status: args.status } : {}),
      payload: {
        ...existing,
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.content !== undefined
          ? { content: args.content, description: args.content }
          : {}),
        ...(args.dueDate !== undefined ? { dueDate: args.dueDate } : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const completeTeamTask = mutation({
  args: {
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.taskId, "team_task");
    const existing = asRecord(row.payload);
    const now = new Date().toISOString();

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      status: "completed",
      payload: {
        ...existing,
        completedAt: now,
      },
      updatedAt: now,
    });

    return { success: true };
  },
});

export const deleteTeamTask = mutation({
  args: {
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await requireWorkspaceRecord(ctx, workspaceId, args.taskId, "team_task");
    await ctx.db.delete(asId<"crmRecords">(row._id));
    return { success: true };
  },
});
