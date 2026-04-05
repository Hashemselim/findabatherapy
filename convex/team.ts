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

async function getWorkspaceCrmRowsByType(
  ctx: ConvexCtx,
  workspaceId: string,
  recordType: string,
) {
  return ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", recordType),
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
    role: readString(payload.role),
    title: readString(payload.title),
    status: readString(row.status) ?? "active",
    hireDate: readString(payload.hireDate),
    npi: readString(payload.npi),
    licenseNumber: readString(payload.licenseNumber),
    licenseState: readString(payload.licenseState),
    imageUrl: readString(payload.imageUrl),
    payload,
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt),
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
  };
}

/* ------------------------------------------------------------------ */
/*  getTeamMembers - list team members                                */
/* ------------------------------------------------------------------ */
export const getTeamMembers = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceCrmRowsByType(
      ctx,
      workspaceId,
      "team_member",
    );

    const filtered = rows
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => {
        if (!args.search) return true;
        const payload = asRecord(row.payload);
        const first = readString(payload.firstName) ?? "";
        const last = readString(payload.lastName) ?? "";
        const email = readString(payload.email) ?? "";
        const term = args.search!.toLowerCase();
        return (
          first.toLowerCase().includes(term) ||
          last.toLowerCase().includes(term) ||
          email.toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return filtered.map(mapTeamMember);
  },
});

/* ------------------------------------------------------------------ */
/*  getTeamMember - single member with credentials and documents      */
/* ------------------------------------------------------------------ */
export const getTeamMember = query({
  args: {
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.memberId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_member"
    ) {
      return null;
    }

    const credentialRows = await getWorkspaceCrmRowsByType(
      ctx,
      workspaceId,
      "team_credential",
    );
    const credentials = credentialRows
      .filter((r) => {
        const p = asRecord(r.payload);
        return readString(p.memberId) === args.memberId;
      })
      .map(mapCredential);

    const documentRows = await getWorkspaceCrmRowsByType(
      ctx,
      workspaceId,
      "team_document",
    );
    const documents = documentRows
      .filter((r) => {
        const p = asRecord(r.payload);
        return readString(p.memberId) === args.memberId;
      })
      .map(mapDocument);

    return {
      member: mapTeamMember(row as unknown as ConvexDoc),
      credentials,
      documents,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  createTeamMember                                                  */
/* ------------------------------------------------------------------ */
export const createTeamMember = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
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
        lastName: args.lastName,
        email: args.email ?? null,
        phone: args.phone ?? null,
        role: args.role ?? null,
        title: args.title ?? null,
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

/* ------------------------------------------------------------------ */
/*  updateTeamMember                                                  */
/* ------------------------------------------------------------------ */
export const updateTeamMember = mutation({
  args: {
    memberId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    npi: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.memberId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_member"
    ) {
      throw new ConvexError("Team member not found");
    }

    const existing = asRecord(row.payload);
    const updates: Record<string, unknown> = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.role !== undefined) updates.role = args.role;
    if (args.title !== undefined) updates.title = args.title;
    if (args.hireDate !== undefined) updates.hireDate = args.hireDate;
    if (args.npi !== undefined) updates.npi = args.npi;
    if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
    if (args.licenseState !== undefined) updates.licenseState = args.licenseState;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      ...(args.status !== undefined ? { status: args.status } : {}),
      payload: { ...existing, ...updates },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  deleteTeamMember                                                  */
/* ------------------------------------------------------------------ */
export const deleteTeamMember = mutation({
  args: {
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.memberId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_member"
    ) {
      throw new ConvexError("Team member not found");
    }

    // Delete related credentials and documents
    const credentialRows = await getWorkspaceCrmRowsByType(
      ctx,
      workspaceId,
      "team_credential",
    );
    for (const cred of credentialRows) {
      const p = asRecord(cred.payload);
      if (readString(p.memberId) === args.memberId) {
        await ctx.db.delete(asId<"crmRecords">(cred._id));
      }
    }

    const documentRows = await getWorkspaceCrmRowsByType(
      ctx,
      workspaceId,
      "team_document",
    );
    for (const doc of documentRows) {
      const p = asRecord(doc.payload);
      if (readString(p.memberId) === args.memberId) {
        await ctx.db.delete(asId<"crmRecords">(doc._id));
      }
    }

    await ctx.db.delete(asId<"crmRecords">(row._id));

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  addTeamCredential                                                 */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  updateTeamCredential                                              */
/* ------------------------------------------------------------------ */
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
    const row = await ctx.db.get(asId<"crmRecords">(args.credentialId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_credential"
    ) {
      throw new ConvexError("Credential not found");
    }

    const existing = asRecord(row.payload);
    const updates: Record<string, unknown> = {};
    if (args.type !== undefined) updates.type = args.type;
    if (args.name !== undefined) updates.name = args.name;
    if (args.issuingBody !== undefined) updates.issuingBody = args.issuingBody;
    if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
    if (args.state !== undefined) updates.state = args.state;
    if (args.issuedDate !== undefined) updates.issuedDate = args.issuedDate;
    if (args.expirationDate !== undefined) updates.expirationDate = args.expirationDate;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      ...(args.status !== undefined ? { status: args.status } : {}),
      payload: { ...existing, ...updates },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  deleteTeamCredential                                              */
/* ------------------------------------------------------------------ */
export const deleteTeamCredential = mutation({
  args: {
    credentialId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.credentialId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_credential"
    ) {
      throw new ConvexError("Credential not found");
    }

    await ctx.db.delete(asId<"crmRecords">(row._id));

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  addTeamDocument                                                   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  deleteTeamDocument                                                */
/* ------------------------------------------------------------------ */
export const deleteTeamDocument = mutation({
  args: {
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.documentId));
    if (
      !row ||
      String(row.workspaceId) !== workspaceId ||
      row.recordType !== "team_document"
    ) {
      throw new ConvexError("Document not found");
    }

    await ctx.db.delete(asId<"crmRecords">(row._id));

    return { success: true };
  },
});
