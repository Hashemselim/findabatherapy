import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type WorkspaceRole = "owner" | "admin" | "member";

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

async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<Identity | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

async function findUserByClerkUserId(
  ctx: { db: { query(table: "users"): { withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> } } } },
  clerkUserId: string,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();

  return users[0] ?? null;
}

async function findMembershipsByUserId(
  ctx: { db: { query(table: "workspaceMemberships"): { withIndex(index: "by_user", cb: (q: { eq(field: "userId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> } } } },
  userId: string,
) {
  return ctx.db
    .query("workspaceMemberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

async function findWorkspaceMemberships(
  ctx: {
    db: {
      query(table: "workspaceMemberships"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  workspaceId: string,
) {
  return ctx.db
    .query("workspaceMemberships")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

async function findWorkspaceInvitations(
  ctx: {
    db: {
      query(table: "workspaceInvitations"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  workspaceId: string,
) {
  return ctx.db
    .query("workspaceInvitations")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

async function findCurrentMembership(
  ctx: {
    db: {
      get(id: string): Promise<ConvexDoc | null>;
      query(table: "workspaceMemberships"): {
        withIndex(index: "by_user", cb: (q: { eq(field: "userId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  user: ConvexDoc,
) {
  const memberships = (await findMembershipsByUserId(ctx as never, user._id)).filter(
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
  ctx: {
    db: {
      insert(table: "users", value: Record<string, unknown>): Promise<string>;
      patch(id: string, value: Record<string, unknown>): Promise<void>;
      query(table: "users"): {
        withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  identity: Identity,
) {
  const existingUser = await findUserByClerkUserId(ctx as never, identity.subject);
  const displayName =
    [identity.givenName, identity.familyName].filter(Boolean).join(" ") || null;

  if (existingUser) {
    await ctx.db.patch(asId<"users">(existingUser._id), {
      primaryEmail: identity.email ?? existingUser.primaryEmail ?? undefined,
      firstName: identity.givenName ?? existingUser.firstName ?? undefined,
      lastName: identity.familyName ?? existingUser.familyName ?? undefined,
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
    displayName,
    imageUrl: identity.pictureUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function getCurrentWorkspaceContext(
  ctx: {
    auth: { getUserIdentity(): Promise<Identity | null> };
    db: {
      get(id: string): Promise<ConvexDoc | null>;
      query(table: "users"): {
        withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "workspaceMemberships"): {
        withIndex(index: "by_user", cb: (q: { eq(field: "userId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx as never, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  const membership = await findCurrentMembership(ctx as never, user);
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
  ctx: {
    db: {
      query(table: "billingRecords"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  workspaceId: string,
) {
  const records = await ctx.db
    .query("billingRecords")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
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
  ctx: {
    db: {
      query(table: "workspaceMemberships"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "workspaceInvitations"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "billingRecords"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
  workspace: ConvexDoc,
) {
  const [memberships, invitations, extraSeats] = await Promise.all([
    findWorkspaceMemberships(ctx as never, workspace._id),
    findWorkspaceInvitations(ctx as never, workspace._id),
    getExtraUserSeatCount(ctx as never, workspace._id),
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
  ctx: {
    db: {
      query(table: "listings"): {
        withIndex(index: "by_slug", cb: (q: { eq(field: "slug", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
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
  ctx: {
    auth: { getUserIdentity(): Promise<Identity | null> };
    db: {
      get(id: string): Promise<ConvexDoc | null>;
      query(table: "users"): {
        withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "workspaceMemberships"): {
        withIndex(index: "by_user", cb: (q: { eq(field: "userId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "workspaceInvitations"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
      query(table: "billingRecords"): {
        withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): {
          collect(): Promise<ConvexDoc[]>;
        };
      };
    };
  },
) {
  const { membership, workspace } = await getCurrentWorkspaceContext(ctx);
  const [memberships, invitations, seatSummary] = await Promise.all([
    findWorkspaceMemberships(ctx as never, workspace._id),
    findWorkspaceInvitations(ctx as never, workspace._id),
    buildSeatSummary(ctx as never, workspace),
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

export const getCurrentMembership = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await findUserByClerkUserId(ctx as never, identity.subject);
    if (!user) {
      return null;
    }

    const membership = await findCurrentMembership(ctx as never, user);
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

export const getCurrentWorkspace = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await findUserByClerkUserId(ctx as never, identity.subject);
    if (!user) {
      return null;
    }

    const membership = await findCurrentMembership(ctx as never, user);
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

export const getInvitationDetails = queryGeneric({
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

export const getWorkspaceSeatSummary = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx as never);
    return buildSeatSummary(ctx as never, workspace);
  },
});

export const getWorkspaceUsersManagement = queryGeneric({
  args: {},
  handler: async (ctx) => getWorkspaceUsersPayload(ctx as never),
});

export const createWorkspaceForCurrentUser = mutationGeneric({
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
    const userId = await ensureUserRecord(ctx as never, {
      ...identity,
      email: args.email,
    });

    const existingMemberships = (await findMembershipsByUserId(ctx as never, userId)).filter(
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
      userId,
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
      activeWorkspaceId: workspaceId,
      updatedAt: timestamp,
    });

    const listingSlug = await findUniqueListingSlug(ctx as never, args.agencyName);
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

export const acceptWorkspaceInvitation = mutationGeneric({
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

    const userId = await ensureUserRecord(ctx as never, identity);
    const activeMemberships = (await findMembershipsByUserId(ctx as never, userId)).filter(
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
        role: invitation.role,
        status: "active",
        joinedAt: existingMembership.joinedAt ?? timestamp,
        updatedAt: timestamp,
      });
    } else {
      membershipId = await ctx.db.insert("workspaceMemberships", {
        workspaceId: invitation.workspaceId,
        userId,
        email: normalizedEmail,
        role: invitation.role,
        status: "active",
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await ctx.db.patch(asId<"workspaceInvitations">(invitation._id), {
      status: "accepted",
      acceptedByUserId: userId,
      acceptedAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.patch(asId<"users">(userId), {
      activeWorkspaceId: invitation.workspaceId,
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

export const inviteWorkspaceUser = mutationGeneric({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    tokenHash: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx as never);
    requireMinimumRole(membership, "admin");

    const normalizedEmail = normalizeEmail(args.email);
    const seatSummary = await buildSeatSummary(ctx as never, workspace);
    if (seatSummary.availableSeats < 1) {
      throw new ConvexError("No available user seats. Add another seat before inviting.");
    }

    const [memberships, invitations] = await Promise.all([
      findWorkspaceMemberships(ctx as never, workspace._id),
      findWorkspaceInvitations(ctx as never, workspace._id),
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

export const revokeWorkspaceInvitation = mutationGeneric({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx as never);
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

export const resendWorkspaceInvitation = mutationGeneric({
  args: {
    invitationId: v.string(),
    tokenHash: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await getCurrentWorkspaceContext(ctx as never);
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

export const removeWorkspaceUser = mutationGeneric({
  args: {
    membershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership } = await getCurrentWorkspaceContext(ctx as never);

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

export const updateWorkspaceUserRole = mutationGeneric({
  args: {
    membershipId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { membership } = await getCurrentWorkspaceContext(ctx as never);
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

export const setCurrentWorkspacePrimaryIntentIfMissing = mutationGeneric({
  args: {
    primaryIntent: v.union(
      v.literal("therapy"),
      v.literal("jobs"),
      v.literal("both"),
    ),
  },
  handler: async (ctx, args) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx as never);
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
