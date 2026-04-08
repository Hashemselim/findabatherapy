import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getPublicListingLogoUrl } from "./lib/public_branding";

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

async function findUserByClerkUserId(ctx: ConvexCtx, clerkUserId: string) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();
  return users[0] ?? null;
}

async function requireCurrentWorkspaceContext(ctx: ConvexCtx) {
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
  const listing = listings[0] ?? null;

  return { user, membership: activeMembership, workspace, listing };
}

async function findUniqueListingSlug(
  ctx: ConvexCtx,
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
  ctx: ConvexCtx,
  listingId: string,
) {
  const attributes = await ctx.db
    .query("listingAttributes")
    .withIndex("by_listing", (q) =>
      q.eq("listingId", asId<"listings">(listingId)),
    )
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
  ctx: ConvexCtx,
  listingId: string,
) {
  const locations = await ctx.db
    .query("locations")
    .withIndex("by_listing", (q) =>
      q.eq("listingId", asId<"listings">(listingId)),
    )
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
  ctx: ConvexCtx,
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
      ? ctx.storage
          .getUrl(asId<"_storage">(logoFile.storageId))
          .then((url) => url ?? readString(logoFile.publicPath))
      : Promise.resolve(null),
    Promise.all(
      photoFiles.map(async (file) => {
        if (typeof file.storageId !== "string") {
          return readString(file.publicPath);
        }

        const url = await ctx.storage.getUrl(asId<"_storage">(file.storageId));
        return url ?? readString(file.publicPath);
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
  ctx: ConvexCtx,
  workspace: ConvexDoc,
  listing: ConvexDoc,
  locations: Awaited<ReturnType<typeof getLocationsForListing>>,
  attributes: Record<string, unknown>,
) {
  const workspaceSettings = asRecord(workspace.settings);
  const listingMetadata = asRecord(listing.metadata);
  const primaryLocation = locations.find((location) => location.isPrimary) ?? null;
  const [media, customDomains] = await Promise.all([
    getListingMedia(ctx, listing._id),
    ctx.db
      .query("customDomains")
      .withIndex("by_listing", (q) =>
        q.eq("listingId", asId<"listings">(listing._id)),
      )
      .collect(),
  ]);
  const customDomain =
    customDomains.find((domain) =>
      ["active", "pending_dns", "verifying"].includes(
        readString(domain.status) ?? "",
      ),
    ) ?? null;

  return {
    id: listing._id,
    slug: readString(listing.slug) ?? "",
    headline: readString(listingMetadata.headline),
    description: readString(listingMetadata.description),
    summary: readString(listingMetadata.summary),
    serviceModes: readStringArray(listingMetadata.serviceModes),
    status: (readString(listing.status) ?? "draft") as "draft" | "published" | "suspended",
    isAcceptingClients: readBoolean(listingMetadata.isAcceptingClients, true),
    logoUrl:
      media.logoUrl ??
      readString(asRecord(workspaceSettings.branding).logoUrl) ??
      readString(listingMetadata.logoUrl),
    videoUrl: readString(listingMetadata.videoUrl),
    websitePublished: readBoolean(listingMetadata.websitePublished, listing.status === "published"),
    websiteSettings: {
      template: readString(asRecord(listingMetadata.websiteSettings).template) ?? "modern",
      show_gallery: readBoolean(asRecord(listingMetadata.websiteSettings).show_gallery, true),
      show_reviews: readBoolean(asRecord(listingMetadata.websiteSettings).show_reviews, true),
      show_careers: readBoolean(asRecord(listingMetadata.websiteSettings).show_careers, true),
      show_resources: readBoolean(
        asRecord(listingMetadata.websiteSettings).show_resources,
        true,
      ),
      hero_cta_text:
        readString(asRecord(listingMetadata.websiteSettings).hero_cta_text) ??
        "Get Started",
      sections_order:
        readStringArray(asRecord(listingMetadata.websiteSettings).sections_order)
          .length > 0
          ? readStringArray(asRecord(listingMetadata.websiteSettings).sections_order)
          : ["hero", "about", "services", "insurance", "locations", "gallery", "reviews"],
    },
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
    customDomain: customDomain
      ? {
          domain: readString(customDomain.hostname) ?? "",
          status: readString(customDomain.status) ?? "verifying",
        }
      : null,
  };
}

export const getCurrentListingSlug = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { listing } = await requireCurrentWorkspaceContext(ctx);
      return listing ? readString(listing.slug) : null;
    } catch {
      return null;
    }
  },
});

export const getDashboardListing = query({
  args: {},
  handler: async (ctx) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
    if (!listing) {
      return null;
    }

    const [locations, attributes] = await Promise.all([
      getLocationsForListing(ctx, listing._id),
      getListingAttributesForListing(ctx, listing._id),
    ]);

    return buildListingResponse(ctx, workspace, listing, locations, attributes);
  },
});

export const getPublicListingBySlug = query({
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
    if (!workspace) {
      return null;
    }

    const [locations, attributes] = await Promise.all([
      getLocationsForListing(ctx, listing._id),
      getListingAttributesForListing(ctx, listing._id),
    ]);

    return buildListingResponse(ctx, workspace, listing, locations, attributes);
  },
});

export const updateDashboardListing = mutation({
  args: {
    headline: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    summary: v.optional(v.union(v.string(), v.null())),
    serviceModes: v.optional(v.array(v.string())),
    isAcceptingClients: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx);
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

export const updateAgencyName = mutation({
  args: {
    agencyName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedAgencyName = args.agencyName.trim();
    if (trimmedAgencyName.length < 2) {
      throw new ConvexError("Company name must be at least 2 characters");
    }

    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
    const timestamp = new Date().toISOString();
    const newSlug = await findUniqueListingSlug(ctx, trimmedAgencyName, workspace._id);

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

export const updateListingStatus = mutation({
  args: {
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const timestamp = new Date().toISOString();
    const metadata = asRecord(listing.metadata);
    await ctx.db.patch(asId<"listings">(listing._id), {
      status: args.status,
      metadata: {
        ...metadata,
        publishedAt: args.status === "published" ? timestamp : null,
      },
      updatedAt: timestamp,
    });

    if (args.status === "published" && !readString(workspace.onboardingCompletedAt)) {
      await ctx.db.patch(asId<"workspaces">(workspace._id), {
        onboardingCompletedAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return { success: true };
  },
});

export const getListingAttributes = query({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx);
    if (!listing) {
      return {};
    }

    const [attributes, locations] = await Promise.all([
      getListingAttributesForListing(ctx, listing._id),
      getLocationsForListing(ctx, listing._id),
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

export const updateListingAttributes = mutation({
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
    const { listing } = await requireCurrentWorkspaceContext(ctx);
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
          .withIndex("by_listing", (q) =>
            q.eq("listingId", asId<"listings">(listing._id)),
          )
          .collect()
      ).filter((entry) => entry.attributeKey === attributeKey);

      for (const entry of existing) {
        await ctx.db.delete(asId<"listingAttributes">(entry._id));
      }

      await ctx.db.insert("listingAttributes", {
        listingId: asId<"listings">(listing._id),
        attributeKey,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

export const updateCompanyContact = mutation({
  args: {
    contactEmail: v.string(),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    website: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx);
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

export const updateContactFormEnabled = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
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

export const updateClientIntakeEnabled = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
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

export const getClientIntakeEnabled = query({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx);
    if (!listing) {
      return false;
    }

    return readBoolean(asRecord(listing.metadata).clientIntakeEnabled);
  },
});

export const getCareersPageSettings = query({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx);
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

export const updateCareersPageSettings = mutation({
  args: {
    brandColor: v.optional(v.string()),
    headline: v.optional(v.union(v.string(), v.null())),
    ctaText: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx);
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

export const updateCareersHideBadge = mutation({
  args: {
    hideBadge: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
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

export const getGooglePlacesListing = query({
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

export const getGooglePlacesListingById = query({
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

async function searchGooglePlacesListingsInternal(
  ctx: ConvexCtx,
  args: {
    state?: string;
    city?: string;
    limit?: number;
    offset?: number;
  },
) {
  const all = await ctx.db
    .query("publicReadModels")
    .withIndex("by_model_type", (q) => q.eq("modelType", "google_places_listing"))
    .collect();

  let filtered = all;

  filtered = filtered.filter((doc: ConvexDoc) => {
    const payload = asRecord(doc.payload);
    return (readString(payload.status) ?? "active") === "active";
  });

  if (args.state) {
    filtered = filtered.filter((doc: ConvexDoc) =>
      matchesState(readString(doc.state), args.state),
    );
  }

  if (args.city) {
    filtered = filtered.filter((doc: ConvexDoc) =>
      matchesStateOrCity(readString(doc.city), args.city),
    );
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
}

export const searchGooglePlacesListings = query({
  args: {
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => searchGooglePlacesListingsInternal(ctx, args),
});

export const getClaimEligibility = query({
  args: {
    googlePlacesListingId: v.string(),
  },
  handler: async (ctx) => {
    try {
      const { listing } = await requireCurrentWorkspaceContext(ctx);
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

export const submitRemovalRequest = mutation({
  args: {
    googlePlacesListingId: v.string(),
    reason: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx);
    if (!listing || listing.status !== "published") {
      throw new ConvexError("You must have a published listing to request removal");
    }

    const timestamp = new Date().toISOString();
    const id = await ctx.db.insert("removalRequests", {
      workspaceId: asId<"workspaces">(workspace._id),
      listingId: asId<"listings">(listing._id),
      googlePlacesListingId: args.googlePlacesListingId,
      reason: args.reason ?? undefined,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { id };
  },
});

// ---------------------------------------------------------------------------
// Sitemap helpers
// ---------------------------------------------------------------------------

export const getPublishedListingSlugs = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    return all
      .filter((listing: ConvexDoc) => readString(listing.slug))
      .map((listing: ConvexDoc) => ({
        slug: readString(listing.slug) ?? "",
        updatedAt: readString(listing.updatedAt) ?? new Date().toISOString(),
      }));
  },
});

// ---------------------------------------------------------------------------
// Search helpers (called by server actions via queryConvexUnauthenticated)
// ---------------------------------------------------------------------------

type SearchFilters = {
  query?: string;
  state?: string;
  city?: string;
  serviceTypes?: string[];
  insurances?: string[];
  languages?: string[];
  acceptingClients?: boolean;
  userLat?: number;
  userLng?: number;
  radiusMiles?: number;
  [key: string]: unknown;
};

type SearchOptions = {
  limit?: number;
  page?: number;
  [key: string]: unknown;
};

const searchFiltersValidator = v.object({
  query: v.optional(v.string()),
  state: v.optional(v.string()),
  city: v.optional(v.string()),
  serviceTypes: v.optional(v.array(v.string())),
  insurances: v.optional(v.array(v.string())),
  languages: v.optional(v.array(v.string())),
  acceptingClients: v.optional(v.boolean()),
  userLat: v.optional(v.number()),
  userLng: v.optional(v.number()),
  radiusMiles: v.optional(v.number()),
});

const searchOptionsValidator = v.object({
  limit: v.optional(v.number()),
  page: v.optional(v.number()),
});

type ProviderSearchResult = {
  id: string;
  slug: string;
  agencyName: string;
  headline: string | null;
  description: string | null;
  logoUrl: string | null;
  status: string;
  planTier: string;
  isAcceptingClients: boolean;
  createdAt: string;
  updatedAt: string;
};

type HomepageFeaturedProviderResult = {
  id: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  serviceModes: string[];
  isAcceptingClients: boolean;
  logoUrl: string | null;
  profile: {
    agencyName: string;
    planTier: "free" | "pro";
  };
  primaryLocation: {
    city: string;
    state: string;
  } | null;
  attributes: {
    insurances?: string[];
    languages?: string[];
    ages_served?: { min?: number; max?: number };
  };
};

type LocationSearchResultEntry = {
  locationId: string;
  city: string;
  state: string;
  street: string | null;
  postalCode: string | null;
  serviceTypes: string[];
  insurances: string[];
  serviceRadiusMiles: number;
  isPrimary: boolean;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  listingId: string;
  slug: string;
  headline: string | null;
  summary: string | null;
  isAcceptingClients: boolean;
  logoUrl: string | null;
  agencyName: string;
  planTier: string;
  otherLocationsCount: number;
  distanceMiles?: number;
  isFeatured: boolean;
  isWithinServiceRadius: boolean;
};

type GooglePlacesSearchResultEntry = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  street: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  distanceMiles?: number;
  isPrePopulated: true;
};

function normalizeSearchText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function expandStateSearchTerms(value: unknown) {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  const upper = normalized.toUpperCase();
  if (upper.length === 2 && STATE_CODE_TO_NAME[upper]) {
    return [normalized, normalizeSearchText(STATE_CODE_TO_NAME[upper])];
  }

  const fromName = Object.entries(STATE_CODE_TO_NAME).find(
    ([, name]) => normalizeSearchText(name) === normalized,
  );
  if (fromName) {
    return [normalized, normalizeSearchText(fromName[0])];
  }

  return [normalized];
}

function hasAnyOverlap(values: string[], selected?: string[]) {
  if (!selected || selected.length === 0) {
    return true;
  }

  const normalizedValues = new Set(values.map((value) => value.toLowerCase()));
  return selected.some((value) => normalizedValues.has(value.toLowerCase()));
}

function matchesStateOrCity(
  value: string | null,
  filterValue: unknown,
) {
  const normalizedValue = normalizeSearchText(value);
  const normalizedFilter = normalizeSearchText(filterValue);
  if (!normalizedFilter) {
    return true;
  }

  return normalizedValue.includes(normalizedFilter);
}

function matchesState(value: string | null, filterValue: unknown) {
  const normalizedValue = normalizeSearchText(value);
  const searchTerms = expandStateSearchTerms(filterValue);

  if (searchTerms.length === 0) {
    return true;
  }

  return searchTerms.includes(normalizedValue);
}

function calculateDistanceMiles(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(fromLatitude);
  const lat2 = toRadians(toLatitude);
  const deltaLat = toRadians(toLatitude - fromLatitude);
  const deltaLng = toRadians(toLongitude - fromLongitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sortCombinedSearchResults(
  left:
    | (LocationSearchResultEntry & {
        isPrePopulated: false;
        section: "featured" | "nearby" | "other";
      })
    | (GooglePlacesSearchResultEntry & { section: "featured" | "nearby" | "other" }),
  right:
    | (LocationSearchResultEntry & {
        isPrePopulated: false;
        section: "featured" | "nearby" | "other";
      })
    | (GooglePlacesSearchResultEntry & { section: "featured" | "nearby" | "other" }),
) {
  const sectionPriority = { featured: 0, nearby: 1, other: 2 } as const;
  const sectionDelta = sectionPriority[left.section] - sectionPriority[right.section];
  if (sectionDelta !== 0) {
    return sectionDelta;
  }

  const leftPrePopulated = "isPrePopulated" in left && left.isPrePopulated;
  const rightPrePopulated = "isPrePopulated" in right && right.isPrePopulated;
  if (leftPrePopulated !== rightPrePopulated) {
    return leftPrePopulated ? 1 : -1;
  }

  const leftDistance =
    typeof left.distanceMiles === "number" ? left.distanceMiles : Number.POSITIVE_INFINITY;
  const rightDistance =
    typeof right.distanceMiles === "number" ? right.distanceMiles : Number.POSITIVE_INFINITY;
  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  const leftPlanTier = "planTier" in left && left.planTier === "pro" ? 0 : 1;
  const rightPlanTier = "planTier" in right && right.planTier === "pro" ? 0 : 1;
  if (leftPlanTier !== rightPlanTier) {
    return leftPlanTier - rightPlanTier;
  }

  const leftName = normalizeSearchText(
    "agencyName" in left ? left.agencyName : left.name,
  );
  const rightName = normalizeSearchText(
    "agencyName" in right ? right.agencyName : right.name,
  );
  return leftName.localeCompare(rightName);
}

/**
 * Shared search logic used by both `searchProviders` and `getStateProviders`.
 * Extracted to avoid the invalid `runQuery` pattern that silently returned empty.
 */
async function searchProvidersInternal(
  ctx: ConvexCtx,
  filters?: SearchFilters,
  options?: SearchOptions,
): Promise<{ listings: ProviderSearchResult[]; total: number; page: number; limit: number }> {
  const published = await ctx.db
    .query("listings")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .collect();

  let filtered = published;

  if (filters?.state && typeof filters.state === "string") {
    const stateLower = filters.state.toLowerCase();
    const locationsByWorkspace = new Map<string, ConvexDoc[]>();

    await Promise.all(
      [...new Set(filtered.map((listing) => String(listing.workspaceId)))].map(
        async (workspaceId) => {
          const workspaceLocations = await ctx.db
            .query("locations")
            .withIndex("by_workspace", (q) =>
              q.eq("workspaceId", asId<"workspaces">(workspaceId)),
            )
            .collect();
          locationsByWorkspace.set(workspaceId, workspaceLocations);
        },
      ),
    );

    filtered = filtered.filter((listing: ConvexDoc) => {
      const locs = locationsByWorkspace.get(String(listing.workspaceId)) ?? [];
      return locs.some((loc: ConvexDoc) => {
        const meta = asRecord(loc.metadata);
        const state = readString(meta.state);
        return state && state.toLowerCase().includes(stateLower);
      });
    });
  }

  const limit = typeof options?.limit === "number" ? options.limit : 20;
  const page = typeof options?.page === "number" ? options.page : 1;
  const offset = (page - 1) * limit;

  const total = filtered.length;
  const pageItems = filtered.slice(offset, offset + limit);

  // Batch-fetch workspaces to avoid N+1 queries
  const workspaceIds = [...new Set(pageItems.map((l) => String(l.workspaceId)))];
  const workspaceResults = await Promise.all(
    workspaceIds.map((id) => ctx.db.get(asId<"workspaces">(id))),
  );
  const workspaceMap = new Map(
    workspaceResults.flatMap((workspace) =>
      workspace ? [[workspace._id, workspace]] : [],
    ),
  );

  const results = (
    await Promise.all(
      pageItems.map(async (listing) => {
        const workspace = workspaceMap.get(listing.workspaceId);
        if (!workspace) return null;
        const metadata = asRecord(listing.metadata);
        const logoUrl = await getPublicListingLogoUrl(ctx, listing, workspace);

        const result: ProviderSearchResult = {
          id: String(listing._id),
          slug: readString(listing.slug) ?? "",
          agencyName: readString(workspace.agencyName) ?? "",
          headline: readString(metadata.headline),
          description: readString(metadata.description),
          logoUrl,
          status: readString(listing.status) ?? "draft",
          planTier: readString(workspace.planTier) ?? "free",
          isAcceptingClients:
            typeof metadata.isAcceptingClients === "boolean"
              ? metadata.isAcceptingClients
              : true,
          createdAt: readString(listing.createdAt) ?? new Date().toISOString(),
          updatedAt: readString(listing.updatedAt) ?? new Date().toISOString(),
        };

        return result;
      }),
    )
  ).filter((listing): listing is NonNullable<typeof listing> => listing !== null);

  return { listings: results, total, page, limit };
}

function readHomepagePlanTier(workspace: ConvexDoc): "free" | "pro" {
  const selectedTier = workspace.planTier === "pro" ? "pro" : "free";
  const isActiveSubscription =
    workspace.subscriptionStatus === "active" ||
    workspace.subscriptionStatus === "trialing";

  return selectedTier === "pro" && isActiveSubscription ? "pro" : "free";
}

function mapHomepageAttributes(attributes: Record<string, unknown>) {
  const result: HomepageFeaturedProviderResult["attributes"] = {};
  const insurances = readStringArray(attributes.insurances);
  const languages = readStringArray(attributes.languages);
  const agesServed = asRecord(attributes.ages_served);
  const minAge = typeof agesServed.min === "number" ? agesServed.min : undefined;
  const maxAge = typeof agesServed.max === "number" ? agesServed.max : undefined;

  if (insurances.length > 0) {
    result.insurances = insurances;
  }

  if (languages.length > 0) {
    result.languages = languages;
  }

  if (minAge !== undefined || maxAge !== undefined) {
    result.ages_served = {
      ...(minAge !== undefined ? { min: minAge } : {}),
      ...(maxAge !== undefined ? { max: maxAge } : {}),
    };
  }

  return result;
}

export const searchProviders = query({
  args: {
    filters: v.optional(searchFiltersValidator),
    options: v.optional(searchOptionsValidator),
  },
  handler: async (ctx, args) => {
    return searchProvidersInternal(
      ctx,
      args.filters as SearchFilters | undefined,
      args.options as SearchOptions | undefined,
    );
  },
});

export const getStateProviders = query({
  args: {
    state: v.string(),
    options: v.optional(searchOptionsValidator),
  },
  handler: async (ctx, args) => {
    return searchProvidersInternal(
      ctx,
      { state: args.state },
      args.options as SearchOptions | undefined,
    );
  },
});

export const getHomepageFeaturedProviders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const max = args.limit ?? 6;

    const workspaceIds = [...new Set(published.map((listing) => String(listing.workspaceId)))];
    const workspaceResults = await Promise.all(
      workspaceIds.map((id) => ctx.db.get(asId<"workspaces">(id))),
    );
    const workspaceMap = new Map(
      workspaceResults.flatMap((workspace) =>
        workspace ? [[String(workspace._id), workspace]] : [],
      ),
    );

    const visibleListings = published
      .filter((listing) => {
        const workspace = workspaceMap.get(String(listing.workspaceId));
        return Boolean(workspace);
      })
      .sort((left, right) => {
        const leftWorkspace = workspaceMap.get(String(left.workspaceId));
        const rightWorkspace = workspaceMap.get(String(right.workspaceId));
        const leftPriority = leftWorkspace && readHomepagePlanTier(leftWorkspace) === "pro" ? 0 : 1;
        const rightPriority = rightWorkspace && readHomepagePlanTier(rightWorkspace) === "pro" ? 0 : 1;

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        const leftCreatedAt = new Date(readString(left.createdAt) ?? "1970-01-01T00:00:00.000Z").getTime();
        const rightCreatedAt = new Date(readString(right.createdAt) ?? "1970-01-01T00:00:00.000Z").getTime();

        return rightCreatedAt - leftCreatedAt;
      })
      .slice(0, max);

    const results: HomepageFeaturedProviderResult[] = [];
    for (const listing of visibleListings) {
      const workspace = workspaceMap.get(String(listing.workspaceId));
      if (!workspace) continue;
      const metadata = asRecord(listing.metadata);
      const [locations, attributes, media] = await Promise.all([
        getLocationsForListing(ctx, listing._id),
        getListingAttributesForListing(ctx, listing._id),
        getListingMedia(ctx, listing._id),
      ]);
      const primaryLocation = locations.find((location) => location.isPrimary) ?? locations[0] ?? null;

      results.push({
        id: listing._id,
        slug: readString(listing.slug) ?? "",
        headline: readString(metadata.headline),
        summary: readString(metadata.summary),
        serviceModes: readStringArray(metadata.serviceModes),
        isAcceptingClients: readBoolean(metadata.isAcceptingClients, true),
        logoUrl:
          media.logoUrl ??
          readString(asRecord(asRecord(workspace.settings).branding).logoUrl) ??
          readString(metadata.logoUrl),
        profile: {
          agencyName: readString(workspace.agencyName) ?? "",
          planTier: readHomepagePlanTier(workspace),
        },
        primaryLocation: primaryLocation
          ? {
              city: primaryLocation.city,
              state: primaryLocation.state,
            }
          : null,
        attributes: mapHomepageAttributes(attributes),
      });
    }

    return results;
  },
});

export const getProviderCountByState = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const locationGroups = await Promise.all(
      published.map((listing) =>
        ctx.db
          .query("locations")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .collect(),
      ),
    );
    const allLocations = locationGroups.flat();
    const counts: Record<string, number> = {};
    const seenWorkspaces = new Set<string>();

    for (const loc of allLocations) {
      const meta = asRecord(loc.metadata);
      const state = readString(meta.state);
      const ws = String(loc.workspaceId);
      const key = `${state}-${ws}`;
      if (state && !seenWorkspaces.has(key)) {
        seenWorkspaces.add(key);
        counts[state] = (counts[state] ?? 0) + 1;
      }
    }

    return counts;
  },
});

async function buildLocationSearchResults(
  ctx: ConvexCtx,
  filters?: Record<string, unknown>,
  options?: Record<string, unknown>,
) {
  const publishedListings = await ctx.db
    .query("listings")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .collect();
  const locationGroups = await Promise.all(
    publishedListings.map((listing) =>
      ctx.db
        .query("locations")
        .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
        .collect(),
    ),
  );
  const allLocations = locationGroups.flat();
  const limit = typeof options?.limit === "number" ? options.limit : 20;
  const page = typeof options?.page === "number" ? options.page : 1;
  const offset = (page - 1) * limit;
  const userLat = typeof filters?.userLat === "number" ? filters.userLat : null;
  const userLng = typeof filters?.userLng === "number" ? filters.userLng : null;
  const hasProximitySearch = userLat !== null && userLng !== null;
  const isBroadStateSearch =
    hasProximitySearch &&
    !normalizeSearchText(filters?.city) &&
    expandStateSearchTerms(filters?.state).length > 0;
  const shouldApplyProximity = hasProximitySearch && !isBroadStateSearch;
  const shouldIgnoreCityFilter = hasProximitySearch;
  const radiusMiles =
    typeof filters?.radiusMiles === "number" && filters.radiusMiles > 0
      ? filters.radiusMiles
      : 25;
  const queryLower = normalizeSearchText(filters?.query);
  const serviceTypeFilters = Array.isArray(filters?.serviceTypes)
    ? filters.serviceTypes.filter((item): item is string => typeof item === "string")
    : [];
  const insuranceFilters = Array.isArray(filters?.insurances)
    ? filters.insurances.filter((item): item is string => typeof item === "string")
    : [];
  const languageFilters = Array.isArray(filters?.languages)
    ? filters.languages.filter((item): item is string => typeof item === "string")
    : [];
  const acceptingClients =
    typeof filters?.acceptingClients === "boolean"
      ? filters.acceptingClients
      : null;

  const prelimFiltered = allLocations.filter((loc: ConvexDoc) => {
    const meta = asRecord(loc.metadata);
    if (!matchesState(readString(meta.state), filters?.state)) {
      return false;
    }
    if (!shouldIgnoreCityFilter && !matchesStateOrCity(readString(meta.city), filters?.city)) {
      return false;
    }
    if (!hasAnyOverlap(readStringArray(meta.serviceTypes), serviceTypeFilters)) {
      return false;
    }
    if (!hasAnyOverlap(readStringArray(meta.insurances), insuranceFilters)) {
      return false;
    }
    return Boolean(readString(loc.listingId));
  });

  // Batch-fetch listings and workspaces before final filtering so listing-level
  // fields like language, accepting-clients, and query text can participate.
  const listingIds = [
    ...new Set(prelimFiltered.map((loc) => String(loc.listingId)).filter(Boolean)),
  ];
  const listingResults = await Promise.all(
    listingIds.map((id) => ctx.db.get(asId<"listings">(id))),
  );
  const listingMap = new Map(
    listingResults.flatMap((listing) =>
      listing && listing.status === "published" ? [[listing._id, listing]] : [],
    ),
  );

  const workspaceIds = [...new Set(
    [...listingMap.values()].map((l) => String(l.workspaceId)),
  )];
  const wsResults = await Promise.all(
    workspaceIds.map((id) => ctx.db.get(asId<"workspaces">(id))),
  );
  const wsMap = new Map(
    wsResults.flatMap((workspace) =>
      workspace ? [[workspace._id, workspace]] : [],
    ),
  );

  // Count locations per listing for otherLocationsCount
  const locCountByListing = new Map<string, number>();
  for (const loc of allLocations) {
    const lid = String(loc.listingId);
    locCountByListing.set(lid, (locCountByListing.get(lid) ?? 0) + 1);
  }

  const locations: LocationSearchResultEntry[] = [];
  for (const loc of prelimFiltered) {
    const listing = listingMap.get(asId<"listings">(loc.listingId));
    if (!listing) continue;
    const workspace = wsMap.get(listing.workspaceId);
    if (!workspace) continue;

    const meta = asRecord(loc.metadata);
    const listingMeta = asRecord(listing.metadata);
    const attributes = await getListingAttributesForListing(ctx, listing._id);
    const languages = readStringArray(attributes.languages);
    const serviceRadiusMiles = readNumber(meta.serviceRadiusMiles, 25);
    const latitude = typeof meta.latitude === "number" ? meta.latitude : null;
    const longitude = typeof meta.longitude === "number" ? meta.longitude : null;
    const distanceMiles =
      shouldApplyProximity && latitude !== null && longitude !== null
        ? calculateDistanceMiles(userLat, userLng, latitude, longitude)
        : undefined;
    const locationServiceTypes = readStringArray(meta.serviceTypes);
    const hasInHomeService = locationServiceTypes.includes("in_home");
    const isCenterOnly =
      (locationServiceTypes.includes("in_center") ||
        locationServiceTypes.includes("school_based")) &&
      !hasInHomeService;
    const isWithinServiceRadius =
      isCenterOnly ||
      (typeof distanceMiles === "number" && distanceMiles <= serviceRadiusMiles);
    const agencyName = readString(workspace.agencyName) ?? "";
    const headline = readString(listingMeta.headline);
    const summary = readString(listingMeta.summary);
    const city = readString(meta.city) ?? "";
    const state = readString(meta.state) ?? "";
    const isAcceptingClients = readBoolean(listingMeta.isAcceptingClients, true);

    if (acceptingClients !== null && isAcceptingClients !== acceptingClients) {
      continue;
    }

    if (!hasAnyOverlap(languages, languageFilters)) {
      continue;
    }

    if (queryLower) {
      const haystack = [agencyName, headline, summary, city, state]
        .map((value) => normalizeSearchText(value))
        .join(" ");
      if (!haystack.includes(queryLower)) {
        continue;
      }
    }

    locations.push({
      locationId: loc._id,
      city,
      state,
      street: readString(meta.street),
      postalCode: readString(meta.postalCode),
      serviceTypes: locationServiceTypes,
      insurances: readStringArray(meta.insurances),
      serviceRadiusMiles,
      isPrimary: readBoolean(meta.isPrimary),
      latitude,
      longitude,
      googlePlaceId: readString(meta.googlePlaceId),
      googleRating: typeof meta.googleRating === "number" ? meta.googleRating : null,
      googleRatingCount: typeof meta.googleRatingCount === "number" ? meta.googleRatingCount : null,
      listingId: listing._id,
      slug: readString(listing.slug) ?? "",
      headline,
      summary,
      isAcceptingClients,
      logoUrl: readString(listingMeta.logoUrl),
      agencyName,
      planTier: readString(workspace.planTier) ?? "free",
      otherLocationsCount: Math.max(0, (locCountByListing.get(String(loc.listingId)) ?? 1) - 1),
      isFeatured: readBoolean(meta.isFeatured),
      distanceMiles,
      isWithinServiceRadius,
    });
  }

  locations.sort((left, right) =>
    sortCombinedSearchResults(
      {
        ...left,
        isPrePopulated: false,
        section: left.isFeatured
          ? "featured"
          : left.isWithinServiceRadius
            ? "nearby"
            : "other",
      },
      {
        ...right,
        isPrePopulated: false,
        section: right.isFeatured
          ? "featured"
          : right.isWithinServiceRadius
            ? "nearby"
            : "other",
      },
    ),
  );

  const total = locations.length;
  const totalPages = Math.ceil(total / limit);
  const pageItems = await Promise.all(
    locations.slice(offset, offset + limit).map(async (location) => {
      const listing = listingMap.get(asId<"listings">(location.listingId));
      const workspace = listing ? wsMap.get(listing.workspaceId) ?? null : null;
      const logoUrl =
        listing && workspace
          ? await getPublicListingLogoUrl(ctx, listing, workspace)
          : location.logoUrl;

      return {
        ...location,
        logoUrl,
      };
    }),
  );

  return {
    locations: pageItems,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
    radiusMiles,
  };
}

export const searchProviderLocations = query({
  args: {
    filters: v.optional(searchFiltersValidator),
    options: v.optional(searchOptionsValidator),
  },
  handler: async (ctx, args) => {
    return buildLocationSearchResults(
      ctx,
      args.filters as Record<string, unknown> | undefined,
      args.options as Record<string, unknown> | undefined,
    );
  },
});

/**
 * Combined location search that matches the `CombinedLocationSearchResult` shape
 * expected by the search page:
 *   { results, realListingsCount, googlePlacesCount, total, page, totalPages,
 *     hasMore, featuredCount, nearbyCount, otherCount, radiusMiles }
 *
 * The `results` array contains items tagged with `isPrePopulated` and `section`.
 */
export const searchProviderLocationsWithGooglePlaces = query({
  args: {
    filters: v.optional(searchFiltersValidator),
    options: v.optional(searchOptionsValidator),
  },
  handler: async (ctx, args) => {
    const raw = await buildLocationSearchResults(
      ctx,
      args.filters as Record<string, unknown> | undefined,
      args.options as Record<string, unknown> | undefined,
    );

    const filters = args.filters as SearchFilters | undefined;
    const radiusMiles = raw.radiusMiles ?? 25;
    const offset =
      ((typeof args.options?.page === "number" ? args.options.page : 1) - 1) *
      (typeof args.options?.limit === "number" ? args.options.limit : 20);
    const hasProximitySearch =
      typeof filters?.userLat === "number" && typeof filters?.userLng === "number";
    const googlePlaces = await searchGooglePlacesListingsInternal(ctx, {
      state: filters?.state,
      city: hasProximitySearch ? undefined : filters?.city,
      limit: typeof args.options?.limit === "number" ? args.options.limit : 20,
      offset,
    });

    const queryLower = normalizeSearchText(filters?.query);
    const isBroadStateSearch =
      hasProximitySearch &&
      !normalizeSearchText(filters?.city) &&
      expandStateSearchTerms(filters?.state).length > 0;
    const shouldApplyProximity = hasProximitySearch && !isBroadStateSearch;

    const realResults = raw.locations.map((loc) => ({
      ...loc,
      isPrePopulated: false as const,
      section: (
        loc.isFeatured
          ? "featured"
          : loc.isWithinServiceRadius
            ? "nearby"
            : "other"
      ) as "featured" | "nearby" | "other",
    }));

    const googleResults = googlePlaces.listings
      .map((listing: ReturnType<typeof mapGooglePlacesPayload>) => {
        const distanceMiles =
          shouldApplyProximity &&
          typeof listing.latitude === "number" &&
          typeof listing.longitude === "number" &&
          typeof filters?.userLat === "number" &&
          typeof filters?.userLng === "number"
            ? calculateDistanceMiles(
                filters.userLat,
                filters.userLng,
                listing.latitude,
                listing.longitude,
              )
            : undefined;

        return {
          id: listing.id,
          slug: listing.slug,
          name: listing.name,
          city: listing.city,
          state: listing.state,
          street: listing.street,
          postalCode: listing.postal_code,
          latitude: listing.latitude,
          longitude: listing.longitude,
          phone: listing.phone,
          website: listing.website,
          googleRating: listing.google_rating,
          googleRatingCount: listing.google_rating_count,
          distanceMiles,
          isPrePopulated: true as const,
          section: (
            !shouldApplyProximity ||
            typeof distanceMiles !== "number" ||
            distanceMiles <= radiusMiles
              ? "nearby"
              : "other"
          ) as "featured" | "nearby" | "other",
        };
      })
      .filter((listing: GooglePlacesSearchResultEntry) => {
        if (!queryLower) {
          return true;
        }

        const haystack = [listing.name, listing.city, listing.state]
          .map((value) => normalizeSearchText(value))
          .join(" ");
        return haystack.includes(queryLower);
      })
      .filter((listing: GooglePlacesSearchResultEntry) => Boolean(listing));

    const results = [...realResults, ...googleResults].sort(sortCombinedSearchResults);
    const featuredCount = results.filter((r) => r.section === "featured").length;
    const nearbyCount = results.filter((r) => r.section === "nearby").length;
    const otherCount = results.filter((r) => r.section === "other").length;

    return {
      results,
      realListingsCount: realResults.length,
      googlePlacesCount: googleResults.length,
      total: raw.total + googleResults.length,
      page: raw.page,
      totalPages: Math.max(
        raw.totalPages,
        Math.ceil((raw.total + googleResults.length) /
          (typeof args.options?.limit === "number" ? args.options.limit : 20)),
      ),
      hasMore:
        raw.hasMore ||
        raw.page <
          Math.ceil((raw.total + googleResults.length) /
            (typeof args.options?.limit === "number" ? args.options.limit : 20)),
      featuredCount,
      nearbyCount,
      otherCount,
      radiusMiles,
    };
  },
});
