import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

const ADMIN_EMAILS = [
  "hashem@behaviorwork.com",
  "hashem@findabatherapy.org",
  "admin@findabatherapy.org",
  "admin@behaviorwork.com",
];

const VIEW_EVENT_TYPES = new Set(["listing_view", "listing.view"]);
const SEARCH_EVENT_TYPES = new Set(["search_performed", "search"]);
const SEARCH_IMPRESSION_EVENT_TYPES = new Set([
  "search_impression",
  "search.impression",
]);
const SEARCH_CLICK_EVENT_TYPES = new Set(["search_click", "search.click"]);
const CONTACT_EVENT_TYPES = new Set([
  "listing_contact_click",
  "listing_phone_click",
  "listing_email_click",
  "listing_website_click",
  "listing.contact",
  "listing.phone_click",
  "listing.email_click",
  "listing.website_click",
]);

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

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

function toDate(value: unknown) {
  const text = readString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInRange(
  value: unknown,
  startDate?: Date,
  endDate?: Date,
) {
  const date = toDate(value);
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfTrailingDays(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function getBucketKey(date: Date, granularity: "day" | "week" | "month") {
  if (granularity === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (granularity === "week") {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
    return copy.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function incrementCount(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function parseDateRange(args: {
  startDate?: string;
  endDate?: string;
}, defaultDays: number) {
  const endDate = args.endDate ? new Date(args.endDate) : new Date();
  const startDate = args.startDate
    ? new Date(args.startDate)
    : new Date(endDate.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

function sortCountsDescending<T extends { count: number }>(items: T[]) {
  return items.sort((a, b) => b.count - a.count);
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

async function requireAdmin(ctx: ConvexCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await findUserByClerkUserId(ctx, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  if (user.isAdmin === true) {
    return { userId: user._id, email: readString(user.primaryEmail) ?? "" };
  }

  const email = readString(user.primaryEmail);
  if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    throw new ConvexError("Not authorized: admin access required");
  }

  return { userId: user._id, email };
}

function isFeedbackRow(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return readString(payload.type) === "feedback";
}

function mapFeedbackRow(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    profileId: row.workspaceId ? String(row.workspaceId) : null,
    name: readString(payload.name) ?? "Unknown",
    email: readString(payload.email) ?? "",
    phone: readString(payload.phone),
    company: readString(payload.company),
    category: readString(payload.category) ?? "general_feedback",
    rating: readNumber(payload.rating),
    message: readString(payload.message) ?? "",
    status: (readString(row.status) ?? "unread") as
      | "unread"
      | "read"
      | "replied"
      | "archived",
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    readAt: readString(payload.readAt),
    repliedAt: readString(payload.repliedAt),
    pageUrl: readString(payload.pageUrl),
    userAgent: readString(payload.userAgent),
  };
}

async function getAllFeedbackRows(ctx: ConvexCtx) {
  const rows = (await ctx.db.query("inquiryRecords").collect()) as ConvexDoc[];
  return rows.filter(isFeedbackRow);
}

async function updateFeedbackStatus(
  ctx: MutationCtx,
  feedbackId: string,
  status: "read" | "replied" | "archived",
) {
  await requireAdmin(ctx);

  const row = await ctx.db.get(asId<"inquiryRecords">(feedbackId));
  if (!row || !isFeedbackRow(row as unknown as ConvexDoc)) {
    throw new ConvexError("Feedback not found");
  }

  const payload = asRecord(row.payload);
  const now = new Date().toISOString();
  const nextPayload: Record<string, unknown> = { ...payload };

  if (status === "read" && !readString(nextPayload.readAt)) {
    nextPayload.readAt = now;
  }

  if (status === "replied") {
    nextPayload.repliedAt = now;
    if (!readString(nextPayload.readAt)) {
      nextPayload.readAt = now;
    }
  }

  await ctx.db.patch(asId<"inquiryRecords">(row._id), {
    status,
    payload: nextPayload,
    updatedAt: now,
  });

  return { success: true };
}

async function getGooglePlacesRows(ctx: ConvexCtx) {
  return (await ctx.db
    .query("publicReadModels")
    .withIndex("by_model_type", (q) => q.eq("modelType", "google_places_listing"))
    .collect()) as ConvexDoc[];
}

async function getAuditRows(ctx: ConvexCtx) {
  return (await ctx.db.query("auditEvents").collect()) as ConvexDoc[];
}

async function getNonFeedbackInquiries(ctx: ConvexCtx) {
  const rows = (await ctx.db.query("inquiryRecords").collect()) as ConvexDoc[];
  return rows.filter((row) => !isFeedbackRow(row));
}

function getSearchSource(payload: Record<string, unknown>) {
  const source = readString(payload.source);
  if (source === "user" || source === "ai" || source === "bot") {
    return source;
  }
  return "unknown";
}

function getStateFromLocation(location: Record<string, unknown>) {
  const metadata = asRecord(location.metadata);
  return (readString(metadata.state) ?? "Unknown").toUpperCase();
}

function hasPublishedListingStatus(status: unknown) {
  const value = readString(status);
  return value === "published" || value === "active";
}

export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requireAdmin(ctx);
      return true;
    } catch {
      return false;
    }
  },
});

export const getFeedback = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;
    const rows = await getAllFeedbackRows(ctx);
    const unreadCount = rows.filter((row) => readString(row.status) === "unread").length;

    const filtered = rows
      .filter((row) => !args.status || readString(row.status) === args.status)
      .filter((row) => {
        if (!args.category) {
          return true;
        }
        const payload = asRecord(row.payload);
        return readString(payload.category) === args.category;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      feedback: filtered.slice(offset, offset + limit).map(mapFeedbackRow),
      unreadCount,
      total: filtered.length,
    };
  },
});

export const getFeedbackById = query({
  args: {
    feedbackId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const row = await ctx.db.get(asId<"inquiryRecords">(args.feedbackId));
    if (!row || !isFeedbackRow(row as unknown as ConvexDoc)) {
      return null;
    }

    return mapFeedbackRow(row as unknown as ConvexDoc);
  },
});

export const markFeedbackAsRead = mutation({
  args: {
    feedbackId: v.string(),
  },
  handler: async (ctx, args) => updateFeedbackStatus(ctx, args.feedbackId, "read"),
});

export const markFeedbackAsReplied = mutation({
  args: {
    feedbackId: v.string(),
  },
  handler: async (ctx, args) => updateFeedbackStatus(ctx, args.feedbackId, "replied"),
});

export const archiveFeedback = mutation({
  args: {
    feedbackId: v.string(),
  },
  handler: async (ctx, args) => updateFeedbackStatus(ctx, args.feedbackId, "archived"),
});

export const getUnreadFeedbackCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await getAllFeedbackRows(ctx);
    return rows.filter((row) => readString(row.status) === "unread").length;
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [googlePlacesRows, removalRequests] = await Promise.all([
      getGooglePlacesRows(ctx),
      ctx.db.query("removalRequests").collect(),
    ]);

    const totalGooglePlacesListings = googlePlacesRows.length;
    let activeGooglePlacesListings = 0;
    let removedGooglePlacesListings = 0;

    for (const row of googlePlacesRows) {
      const payload = asRecord(row.payload);
      const status = readString(payload.status) ?? "active";
      if (status === "removed") {
        removedGooglePlacesListings += 1;
      } else {
        activeGooglePlacesListings += 1;
      }
    }

    const pendingRemovalRequests = removalRequests.filter(
      (row) => row.status === "pending",
    ).length;

    return {
      totalGooglePlacesListings,
      activeGooglePlacesListings,
      removedGooglePlacesListings,
      pendingRemovalRequests,
      totalRemovalRequests: removalRequests.length,
    };
  },
});

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
    const [requests, googlePlacesRows, workspaces, listings] = await Promise.all([
      ctx.db.query("removalRequests").collect(),
      getGooglePlacesRows(ctx),
      ctx.db.query("workspaces").collect(),
      ctx.db.query("listings").collect(),
    ]);

    const googlePlacesById = new Map(googlePlacesRows.map((row) => [row._id, row]));
    const workspacesById = new Map(workspaces.map((row) => [String(row._id), row]));
    const listingsById = new Map(listings.map((row) => [String(row._id), row]));

    const filtered = requests
      .filter((request) => !args.status || request.status === args.status)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      requests: filtered.slice(offset, offset + limit).map((request) => {
        const googlePlacesRow = googlePlacesById.get(request.googlePlacesListingId) as ConvexDoc | undefined;
        const googlePayload = googlePlacesRow ? asRecord(googlePlacesRow.payload) : {};
        const workspace = workspacesById.get(String(request.workspaceId));
        const listing = listingsById.get(String(request.listingId));
        const listingReadModel = listing
          ? {
              slug: readString(listing.slug) ?? "",
              headline:
                readString(asRecord(listing.publicReadModel).headline) ??
                readString(asRecord(listing.metadata).headline),
            }
          : { slug: "", headline: null };
        const reviewMeta = asRecord(request.legacyPayload);

        return {
          id: String(request._id),
          reason: request.reason ?? null,
          status:
            request.status === "rejected"
              ? "denied"
              : ((request.status ?? "pending") as "pending" | "approved" | "denied"),
          adminNotes: readString(reviewMeta.adminNotes),
          reviewedAt: readString(reviewMeta.reviewedAt),
          createdAt: readString(request.createdAt) ?? new Date().toISOString(),
          googlePlacesListing: {
            id: request.googlePlacesListingId,
            name: readString(googlePayload.name) ?? "Directory listing",
            slug: readString(googlePlacesRow?.slug) ?? "",
            city: readString(googlePayload.city) ?? readString(googlePlacesRow?.city) ?? "",
            state: readString(googlePayload.state) ?? readString(googlePlacesRow?.state) ?? "",
          },
          profile: {
            id: String(request.workspaceId),
            agencyName: readString(workspace?.agencyName) ?? "Unknown workspace",
            contactEmail: readString(workspace?.contactEmail) ?? "",
          },
          listing: {
            id: String(request.listingId),
            slug: listingReadModel.slug,
            headline: listingReadModel.headline ?? null,
          },
        };
      }),
      total: filtered.length,
    };
  },
});

export const approveRemovalRequest = mutation({
  args: {
    requestId: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const request = await ctx.db.get(asId<"removalRequests">(args.requestId));
    if (!request) {
      throw new ConvexError("Removal request not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(request._id, {
      status: "approved",
      updatedAt: now,
      legacyPayload: {
        ...(asRecord(request.legacyPayload)),
        adminNotes: args.adminNotes ?? null,
        reviewedAt: now,
        reviewedBy: String(userId),
      },
    });

    const googlePlaceDoc = await ctx.db.get(
      asId<"publicReadModels">(request.googlePlacesListingId),
    );
    if (googlePlaceDoc && googlePlaceDoc.modelType === "google_places_listing") {
      const payload = asRecord(googlePlaceDoc.payload);
      await ctx.db.patch(googlePlaceDoc._id, {
        payload: { ...payload, status: "removed" },
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const denyRemovalRequest = mutation({
  args: {
    requestId: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const request = await ctx.db.get(asId<"removalRequests">(args.requestId));
    if (!request) {
      throw new ConvexError("Removal request not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(request._id, {
      status: "rejected",
      updatedAt: now,
      legacyPayload: {
        ...(asRecord(request.legacyPayload)),
        adminNotes: args.adminNotes ?? null,
        reviewedAt: now,
        reviewedBy: String(userId),
      },
    });

    return { success: true };
  },
});

export const getListingsPerState = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [googlePlacesRows, listings, locations] = await Promise.all([
      getGooglePlacesRows(ctx),
      ctx.db.query("listings").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const publishedListingIds = new Set(
      listings
        .filter((listing) => hasPublishedListingStatus(listing.status))
        .map((listing) => String(listing._id)),
    );
    const counts: Record<string, { realListings: number; scrapedListings: number }> = {};

    for (const location of locations) {
      if (!location.listingId || !publishedListingIds.has(String(location.listingId))) {
        continue;
      }
      const state = getStateFromLocation(location as unknown as Record<string, unknown>);
      counts[state] ??= { realListings: 0, scrapedListings: 0 };
      counts[state].realListings += 1;
    }

    for (const row of googlePlacesRows) {
      const payload = asRecord(row.payload);
      const status = readString(payload.status) ?? "active";
      if (status !== "active") continue;
      const state = (readString(payload.state) ?? readString(row.state) ?? "Unknown").toUpperCase();
      counts[state] ??= { realListings: 0, scrapedListings: 0 };
      counts[state].scrapedListings += 1;
    }

    return Object.entries(counts)
      .map(([state, value]) => ({
        state,
        realListings: value.realListings,
        scrapedListings: value.scrapedListings,
        total: value.realListings + value.scrapedListings,
      }))
      .sort((a, b) => b.total - a.total);
  },
});

export const getApplicationAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [auditRows, inquiryRows] = await Promise.all([
      getAuditRows(ctx),
      getNonFeedbackInquiries(ctx),
    ]);
    const now = new Date();
    const today = startOfToday(now);
    const week = startOfTrailingDays(now, 7);
    const month = startOfMonth(now);

    const countAuditRows = (
      matcher: (eventType: string) => boolean,
      source: "user" | "ai" | "bot" | null,
      startDate?: Date,
    ) =>
      auditRows.filter((row) => {
        const eventType = String(row.eventType);
        if (!matcher(eventType)) return false;
        if (!isInRange(row.createdAt, startDate, now)) return false;
        if (source === null) return true;
        return getSearchSource(asRecord(row.payload)) === source;
      }).length;

    const countInquiries = (startDate?: Date) =>
      inquiryRows.filter((row) => isInRange(row.createdAt, startDate, now)).length;

    const totalUserSearches = countAuditRows(
      (eventType) => SEARCH_EVENT_TYPES.has(eventType),
      "user",
    );

    return {
      totalViews: countAuditRows((eventType) => VIEW_EVENT_TYPES.has(eventType), null),
      totalSearches: totalUserSearches,
      totalUserSearches,
      totalAiSearches: countAuditRows(
        (eventType) => SEARCH_EVENT_TYPES.has(eventType),
        "ai",
      ),
      totalBotSearches: countAuditRows(
        (eventType) => SEARCH_EVENT_TYPES.has(eventType),
        "bot",
      ),
      totalInquiries: countInquiries(),
      totalContactClicks: countAuditRows(
        (eventType) => CONTACT_EVENT_TYPES.has(eventType),
        null,
      ),
      todayViews: countAuditRows((eventType) => VIEW_EVENT_TYPES.has(eventType), null, today),
      todaySearches: countAuditRows(
        (eventType) => SEARCH_EVENT_TYPES.has(eventType),
        "user",
        today,
      ),
      todayInquiries: countInquiries(today),
      todayContactClicks: countAuditRows(
        (eventType) => CONTACT_EVENT_TYPES.has(eventType),
        null,
        today,
      ),
      weekViews: countAuditRows((eventType) => VIEW_EVENT_TYPES.has(eventType), null, week),
      weekSearches: countAuditRows(
        (eventType) => SEARCH_EVENT_TYPES.has(eventType),
        "user",
        week,
      ),
      weekInquiries: countInquiries(week),
      weekContactClicks: countAuditRows(
        (eventType) => CONTACT_EVENT_TYPES.has(eventType),
        null,
        week,
      ),
      monthViews: countAuditRows((eventType) => VIEW_EVENT_TYPES.has(eventType), null, month),
      monthSearches: countAuditRows(
        (eventType) => SEARCH_EVENT_TYPES.has(eventType),
        "user",
        month,
      ),
      monthInquiries: countInquiries(month),
      monthContactClicks: countAuditRows(
        (eventType) => CONTACT_EVENT_TYPES.has(eventType),
        null,
        month,
      ),
    };
  },
});

export const getCustomerMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const workspaces = await ctx.db.query("workspaces").collect();

    const now = new Date();
    const today = startOfToday(now);
    const week = startOfTrailingDays(now, 7);
    const month = startOfMonth(now);

    const byTier: Record<string, number> = {};
    const byBillingInterval: Record<string, number> = {};
    let todaySignups = 0;
    let weekSignups = 0;
    let monthSignups = 0;

    for (const workspace of workspaces) {
      const tier = readString(workspace.planTier) ?? "free";
      incrementCount(byTier, tier);

      const billingInterval = readString(workspace.billingInterval);
      if (tier !== "free" && billingInterval) {
        incrementCount(byBillingInterval, billingInterval);
      }

      const createdAt = toDate(workspace.createdAt);
      if (!createdAt) continue;
      if (createdAt >= today) todaySignups += 1;
      if (createdAt >= week) weekSignups += 1;
      if (createdAt >= month) monthSignups += 1;
    }

    return {
      totalCustomers: workspaces.length,
      byTier: sortCountsDescending(
        Object.entries(byTier).map(([tier, count]) => ({ tier, count })),
      ),
      byBillingInterval: sortCountsDescending(
        Object.entries(byBillingInterval).map(([interval, count]) => ({
          interval,
          count,
        })),
      ),
      todaySignups,
      weekSignups,
      monthSignups,
    };
  },
});

export const getOnboardingMetrics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const workspaces = await ctx.db.query("workspaces").collect();
    const { startDate, endDate } = parseDateRange(args, 90);

    let totalSignups = 0;
    let completedOnboarding = 0;
    let pendingOnboarding = 0;
    let totalCompletionHours = 0;

    for (const workspace of workspaces) {
      if (!isInRange(workspace.createdAt, startDate, endDate)) continue;
      totalSignups += 1;

      const completedAt = toDate(workspace.onboardingCompletedAt);
      const createdAt = toDate(workspace.createdAt);
      if (completedAt) {
        completedOnboarding += 1;
        if (createdAt) {
          totalCompletionHours +=
            (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        }
      } else {
        pendingOnboarding += 1;
      }
    }

    return {
      totalSignups,
      completedOnboarding,
      completionRate:
        totalSignups > 0 ? (completedOnboarding / totalSignups) * 100 : 0,
      pendingOnboarding,
      avgCompletionTimeHours:
        completedOnboarding > 0
          ? totalCompletionHours / completedOnboarding
          : null,
    };
  },
});

export const getCustomersByState = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [listings, locations] = await Promise.all([
      ctx.db.query("listings").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const publishedListingsById = new Map(
      listings
        .filter((listing) => hasPublishedListingStatus(listing.status))
        .map((listing) => [String(listing._id), listing]),
    );

    const stateData = new Map<
      string,
      { workspaces: Set<string>; listings: Set<string>; featuredLocations: number }
    >();

    for (const location of locations) {
      if (!location.listingId) continue;
      const listing = publishedListingsById.get(String(location.listingId));
      if (!listing) continue;

      const metadata = asRecord(location.metadata);
      const state = (readString(metadata.state) ?? "Unknown").toUpperCase();
      const current =
        stateData.get(state) ??
        { workspaces: new Set<string>(), listings: new Set<string>(), featuredLocations: 0 };

      current.workspaces.add(String(location.workspaceId));
      current.listings.add(String(location.listingId));
      if (readBoolean(metadata.isFeatured) === true) {
        current.featuredLocations += 1;
      }
      stateData.set(state, current);
    }

    return Array.from(stateData.entries())
      .map(([state, value]) => ({
        state,
        customers: value.workspaces.size,
        listings: value.listings.size,
        featuredLocations: value.featuredLocations,
      }))
      .sort((a, b) => b.customers - a.customers);
  },
});

export const getSearchAnalytics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const auditRows = await getAuditRows(ctx);
    const { startDate, endDate } = parseDateRange(args, 30);

    const stateCounts: Record<string, number> = {};
    const insuranceCounts: Record<string, number> = {};
    const serviceModeCounts: Record<string, number> = {};
    const queryCounts: Record<string, number> = {};
    const zeroResults: Record<string, { query: string; state: string | null; count: number }> = {};

    for (const row of auditRows) {
      const eventType = String(row.eventType);
      if (!SEARCH_EVENT_TYPES.has(eventType)) continue;
      if (!isInRange(row.createdAt, startDate, endDate)) continue;

      const payload = asRecord(row.payload);
      if (getSearchSource(payload) !== "user") continue;

      const filters = asRecord(payload.filters);
      const state = readString(filters.state);
      if (state) {
        incrementCount(stateCounts, state.toUpperCase());
      }

      const insurances = Array.isArray(filters.insurances) ? filters.insurances : [];
      for (const insurance of insurances) {
        if (typeof insurance === "string" && insurance.trim()) {
          incrementCount(insuranceCounts, insurance);
        }
      }

      const serviceModes = Array.isArray(filters.serviceModes) ? filters.serviceModes : [];
      for (const mode of serviceModes) {
        if (typeof mode === "string" && mode.trim()) {
          incrementCount(serviceModeCounts, mode);
        }
      }

      const query = readString(payload.query);
      if (query) {
        incrementCount(queryCounts, query.toLowerCase().trim());
      }

      if (readNumber(payload.resultsCount) === 0) {
        const key = `${query ?? "(no query)"}|${state ?? ""}`;
        zeroResults[key] ??= { query: query ?? "(no query)", state: state ?? null, count: 0 };
        zeroResults[key].count += 1;
      }
    }

    return {
      byState: sortCountsDescending(
        Object.entries(stateCounts).map(([state, count]) => ({ state, count })),
      ).slice(0, 20),
      byInsurance: sortCountsDescending(
        Object.entries(insuranceCounts).map(([insurance, count]) => ({
          insurance,
          count,
        })),
      ),
      byServiceMode: sortCountsDescending(
        Object.entries(serviceModeCounts).map(([mode, count]) => ({
          mode,
          count,
        })),
      ),
      topQueries: sortCountsDescending(
        Object.entries(queryCounts).map(([query, count]) => ({ query, count })),
      ).slice(0, 20),
      zeroResultSearches: Object.values(zeroResults)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    };
  },
});

export const getAnalyticsTimeSeries = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    granularity: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const [auditRows, inquiryRows, workspaces] = await Promise.all([
      getAuditRows(ctx),
      getNonFeedbackInquiries(ctx),
      ctx.db.query("workspaces").collect(),
    ]);
    const { startDate, endDate } = parseDateRange(args, 30);
    const granularity = args.granularity ?? "day";

    const views: Record<string, number> = {};
    const searches: Record<string, number> = {};
    const inquiries: Record<string, number> = {};
    const signups: Record<string, number> = {};

    for (const row of auditRows) {
      if (!isInRange(row.createdAt, startDate, endDate)) continue;
      const createdAt = toDate(row.createdAt);
      if (!createdAt) continue;

      const bucket = getBucketKey(createdAt, granularity);
      const eventType = String(row.eventType);
      if (VIEW_EVENT_TYPES.has(eventType)) {
        incrementCount(views, bucket);
      } else if (
        SEARCH_EVENT_TYPES.has(eventType) &&
        getSearchSource(asRecord(row.payload)) === "user"
      ) {
        incrementCount(searches, bucket);
      }
    }

    for (const row of inquiryRows) {
      if (!isInRange(row.createdAt, startDate, endDate)) continue;
      const createdAt = toDate(row.createdAt);
      if (!createdAt) continue;
      incrementCount(inquiries, getBucketKey(createdAt, granularity));
    }

    for (const workspace of workspaces) {
      if (!isInRange(workspace.createdAt, startDate, endDate)) continue;
      const createdAt = toDate(workspace.createdAt);
      if (!createdAt) continue;
      incrementCount(signups, getBucketKey(createdAt, granularity));
    }

    const allBuckets = new Set([
      ...Object.keys(views),
      ...Object.keys(searches),
      ...Object.keys(inquiries),
      ...Object.keys(signups),
    ]);

    const buckets = Array.from(allBuckets).sort();
    return {
      views: buckets.map((date) => ({ date, count: views[date] ?? 0 })),
      searches: buckets.map((date) => ({ date, count: searches[date] ?? 0 })),
      inquiries: buckets.map((date) => ({ date, count: inquiries[date] ?? 0 })),
      signups: buckets.map((date) => ({ date, count: signups[date] ?? 0 })),
    };
  },
});

export const getConversionMetrics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const [auditRows, inquiryRows] = await Promise.all([
      getAuditRows(ctx),
      getNonFeedbackInquiries(ctx),
    ]);
    const { startDate, endDate } = parseDateRange(args, 30);

    let searches = 0;
    let userSearches = 0;
    let botSearches = 0;
    let impressions = 0;
    let clicks = 0;
    let views = 0;

    for (const row of auditRows) {
      if (!isInRange(row.createdAt, startDate, endDate)) continue;
      const eventType = String(row.eventType);
      const payload = asRecord(row.payload);
      const source = getSearchSource(payload);

      if (SEARCH_EVENT_TYPES.has(eventType)) {
        searches += 1;
        if (source === "user") userSearches += 1;
        if (source === "bot") botSearches += 1;
      } else if (SEARCH_IMPRESSION_EVENT_TYPES.has(eventType)) {
        if (source === "user") impressions += 1;
      } else if (SEARCH_CLICK_EVENT_TYPES.has(eventType)) {
        clicks += 1;
      } else if (VIEW_EVENT_TYPES.has(eventType)) {
        views += 1;
      }
    }

    const inquiries = inquiryRows.filter((row) =>
      isInRange(row.createdAt, startDate, endDate),
    ).length;

    return {
      searches,
      userSearches,
      botSearches,
      impressions,
      clicks,
      views,
      inquiries,
      searchToClickRate: impressions > 0 ? (clicks / impressions) * 100 : 0,
      viewToInquiryRate: views > 0 ? (inquiries / views) * 100 : 0,
    };
  },
});

export const getCustomerList = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    tierFilter: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const [workspaces, listings, locations] = await Promise.all([
      ctx.db.query("workspaces").collect(),
      ctx.db.query("listings").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 25;
    const sortBy = args.sortBy ?? "created_at";
    const sortOrder = args.sortOrder === "asc" ? "asc" : "desc";
    const tierFilter = args.tierFilter;
    const searchQuery = args.searchQuery?.trim().toLowerCase() ?? "";
    const now = new Date();

    const listingsByWorkspace = new Map<string, typeof listings>();
    for (const listing of listings) {
      const key = String(listing.workspaceId);
      const existing = listingsByWorkspace.get(key) ?? [];
      existing.push(listing);
      listingsByWorkspace.set(key, existing);
    }

    const locationsByListing = new Map<string, typeof locations>();
    for (const location of locations) {
      if (!location.listingId) continue;
      const key = String(location.listingId);
      const existing = locationsByListing.get(key) ?? [];
      existing.push(location);
      locationsByListing.set(key, existing);
    }

    let customers = workspaces.map((workspace) => {
      const workspaceListings = listingsByWorkspace.get(String(workspace._id)) ?? [];
      const states = new Set<string>();
      let locationCount = 0;
      let hasFeaturedAddon = false;

      for (const listing of workspaceListings) {
        const listingLocations = locationsByListing.get(String(listing._id)) ?? [];
        locationCount += listingLocations.length;
        for (const location of listingLocations) {
          const metadata = asRecord(location.metadata);
          const state = readString(metadata.state);
          if (state) {
            states.add(state.toUpperCase());
          }
          if (readBoolean(metadata.isFeatured) === true) {
            hasFeaturedAddon = true;
          }
        }
      }

      const createdAt = readString(workspace.createdAt) ?? new Date().toISOString();
      const createdDate = new Date(createdAt);
      const daysSinceSignup = Math.max(
        0,
        Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        id: String(workspace._id),
        agencyName: readString(workspace.agencyName) ?? "Unnamed workspace",
        contactEmail: readString(workspace.contactEmail) ?? "",
        planTier: readString(workspace.planTier) ?? "free",
        billingInterval: readString(workspace.billingInterval),
        hasFeaturedAddon,
        createdAt,
        onboardingCompletedAt: readString(workspace.onboardingCompletedAt),
        locationCount,
        listingCount: workspaceListings.length,
        states: Array.from(states).sort(),
        hasPublishedListing: workspaceListings.some((listing) =>
          hasPublishedListingStatus(listing.status),
        ),
        daysSinceSignup,
      };
    });

    if (tierFilter && tierFilter !== "all") {
      customers = customers.filter((customer) => customer.planTier === tierFilter);
    }

    if (searchQuery) {
      customers = customers.filter(
        (customer) =>
          customer.agencyName.toLowerCase().includes(searchQuery) ||
          customer.contactEmail.toLowerCase().includes(searchQuery),
      );
    }

    customers.sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "agency_name") {
        return a.agencyName.localeCompare(b.agencyName) * direction;
      }
      if (sortBy === "plan_tier") {
        return a.planTier.localeCompare(b.planTier) * direction;
      }
      if (sortBy === "location_count") {
        return (a.locationCount - b.locationCount) * direction;
      }
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        direction
      );
    });

    const total = customers.length;
    const offset = (page - 1) * pageSize;

    return {
      customers: customers.slice(offset, offset + pageSize),
      total,
      page,
      pageSize,
    };
  },
});

export const getCustomerConversionFunnel = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [workspaces, listings, locations] = await Promise.all([
      ctx.db.query("workspaces").collect(),
      ctx.db.query("listings").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const listingsByWorkspace = new Map<string, typeof listings>();
    for (const listing of listings) {
      const key = String(listing.workspaceId);
      const existing = listingsByWorkspace.get(key) ?? [];
      existing.push(listing);
      listingsByWorkspace.set(key, existing);
    }

    const locationsByListing = new Map<string, number>();
    for (const location of locations) {
      if (!location.listingId) continue;
      const key = String(location.listingId);
      locationsByListing.set(key, (locationsByListing.get(key) ?? 0) + 1);
    }

    const now = new Date();
    const days7Ago = startOfTrailingDays(now, 7);
    const days30Ago = startOfTrailingDays(now, 30);
    const days90Ago = startOfTrailingDays(now, 90);

    let totalSignups = 0;
    let completedOnboarding = 0;
    let createdListing = 0;
    let publishedListing = 0;
    let addedLocation = 0;
    let paidCustomers = 0;
    let signupsLast7Days = 0;
    let signupsLast30Days = 0;
    let signupsLast90Days = 0;
    let staleAccounts = 0;
    let incompleteOnboarding = 0;

    for (const workspace of workspaces) {
      totalSignups += 1;

      const workspaceListings = listingsByWorkspace.get(String(workspace._id)) ?? [];
      const hasListing = workspaceListings.length > 0;
      const hasPublishedListing = workspaceListings.some((listing) =>
        hasPublishedListingStatus(listing.status),
      );
      const hasLocation = workspaceListings.some(
        (listing) => (locationsByListing.get(String(listing._id)) ?? 0) > 0,
      );
      const completed = readString(workspace.onboardingCompletedAt) !== null;
      const planTier = readString(workspace.planTier) ?? "free";
      const subscriptionStatus = readString(workspace.subscriptionStatus);
      const isPaid =
        planTier !== "free" ||
        subscriptionStatus === "active" ||
        subscriptionStatus === "trialing";

      if (completed) completedOnboarding += 1;
      if (hasListing) createdListing += 1;
      if (hasPublishedListing) publishedListing += 1;
      if (hasLocation) addedLocation += 1;
      if (isPaid) paidCustomers += 1;

      const createdAt = toDate(workspace.createdAt);
      if (createdAt) {
        if (createdAt >= days7Ago) signupsLast7Days += 1;
        if (createdAt >= days30Ago) signupsLast30Days += 1;
        if (createdAt >= days90Ago) signupsLast90Days += 1;
        if (createdAt < days30Ago && !hasListing) staleAccounts += 1;
      }

      if (!completed && hasListing) {
        incompleteOnboarding += 1;
      }
    }

    return {
      totalSignups,
      completedOnboarding,
      createdListing,
      publishedListing,
      addedLocation,
      paidCustomers,
      onboardingRate: totalSignups > 0 ? (completedOnboarding / totalSignups) * 100 : 0,
      listingCreationRate: totalSignups > 0 ? (createdListing / totalSignups) * 100 : 0,
      publishRate: createdListing > 0 ? (publishedListing / createdListing) * 100 : 0,
      paidConversionRate: totalSignups > 0 ? (paidCustomers / totalSignups) * 100 : 0,
      signupsLast7Days,
      signupsLast30Days,
      signupsLast90Days,
      staleAccounts,
      incompleteOnboarding,
    };
  },
});

export const exportAnalyticsCSV = query({
  args: {
    dataType: v.union(
      v.literal("customers"),
      v.literal("searches"),
      v.literal("timeseries"),
      v.literal("states"),
      v.literal("customer_list"),
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    switch (args.dataType) {
      case "customers": {
        const data: {
          totalCustomers: number;
          byTier: Array<{ tier: string; count: number }>;
          todaySignups: number;
          weekSignups: number;
          monthSignups: number;
        } = await ctx.runQuery(api.admin.getCustomerMetrics, {});
        let csvContent = "Metric,Value\n";
        csvContent += `Total Customers,${data.totalCustomers}\n`;
        csvContent += `Today Signups,${data.todaySignups}\n`;
        csvContent += `Week Signups,${data.weekSignups}\n`;
        csvContent += `Month Signups,${data.monthSignups}\n\n`;
        csvContent += "Tier,Count\n";
        for (const tier of data.byTier) {
          csvContent += `${tier.tier},${tier.count}\n`;
        }
        return csvContent;
      }

      case "searches": {
        const data: {
          byState: Array<{ state: string; count: number }>;
          byInsurance: Array<{ insurance: string; count: number }>;
          topQueries: Array<{ query: string; count: number }>;
          zeroResultSearches: Array<{ query: string; state: string | null; count: number }>;
        } = await ctx.runQuery(api.admin.getSearchAnalytics, {
          startDate: args.startDate,
          endDate: args.endDate,
        });
        let csvContent = "Searches by State\nState,Count\n";
        for (const item of data.byState) {
          csvContent += `${item.state},${item.count}\n`;
        }
        csvContent += "\nSearches by Insurance\nInsurance,Count\n";
        for (const item of data.byInsurance) {
          csvContent += `${item.insurance},${item.count}\n`;
        }
        csvContent += "\nTop Queries\nQuery,Count\n";
        for (const item of data.topQueries) {
          csvContent += `"${item.query}",${item.count}\n`;
        }
        csvContent += "\nZero Result Searches\nQuery,State,Count\n";
        for (const item of data.zeroResultSearches) {
          csvContent += `"${item.query}",${item.state ?? ""},${item.count}\n`;
        }
        return csvContent;
      }

      case "timeseries": {
        const data: {
          views: Array<{ date: string; count: number }>;
          searches: Array<{ date: string; count: number }>;
          inquiries: Array<{ date: string; count: number }>;
          signups: Array<{ date: string; count: number }>;
        } = await ctx.runQuery(api.admin.getAnalyticsTimeSeries, {
          startDate: args.startDate,
          endDate: args.endDate,
          granularity: "day",
        });
        let csvContent = "Date,Views,Searches,Inquiries,Signups\n";
        const allDates = data.views.map((item) => item.date);
        for (const date of allDates) {
          const views = data.views.find((item) => item.date === date)?.count ?? 0;
          const searches = data.searches.find((item) => item.date === date)?.count ?? 0;
          const inquiries = data.inquiries.find((item) => item.date === date)?.count ?? 0;
          const signups = data.signups.find((item) => item.date === date)?.count ?? 0;
          csvContent += `${date},${views},${searches},${inquiries},${signups}\n`;
        }
        return csvContent;
      }

      case "states": {
        const data: Array<{
          state: string;
          customers: number;
          listings: number;
          featuredLocations: number;
        }> = await ctx.runQuery(api.admin.getCustomersByState, {});
        let csvContent = "State,Customers,Listings,Featured Locations\n";
        for (const item of data) {
          csvContent += `${item.state},${item.customers},${item.listings},${item.featuredLocations}\n`;
        }
        return csvContent;
      }

      case "customer_list": {
        const data: {
          customers: Array<{
            agencyName: string;
            contactEmail: string;
            planTier: string;
            billingInterval: string | null;
            locationCount: number;
            states: string[];
            createdAt: string;
            onboardingCompletedAt: string | null;
            hasPublishedListing: boolean;
          }>;
        } = await ctx.runQuery(api.admin.getCustomerList, {
          page: 1,
          pageSize: 10000,
        });
        let csvContent =
          "Agency Name,Email,Tier,Billing,Locations,States,Created,Onboarding Completed,Has Published Listing\n";
        for (const customer of data.customers) {
          csvContent += `"${customer.agencyName}","${customer.contactEmail}",${customer.planTier},${customer.billingInterval ?? "N/A"},${customer.locationCount},"${customer.states.join(", ")}",${customer.createdAt},${customer.onboardingCompletedAt ?? ""},${customer.hasPublishedListing}\n`;
        }
        return csvContent;
      }
    }
  },
});

export const getBotAnalytics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const auditRows = await getAuditRows(ctx);
    const { startDate, endDate } = parseDateRange(args, 30);

    let totalBotImpressions = 0;
    let totalAiImpressions = 0;
    let totalBotSearches = 0;
    let totalAiSearches = 0;
    let totalUserImpressions = 0;

    const dateMap = new Map<
      string,
      { botImpressions: number; aiImpressions: number; botSearches: number; aiSearches: number }
    >();

    const botBreakdown = {
      searchEngine: 0,
      aiAssistant: 0,
      socialMedia: 0,
      seo: 0,
      other: 0,
    };

    for (const row of auditRows) {
      if (!isInRange(row.createdAt, startDate, endDate)) continue;
      const eventType = String(row.eventType);
      const payload = asRecord(row.payload);
      const source = getSearchSource(payload);
      const createdAt = toDate(row.createdAt);
      const date = createdAt ? createdAt.toISOString().slice(0, 10) : "";
      const dateEntry =
        dateMap.get(date) ??
        { botImpressions: 0, aiImpressions: 0, botSearches: 0, aiSearches: 0 };

      if (SEARCH_IMPRESSION_EVENT_TYPES.has(eventType)) {
        if (source === "bot") {
          totalBotImpressions += 1;
          dateEntry.botImpressions += 1;
        } else if (source === "ai") {
          totalAiImpressions += 1;
          dateEntry.aiImpressions += 1;
        } else if (source === "user") {
          totalUserImpressions += 1;
        }
      }

      if (SEARCH_EVENT_TYPES.has(eventType)) {
        if (source === "bot") {
          totalBotSearches += 1;
          dateEntry.botSearches += 1;
        } else if (source === "ai") {
          totalAiSearches += 1;
          dateEntry.aiSearches += 1;
        }
      }

      if (date) {
        dateMap.set(date, dateEntry);
      }

      const userAgent = (readString(payload.userAgent) ?? "").toLowerCase();
      if (source === "ai") {
        botBreakdown.aiAssistant += 1;
      } else if (source === "bot") {
        if (/googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i.test(userAgent)) {
          botBreakdown.searchEngine += 1;
        } else if (/facebot|facebook|twitter|linkedin|pinterest/i.test(userAgent)) {
          botBreakdown.socialMedia += 1;
        } else if (/semrush|ahrefs|moz|majestic|dotbot/i.test(userAgent)) {
          botBreakdown.seo += 1;
        } else {
          botBreakdown.other += 1;
        }
      }
    }

    return {
      summary: {
        totalBotImpressions,
        totalAiImpressions,
        totalBotSearches,
        totalAiSearches,
        botToHumanRatio:
          totalUserImpressions > 0
            ? (totalBotImpressions + totalAiImpressions) / totalUserImpressions
            : totalBotImpressions + totalAiImpressions > 0
              ? Infinity
              : 0,
      },
      timeSeries: Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, ...value })),
      botBreakdown,
    };
  },
});
