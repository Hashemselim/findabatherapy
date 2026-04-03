import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };

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

function isPublicContactEmailVisible(email: unknown) {
  return !(
    typeof email === "string" &&
    email.trim().toLowerCase().endsWith("@test.findabatherapy.com")
  );
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

async function findUserByClerkUserId(ctx: { db: { query(table: "users"): { withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> } } } }, clerkUserId: string) {
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
      withIndex(index: "by_clerk_user_id", cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "workspaceMemberships"): {
      withIndex(index: "by_user", cb: (q: { eq(field: "userId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "listings"): {
      withIndex(index: "by_workspace", cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
      withIndex(index: "by_slug", cb: (q: { eq(field: "slug", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "locations"): {
      withIndex(index: "by_listing", cb: (q: { eq(field: "listingId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "listingAttributes"): {
      withIndex(index: "by_listing", cb: (q: { eq(field: "listingId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
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
  const listing = listings[0] ?? null;

  return { user, membership: activeMembership, workspace, listing };
}

async function findUniqueListingSlug(
  ctx: {
    db: {
      query(table: "listings"): {
        withIndex(index: "by_slug", cb: (q: { eq(field: "slug", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  agencyName: string,
  currentWorkspaceId: string,
) {
  const baseSlug = generateSlug(agencyName) || "my-agency";
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const matches = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .collect();
    const conflictingMatch = matches.find(
      (listing) => listing.workspaceId !== currentWorkspaceId,
    );

    if (!conflictingMatch) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function getListingAttributesForListing(
  ctx: {
    db: {
      query(table: "listingAttributes"): {
        withIndex(index: "by_listing", cb: (q: { eq(field: "listingId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  listingId: string,
) {
  const attributes = await ctx.db
    .query("listingAttributes")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .collect();

  const mapped: Record<string, unknown> = {};
  for (const attribute of attributes) {
    if (typeof attribute.attributeKey === "string") {
      mapped[attribute.attributeKey] = attribute.value;
    }
  }

  return mapped;
}

async function getLocationsForListing(
  ctx: {
    db: {
      query(table: "locations"): {
        withIndex(index: "by_listing", cb: (q: { eq(field: "listingId", value: string): unknown }) => unknown): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  listingId: string,
) {
  const locations = await ctx.db
    .query("locations")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .collect();

  return locations
    .map((location) => {
      const metadata = asRecord(location.metadata);
      return {
        id: location._id,
        label: readString(metadata.label),
        street: readString(metadata.street),
        city: readString(metadata.city) ?? "",
        state: readString(metadata.state) ?? "",
        postalCode: readString(metadata.postalCode),
        isPrimary: readBoolean(metadata.isPrimary),
        isFeatured: readBoolean(metadata.isFeatured),
        serviceMode: readString(metadata.serviceMode) ?? undefined,
        insurances: readStringArray(metadata.insurances),
        serviceRadiusMiles: readNumber(metadata.serviceRadiusMiles, 25),
        latitude: typeof metadata.latitude === "number" ? metadata.latitude : null,
        longitude: typeof metadata.longitude === "number" ? metadata.longitude : null,
        googlePlaceId: readString(metadata.googlePlaceId),
        googleRating: typeof metadata.googleRating === "number" ? metadata.googleRating : null,
        googleRatingCount:
          typeof metadata.googleRatingCount === "number"
            ? metadata.googleRatingCount
            : null,
        showGoogleReviews: readBoolean(metadata.showGoogleReviews),
        contactPhone: readString(metadata.contactPhone),
        contactEmail: readString(metadata.contactEmail),
        contactWebsite: readString(metadata.contactWebsite),
        useCompanyContact: readBoolean(metadata.useCompanyContact, true),
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

async function getListingMedia(
  ctx: {
    db: {
      query(table: "files"): {
        withIndex(
          index: "by_related_record",
          cb: (q: {
            eq(field: "relatedTable", value: string): {
              eq(field: "relatedId", value: string): unknown;
            };
          }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    storage: {
      getUrl(storageId: string): Promise<string | null>;
    };
  },
  listingId: string,
) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "listings").eq("relatedId", listingId),
    )
    .collect();

  const logoFile = files.find((file) => asRecord(file.metadata).kind === "logo") ?? null;
  const photoFiles = files
    .filter((file) => asRecord(file.metadata).kind === "photo")
    .sort(
      (a, b) =>
        readNumber(asRecord(a.metadata).sortOrder, 0) -
        readNumber(asRecord(b.metadata).sortOrder, 0),
    );

  const [logoUrl, photoUrls] = await Promise.all([
    typeof logoFile?.storageId === "string"
      ? ctx.storage.getUrl(asId<"_storage">(logoFile.storageId))
      : Promise.resolve(null),
    Promise.all(
      photoFiles.map(async (file) => {
        if (typeof file.storageId !== "string") {
          return null;
        }

        return ctx.storage.getUrl(asId<"_storage">(file.storageId));
      }),
    ),
  ]);

  return {
    logoUrl,
    photoUrls: photoUrls.filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    ),
  };
}

async function buildListingResponse(
  ctx: {
    db: {
      query(table: "files"): {
        withIndex(
          index: "by_related_record",
          cb: (q: {
            eq(field: "relatedTable", value: string): {
              eq(field: "relatedId", value: string): unknown;
            };
          }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    storage: {
      getUrl(storageId: string): Promise<string | null>;
    };
  },
  workspace: ConvexDoc,
  listing: ConvexDoc,
  locations: Awaited<ReturnType<typeof getLocationsForListing>>,
  attributes: Record<string, unknown>,
) {
  const workspaceSettings = asRecord(workspace.settings);
  const listingMetadata = asRecord(listing.metadata);
  const primaryLocation = locations.find((location) => location.isPrimary) ?? null;
  const media = await getListingMedia(ctx, listing._id);

  return {
    id: listing._id,
    slug: readString(listing.slug) ?? "",
    headline: readString(listingMetadata.headline),
    description: readString(listingMetadata.description),
    summary: readString(listingMetadata.summary),
    serviceModes: readStringArray(listingMetadata.serviceModes),
    status: (readString(listing.status) ?? "draft") as "draft" | "published" | "suspended",
    isAcceptingClients: readBoolean(listingMetadata.isAcceptingClients, true),
    logoUrl: media.logoUrl ?? readString(listingMetadata.logoUrl),
    videoUrl: readString(listingMetadata.videoUrl),
    publishedAt: readString(listingMetadata.publishedAt),
    createdAt: readString(listing.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(listing.updatedAt) ?? new Date().toISOString(),
    profile: {
      agencyName: readString(workspace.agencyName) ?? "",
      contactEmail: readString(workspace.contactEmail) ?? "",
      contactPhone: readString(workspaceSettings.contactPhone),
      website: readString(workspaceSettings.website),
      planTier: readString(workspace.planTier) ?? "free",
      subscriptionStatus: readString(workspace.subscriptionStatus),
      intakeFormSettings: {
        background_color:
          readString(asRecord(workspaceSettings.intakeFormSettings).background_color) ??
          "#0866FF",
        show_powered_by: readBoolean(
          asRecord(workspaceSettings.intakeFormSettings).show_powered_by,
          true,
        ),
      },
    },
    primaryLocation: primaryLocation
      ? {
          id: primaryLocation.id,
          street: primaryLocation.street,
          city: primaryLocation.city,
          state: primaryLocation.state,
          postalCode: primaryLocation.postalCode,
          latitude: primaryLocation.latitude,
          longitude: primaryLocation.longitude,
          serviceRadiusMiles: primaryLocation.serviceRadiusMiles,
        }
      : null,
    locations,
    attributes,
    photoUrls:
      media.photoUrls.length > 0
        ? media.photoUrls
        : readStringArray(listingMetadata.photoUrls),
  };
}

export const getCurrentListingSlug = queryGeneric({
  args: {},
  handler: async (ctx) => {
    try {
      const { listing } = await requireCurrentWorkspaceContext(ctx as never);
      return listing ? readString(listing.slug) : null;
    } catch {
      return null;
    }
  },
});

export const getDashboardListing = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      return null;
    }

    const [locations, attributes] = await Promise.all([
      getLocationsForListing(ctx as never, listing._id),
      getListingAttributesForListing(ctx as never, listing._id),
    ]);

    return buildListingResponse(ctx as never, workspace, listing, locations, attributes);
  },
});

export const getPublicListingBySlug = queryGeneric({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();
    const listing = matches[0] ?? null;

    if (!listing || listing.status !== "published") {
      return null;
    }

    const workspace = await ctx.db.get(asId<"workspaces">(listing.workspaceId));
    if (!workspace || !isPublicContactEmailVisible(workspace.contactEmail)) {
      return null;
    }

    const [locations, attributes] = await Promise.all([
      getLocationsForListing(ctx as never, listing._id),
      getListingAttributesForListing(ctx as never, listing._id),
    ]);

    return buildListingResponse(ctx as never, workspace, listing, locations, attributes);
  },
});

export const updateDashboardListing = mutationGeneric({
  args: {
    headline: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    summary: v.optional(v.union(v.string(), v.null())),
    serviceModes: v.optional(v.array(v.string())),
    isAcceptingClients: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...metadata,
        ...(args.headline !== undefined ? { headline: args.headline } : {}),
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.summary !== undefined ? { summary: args.summary } : {}),
        ...(args.serviceModes !== undefined ? { serviceModes: args.serviceModes } : {}),
        ...(args.isAcceptingClients !== undefined
          ? { isAcceptingClients: args.isAcceptingClients }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const updateAgencyName = mutationGeneric({
  args: {
    agencyName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedAgencyName = args.agencyName.trim();
    if (trimmedAgencyName.length < 2) {
      throw new ConvexError("Company name must be at least 2 characters");
    }

    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    const timestamp = new Date().toISOString();
    const newSlug = await findUniqueListingSlug(ctx as never, trimmedAgencyName, workspace._id);

    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      agencyName: trimmedAgencyName,
      updatedAt: timestamp,
    });

    if (listing) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        slug: newSlug,
        updatedAt: timestamp,
      });
    }

    return { newSlug };
  },
});

export const updateListingStatus = mutationGeneric({
  args: {
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      status: args.status,
      metadata: {
        ...metadata,
        publishedAt: args.status === "published" ? new Date().toISOString() : null,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const getListingAttributes = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      return {};
    }

    const [attributes, locations] = await Promise.all([
      getListingAttributesForListing(ctx as never, listing._id),
      getLocationsForListing(ctx as never, listing._id),
    ]);

    if (!attributes.insurances) {
      const primaryLocation = locations.find((location) => location.isPrimary);
      if (primaryLocation?.insurances?.length) {
        attributes.insurances = primaryLocation.insurances;
      }
    }

    return attributes;
  },
});

export const updateListingAttributes = mutationGeneric({
  args: {
    insurances: v.optional(v.array(v.string())),
    servicesOffered: v.optional(v.array(v.string())),
    agesServedMin: v.optional(v.number()),
    agesServedMax: v.optional(v.number()),
    languages: v.optional(v.array(v.string())),
    diagnoses: v.optional(v.array(v.string())),
    clinicalSpecialties: v.optional(v.array(v.string())),
    isAcceptingClients: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const metadata = asRecord(listing.metadata);
    if (args.isAcceptingClients !== undefined) {
      await ctx.db.patch(asId<"listings">(listing._id), {
        metadata: {
          ...metadata,
          isAcceptingClients: args.isAcceptingClients,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    const attributesToUpsert = [
      ["insurances", args.insurances],
      ["services_offered", args.servicesOffered],
      ["languages", args.languages],
      ["diagnoses", args.diagnoses],
      ["clinical_specialties", args.clinicalSpecialties],
      [
        "ages_served",
        args.agesServedMin !== undefined || args.agesServedMax !== undefined
          ? {
              min: args.agesServedMin ?? 0,
              max: args.agesServedMax ?? 21,
            }
          : undefined,
      ],
    ] as const;

    for (const [attributeKey, value] of attributesToUpsert) {
      if (value === undefined) {
        continue;
      }

      const existing = (
        await ctx.db
          .query("listingAttributes")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .collect()
      ).filter((entry) => entry.attributeKey === attributeKey);

      for (const entry of existing) {
        await ctx.db.delete(asId<"listingAttributes">(entry._id));
      }

      await ctx.db.insert("listingAttributes", {
        listingId: listing._id,
        attributeKey,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

export const updateCompanyContact = mutationGeneric({
  args: {
    contactEmail: v.string(),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    website: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const settings = asRecord(workspace.settings);
    await ctx.db.patch(asId<"workspaces">(workspace._id), {
      contactEmail: args.contactEmail,
      settings: {
        ...settings,
        contactPhone: args.contactPhone ?? null,
        website: args.website ?? null,
      },
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

export const updateContactFormEnabled = mutationGeneric({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    if (workspace.planTier === "free") {
      throw new ConvexError("Contact form is only available for paid plans");
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...metadata,
        contactFormEnabled: args.enabled,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const updateClientIntakeEnabled = mutationGeneric({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const isActiveSubscription =
      workspace.subscriptionStatus === "active" ||
      workspace.subscriptionStatus === "trialing";
    if (workspace.planTier === "free" || !isActiveSubscription) {
      throw new ConvexError("Client intake form is only available for paid plans");
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...metadata,
        clientIntakeEnabled: args.enabled,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const getClientIntakeEnabled = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      return false;
    }

    return readBoolean(asRecord(listing.metadata).clientIntakeEnabled);
  },
});

export const getCareersPageSettings = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const metadata = asRecord(listing.metadata);
    return {
      brandColor: readString(metadata.careersBrandColor) ?? "#10B981",
      headline: readString(metadata.careersHeadline),
      ctaText: readString(metadata.careersCtaText) ?? "Join Our Team",
      hideBadge: readBoolean(metadata.careersHideBadge),
    };
  },
});

export const updateCareersPageSettings = mutationGeneric({
  args: {
    brandColor: v.optional(v.string()),
    headline: v.optional(v.union(v.string(), v.null())),
    ctaText: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    if (args.brandColor !== undefined) {
      const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexPattern.test(args.brandColor)) {
        throw new ConvexError(
          "Invalid color format. Please use a valid hex color (e.g., #10B981)",
        );
      }
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...metadata,
        ...(args.brandColor !== undefined
          ? { careersBrandColor: args.brandColor }
          : {}),
        ...(args.headline !== undefined
          ? { careersHeadline: args.headline }
          : {}),
        ...(args.ctaText !== undefined
          ? { careersCtaText: args.ctaText || "Join Our Team" }
          : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const updateCareersHideBadge = mutationGeneric({
  args: {
    hideBadge: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const isActiveSubscription =
      workspace.subscriptionStatus === "active" ||
      workspace.subscriptionStatus === "trialing";
    if (!isActiveSubscription || workspace.planTier === "free") {
      throw new ConvexError("This feature requires a Pro subscription");
    }

    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...metadata,
        careersHideBadge: args.hideBadge,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Google Places directory queries
// ---------------------------------------------------------------------------

function mapGooglePlacesPayload(doc: ConvexDoc) {
  const payload = asRecord(doc.payload);
  return {
    id: doc._id,
    google_place_id: readString(payload.google_place_id) ?? "",
    name: readString(payload.name) ?? "",
    slug: readString(doc.slug) ?? "",
    street: readString(payload.street),
    city: readString(payload.city) ?? readString(doc.city) ?? "",
    state: readString(payload.state) ?? readString(doc.state) ?? "",
    postal_code: readString(payload.postal_code),
    latitude: typeof payload.latitude === "number" ? payload.latitude : null,
    longitude: typeof payload.longitude === "number" ? payload.longitude : null,
    formatted_address: readString(payload.formatted_address),
    phone: readString(payload.phone),
    website: readString(payload.website),
    google_rating: typeof payload.google_rating === "number" ? payload.google_rating : null,
    google_rating_count: typeof payload.google_rating_count === "number" ? payload.google_rating_count : null,
    status: (readString(payload.status) ?? "active") as "active" | "removed" | "claimed",
    created_at: readString(doc.createdAt) ?? new Date().toISOString(),
    updated_at: readString(doc.updatedAt) ?? new Date().toISOString(),
  };
}

export const getGooglePlacesListing = queryGeneric({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("publicReadModels")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();
    const doc = matches.find(
      (m: ConvexDoc) => m.modelType === "google_places_listing",
    ) ?? null;

    if (!doc) {
      return null;
    }

    return mapGooglePlacesPayload(doc);
  },
});

export const getGooglePlacesListingById = queryGeneric({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(asId<"publicReadModels">(args.id));
    if (!doc || doc.modelType !== "google_places_listing") {
      return null;
    }

    return mapGooglePlacesPayload(doc);
  },
});

export const searchGooglePlacesListings = queryGeneric({
  args: {
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("publicReadModels")
      .withIndex("by_model_type", (q) => q.eq("modelType", "google_places_listing"))
      .collect();

    let filtered = all;

    if (args.state) {
      filtered = filtered.filter(
        (doc: ConvexDoc) => doc.state === args.state,
      );
    }

    if (args.city) {
      const cityLower = args.city.toLowerCase();
      filtered = filtered.filter((doc: ConvexDoc) => {
        const city = readString(doc.city);
        return city !== null && city.toLowerCase().includes(cityLower);
      });
    }

    const total = filtered.length;

    // Sort by google_rating descending
    filtered.sort((a: ConvexDoc, b: ConvexDoc) => {
      const ratingA = typeof asRecord(a.payload).google_rating === "number"
        ? (asRecord(a.payload).google_rating as number)
        : 0;
      const ratingB = typeof asRecord(b.payload).google_rating === "number"
        ? (asRecord(b.payload).google_rating as number)
        : 0;
      return ratingB - ratingA;
    });

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    const page = filtered.slice(offset, offset + limit);

    return {
      listings: page.map(mapGooglePlacesPayload),
      total,
    };
  },
});

export const getClaimEligibility = queryGeneric({
  args: {
    googlePlacesListingId: v.string(),
  },
  handler: async (ctx) => {
    try {
      const { listing } = await requireCurrentWorkspaceContext(ctx as never);
      if (!listing || listing.status !== "published") {
        return { status: "no_listing" as const };
      }
      return {
        status: "has_listing" as const,
        listingSlug: readString(listing.slug) ?? "",
      };
    } catch {
      return { status: "signed_out" as const };
    }
  },
});

export const submitRemovalRequest = mutationGeneric({
  args: {
    googlePlacesListingId: v.string(),
    reason: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing || listing.status !== "published") {
      throw new ConvexError("You must have a published listing to request removal");
    }

    // Removal requests table not yet in Convex schema — return a placeholder.
    return { id: "pending" };
  },
});
