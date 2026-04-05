/**
 * Shared helper functions for all Convex backend files.
 *
 * This module centralizes auth resolution, type utilities, and common
 * patterns so they are defined once rather than duplicated across every
 * Convex file.
 */
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ---------------------------------------------------------------------------
// Type Utilities
// ---------------------------------------------------------------------------

export type Identity = {
  subject: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
};

export type ConvexDoc = Record<string, unknown> & { _id: string };

export type WorkspaceRole = "owner" | "admin" | "member";
type ConvexCtx = QueryCtx | MutationCtx;

// ---------------------------------------------------------------------------
// Value readers for schema payload objects stored with broad JSON validators.
// ---------------------------------------------------------------------------

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Cast an unknown value to a Convex document ID.
 * Use sparingly — prefer typed queries from `_generated/server` once codegen
 * is available.
 */
export function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------

/**
 * Require that the current request has a valid Clerk identity.
 */
export async function requireIdentity(ctx: ConvexCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  return identity;
}

/**
 * Look up the Convex `users` record for a Clerk user ID.
 */
export async function findUserByClerkUserId(
  ctx: ConvexCtx,
  clerkUserId: string,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();
  return users[0] ?? null;
}

/**
 * Resolve the current user's active workspace context.
 *
 * Returns { user, membership, workspace, workspaceId, userId }.
 *
 * Throws `ConvexError` if the user is not authenticated or has no active
 * workspace membership.
 */
export async function requireCurrentWorkspace(ctx: ConvexCtx) {
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
      (m) => m.status === "active" && m.workspaceId === user.activeWorkspaceId,
    ) ?? memberships.find((m) => m.status === "active");

  if (!activeMembership) {
    throw new ConvexError("Workspace not found");
  }

  const workspace = await ctx.db.get(asId<"workspaces">(activeMembership.workspaceId));
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  return {
    user,
    membership: activeMembership,
    workspace,
    workspaceId: String(activeMembership.workspaceId),
    userId: user._id,
  };
}

// ---------------------------------------------------------------------------
// Timestamp Helpers
// ---------------------------------------------------------------------------

export function now() {
  return new Date().toISOString();
}

export function generateSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
