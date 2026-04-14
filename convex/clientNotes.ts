import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  asRecord,
  readString,
  asId,
  now,
  requireCurrentWorkspace,
  type ConvexDoc,
} from "./_helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNotDeleted(row: ConvexDoc): boolean {
  return !row.deletedAt;
}

async function getClientNameMap(
  ctx: QueryCtx,
  workspaceId: string,
): Promise<Map<string, string>> {
  const clients = await ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", "client"),
    )
    .collect();

  const map = new Map<string, string>();
  for (const c of clients) {
    if (c.deletedAt) continue;
    const payload = asRecord(c.payload);
    const name = [readString(payload.firstName), readString(payload.lastName)]
      .filter(Boolean)
      .join(" ");
    map.set(c._id, name || "Unnamed Client");
  }
  return map;
}

async function getUserName(
  ctx: QueryCtx,
  userId: string,
): Promise<string | null> {
  try {
    const user = await ctx.db.get(asId<"users">(userId));
    if (!user) return null;
    const rec = user as unknown as Record<string, unknown>;
    return (
      [readString(rec.firstName), readString(rec.lastName)]
        .filter(Boolean)
        .join(" ") ||
      readString(rec.email) ||
      null
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * List client notes for the current workspace.
 * If `clientId` is provided, only return notes for that client.
 */
export const getClientNotes = query({
  args: {
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, userId } = await requireCurrentWorkspace(ctx);

    const rows = await ctx.db
      .query("crmRecords")
      .withIndex("by_workspace_and_type", (q) =>
        q
          .eq("workspaceId", asId<"workspaces">(workspaceId))
          .eq("recordType", "client_note"),
      )
      .collect();

    const filtered = rows
      .filter((row) => {
        if (!isNotDeleted(row as unknown as ConvexDoc)) return false;
        if (args.clientId) {
          const payload = asRecord(row.payload);
          return readString(payload.clientId) === args.clientId;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    // Build lookup maps for client names and author names
    const clientNameMap = await getClientNameMap(ctx, workspaceId);

    // Collect unique author user IDs
    const authorIds = new Set<string>();
    for (const row of filtered) {
      const payload = asRecord(row.payload);
      const authorId = readString(payload.authorUserId);
      if (authorId) authorIds.add(authorId);
    }

    const authorEntries = await Promise.all(
      [...authorIds].map(async (authorId) => {
        const name = await getUserName(ctx, authorId);
        return name ? ([authorId, name] as const) : null;
      }),
    );
    const authorNameMap = new Map<string, string>(
      authorEntries.filter(
        (entry): entry is readonly [string, string] => entry !== null,
      ),
    );

    return filtered.map((row) => {
      const payload = asRecord(row.payload);
      const clientId = readString(payload.clientId);
      const authorUserId = readString(payload.authorUserId);

      return {
        id: row._id,
        clientId,
        clientName: clientId ? (clientNameMap.get(clientId) ?? null) : null,
        category: readString(payload.category) ?? "",
        body: readString(payload.body) ?? "",
        createdAt: readString(row.createdAt) ?? new Date().toISOString(),
        updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
        authorName: authorUserId
          ? (authorNameMap.get(authorUserId) ?? null)
          : null,
      };
    });
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Add a new client note.
 */
export const addNote = mutation({
  args: {
    clientId: v.optional(v.string()),
    category: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId, userId } = await requireCurrentWorkspace(ctx);
    const timestamp = now();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client_note",
      payload: {
        clientId: args.clientId ?? null,
        category: args.category,
        body: args.body,
        authorUserId: userId,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { id: String(id) };
  },
});

/**
 * Update an existing client note.
 */
export const updateNote = mutation({
  args: {
    noteId: v.string(),
    category: v.optional(v.string()),
    body: v.optional(v.string()),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const existing = await ctx.db.get(asId<"crmRecords">(args.noteId));
    if (
      !existing ||
      String(existing.workspaceId) !== workspaceId ||
      existing.recordType !== "client_note"
    ) {
      throw new ConvexError("Note not found");
    }

    if (existing.deletedAt) {
      throw new ConvexError("Note not found");
    }

    const existingPayload = asRecord(existing.payload);
    const updatedPayload: Record<string, unknown> = { ...existingPayload };

    if (args.category !== undefined) updatedPayload.category = args.category;
    if (args.body !== undefined) updatedPayload.body = args.body;
    if (args.clientId !== undefined) updatedPayload.clientId = args.clientId;

    await ctx.db.patch(asId<"crmRecords">(existing._id), {
      payload: updatedPayload,
      updatedAt: now(),
    });

    return { id: existing._id };
  },
});

/**
 * Soft-delete a client note by setting `deletedAt`.
 */
export const deleteNote = mutation({
  args: {
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const existing = await ctx.db.get(asId<"crmRecords">(args.noteId));
    if (
      !existing ||
      String(existing.workspaceId) !== workspaceId ||
      existing.recordType !== "client_note"
    ) {
      throw new ConvexError("Note not found");
    }

    await ctx.db.patch(asId<"crmRecords">(existing._id), {
      deletedAt: now(),
    });

    return { success: true };
  },
});
