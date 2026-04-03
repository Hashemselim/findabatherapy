import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type EffectiveLimits = {
  maxLocations: number;
  maxJobPostings: number;
  maxUsers: number;
  maxStorageGB: number;
  hasHomepagePlacement: boolean;
};

const BASE_LIMITS: Record<"free" | "pro", EffectiveLimits> = {
  free: {
    maxLocations: 3,
    maxJobPostings: 0,
    maxUsers: 1,
    maxStorageGB: 5,
    hasHomepagePlacement: false,
  },
  pro: {
    maxLocations: 10,
    maxJobPostings: 10,
    maxUsers: 1,
    maxStorageGB: 5,
    hasHomepagePlacement: false,
  },
} as const;

const ADDON_UNITS = {
  location_pack: 5,
  job_pack: 5,
  extra_users: 1,
  storage_pack: 10,
  homepage_placement: 1,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

function readStripeCustomerId(workspace: ConvexDoc) {
  return readString(asRecord(workspace.settings).stripeCustomerId);
}

function readStripeSubscriptionId(workspace: ConvexDoc) {
  return readString(asRecord(workspace.settings).stripeSubscriptionId);
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

async function requireCurrentWorkspaceContext(ctx: {
  auth: { getUserIdentity(): Promise<Identity | null> };
  db: {
    get(id: string): Promise<ConvexDoc | null>;
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
      withIndex(
        index: "by_workspace",
        cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "workspaceInvitations"): {
      withIndex(
        index: "by_workspace",
        cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "billingRecords"): {
      withIndex(
        index: "by_workspace",
        cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
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

  const workspace = await ctx.db.get(asId<"workspaces">(activeMembership.workspaceId));
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  const [workspaceMemberships, invitations, billingRecords] = await Promise.all([
    ctx.db
      .query("workspaceMemberships")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect(),
    ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect(),
    ctx.db
      .query("billingRecords")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect(),
  ]);

  return {
    user,
    membership: activeMembership,
    workspace,
    workspaceMemberships,
    invitations,
    billingRecords,
  };
}

function getCurrentPlanTier(workspace: ConvexDoc): "free" | "pro" {
  const rawTier = workspace.planTier === "pro" ? "pro" : "free";
  if (!workspace.onboardingCompletedAt) {
    return rawTier;
  }

  const isActive =
    workspace.subscriptionStatus === "active" ||
    workspace.subscriptionStatus === "trialing";

  return rawTier === "pro" && isActive ? "pro" : "free";
}

function getSelectedPlanTier(workspace: ConvexDoc): "free" | "pro" {
  return workspace.planTier === "pro" ? "pro" : "free";
}

function getEffectiveInvitationStatus(invitation: ConvexDoc) {
  if (invitation.status !== "pending") {
    return invitation.status;
  }

  if (
    typeof invitation.expiresAt === "string" &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    return "expired";
  }

  return "pending";
}

function mapAddon(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const addonType = readString(payload.addonType) ?? readString(payload.addon_type);
  if (!addonType) {
    return null;
  }

  return {
    id: row._id,
    addonType,
    quantity: readNumber(payload.quantity, 1),
    status: readString(row.status) ?? "active",
    stripeSubscriptionId:
      readString(row.stripeSubscriptionId) ??
      readString(payload.stripeSubscriptionId) ??
      readString(payload.stripe_subscription_id),
    cancelAtPeriodEnd:
      payload.cancelAtPeriodEnd === true || payload.cancel_at_period_end === true,
    currentPeriodEnd:
      readString(payload.currentPeriodEnd) ?? readString(payload.current_period_end),
    grandfatheredUntil:
      readString(payload.grandfatheredUntil) ?? readString(payload.grandfathered_until),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

function getActiveAddonsFromRecords(records: ConvexDoc[]) {
  return records
    .filter((record) => record.recordType === "addon" && record.status === "active")
    .map(mapAddon)
    .filter((addon): addon is NonNullable<typeof addon> => Boolean(addon))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function buildEffectiveLimits(workspace: ConvexDoc, records: ConvexDoc[]) {
  const tier = getCurrentPlanTier(workspace);
  const limits = { ...BASE_LIMITS[tier] };
  if (tier !== "pro") {
    return limits;
  }

  for (const addon of getActiveAddonsFromRecords(records)) {
    const unitsPerPack =
      ADDON_UNITS[addon.addonType as keyof typeof ADDON_UNITS] ?? 1;
    const totalUnits = addon.quantity * unitsPerPack;

    switch (addon.addonType) {
      case "location_pack":
        limits.maxLocations += totalUnits;
        break;
      case "job_pack":
        limits.maxJobPostings += totalUnits;
        break;
      case "extra_users":
        limits.maxUsers += totalUnits;
        break;
      case "storage_pack":
        limits.maxStorageGB += totalUnits;
        break;
      case "homepage_placement":
        limits.hasHomepagePlacement = true;
        break;
    }
  }

  return limits;
}

function getSeatUsage(memberships: ConvexDoc[], invitations: ConvexDoc[]) {
  const activeMembers = memberships.filter((membership) => membership.status === "active").length;
  const pendingInvites = invitations.filter(
    (invitation) => getEffectiveInvitationStatus(invitation) === "pending",
  ).length;

  return {
    activeMembers,
    pendingInvites,
    usedSeats: activeMembers + pendingInvites,
  };
}

async function getCurrentListing(
  ctx: {
    db: {
      query(table: "listings"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspaceId: string,
) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  return listings[0] ?? null;
}

function mapFeaturedLocationRecord(record: ConvexDoc, locations: Map<string, ConvexDoc>) {
  const payload = asRecord(record.payload);
  const locationId = readString(payload.locationId) ?? readString(payload.location_id);
  if (!locationId) {
    return null;
  }

  const location = locations.get(locationId);
  if (!location) {
    return null;
  }

  const metadata = asRecord(location.metadata);
  const city = readString(metadata.city) ?? "";
  const state = readString(metadata.state) ?? "";
  const label = readString(metadata.label) ?? (city && state ? `${city}, ${state}` : "Location");

  return {
    id: record._id,
    locationId,
    locationLabel: label,
    city,
    state,
    status: readString(record.status) ?? "active",
    billingInterval:
      readString(payload.billingInterval) ??
      readString(payload.billing_interval) ??
      "month",
    currentPeriodEnd:
      readString(payload.currentPeriodEnd) ?? readString(payload.current_period_end),
    cancelAtPeriodEnd:
      payload.cancelAtPeriodEnd === true || payload.cancel_at_period_end === true,
  };
}

export const getPaymentStatus = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const selectedPlanTier = getSelectedPlanTier(workspace);
    const hasSubscription = Boolean(readStripeSubscriptionId(workspace));
    const isPaid =
      selectedPlanTier === "pro" &&
      (workspace.subscriptionStatus === "active" ||
        workspace.subscriptionStatus === "trialing");

    return {
      isPaid,
      planTier: selectedPlanTier,
      hasSubscription,
    };
  },
});

export const getCurrentBillingWorkspaceState = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const listing = await getCurrentListing(ctx as never, workspace._id);

    return {
      workspaceId: workspace._id,
      listingId: listing?._id ?? null,
      planTier: getSelectedPlanTier(workspace),
      billingInterval: readString(workspace.billingInterval) ?? "month",
      subscriptionStatus: readString(workspace.subscriptionStatus),
      stripeCustomerId: readStripeCustomerId(workspace),
      stripeSubscriptionId: readStripeSubscriptionId(workspace),
    };
  },
});

export const getSelectedPlanTierQuery = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    return { planTier: getSelectedPlanTier(workspace) };
  },
});

export const getCurrentPlanTierQuery = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    return { planTier: getCurrentPlanTier(workspace) };
  },
});

export const getActiveAddons = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { billingRecords } = await requireCurrentWorkspaceContext(ctx as never);
    return getActiveAddonsFromRecords(billingRecords);
  },
});

export const getEffectiveLimits = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace, billingRecords } = await requireCurrentWorkspaceContext(ctx as never);
    return buildEffectiveLimits(workspace, billingRecords);
  },
});

export const getFeaturedLocations = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace, billingRecords } = await requireCurrentWorkspaceContext(ctx as never);
    const db = ctx.db as {
      query(table: "locations"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    const locationRows = await db
      .query("locations")
      .withIndex("by_workspace", (q: { eq(field: "workspaceId", value: string): unknown }) =>
        q.eq("workspaceId", workspace._id),
      )
      .collect();

    const locationsById = new Map<string, ConvexDoc>(
      (locationRows as ConvexDoc[]).map((location) => [location._id, location]),
    );
    const locations = billingRecords
      .filter(
        (record) =>
          (record.recordType === "featured_location_subscription" ||
            record.recordType === "featured_location") &&
          (record.status === "active" || record.status === "past_due"),
      )
      .map((record) => mapFeaturedLocationRecord(record, locationsById))
      .filter(
        (
          location,
        ): location is NonNullable<typeof location> => Boolean(location),
      )
      .sort((a, b) => a.locationLabel.localeCompare(b.locationLabel));

    return { locations };
  },
});

export const setStripeCustomerId = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await requireCurrentWorkspaceContext(ctx as never);
    if (membership.role !== "owner") {
      throw new ConvexError("Not authenticated");
    }

    const settings = asRecord(workspace.settings);
    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      settings: {
        ...settings,
        stripeCustomerId: args.stripeCustomerId,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const syncCheckoutSubscription = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planTier: v.string(),
    billingInterval: v.string(),
    subscriptionStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const { membership, workspace } = await requireCurrentWorkspaceContext(ctx as never);
    if (membership.role !== "owner") {
      throw new ConvexError("Not authenticated");
    }

    const timestamp = new Date().toISOString();
    const settings = asRecord(workspace.settings);
    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: args.planTier,
      billingInterval: args.billingInterval,
      subscriptionStatus: args.subscriptionStatus,
      settings: {
        ...settings,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      },
      updatedAt: timestamp,
    });

    const listing = await getCurrentListing(ctx as never, workspace._id);
    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        status: "published",
        updatedAt: timestamp,
      });
    }

    const db = ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    const existingRecords = await db
      .query("billingRecords")
      .withIndex(
        "by_stripe_subscription_id",
        (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
          q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();
    const existingRecord = (existingRecords as ConvexDoc[])[0] ?? null;

    if (existingRecord) {
      await ctx.db.patch(asId<"billingRecords">(existingRecord._id), {
        workspaceId: asId<"workspaces">(workspace._id),
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        recordType: existingRecord.recordType,
        status: args.subscriptionStatus,
        payload: {
          ...asRecord(existingRecord.payload),
          planTier: args.planTier,
          billingInterval: args.billingInterval,
        },
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("billingRecords", {
        workspaceId: asId<"workspaces">(workspace._id),
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        recordType: "subscription",
        status: args.subscriptionStatus,
        payload: {
          planTier: args.planTier,
          billingInterval: args.billingInterval,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

export const resetPlanToFree = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { membership, workspace, workspaceMemberships, invitations } =
      await requireCurrentWorkspaceContext(ctx as never);

    if (membership.role !== "owner") {
      throw new ConvexError("Not authenticated");
    }

    const seatUsage = getSeatUsage(workspaceMemberships, invitations);
    if (seatUsage.usedSeats > 1) {
      throw new ConvexError(
        "Reduce workspace users and pending invitations to one seat before resetting to Free.",
      );
    }

    if (
      workspace.subscriptionStatus === "active" ||
      workspace.subscriptionStatus === "trialing"
    ) {
      return { success: true };
    }

    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: "free",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ============================================================================
// Webhook mutations – called from the Next.js Stripe webhook handler.
// These do NOT require Clerk auth; they look up workspaces by Stripe IDs.
// ============================================================================

async function findWorkspaceByStripeCustomerId(
  ctx: {
    db: {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_customer_id",
          cb: (q: { eq(field: "stripeCustomerId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
      get(id: string): Promise<ConvexDoc | null>;
    };
  },
  stripeCustomerId: string,
) {
  const records = await ctx.db
    .query("billingRecords")
    .withIndex("by_stripe_customer_id", (q) =>
      q.eq("stripeCustomerId", stripeCustomerId),
    )
    .collect();

  if (records.length > 0) {
    const workspaceId = records[0].workspaceId as string;
    return ctx.db.get(workspaceId);
  }

  return null;
}

async function findWorkspaceByStripeSubscriptionId(
  ctx: {
    db: {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
      get(id: string): Promise<ConvexDoc | null>;
    };
  },
  stripeSubscriptionId: string,
) {
  const records = await ctx.db
    .query("billingRecords")
    .withIndex("by_stripe_subscription_id", (q) =>
      q.eq("stripeSubscriptionId", stripeSubscriptionId),
    )
    .collect();

  if (records.length > 0) {
    const workspaceId = records[0].workspaceId as string;
    return ctx.db.get(workspaceId);
  }

  return null;
}

/**
 * Webhook: checkout.session.completed for main plan subscription.
 */
export const webhookCheckoutCompleted = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planTier: v.string(),
    billingInterval: v.string(),
    profileId: v.optional(v.string()),
    listingId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId);
    if (!workspace) {
      console.error("webhookCheckoutCompleted: no workspace found for customer", args.stripeCustomerId);
      return { success: false };
    }

    const timestamp = new Date().toISOString();
    const settings = asRecord(workspace.settings);
    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: args.planTier,
      billingInterval: args.billingInterval,
      subscriptionStatus: "active",
      settings: {
        ...settings,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      },
      updatedAt: timestamp,
    });

    // Publish listing if exists
    const listing = await getCurrentListing(ctx as never, workspace._id);
    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        status: "published",
        updatedAt: timestamp,
      });
    }

    // Upsert billing record
    const existingRecords = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();
    const existing = (existingRecords as ConvexDoc[])[0] ?? null;

    if (existing) {
      await ctx.db.patch(asId<"billingRecords">(existing._id), {
        status: "active",
        payload: {
          ...asRecord(existing.payload),
          planTier: args.planTier,
          billingInterval: args.billingInterval,
        },
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("billingRecords", {
        workspaceId: asId<"workspaces">(workspace._id),
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        recordType: "subscription",
        status: "active",
        payload: {
          planTier: args.planTier,
          billingInterval: args.billingInterval,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

/**
 * Webhook: customer.subscription.updated for main plan.
 */
export const webhookSubscriptionUpdated = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planTier: v.string(),
    billingInterval: v.string(),
    subscriptionStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace =
      (await findWorkspaceByStripeSubscriptionId(ctx as never, args.stripeSubscriptionId)) ??
      (await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId));

    if (!workspace) {
      console.error("webhookSubscriptionUpdated: no workspace found", args.stripeSubscriptionId);
      return { success: false };
    }

    const isActive = args.subscriptionStatus === "active" || args.subscriptionStatus === "trialing";
    const timestamp = new Date().toISOString();
    const settings = asRecord(workspace.settings);

    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: isActive ? args.planTier : "free",
      billingInterval: isActive ? args.billingInterval : "month",
      subscriptionStatus: args.subscriptionStatus,
      settings: {
        ...settings,
        stripeSubscriptionId: args.stripeSubscriptionId,
      },
      updatedAt: timestamp,
    });

    // Update listing
    const listing = await getCurrentListing(ctx as never, workspace._id);
    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        updatedAt: timestamp,
      });
    }

    // Update billing record
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (record) {
      await ctx.db.patch(asId<"billingRecords">(record._id), {
        status: args.subscriptionStatus,
        payload: {
          ...asRecord(record.payload),
          planTier: args.planTier,
          billingInterval: args.billingInterval,
        },
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

/**
 * Webhook: customer.subscription.deleted for main plan.
 */
export const webhookSubscriptionDeleted = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace =
      (await findWorkspaceByStripeSubscriptionId(ctx as never, args.stripeSubscriptionId)) ??
      (await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId));

    if (!workspace) {
      console.error("webhookSubscriptionDeleted: no workspace found", args.stripeSubscriptionId);
      return { success: false };
    }

    const timestamp = new Date().toISOString();
    const settings = asRecord(workspace.settings);

    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: "free",
      billingInterval: "month",
      subscriptionStatus: undefined,
      settings: {
        ...settings,
        stripeSubscriptionId: undefined,
      },
      updatedAt: timestamp,
    });

    // Update listing
    const listing = await getCurrentListing(ctx as never, workspace._id);
    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        updatedAt: timestamp,
      });
    }

    // Update billing record
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (record) {
      await ctx.db.patch(asId<"billingRecords">(record._id), {
        status: "cancelled",
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

/**
 * Webhook: addon subscription created (inline charge or checkout).
 */
export const webhookAddonCreated = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    addonType: v.string(),
    quantity: v.number(),
    currentPeriodEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId);
    if (!workspace) {
      console.error("webhookAddonCreated: no workspace found", args.stripeCustomerId);
      return { success: false };
    }

    // Idempotency check
    const existing = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    if ((existing as ConvexDoc[]).length > 0) {
      return { success: true };
    }

    const timestamp = new Date().toISOString();
    await ctx.db.insert("billingRecords", {
      workspaceId: asId<"workspaces">(workspace._id),
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      recordType: "addon",
      status: "active",
      payload: {
        addonType: args.addonType,
        quantity: args.quantity,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { success: true };
  },
});

/**
 * Webhook: addon subscription updated.
 */
export const webhookAddonUpdated = mutationGeneric({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
    quantity: v.number(),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (!record) {
      console.error("webhookAddonUpdated: no record found", args.stripeSubscriptionId);
      return { success: false };
    }

    await ctx.db.patch(asId<"billingRecords">(record._id), {
      status: args.status,
      payload: {
        ...asRecord(record.payload),
        quantity: args.quantity,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/**
 * Webhook: addon subscription deleted.
 */
export const webhookAddonDeleted = mutationGeneric({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (!record) {
      console.error("webhookAddonDeleted: no record found", args.stripeSubscriptionId);
      return { success: false };
    }

    await ctx.db.patch(asId<"billingRecords">(record._id), {
      status: "canceled",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/**
 * Webhook: featured location subscription created (checkout or inline charge).
 */
export const webhookFeaturedLocationCreated = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    locationId: v.string(),
    billingInterval: v.string(),
    currentPeriodEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId);
    if (!workspace) {
      console.error("webhookFeaturedLocationCreated: no workspace found", args.stripeCustomerId);
      return { success: false };
    }

    // Idempotency check
    const existing = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    if ((existing as ConvexDoc[]).length > 0) {
      return { success: true };
    }

    const timestamp = new Date().toISOString();
    await ctx.db.insert("billingRecords", {
      workspaceId: asId<"workspaces">(workspace._id),
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      recordType: "featured_location_subscription",
      status: "active",
      payload: {
        locationId: args.locationId,
        billingInterval: args.billingInterval,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Update location featured flag
    const db = ctx.db as {
      query(table: "locations"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    const locations = await db
      .query("locations")
      .withIndex("by_workspace", (q: { eq(field: "workspaceId", value: string): unknown }) =>
        q.eq("workspaceId", workspace._id),
      )
      .collect();

    const matchingLocation = (locations as ConvexDoc[]).find(
      (loc) => loc._id === args.locationId || loc.legacySourceId === args.locationId,
    );
    if (matchingLocation) {
      const metadata = asRecord(matchingLocation.metadata);
      await ctx.db.patch(asId<"locations">(matchingLocation._id), {
        metadata: { ...metadata, isFeatured: true },
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

/**
 * Webhook: featured location subscription updated.
 */
export const webhookFeaturedLocationUpdated = mutationGeneric({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.optional(v.string()),
    cancelAtPeriodEnd: v.boolean(),
    locationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (!record) {
      console.error("webhookFeaturedLocationUpdated: no record found", args.stripeSubscriptionId);
      return { success: false };
    }

    const timestamp = new Date().toISOString();
    await ctx.db.patch(asId<"billingRecords">(record._id), {
      status: args.status,
      payload: {
        ...asRecord(record.payload),
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      },
      updatedAt: timestamp,
    });

    // Update location featured flag if no longer active/past_due
    const isActiveOrGrace = args.status === "active" || args.status === "past_due";
    if (!isActiveOrGrace && args.locationId) {
      const workspace = await ctx.db.get(asId<"workspaces">(record.workspaceId as string));
      if (workspace) {
        const db = ctx.db as {
          query(table: "locations"): {
            withIndex(
              index: "by_workspace",
              cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
            ): { collect(): Promise<ConvexDoc[]> };
          };
        };
        const locations = await db
          .query("locations")
          .withIndex("by_workspace", (q: { eq(field: "workspaceId", value: string): unknown }) =>
            q.eq("workspaceId", workspace._id),
          )
          .collect();

        const matchingLocation = (locations as ConvexDoc[]).find(
          (loc) => loc._id === args.locationId || loc.legacySourceId === args.locationId,
        );
        if (matchingLocation) {
          const metadata = asRecord(matchingLocation.metadata);
          await ctx.db.patch(asId<"locations">(matchingLocation._id), {
            metadata: { ...metadata, isFeatured: false },
            updatedAt: timestamp,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * Webhook: featured location subscription deleted.
 */
export const webhookFeaturedLocationDeleted = mutationGeneric({
  args: {
    stripeSubscriptionId: v.string(),
    locationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const records = await (ctx.db as {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_stripe_subscription_id",
          cb: (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    })
      .query("billingRecords")
      .withIndex("by_stripe_subscription_id", (q: { eq(field: "stripeSubscriptionId", value: string): unknown }) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .collect();

    const record = (records as ConvexDoc[])[0] ?? null;
    if (!record) {
      console.error("webhookFeaturedLocationDeleted: no record found", args.stripeSubscriptionId);
      return { success: false };
    }

    const timestamp = new Date().toISOString();
    await ctx.db.patch(asId<"billingRecords">(record._id), {
      status: "cancelled",
      updatedAt: timestamp,
    });

    // Remove featured flag from location
    const locationId = args.locationId ?? readString(asRecord(record.payload).locationId);
    if (locationId) {
      const workspace = await ctx.db.get(asId<"workspaces">(record.workspaceId as string));
      if (workspace) {
        const db = ctx.db as {
          query(table: "locations"): {
            withIndex(
              index: "by_workspace",
              cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
            ): { collect(): Promise<ConvexDoc[]> };
          };
        };
        const locations = await db
          .query("locations")
          .withIndex("by_workspace", (q: { eq(field: "workspaceId", value: string): unknown }) =>
            q.eq("workspaceId", workspace._id),
          )
          .collect();

        const matchingLocation = (locations as ConvexDoc[]).find(
          (loc) => loc._id === locationId || loc.legacySourceId === locationId,
        );
        if (matchingLocation) {
          const metadata = asRecord(matchingLocation.metadata);
          await ctx.db.patch(asId<"locations">(matchingLocation._id), {
            metadata: { ...metadata, isFeatured: false },
            updatedAt: timestamp,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * Webhook: sync verify-and-sync checkout (race condition fix from success page).
 */
export const webhookSyncCheckout = mutationGeneric({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    planTier: v.string(),
    billingInterval: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await findWorkspaceByStripeCustomerId(ctx as never, args.stripeCustomerId);
    if (!workspace) {
      console.error("webhookSyncCheckout: no workspace found", args.stripeCustomerId);
      return { success: false };
    }

    const timestamp = new Date().toISOString();
    const settings = asRecord(workspace.settings);
    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      planTier: args.planTier,
      billingInterval: args.billingInterval,
      subscriptionStatus: "active",
      settings: {
        ...settings,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      },
      updatedAt: timestamp,
    });

    // Publish listing
    const listing = await getCurrentListing(ctx as never, workspace._id);
    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        status: "published",
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});
