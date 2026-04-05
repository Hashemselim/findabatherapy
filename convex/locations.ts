import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

const LOCATION_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
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

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
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

async function findUserByClerkUserId(ctx: ConvexCtx, clerkUserId: string) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();
  return users[0] ?? null;
}

async function requireCurrentListingContext(ctx: ConvexCtx) {
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
    ) ??
    memberships.find((membership) => membership.status === "active");

  if (!activeMembership) {
    throw new ConvexError("Workspace not found");
  }

  const workspace = await ctx.db.get(asId<"workspaces">(activeMembership.workspaceId));
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
    .collect();
  const listing = listings[0];

  if (!listing) {
    throw new ConvexError("Listing not found");
  }

  const locations = await ctx.db
    .query("locations")
    .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
    .collect();

  return { workspace, listing, locations };
}

function mapLocation(location: ConvexDoc) {
  const metadata = asRecord(location.metadata);
  return {
    id: location._id,
    label: readString(metadata.label),
    street: readString(metadata.street),
    city: readString(metadata.city) ?? "",
    state: readString(metadata.state) ?? "",
    postalCode: readString(metadata.postalCode),
    latitude: typeof metadata.latitude === "number" ? metadata.latitude : null,
    longitude: typeof metadata.longitude === "number" ? metadata.longitude : null,
    serviceRadiusMiles: readNumber(metadata.serviceRadiusMiles, 25),
    isPrimary: readBoolean(metadata.isPrimary),
    isAcceptingClients: readBoolean(metadata.isAcceptingClients, true),
    createdAt: readString(location.createdAt) ?? new Date().toISOString(),
    serviceTypes: readStringArray(metadata.serviceTypes) as Array<
      "in_home" | "in_center" | "telehealth" | "school_based"
    >,
    insurances: readStringArray(metadata.insurances),
    contactPhone: readString(metadata.contactPhone),
    contactEmail: readString(metadata.contactEmail),
    contactWebsite: readString(metadata.contactWebsite),
    useCompanyContact: readBoolean(metadata.useCompanyContact, true),
    googlePlaceId: readString(metadata.googlePlaceId),
    googleRating: typeof metadata.googleRating === "number" ? metadata.googleRating : null,
    googleRatingCount:
      typeof metadata.googleRatingCount === "number"
        ? metadata.googleRatingCount
        : null,
    showGoogleReviews: readBoolean(metadata.showGoogleReviews),
    isFeatured: readBoolean(metadata.isFeatured),
    featuredSubscription: null,
  };
}

export const getDashboardLocations = query({
  args: {},
  handler: async (ctx) => {
    const { locations } = await requireCurrentListingContext(ctx);
    return locations
      .map(mapLocation)
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  },
});

export const addLocation = mutation({
  args: {
    label: v.optional(v.union(v.string(), v.null())),
    street: v.optional(v.union(v.string(), v.null())),
    city: v.string(),
    state: v.string(),
    postalCode: v.optional(v.union(v.string(), v.null())),
    latitude: v.optional(v.union(v.number(), v.null())),
    longitude: v.optional(v.union(v.number(), v.null())),
    serviceRadiusMiles: v.optional(v.number()),
    serviceTypes: v.array(v.string()),
    insurances: v.array(v.string()),
    isAcceptingClients: v.optional(v.boolean()),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    contactEmail: v.optional(v.union(v.string(), v.null())),
    contactWebsite: v.optional(v.union(v.string(), v.null())),
    useCompanyContact: v.optional(v.boolean()),
    geocoded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspace, listing, locations } = await requireCurrentListingContext(ctx);
    const currentCount = locations.length;
    const limit = LOCATION_LIMITS[String(workspace.planTier ?? "free")] ?? 1;

    if (currentCount >= limit) {
      throw new ConvexError(
        workspace.planTier === "free"
          ? `Your plan allows a maximum of ${limit} location${limit === 1 ? "" : "s"}. Go Live to unlock more capacity.`
          : `You've used ${currentCount} of ${limit} locations. Add more capacity from billing to create another location.`,
      );
    }

    const timestamp = new Date().toISOString();
    const locationId = await ctx.db.insert("locations", {
      workspaceId: asId<"workspaces">(workspace._id),
      listingId: asId<"listings">(listing._id),
      metadata: {
        label: args.label ?? null,
        street: args.street ?? null,
        city: args.city,
        state: args.state,
        postalCode: args.postalCode ?? null,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
        serviceRadiusMiles: args.serviceRadiusMiles ?? 25,
        isPrimary: currentCount === 0,
        isAcceptingClients: args.isAcceptingClients ?? true,
        serviceTypes: args.serviceTypes,
        serviceMode:
          args.serviceTypes.includes("in_home") && args.serviceTypes.includes("in_center")
            ? "both"
            : args.serviceTypes.includes("in_home")
              ? "in_home"
              : "center_based",
        insurances: args.insurances,
        contactPhone: args.contactPhone ?? null,
        contactEmail: args.contactEmail ?? null,
        contactWebsite: args.contactWebsite ?? null,
        useCompanyContact: args.useCompanyContact ?? true,
        googlePlaceId: null,
        googleRating: null,
        googleRatingCount: null,
        showGoogleReviews: false,
        isFeatured: false,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: locationId,
      geocoded: args.geocoded ?? false,
    };
  },
});

export const updateLocation = mutation({
  args: {
    locationId: v.string(),
    label: v.optional(v.union(v.string(), v.null())),
    street: v.optional(v.union(v.string(), v.null())),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.union(v.string(), v.null())),
    latitude: v.optional(v.union(v.number(), v.null())),
    longitude: v.optional(v.union(v.number(), v.null())),
    serviceRadiusMiles: v.optional(v.number()),
    serviceTypes: v.optional(v.array(v.string())),
    insurances: v.optional(v.array(v.string())),
    isAcceptingClients: v.optional(v.boolean()),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    contactEmail: v.optional(v.union(v.string(), v.null())),
    contactWebsite: v.optional(v.union(v.string(), v.null())),
    useCompanyContact: v.optional(v.boolean()),
    geocoded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { listing, locations } = await requireCurrentListingContext(ctx);
    const location = locations.find((entry) => entry._id === args.locationId);
    if (!location || location.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    const metadata = asRecord(location.metadata);
    await ctx.db.patch(asId<"locations">(location._id), {
      metadata: {
        ...metadata,
        ...(args.label !== undefined ? { label: args.label } : {}),
        ...(args.street !== undefined ? { street: args.street } : {}),
        ...(args.city !== undefined ? { city: args.city } : {}),
        ...(args.state !== undefined ? { state: args.state } : {}),
        ...(args.postalCode !== undefined ? { postalCode: args.postalCode } : {}),
        ...(args.latitude !== undefined ? { latitude: args.latitude } : {}),
        ...(args.longitude !== undefined ? { longitude: args.longitude } : {}),
        ...(args.serviceRadiusMiles !== undefined
          ? { serviceRadiusMiles: args.serviceRadiusMiles }
          : {}),
        ...(args.serviceTypes !== undefined
          ? {
              serviceTypes: args.serviceTypes,
              serviceMode:
                args.serviceTypes.includes("in_home") &&
                args.serviceTypes.includes("in_center")
                  ? "both"
                  : args.serviceTypes.includes("in_home")
                    ? "in_home"
                    : "center_based",
            }
          : {}),
        ...(args.insurances !== undefined ? { insurances: args.insurances } : {}),
        ...(args.isAcceptingClients !== undefined
          ? { isAcceptingClients: args.isAcceptingClients }
          : {}),
        ...(args.contactPhone !== undefined ? { contactPhone: args.contactPhone } : {}),
        ...(args.contactEmail !== undefined ? { contactEmail: args.contactEmail } : {}),
        ...(args.contactWebsite !== undefined
          ? { contactWebsite: args.contactWebsite }
          : {}),
        ...(args.useCompanyContact !== undefined
          ? { useCompanyContact: args.useCompanyContact }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { geocoded: args.geocoded ?? false };
  },
});

export const deleteLocation = mutation({
  args: {
    locationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { listing, locations } = await requireCurrentListingContext(ctx);
    const location = locations.find((entry) => entry._id === args.locationId);
    if (!location || location.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    if (locations.length <= 1) {
      throw new ConvexError("Cannot delete the only location");
    }

    const metadata = asRecord(location.metadata);
    await ctx.db.delete(asId<"locations">(location._id));

    if (readBoolean(metadata.isPrimary)) {
      const replacement = locations.find((entry) => entry._id !== location._id);
      if (replacement) {
        const replacementMetadata = asRecord(replacement.metadata);
        await ctx.db.patch(asId<"locations">(replacement._id), {
          metadata: {
            ...replacementMetadata,
            isPrimary: true,
          },
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return { success: true };
  },
});

export const setPrimaryLocation = mutation({
  args: {
    locationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { listing, locations } = await requireCurrentListingContext(ctx);
    const targetLocation = locations.find((entry) => entry._id === args.locationId);
    if (!targetLocation || targetLocation.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    const timestamp = new Date().toISOString();
    for (const location of locations) {
      const metadata = asRecord(location.metadata);
      const shouldBePrimary = location._id === args.locationId;
      if (readBoolean(metadata.isPrimary) !== shouldBePrimary) {
        await ctx.db.patch(asId<"locations">(location._id), {
          metadata: {
            ...metadata,
            isPrimary: shouldBePrimary,
          },
          updatedAt: timestamp,
        });
      }
    }

    return { success: true };
  },
});

export const getLocationLimit = query({
  args: {},
  handler: async (ctx) => {
    const { workspace, locations } = await requireCurrentListingContext(ctx);
    const planTier = String(workspace.planTier ?? "free");
    return {
      limit: LOCATION_LIMITS[planTier] ?? 1,
      current: locations.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Google Reviews
// ---------------------------------------------------------------------------

function mapGoogleReview(record: ConvexDoc, locationId: string) {
  const payload = asRecord(record.payload);
  return {
    id: record._id,
    locationId,
    googleReviewId: readString(record.reviewId) ?? "",
    authorName: readString(payload.authorName) ?? "Anonymous",
    authorPhotoUrl: readString(payload.authorPhotoUrl) ?? null,
    rating: readNumber(payload.rating, 5),
    text: readString(payload.text) ?? null,
    relativeTimeDescription: readString(payload.relativeTimeDescription) ?? null,
    publishedAt: readString(payload.publishedAt) ?? null,
    isSelected: readBoolean(payload.isSelected),
    fetchedAt: readString(payload.fetchedAt) ?? new Date().toISOString(),
  };
}

async function queryGoogleReviewRecordsForListing(
  ctx: ConvexCtx,
  listingId: string,
  locationId: string,
) {
  const allRecords: ConvexDoc[] = await ctx.db
    .query("googleReviewRecords")
    .collect();

  return allRecords.filter((record) => {
    if (String(record.listingId ?? "") !== listingId) return false;
    const payload = asRecord(record.payload);
    return String(payload.locationId ?? "") === locationId;
  });
}

export const getGoogleReviews = query({
  args: {
    locationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { listing, locations } = await requireCurrentListingContext(ctx);
    const location = locations.find((entry) => entry._id === args.locationId);
    if (!location || location.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    const records = await queryGoogleReviewRecordsForListing(
      ctx,
      listing._id,
      args.locationId,
    );

    return {
      reviews: records.map((record) => mapGoogleReview(record, args.locationId)),
    };
  },
});

export const upsertGoogleReviews = mutation({
  args: {
    locationId: v.string(),
    reviews: v.array(
      v.object({
        googleReviewId: v.string(),
        authorName: v.string(),
        authorPhotoUrl: v.optional(v.union(v.string(), v.null())),
        rating: v.number(),
        text: v.optional(v.union(v.string(), v.null())),
        relativeTimeDescription: v.optional(v.union(v.string(), v.null())),
        publishedAt: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { listing, locations } = await requireCurrentListingContext(ctx);
    const location = locations.find((entry) => entry._id === args.locationId);
    if (!location || location.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    // Get existing reviews to preserve isSelected state
    const existingRecords = await queryGoogleReviewRecordsForListing(
      ctx,
      listing._id,
      args.locationId,
    );

    const existingSelections = new Map<string, boolean>();
    for (const record of existingRecords) {
      const payload = asRecord(record.payload);
      existingSelections.set(
        readString(record.reviewId) ?? "",
        readBoolean(payload.isSelected),
      );
    }

    // Delete all existing reviews for this location
    for (const record of existingRecords) {
      await ctx.db.delete(asId<"googleReviewRecords">(record._id));
    }

    // Insert new reviews with preserved isSelected
    const timestamp = new Date().toISOString();
    for (const review of args.reviews) {
      await ctx.db.insert("googleReviewRecords", {
        listingId: asId<"listings">(listing._id),
        reviewId: review.googleReviewId,
        payload: {
          locationId: args.locationId,
          authorName: review.authorName,
          authorPhotoUrl: review.authorPhotoUrl ?? null,
          rating: review.rating,
          text: review.text ?? null,
          relativeTimeDescription: review.relativeTimeDescription ?? null,
          publishedAt: review.publishedAt ?? null,
          isSelected: existingSelections.get(review.googleReviewId) ?? false,
          fetchedAt: timestamp,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { count: args.reviews.length };
  },
});

export const updateSelectedGoogleReviews = mutation({
  args: {
    locationId: v.string(),
    selectedReviewIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.selectedReviewIds.length > 4) {
      throw new ConvexError("Maximum of 4 reviews can be selected");
    }

    const { listing, locations } = await requireCurrentListingContext(ctx);
    const location = locations.find((entry) => entry._id === args.locationId);
    if (!location || location.listingId !== listing._id) {
      throw new ConvexError("Location not found");
    }

    const records = await queryGoogleReviewRecordsForListing(
      ctx,
      listing._id,
      args.locationId,
    );

    const selectedSet = new Set(args.selectedReviewIds);
    const timestamp = new Date().toISOString();

    for (const record of records) {
      const payload = asRecord(record.payload);
      const shouldBeSelected = selectedSet.has(record._id);
      if (readBoolean(payload.isSelected) !== shouldBeSelected) {
        await ctx.db.patch(asId<"googleReviewRecords">(record._id), {
          payload: {
            ...payload,
            isSelected: shouldBeSelected,
          },
          updatedAt: timestamp,
        });
      }
    }

    return { success: true };
  },
});

export const getSelectedGoogleReviewsPublic = query({
  args: {
    locationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Public query - no auth required
    const location = await ctx.db.get(asId<"locations">(args.locationId));
    if (!location) {
      return [];
    }

    const metadata = asRecord(location.metadata);
    if (!readBoolean(metadata.showGoogleReviews)) {
      return [];
    }

    const listingId = String(location.listingId ?? "");
    if (!listingId) {
      return [];
    }

    const records = await queryGoogleReviewRecordsForListing(
      ctx,
      listingId,
      args.locationId,
    );

    return records
      .filter((record) => {
        const payload = asRecord(record.payload);
        return readBoolean(payload.isSelected);
      })
      .slice(0, 4)
      .map((record) => mapGoogleReview(record, args.locationId));
  },
});
