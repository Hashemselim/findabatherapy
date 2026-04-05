import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Identity = {
  subject: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type WorkspaceRole = "owner" | "admin" | "member";
type ConvexCtx = QueryCtx | MutationCtx;

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function compareTimestamps(left: unknown, right: unknown) {
  const leftValue =
    typeof left === "string" ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
  const rightValue =
    typeof right === "string" ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;

  return leftValue - rightValue;
}

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
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

async function findMembershipsByUserId(
  ctx: ConvexCtx,
  userId: string,
) {
  return ctx.db
    .query("workspaceMemberships")
    .withIndex("by_user", (q) => q.eq("userId", asId<"users">(userId)))
    .collect();
}

async function findWorkspaceMemberships(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("workspaceMemberships")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function findWorkspaceInvitations(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("workspaceInvitations")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function findCurrentMembership(
  ctx: ConvexCtx,
  user: ConvexDoc,
) {
  const memberships = (await findMembershipsByUserId(ctx, user._id)).filter(
    (membership) => membership.status === "active",
  );

  if (memberships.length === 0) {
    return null;
  }

  const activeWorkspaceId = readString(user.activeWorkspaceId);
  if (activeWorkspaceId) {
    const matchingMembership = memberships.find(
      (membership) => membership.workspaceId === activeWorkspaceId,
    );
    if (matchingMembership) {
      return matchingMembership;
    }
  }

  return memberships[0];
}

function getEffectiveInvitationStatus(invitation: ConvexDoc) {
  const rawStatus = invitation.status;
  if (rawStatus !== "pending") {
    return rawStatus;
  }

  if (
    typeof invitation.expiresAt === "string" &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    return "expired";
  }

  return "pending";
}

async function ensureUserRecord(
  ctx: MutationCtx,
  identity: Identity,
) {
  const existingUser = await findUserByClerkUserId(ctx, identity.subject);
  const displayName =
    [identity.givenName, identity.familyName].filter(Boolean).join(" ") || null;

  if (existingUser) {
    await ctx.db.patch(asId<"users">(existingUser._id), {
      primaryEmail: identity.email ?? existingUser.primaryEmail ?? undefined,
      firstName: identity.givenName ?? existingUser.firstName ?? undefined,
      lastName: identity.familyName ?? existingUser.lastName ?? undefined,
      displayName: displayName ?? existingUser.displayName ?? undefined,
      imageUrl: identity.pictureUrl ?? existingUser.imageUrl ?? undefined,
      updatedAt: new Date().toISOString(),
    });
    return existingUser._id;
  }

  return ctx.db.insert("users", {
    clerkUserId: identity.subject,
    primaryEmail: identity.email,
    firstName: identity.givenName,
    lastName: identity.familyName,
    displayName: displayName ?? undefined,
    imageUrl: identity.pictureUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function getCurrentWorkspaceContext(
  ctx: ConvexCtx,
) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  const membership = await findCurrentMembership(ctx, user);
  if (!membership || membership.status !== "active") {
    throw new ConvexError("Not authenticated");
  }

  const workspace = await ctx.db.get(asId<"workspaces">(membership.workspaceId));
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  return { identity, user, membership, workspace };
}

function requireMinimumRole(membership: ConvexDoc, minimumRole: WorkspaceRole) {
  const role = membership.role as WorkspaceRole;
  if (ROLE_ORDER[role] < ROLE_ORDER[minimumRole]) {
    throw new ConvexError("Insufficient permissions");
  }
}

function resolveEffectivePlanTier(workspace: ConvexDoc): "free" | "pro" {
  const rawTier = workspace.planTier === "pro" ? "pro" : "free";
  if (!workspace.onboardingCompletedAt) {
    return rawTier;
  }

  const active =
    workspace.subscriptionStatus === "active" ||
    workspace.subscriptionStatus === "trialing";

  return rawTier === "pro" && active ? "pro" : "free";
}

async function getExtraUserSeatCount(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  const records = await ctx.db
    .query("billingRecords")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();

  return records.reduce((sum, record) => {
    if (record.recordType !== "addon" || record.status !== "active") {
      return sum;
    }

    const payload = asRecord(record.payload);
    const addonType = readString(payload.addonType) ?? readString(payload.addon_type);
    if (addonType !== "extra_users") {
      return sum;
    }

    const quantity = payload.quantity;
    if (typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0) {
      return sum + quantity;
    }

    return sum + 1;
  }, 0);
}

async function buildSeatSummary(
  ctx: ConvexCtx,
  workspace: ConvexDoc,
) {
  const [memberships, invitations, extraSeats] = await Promise.all([
    findWorkspaceMemberships(ctx, workspace._id),
    findWorkspaceInvitations(ctx, workspace._id),
    getExtraUserSeatCount(ctx, workspace._id),
  ]);

  const planTier = resolveEffectivePlanTier(workspace);
  const maxSeats = 1 + (planTier === "pro" ? extraSeats : 0);
  const activeMembers = memberships.filter((membership) => membership.status === "active").length;
  const pendingInvites = invitations.filter(
    (invitation) => getEffectiveInvitationStatus(invitation) === "pending",
  ).length;
  const usedSeats = activeMembers + pendingInvites;

  return {
    planTier,
    maxSeats,
    usedSeats,
    pendingSeats: pendingInvites,
    availableSeats: Math.max(0, maxSeats - usedSeats),
  };
}

async function findUniqueListingSlug(
  ctx: ConvexCtx,
  agencyName: string,
  currentWorkspaceId?: string,
) {
  const baseSlug = generateSlug(agencyName) || "my-agency";
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const matches = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .collect();

    const conflictingMatch = matches.find((listing) => {
      if (!currentWorkspaceId) {
        return true;
      }
      return listing.workspaceId !== currentWorkspaceId;
    });

    if (!conflictingMatch) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

function buildWorkspacePayload(workspace: ConvexDoc, membership: ConvexDoc) {
  const workspaceSettings = asRecord(workspace.settings);

  return {
    membership: {
      id: membership._id,
      profile_id: workspace._id,
      user_id: String(membership.userId),
      email: String(membership.email ?? ""),
      role: membership.role,
      status: membership.status,
      invited_by_user_id: readString(membership.invitedByUserId),
      joined_at: readString(membership.joinedAt),
      created_at: readString(membership.createdAt),
      updated_at: readString(membership.updatedAt),
    },
    profile: {
      id: workspace._id,
      slug: readString(workspace.slug),
      agency_name: readString(workspace.agencyName),
      contact_email: readString(workspace.contactEmail),
      contact_phone: readString(workspaceSettings.contactPhone),
      website: readString(workspaceSettings.website),
      plan_tier: readString(workspace.planTier),
      subscription_status: readString(workspace.subscriptionStatus),
      billing_interval: readString(workspace.billingInterval),
      onboarding_completed_at: readString(workspace.onboardingCompletedAt),
      intake_form_settings: workspaceSettings.intakeFormSettings ?? null,
      primary_intent: readString(workspace.primaryIntent),
      stripe_customer_id: readString(workspaceSettings.stripeCustomerId),
      stripe_subscription_id: readString(workspaceSettings.stripeSubscriptionId),
      email: readString(workspace.contactEmail),
      created_at: readString(workspace.createdAt),
      updated_at: readString(workspace.updatedAt),
    },
  };
}

async function getWorkspaceUsersPayload(
  ctx: ConvexCtx,
) {
  const { membership, workspace } = await getCurrentWorkspaceContext(ctx);
  const [memberships, invitations, seatSummary] = await Promise.all([
    findWorkspaceMemberships(ctx, workspace._id),
    findWorkspaceInvitations(ctx, workspace._id),
    buildSeatSummary(ctx, workspace),
  ]);

  const members = memberships
    .filter((row) => row.status === "active")
    .slice()
    .sort((left, right) => compareTimestamps(left.createdAt, right.createdAt))
    .map((row) => ({
      id: row._id,
      userId: String(row.userId),
      email: String(row.email ?? ""),
      role: row.role,
      status: row.status,
      joinedAt: readString(row.joinedAt),
      isCurrentUser: row.userId === membership.userId,
    }));

  const invitationRows = invitations
    .slice()
    .sort((left, right) => compareTimestamps(right.createdAt, left.createdAt))
    .filter((invitation) => {
      const status = getEffectiveInvitationStatus(invitation);
      return status === "pending" || status === "expired" || status === "revoked";
    })
    .map((invitation) => ({
      id: invitation._id,
      email: String(invitation.email ?? ""),
      role: invitation.role,
      status: getEffectiveInvitationStatus(invitation),
      expiresAt: readString(invitation.expiresAt) ?? new Date().toISOString(),
      createdAt: readString(invitation.createdAt) ?? new Date().toISOString(),
    }));

  return {
    workspaceName: readString(workspace.agencyName) ?? "Workspace",
    currentMembership: {
      id: membership._id,
      profile_id: String(workspace._id),
      user_id: String(membership.userId),
      email: String(membership.email ?? ""),
      role: membership.role,
      status: membership.status,
      invited_by_user_id: readString(membership.invitedByUserId),
      joined_at: readString(membership.joinedAt),
      created_at: readString(membership.createdAt),
      updated_at: readString(membership.updatedAt),
    },
    members,
    invitations: invitationRows,
    seatSummary,
  };
}

export const getCurrentMembership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await findUserByClerkUserId(ctx, identity.subject);
    if (!user) {
      return null;
    }

    const membership = await findCurrentMembership(ctx, user);
    if (!membership) {
      return null;
    }

    return {
      id: membership._id,
      profile_id: String(membership.workspaceId),
      user_id: String(membership.userId),
      email: String(membership.email ?? ""),
      role: membership.role,
      status: membership.status,
      invited_by_user_id: readString(membership.invitedByUserId),
      joined_at: readString(membership.joinedAt),
      created_at: readString(membership.createdAt),
      updated_at: readString(membership.updatedAt),
    };
  },
});

export const getCurrentWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await findUserByClerkUserId(ctx, identity.subject);
    if (!user) {
      return null;
    }

    const membership = await findCurrentMembership(ctx, user);
    if (!membership) {
      return null;
    }

    const workspace = await ctx.db.get(asId<"workspaces">(membership.workspaceId));
    if (!workspace) {
      return null;
    }

    return buildWorkspacePayload(workspace, membership);
  },
});

export const getInvitationDetails = query({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .collect();

    const invitation = invitations[0];
    if (!invitation) {
      return null;
    }

    const workspace = await ctx.db.get(asId<"workspaces">(invitation.workspaceId));
    if (!workspace) {
      return null;
    }

    const expired =
      invitation.status === "pending" &&
      typeof invitation.expiresAt === "string" &&
      new Date(invitation.expiresAt).getTime() < Date.now();

    return {
      id: invitation._id,
      profileId: workspace._id,
      agencyName: readString(workspace.agencyName) ?? "My Agency",
      invitedEmail: String(invitation.email),
      role: invitation.role,
      status: expired ? "expired" : invitation.status,
      expiresAt: readString(invitation.expiresAt) ?? new Date().toISOString(),
      inviterName: null,
    };
  },
});

export const getWorkspaceSeatSummary = query({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx);
    return buildSeatSummary(ctx, workspace);
  },
});

export const getWorkspaceUsersManagement = query({
  args: {},
  handler: async (ctx) => getWorkspaceUsersPayload(ctx),
});

export const createWorkspaceForCurrentUser = mutation({
  args: {
    email: v.string(),
    agencyName: v.string(),
    planTier: v.string(),
    billingInterval: v.string(),
    primaryIntent: v.union(v.literal("therapy"), v.literal("jobs"), v.literal("both")),
    legacySourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const userId = await ensureUserRecord(ctx, {
      ...identity,
      email: args.email,
    });

    const existingMemberships = (await findMembershipsByUserId(ctx, userId)).filter(
      (membership) => membership.status === "active",
    );
    if (existingMemberships.length > 0) {
      const workspace = await ctx.db.get(
        asId<"workspaces">(existingMemberships[0].workspaceId),
      );
      if (!workspace) {
        throw new ConvexError("Workspace not found");
      }
      return buildWorkspacePayload(workspace, existingMemberships[0]);
    }

    const normalizedEmail = normalizeEmail(args.email);
    const timestamp = new Date().toISOString();
    const workspaceId = await ctx.db.insert("workspaces", {
      agencyName: args.agencyName,
      contactEmail: normalizedEmail,
      planTier: args.planTier,
      billingInterval: args.billingInterval,
      primaryIntent: args.primaryIntent,
      settings: {
        contactPhone: null,
        website: null,
        intakeFormSettings: {
          background_color: "#0866FF",
          show_powered_by: true,
        },
      },
      legacySourceId: args.legacySourceId,
      legacyTable: "profiles",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const membershipId = await ctx.db.insert("workspaceMemberships", {
      workspaceId,
      userId: asId<"users">(userId),
      email: normalizedEmail,
      role: "owner",
      status: "active",
      joinedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      legacySourceId: args.legacySourceId,
      legacyTable: "profile_memberships",
    });

    await ctx.db.patch(asId<"users">(userId), {
      activeWorkspaceId: asId<"workspaces">(workspaceId),
      updatedAt: timestamp,
    });

    const listingSlug = await findUniqueListingSlug(ctx, args.agencyName);
    await ctx.db.insert("listings", {
      workspaceId,
      slug: listingSlug,
      status: "draft",
      metadata: {
        headline: null,
        description: null,
        summary: null,
        serviceModes: [],
        isAcceptingClients: true,
        logoUrl: null,
        videoUrl: null,
        publishedAt: null,
        contactFormEnabled: false,
        clientIntakeEnabled: false,
        careersBrandColor: "#10B981",
        careersHeadline: null,
        careersCtaText: "Join Our Team",
        careersHideBadge: false,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    const membership = await ctx.db.get(
      asId<"workspaceMemberships">(membershipId),
    );

    if (!workspace || !membership) {
      throw new ConvexError("Failed to create workspace");
    }

    return buildWorkspacePayload(workspace, membership);
  },
});

export const acceptWorkspaceInvitation = mutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const normalizedEmail = normalizeEmail(identity.email ?? "");
    if (!normalizedEmail) {
      throw new ConvexError("This invitation must be accepted with the invited email address");
    }

    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .collect();
    const invitation = invitations[0];

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    if (invitation.status === "revoked") {
      throw new ConvexError("This invitation has been revoked");
    }

    if (
      invitation.status === "pending" &&
      typeof invitation.expiresAt === "string" &&
      new Date(invitation.expiresAt).getTime() < Date.now()
    ) {
      throw new ConvexError("This invitation has expired");
    }

    if (invitation.status === "accepted") {
      throw new ConvexError("This invitation has already been accepted");
    }

    if (normalizeEmail(String(invitation.email)) !== normalizedEmail) {
      throw new ConvexError("This invitation must be accepted with the invited email address");
    }

    const userId = await ensureUserRecord(ctx, identity);
    const activeMemberships = (await findMembershipsByUserId(ctx, userId)).filter(
      (membership) => membership.status === "active",
    );
    const conflictingMembership = activeMemberships.find(
      (membership) => membership.workspaceId !== invitation.workspaceId,
    );

    if (conflictingMembership) {
      throw new ConvexError("This user already belongs to another workspace");
    }

    const existingMembership = activeMemberships.find(
      (membership) => membership.workspaceId === invitation.workspaceId,
    );
    const timestamp = new Date().toISOString();

    let membershipId = existingMembership?._id;
    if (existingMembership) {
      await ctx.db.patch(asId<"workspaceMemberships">(existingMembership._id), {
        email: normalizedEmail,
        role: invitation.role as WorkspaceRole,
        status: "active",
        joinedAt: readString(existingMembership.joinedAt) ?? timestamp,
        updatedAt: timestamp,
      });
    } else {
      membershipId = await ctx.db.insert("workspaceMemberships", {
        workspaceId: asId<"workspaces">(invitation.workspaceId),
        userId: asId<"users">(userId),
        email: normalizedEmail,
        role: invitation.role as WorkspaceRole,
        status: "active",
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await ctx.db.patch(asId<"workspaceInvitations">(invitation._id), {
      status: "accepted",
      acceptedByUserId: asId<"users">(userId),
      acceptedAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.patch(asId<"users">(userId), {
      activeWorkspaceId: asId<"workspaces">(invitation.workspaceId),
      updatedAt: timestamp,
    });

    const workspace = await ctx.db.get(asId<"workspaces">(invitation.workspaceId));
    const membership = membershipId
      ? await ctx.db.get(asId<"workspaceMemberships">(membershipId))
      : null;

    if (!workspace || !membership) {
      throw new ConvexError("Failed to accept invitation");
    }

    return buildWorkspacePayload(workspace, membership);
  },
});

export const inviteWorkspaceUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    tokenHash: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx);
    requireMinimumRole(membership, "admin");

    const normalizedEmail = normalizeEmail(args.email);
    const seatSummary = await buildSeatSummary(ctx, workspace);
    if (seatSummary.availableSeats < 1) {
      throw new ConvexError("No available user seats. Add another seat before inviting.");
    }

    const [memberships, invitations] = await Promise.all([
      findWorkspaceMemberships(ctx, workspace._id),
      findWorkspaceInvitations(ctx, workspace._id),
    ]);

    const existingMember = memberships.find(
      (row) =>
        row.status === "active" &&
        normalizeEmail(String(row.email ?? "")) === normalizedEmail,
    );
    if (existingMember) {
      throw new ConvexError("That user is already a member of this workspace");
    }

    const existingInvite = invitations.find(
      (row) =>
        normalizeEmail(String(row.email ?? "")) === normalizedEmail &&
        getEffectiveInvitationStatus(row) === "pending",
    );
    if (existingInvite) {
      throw new ConvexError("An invitation is already pending for that email");
    }

    const timestamp = new Date().toISOString();
    const invitationId = await ctx.db.insert("workspaceInvitations", {
      workspaceId: asId<"workspaces">(workspace._id),
      email: normalizedEmail,
      role: args.role,
      status: "pending",
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "profile_invitations",
    });

    return {
      invitationId,
      workspaceName: readString(workspace.agencyName) ?? "GoodABA",
      inviterEmail: String(membership.email ?? ""),
    };
  },
});

export const revokeWorkspaceInvitation = mutation({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx);
    requireMinimumRole(membership, "admin");

    const invitation = await ctx.db.get(asId<"workspaceInvitations">(args.invitationId));
    if (!invitation || invitation.workspaceId !== workspace._id) {
      throw new ConvexError("Invitation not found");
    }

    const effectiveStatus = getEffectiveInvitationStatus(invitation);
    if (effectiveStatus !== "pending" && effectiveStatus !== "expired") {
      throw new ConvexError("Only pending or expired invitations can be revoked");
    }

    await ctx.db.patch(asId<"workspaceInvitations">(invitation._id), {
      status: "revoked",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const resendWorkspaceInvitation = mutation({
  args: {
    invitationId: v.string(),
    tokenHash: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx);
    requireMinimumRole(membership, "admin");

    const invitation = await ctx.db.get(asId<"workspaceInvitations">(args.invitationId));
    if (!invitation || invitation.workspaceId !== workspace._id) {
      throw new ConvexError("Invitation not found");
    }

    const effectiveStatus = getEffectiveInvitationStatus(invitation);
    if (effectiveStatus !== "pending" && effectiveStatus !== "expired") {
      throw new ConvexError("Only pending or expired invitations can be resent");
    }

    await ctx.db.patch(asId<"workspaceInvitations">(invitation._id), {
      status: "pending",
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      updatedAt: new Date().toISOString(),
    });

    return {
      invitationId: invitation._id,
      email: String(invitation.email ?? ""),
      role: invitation.role,
      workspaceName: readString(workspace.agencyName) ?? "GoodABA",
      inviterEmail: String(membership.email ?? ""),
    };
  },
});

export const removeWorkspaceUser = mutation({
  args: {
    membershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership } = await getCurrentWorkspaceContext(ctx);

    const target = await ctx.db.get(asId<"workspaceMemberships">(args.membershipId));
    if (!target || target.workspaceId !== membership.workspaceId) {
      throw new ConvexError("Workspace user not found");
    }

    if (target.role === "owner") {
      throw new ConvexError("The workspace owner cannot be removed");
    }

    if (target.userId === membership.userId) {
      throw new ConvexError("You cannot remove yourself from the workspace");
    }

    const canRemove =
      membership.role === "owner" ||
      (membership.role === "admin" && target.role === "member");

    if (!canRemove) {
      throw new ConvexError("You do not have permission to remove this user");
    }

    await ctx.db.patch(asId<"workspaceMemberships">(target._id), {
      status: "revoked",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const updateWorkspaceUserRole = mutation({
  args: {
    membershipId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { membership } = await getCurrentWorkspaceContext(ctx);
    requireMinimumRole(membership, "owner");

    const target = await ctx.db.get(asId<"workspaceMemberships">(args.membershipId));
    if (!target || target.workspaceId !== membership.workspaceId) {
      throw new ConvexError("Workspace user not found");
    }

    if (target.role === "owner") {
      throw new ConvexError("The workspace owner role cannot be changed");
    }

    await ctx.db.patch(asId<"workspaceMemberships">(target._id), {
      role: args.role,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const setCurrentWorkspacePrimaryIntentIfMissing = mutation({
  args: {
    primaryIntent: v.union(
      v.literal("therapy"),
      v.literal("jobs"),
      v.literal("both"),
    ),
  },
  handler: async (ctx, args) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx);
    if (readString(workspace.primaryIntent)) {
      return { success: true, updated: false };
    }

    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      primaryIntent: args.primaryIntent,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, updated: true };
  },
});

export const getOnboardingFlowState = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { workspace } = await getCurrentWorkspaceContext(ctx);

      // Get listing for this workspace
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
        .collect();
      const listing = listings[0] ?? null;
      const listingMetadata = listing ? asRecord(listing.metadata) : {};

      // Check location step
      let hasLocationStep = false;
      let hasServicesStep = false;
      if (listing) {
        const locations = await ctx.db
          .query("locations")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .collect();
        hasLocationStep = locations.length > 0;

        const attrs = await ctx.db
          .query("listingAttributes")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .collect();
        const servicesAttr = (attrs as Array<Record<string, unknown>>).find(
          (a) => a.attributeKey === "services_offered",
        );
        hasServicesStep =
          Array.isArray(servicesAttr?.value) &&
          (servicesAttr.value as unknown[]).length > 0;
      }

      const hasAgencyStep =
        Boolean(readString(workspace.agencyName)) &&
        Boolean(readString(workspace.contactEmail)) &&
        Boolean(readString(listingMetadata.description)?.trim());

      return {
        onboardingCompleted: Boolean(readString(workspace.onboardingCompletedAt)),
        selectedPlan: readString(workspace.planTier),
        billingInterval: readString(workspace.billingInterval),
        subscriptionStatus: readString(workspace.subscriptionStatus),
        hasAgencyStep,
        hasLocationStep,
        hasServicesStep,
      };
    } catch {
      return null;
    }
  },
});
