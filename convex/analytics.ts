import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const EVENT_TYPES = {
  LISTING_VIEW: "listing_view",
  LISTING_CONTACT_CLICK: "listing_contact_click",
  LISTING_PHONE_CLICK: "listing_phone_click",
  LISTING_EMAIL_CLICK: "listing_email_click",
  LISTING_WEBSITE_CLICK: "listing_website_click",
  SEARCH_PERFORMED: "search_performed",
  SEARCH_IMPRESSION: "search_impression",
  SEARCH_CLICK: "search_click",
  INQUIRY_SUBMITTED: "inquiry_submitted",
  JOB_VIEW: "job_view",
  JOB_SEARCH_PERFORMED: "job_search_performed",
  JOB_SEARCH_IMPRESSION: "job_search_impression",
  JOB_SEARCH_CLICK: "job_search_click",
  JOB_APPLY_CLICK: "job_apply_click",
  APPLICATION_SUBMITTED: "application_submitted",
  APPLICATION_VIEWED: "application_viewed",
} as const;

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

async function getWorkspaceAuditRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("auditEvents")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

function getAnalyticsPeriodRange(
  period: string | undefined,
): { startDate: Date; endDate: Date; previousStartDate: Date; previousEndDate: Date } {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (period === "all") {
    startDate.setFullYear(startDate.getFullYear() - 10);
  } else if (period === "year") {
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (period === "quarter") {
    startDate.setMonth(startDate.getMonth() - 3);
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }

  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setTime(
    previousEndDate.getTime() - (endDate.getTime() - startDate.getTime()),
  );

  return { startDate, endDate, previousStartDate, previousEndDate };
}

function getSeriesKey(date: Date, period: string | undefined) {
  if (period === "year") {
    return date.toISOString().slice(0, 7);
  }

  if (period === "quarter") {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function isViewEvent(eventType: string) {
  return eventType === EVENT_TYPES.LISTING_VIEW || eventType === "listing.view";
}

function isSearchImpressionEvent(eventType: string) {
  return eventType === EVENT_TYPES.SEARCH_IMPRESSION || eventType === "search.impression";
}

function isSearchClickEvent(eventType: string) {
  return eventType === EVENT_TYPES.SEARCH_CLICK || eventType === "search.click";
}

function isContactEvent(eventType: string) {
  return (
    eventType === EVENT_TYPES.LISTING_CONTACT_CLICK ||
    eventType === EVENT_TYPES.LISTING_PHONE_CLICK ||
    eventType === EVENT_TYPES.LISTING_EMAIL_CLICK ||
    eventType === "listing.contact" ||
    eventType === "listing.phone_click" ||
    eventType === "listing.email_click" ||
    eventType === "listing.website_click"
  );
}

function isInquiryEvent(eventType: string) {
  return eventType === EVENT_TYPES.INQUIRY_SUBMITTED || eventType === "inquiry.submitted";
}

function isLocationIncluded(
  payload: Record<string, unknown>,
  locationIds: string[] | null | undefined,
) {
  if (!locationIds || locationIds.length === 0) {
    return true;
  }

  const locationId = readString(payload.locationId);
  return !!locationId && locationIds.includes(locationId);
}

/* ------------------------------------------------------------------ */
/*  trackEvent - public (no auth): record analytics event             */
/* ------------------------------------------------------------------ */

const ALLOWED_PUBLIC_EVENT_TYPES = [
  EVENT_TYPES.LISTING_VIEW,
  EVENT_TYPES.LISTING_CONTACT_CLICK,
  EVENT_TYPES.LISTING_PHONE_CLICK,
  EVENT_TYPES.LISTING_EMAIL_CLICK,
  EVENT_TYPES.LISTING_WEBSITE_CLICK,
  EVENT_TYPES.SEARCH_PERFORMED,
  EVENT_TYPES.SEARCH_IMPRESSION,
  EVENT_TYPES.SEARCH_CLICK,
  EVENT_TYPES.INQUIRY_SUBMITTED,
  EVENT_TYPES.JOB_VIEW,
  EVENT_TYPES.JOB_SEARCH_PERFORMED,
  EVENT_TYPES.JOB_SEARCH_IMPRESSION,
  EVENT_TYPES.JOB_SEARCH_CLICK,
  EVENT_TYPES.JOB_APPLY_CLICK,
  EVENT_TYPES.APPLICATION_SUBMITTED,
  EVENT_TYPES.APPLICATION_VIEWED,

  // Backward-compatible aliases from the legacy analytics schema.
  "listing_click",
  "search",
  "job_search",
];

const analyticsPayloadScalar = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

const analyticsPayloadLeaf = v.union(
  analyticsPayloadScalar,
  v.array(v.string()),
  v.array(v.number()),
  v.array(v.boolean()),
  v.array(v.null()),
);

const analyticsPayloadObject = v.record(v.string(), analyticsPayloadLeaf);

const analyticsPayloadValidator = v.record(
  v.string(),
  v.union(
    analyticsPayloadLeaf,
    analyticsPayloadObject,
    v.array(analyticsPayloadObject),
  ),
);

export const trackEvent = mutation({
  args: {
    workspaceId: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    eventType: v.string(),
    payload: v.optional(analyticsPayloadValidator),
    metadata: v.optional(analyticsPayloadValidator),
    listingId: v.optional(v.union(v.string(), v.null())),
    profileId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Validate event type against whitelist
    if (!ALLOWED_PUBLIC_EVENT_TYPES.includes(args.eventType)) {
      throw new ConvexError("Invalid event type");
    }

    const now = new Date().toISOString();

    const id = await ctx.db.insert("auditEvents", {
      workspaceId: args.workspaceId
        ? asId<"workspaces">(args.workspaceId)
        : undefined,
      actorUserId: args.actorUserId
        ? asId<"users">(args.actorUserId)
        : undefined,
      eventType: args.eventType,
      payload: {
        ...(args.metadata ?? {}),
        ...(args.payload ?? {}),
        ...(args.listingId ? { listingId: args.listingId } : {}),
        ...(args.profileId ? { profileId: args.profileId } : {}),
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getListingAnalytics - time-series for listing views, clicks, etc. */
/* ------------------------------------------------------------------ */
export const getListingAnalytics = query({
  args: {
    period: v.optional(v.string()),
    locationIds: v.optional(v.union(v.array(v.string()), v.null())),
    listingId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    groupBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceAuditRows(ctx, workspaceId);

    const period = args.period ?? args.groupBy ?? "month";
    const {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    } = getAnalyticsPeriodRange(period);
    const effectiveStartDate = args.startDate ? new Date(args.startDate) : startDate;
    const effectiveEndDate = args.endDate ? new Date(args.endDate) : endDate;
    const locationIds = args.locationIds ?? null;

    const inDateRange = (
      row: typeof rows[number],
      rangeStart: Date,
      rangeEnd: Date,
    ) => {
      const created = readString(row.createdAt);
      if (!created) return false;
      const createdAt = new Date(created);
      return createdAt >= rangeStart && createdAt <= rangeEnd;
    };

    const summarize = (rangeStart: Date, rangeEnd: Date) => {
      let views = 0;
      let searchImpressions = 0;
      let userImpressions = 0;
      let aiImpressions = 0;
      let botImpressions = 0;
      let searchClicks = 0;
      let contactClicks = 0;
      let inquiries = 0;
      const uniqueSessions = new Set<string>();

      for (const row of rows) {
        if (!inDateRange(row, rangeStart, rangeEnd)) continue;
        const eventType = String(row.eventType);
        const payload = asRecord(row.payload);
        if (args.listingId && readString(payload.listingId) !== args.listingId) continue;
        if (!isLocationIncluded(payload, locationIds)) continue;

        if (isViewEvent(eventType)) {
          views += 1;
          const sessionId = readString(payload.sessionId);
          if (sessionId) uniqueSessions.add(sessionId);
        } else if (isSearchImpressionEvent(eventType)) {
          searchImpressions += 1;
          if (readString(payload.source) === "bot") {
            botImpressions += 1;
          } else if (readString(payload.source) === "ai") {
            aiImpressions += 1;
            userImpressions += 1;
          } else {
            userImpressions += 1;
          }
        } else if (isSearchClickEvent(eventType)) {
          searchClicks += 1;
        } else if (isContactEvent(eventType)) {
          contactClicks += 1;
        } else if (isInquiryEvent(eventType)) {
          inquiries += 1;
        }
      }

      return {
        views,
        uniqueViews: uniqueSessions.size,
        searchImpressions,
        userImpressions,
        aiImpressions,
        botImpressions,
        searchClicks,
        contactClicks,
        inquiries,
        clickThroughRate:
          userImpressions > 0 ? (searchClicks / userImpressions) * 100 : 0,
        conversionRate: views > 0 ? (inquiries / views) * 100 : 0,
      };
    };

    const bucketValues = (
      matcher: (eventType: string) => boolean,
      excludeBotImpressions = false,
    ) => {
      const buckets = new Map<string, number>();
      for (const row of rows) {
        if (!inDateRange(row, effectiveStartDate, effectiveEndDate)) continue;
        const eventType = String(row.eventType);
        if (!matcher(eventType)) continue;
        const payload = asRecord(row.payload);
        if (args.listingId && readString(payload.listingId) !== args.listingId) continue;
        if (!isLocationIncluded(payload, locationIds)) continue;
        if (
          excludeBotImpressions &&
          readString(payload.source) === "bot"
        ) {
          continue;
        }
        const created = readString(row.createdAt);
        if (!created) continue;
        const key = getSeriesKey(new Date(created), period);
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }

      return Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }));
    };

    const topSourceCounts = new Map<string, number>();
    for (const row of rows) {
      if (!inDateRange(row, effectiveStartDate, effectiveEndDate)) continue;
      if (!isViewEvent(String(row.eventType))) continue;
      const payload = asRecord(row.payload);
      if (args.listingId && readString(payload.listingId) !== args.listingId) continue;
      if (!isLocationIncluded(payload, locationIds)) continue;
      const source = readString(payload.source) ?? "direct";
      topSourceCounts.set(source, (topSourceCounts.get(source) ?? 0) + 1);
    }

    return {
      current: summarize(effectiveStartDate, effectiveEndDate),
      previous: summarize(previousStartDate, previousEndDate),
      timeSeries: {
        views: bucketValues(isViewEvent),
        impressions: bucketValues(isSearchImpressionEvent, true),
        clicks: bucketValues(isSearchClickEvent),
      },
      topSources: Array.from(topSourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getAnalyticsSummary - aggregate summary for dashboard             */
/* ------------------------------------------------------------------ */
export const getAnalyticsSummary = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceAuditRows(ctx, workspaceId);

    const startDate = args.startDate
      ? new Date(args.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = args.endDate ? new Date(args.endDate) : new Date();

    const inRange = rows.filter((row) => {
      const created = readString(row.createdAt);
      if (!created) return false;
      const d = new Date(created);
      return d >= startDate && d <= endDate;
    });

    const counts: Record<string, number> = {};
    for (const row of inRange) {
      const eventType = String(row.eventType);
      counts[eventType] = (counts[eventType] ?? 0) + 1;
    }

    const totalViews = counts["listing.view"] ?? 0;
    const totalClicks = counts["listing.click"] ?? 0;
    const totalContacts = counts["listing.contact"] ?? 0;
    const totalPhoneClicks = counts["listing.phone_click"] ?? 0;
    const totalWebsiteClicks = counts["listing.website_click"] ?? 0;
    const totalDirectionsClicks = counts["listing.directions_click"] ?? 0;

    return {
      totalViews,
      totalClicks,
      totalContacts,
      totalPhoneClicks,
      totalWebsiteClicks,
      totalDirectionsClicks,
      totalEvents: inRange.length,
      eventCounts: counts,
      conversionRate: totalViews > 0 ? totalContacts / totalViews : 0,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getLocationAnalytics - per-location analytics                     */
/* ------------------------------------------------------------------ */
export const getLocationAnalytics = query({
  args: {
    period: v.optional(v.string()),
    locationId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const [rows, locationRows] = await Promise.all([
      getWorkspaceAuditRows(ctx, workspaceId),
      ctx.db
        .query("locations")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", asId<"workspaces">(workspaceId)),
        )
        .collect(),
    ]);

    const { startDate, endDate } = getAnalyticsPeriodRange(args.period ?? "month");
    const effectiveStartDate = args.startDate ? new Date(args.startDate) : startDate;
    const effectiveEndDate = args.endDate ? new Date(args.endDate) : endDate;
    const locationMetaById = new Map<string, {
      label: string | null;
      city: string;
      state: string;
    }>(
      locationRows
        .filter((location) => !location.deletedAt)
        .map((location) => {
          const metadata = asRecord(location.metadata);
          return [
            String(location._id),
            {
              label: readString(metadata.label),
              city: readString(metadata.city) ?? "",
              state: readString(metadata.state) ?? "",
            },
          ] as const;
        }),
    );

    const metricsByLocation = new Map<string, {
      views: number;
      impressions: number;
      clicks: number;
      viewBuckets: Map<string, number>;
      impressionBuckets: Map<string, number>;
      clickBuckets: Map<string, number>;
    }>();

    for (const locationId of locationMetaById.keys()) {
      if (args.locationId && locationId !== args.locationId) continue;
      metricsByLocation.set(locationId, {
        views: 0,
        impressions: 0,
        clicks: 0,
        viewBuckets: new Map(),
        impressionBuckets: new Map(),
        clickBuckets: new Map(),
      });
    }

    for (const row of rows) {
      const created = readString(row.createdAt);
      if (!created) continue;
      const createdAt = new Date(created);
      if (createdAt < effectiveStartDate || createdAt > effectiveEndDate) continue;

      const payload = asRecord(row.payload);
      const locationId = readString(payload.locationId);
      if (!locationId || !metricsByLocation.has(locationId)) continue;

      const bucket = getSeriesKey(createdAt, args.period ?? "month");
      const eventType = String(row.eventType);
      const metrics = metricsByLocation.get(locationId)!;

      if (isViewEvent(eventType)) {
        metrics.views += 1;
        metrics.viewBuckets.set(bucket, (metrics.viewBuckets.get(bucket) ?? 0) + 1);
      } else if (
        isSearchImpressionEvent(eventType) &&
        readString(payload.source) !== "bot"
      ) {
        metrics.impressions += 1;
        metrics.impressionBuckets.set(
          bucket,
          (metrics.impressionBuckets.get(bucket) ?? 0) + 1,
        );
      } else if (isSearchClickEvent(eventType)) {
        metrics.clicks += 1;
        metrics.clickBuckets.set(bucket, (metrics.clickBuckets.get(bucket) ?? 0) + 1);
      }
    }

    return Array.from(metricsByLocation.entries())
      .map(([locationId, metrics]) => {
        const locationMeta = locationMetaById.get(locationId);
        return {
          locationId,
          label: locationMeta?.label ?? null,
          city: locationMeta?.city ?? "",
          state: locationMeta?.state ?? "",
          metrics: {
            views: metrics.views,
            impressions: metrics.impressions,
            clicks: metrics.clicks,
            ctr:
              metrics.impressions > 0
                ? Math.round((metrics.clicks / metrics.impressions) * 1000) / 10
                : 0,
          },
          timeSeries: {
            views: Array.from(metrics.viewBuckets.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, value]) => ({ date, value })),
            impressions: Array.from(metrics.impressionBuckets.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, value]) => ({ date, value })),
            clicks: Array.from(metrics.clickBuckets.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, value]) => ({ date, value })),
          },
        };
      })
      .sort((a, b) => b.metrics.views - a.metrics.views);
  },
});
