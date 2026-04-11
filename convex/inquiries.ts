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

function readLocationSnapshot(value: unknown) {
  const location = asRecord(value);
  const id = readString(location.id);
  const city = readString(location.city);
  const state = readString(location.state);
  if (!id || !city || !state) {
    return null;
  }

  return {
    id,
    label: readString(location.label),
    city,
    state,
  };
}

function isInternalTestEmail(email: string | null) {
  return email?.trim().toLowerCase().endsWith("@test.findabatherapy.com") ?? false;
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

async function getListingLogoUrl(
  ctx: ConvexCtx,
  listingId: string | null,
) {
  if (!listingId) {
    return null;
  }

  const files = await ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "listings").eq("relatedId", listingId),
    )
    .collect();

  const logo = files.find((file) => asRecord(file.metadata).kind === "logo") ?? null;
  if (!logo || typeof logo.storageId !== "string") {
    return null;
  }

  return ctx.storage.getUrl(asId<"_storage">(logo.storageId));
}

function isInquiryRow(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const type = readString(payload.type);
  return !type || type === "inquiry";
}

function mapInquiry(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const location = readLocationSnapshot(payload.location);
  const familyName = readString(payload.familyName) ?? readString(payload.name) ?? "";
  const familyEmail = readString(payload.familyEmail) ?? readString(payload.email) ?? "";
  const familyPhone = readString(payload.familyPhone) ?? readString(payload.phone);
  const source = readString(payload.source) ?? "listing_page";
  return {
    id: row._id,
    workspaceId: row.workspaceId ? String(row.workspaceId) : null,
    listingId: row.listingId ? String(row.listingId) : readString(payload.listingId),
    familyName,
    familyEmail,
    familyPhone,
    childAge: readString(payload.childAge),
    status: readString(row.status) ?? "unread",
    name: familyName,
    email: familyEmail,
    phone: familyPhone,
    message: readString(payload.message) ?? "",
    source,
    type: readString(payload.type) ?? "inquiry",
    payload,
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt),
    readAt: readString(payload.readAt),
    repliedAt: readString(payload.repliedAt),
    locationId: readString(payload.locationId),
    location,
    referralSource: readString(payload.referralSource),
    referralSourceOther: readString(payload.referralSourceOther),
  };
}

/* ------------------------------------------------------------------ */
/*  submitInquiry - public (no auth)                                  */
/* ------------------------------------------------------------------ */
export const submitInquiry = mutation({
  args: {
    listingId: v.string(),
    familyName: v.string(),
    familyEmail: v.string(),
    familyPhone: v.optional(v.union(v.string(), v.null())),
    childAge: v.optional(v.union(v.string(), v.null())),
    message: v.string(),
    source: v.optional(v.string()),
    locationId: v.optional(v.union(v.string(), v.null())),
    referralSource: v.optional(v.union(v.string(), v.null())),
    referralSourceOther: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(asId<"listings">(args.listingId));
    if (!listing || listing.status !== "published") {
      return { success: false };
    }

    const workspace = await ctx.db.get(asId<"workspaces">(listing.workspaceId));
    if (!workspace) {
      return { success: false };
    }

    const providerEmail = readString(workspace.contactEmail);
    if (!providerEmail || isInternalTestEmail(providerEmail)) {
      return { success: false };
    }

    const planTier = readString(workspace.planTier) ?? "free";
    const subscriptionStatus = readString(workspace.subscriptionStatus);
    const isPremium =
      planTier !== "free" &&
      (subscriptionStatus === "active" || subscriptionStatus === "trialing");

    if (!isPremium) {
      return { success: false };
    }

    let locationSnapshot: ReturnType<typeof readLocationSnapshot> = null;
    if (args.locationId) {
      const location = await ctx.db.get(asId<"locations">(args.locationId));
      if (location && String(location.workspaceId) === String(workspace._id)) {
        const metadata = asRecord(location.metadata);
        locationSnapshot = {
          id: location._id,
          label: readString(metadata.label),
          city: readString(metadata.city) ?? "",
          state: readString(metadata.state) ?? "",
        };
      }
    }

    const now = new Date().toISOString();
    const inquiryId = await ctx.db.insert("inquiryRecords", {
      workspaceId: asId<"workspaces">(workspace._id),
      listingId: asId<"listings">(args.listingId),
      status: "unread",
      payload: {
        familyName: args.familyName,
        name: args.familyName,
        familyEmail: args.familyEmail,
        email: args.familyEmail,
        familyPhone: args.familyPhone ?? null,
        phone: args.familyPhone ?? null,
        childAge: args.childAge ?? null,
        message: args.message,
        source: args.source ?? "listing_page",
        locationId: args.locationId ?? null,
        location: locationSnapshot,
        referralSource: args.referralSource ?? null,
        referralSourceOther: args.referralSourceOther ?? null,
        listingId: args.listingId,
        type: "inquiry",
      },
      createdAt: now,
      updatedAt: now,
    });

    const familyNameParts = args.familyName.trim().split(/\s+/);
    const parentFirstName = familyNameParts[0] ?? "";
    const parentLastName = familyNameParts.slice(1).join(" ");
    const notes = [args.childAge ? `Child's age: ${args.childAge}` : null, args.message]
      .filter(Boolean)
      .join("\n\n");

    const clientId = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspace._id),
      recordType: "client",
      status: "inquiry",
      payload: {
        firstName: parentFirstName,
        lastName: parentLastName,
        email: args.familyEmail,
        phone: args.familyPhone ?? null,
        referralSource: args.referralSource ?? null,
        referralSourceDetail: args.referralSourceOther ?? null,
        notes,
        stage: "inquiry",
        listingId: args.listingId,
        inquiryId,
      },
      relatedIds: {
        listingId: args.listingId,
        inquiryId,
      },
      createdAt: now,
      updatedAt: now,
      legacyTable: "clients",
    });

    await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspace._id),
      recordType: "client_parent",
      payload: {
        firstName: parentFirstName,
        lastName: parentLastName,
        email: args.familyEmail,
        phone: args.familyPhone ?? null,
        isPrimary: true,
        sortOrder: 0,
      },
      relatedIds: { clientId, inquiryId },
      createdAt: now,
      updatedAt: now,
    });

    if (locationSnapshot) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspace._id),
        recordType: "client_location",
        payload: {
          locationId: locationSnapshot.id,
          label: locationSnapshot.label,
          city: locationSnapshot.city,
          state: locationSnapshot.state,
          isPrimary: true,
        },
        relatedIds: { clientId, inquiryId },
        createdAt: now,
        updatedAt: now,
      });
    }

    const workspaceSettings = asRecord(workspace.settings);
    const logoUrl = await getListingLogoUrl(ctx, listing._id);

    return {
      success: true,
      inquiryId,
      clientId,
      providerEmail,
      providerName: readString(workspace.agencyName) ?? "Provider",
      providerSlug: readString(listing.slug) ?? "",
      logoUrl,
      brandColor:
        readString(asRecord(workspaceSettings.intakeFormSettings).background_color) ?? "#0866FF",
      website: readString(workspaceSettings.website),
      phone: readString(workspaceSettings.contactPhone),
      workspaceId: String(workspace._id),
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getInquiries - list for workspace with status filter, pagination  */
/* ------------------------------------------------------------------ */
export const getInquiries = query({
  args: {
    status: v.optional(v.string()),
    locationIds: v.optional(v.union(v.array(v.string()), v.null())),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceInquiryRows(ctx, workspaceId);
    const filtered = rows
      .filter(isInquiryRow)
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => {
        if (!args.locationIds || args.locationIds.length === 0) {
          return true;
        }
        const payload = asRecord(row.payload);
        const locationId = readString(payload.locationId);
        return !locationId || args.locationIds.includes(locationId);
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    const unreadCount = rows
      .filter(isInquiryRow)
      .filter((row) => readString(row.status) === "unread").length;

    return {
      inquiries: filtered.slice(offset, offset + limit).map(mapInquiry),
      unreadCount,
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
    if (!row || String(row.workspaceId) !== workspaceId || !isInquiryRow(row as unknown as ConvexDoc)) {
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
    if (!row || String(row.workspaceId) !== workspaceId || !isInquiryRow(row as unknown as ConvexDoc)) {
      throw new ConvexError("Inquiry not found");
    }

    const payload = asRecord(row.payload);
    const now = new Date().toISOString();

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "read",
      payload: {
        ...payload,
        readAt: readString(payload.readAt) ?? now,
      },
      updatedAt: now,
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
    if (!row || String(row.workspaceId) !== workspaceId || !isInquiryRow(row as unknown as ConvexDoc)) {
      throw new ConvexError("Inquiry not found");
    }

    const payload = asRecord(row.payload);
    const now = new Date().toISOString();

    await ctx.db.patch(asId<"inquiryRecords">(row._id), {
      status: "replied",
      payload: {
        ...payload,
        readAt: readString(payload.readAt) ?? now,
        repliedAt: now,
      },
      updatedAt: now,
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
    if (!row || String(row.workspaceId) !== workspaceId || !isInquiryRow(row as unknown as ConvexDoc)) {
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
    if (!row || String(row.workspaceId) !== workspaceId || !isInquiryRow(row as unknown as ConvexDoc)) {
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
    return rows.filter(isInquiryRow).filter((row) => row.status === "unread").length;
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

export const submitAuthenticatedFeedback = mutation({
  args: {
    category: v.string(),
    rating: v.optional(v.union(v.number(), v.null())),
    message: v.string(),
    pageUrl: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.union(v.string(), v.null())),
    company: v.optional(v.union(v.string(), v.null())),
    userAgent: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("inquiryRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      status: "unread",
      payload: {
        name: args.name,
        email: args.email,
        phone: args.phone ?? null,
        company: args.company ?? null,
        category: args.category,
        rating: args.rating ?? null,
        message: args.message,
        pageUrl: args.pageUrl ?? null,
        userAgent: args.userAgent ?? null,
        type: "feedback",
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
