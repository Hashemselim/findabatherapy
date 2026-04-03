import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };

const PHOTO_LIMITS = {
  free: 3,
  pro: 10,
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
  return typeof value === "number" ? value : fallback;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

function getEffectivePlanTier(
  planTier: unknown,
  subscriptionStatus: unknown,
): "free" | "pro" {
  if (planTier !== "pro") {
    return "free";
  }

  return subscriptionStatus === "active" || subscriptionStatus === "trialing"
    ? "pro"
    : "free";
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
    system: {
      get(table: "_storage", id: string): Promise<ConvexDoc | null>;
    };
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
    };
    query(table: "listings"): {
      withIndex(
        index: "by_workspace",
        cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
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
    insert(table: "files", value: Record<string, unknown>): Promise<string>;
    patch(id: string, value: Record<string, unknown>): Promise<void>;
    delete(id: string): Promise<void>;
  };
  storage: {
    getUrl(storageId: string): Promise<string | null>;
    generateUploadUrl(): Promise<string>;
    delete(storageId: string): Promise<void>;
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

  return { user, workspace, listing };
}

async function getListingFiles(
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
  },
  listingId: string,
) {
  return ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "listings").eq("relatedId", listingId),
    )
    .collect();
}

function filterListingFilesByKind(files: ConvexDoc[], kind: "logo" | "photo") {
  return files.filter((file) => asRecord(file.metadata).kind === kind);
}

async function deleteFileRecords(
  ctx: {
    db: { delete(id: string): Promise<void> };
    storage: { delete(storageId: string): Promise<void> };
  },
  files: ConvexDoc[],
) {
  for (const file of files) {
    if (typeof file.storageId === "string") {
      await ctx.storage.delete(asId<"_storage">(file.storageId));
    }
    await ctx.db.delete(asId<"files">(file._id));
  }
}

async function createFileRecord(
  ctx: {
    db: {
      insert(table: "files", value: Record<string, unknown>): Promise<string>;
      system: {
        get(table: "_storage", id: string): Promise<ConvexDoc | null>;
      };
    };
  },
  args: {
    workspaceId: string;
    listingId: string;
    storageId: string;
    bucket: string;
    storageKey: string;
    filename: string;
    mimeType: string;
    byteSize: number;
    visibility: "public" | "private";
    metadata: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();
  const storageDoc = await ctx.db.system.get("_storage", asId<"_storage">(args.storageId));

  const fileId = await ctx.db.insert("files", {
    workspaceId: asId<"workspaces">(args.workspaceId),
    storageId: asId<"_storage">(args.storageId),
    bucket: args.bucket,
    storageKey: args.storageKey,
    filename: args.filename,
    mimeType: readString(storageDoc?.contentType) ?? args.mimeType,
    byteSize:
      typeof storageDoc?.size === "number" ? storageDoc.size : args.byteSize,
    visibility: args.visibility,
    relatedTable: "listings",
    relatedId: args.listingId,
    metadata: args.metadata,
    createdAt: now,
    updatedAt: now,
  });

  return fileId;
}

export const generateUploadUrl = mutationGeneric({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCurrentWorkspaceContext(ctx as never);
    return ctx.storage.generateUploadUrl();
  },
});

export const discardUpload = mutationGeneric({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCurrentWorkspaceContext(ctx as never);
    await ctx.storage.delete(asId<"_storage">(args.storageId));
    return { success: true };
  },
});

export const saveListingLogo = mutationGeneric({
  args: {
    storageId: v.string(),
    storageKey: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const existingFiles = await getListingFiles(ctx as never, listing._id);
    const existingLogos = filterListingFilesByKind(existingFiles, "logo");
    const fileId = await createFileRecord(ctx as never, {
      workspaceId: workspace._id,
      listingId: listing._id,
      storageId: args.storageId,
      bucket: "listing-logos",
      storageKey: args.storageKey,
      filename: args.filename,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "public",
      metadata: { kind: "logo" },
    });

    const logoUrl = await ctx.storage.getUrl(asId<"_storage">(args.storageId));
    await ctx.db.patch(asId<"listings">(listing._id), {
      updatedAt: new Date().toISOString(),
    });

    await deleteFileRecords(ctx as never, existingLogos);

    return {
      id: fileId,
      url: logoUrl,
      listingSlug: readString(listing.slug),
    };
  },
});

export const deleteListingLogo = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const existingFiles = await getListingFiles(ctx as never, listing._id);
    const existingLogos = filterListingFilesByKind(existingFiles, "logo");
    await deleteFileRecords(ctx as never, existingLogos);
    await ctx.db.patch(asId<"listings">(listing._id), {
      updatedAt: new Date().toISOString(),
    });

    return { listingSlug: readString(listing.slug) };
  },
});

export const getListingPhotos = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const files = filterListingFilesByKind(
      await getListingFiles(ctx as never, listing._id),
      "photo",
    ).sort(
      (a, b) =>
        readNumber(asRecord(a.metadata).sortOrder, 0) -
        readNumber(asRecord(b.metadata).sortOrder, 0),
    );

    const photos = await Promise.all(
      files.map(async (file) => ({
        id: file._id,
        url:
          typeof file.storageId === "string"
            ? await ctx.storage.getUrl(asId<"_storage">(file.storageId))
            : null,
        order: readNumber(asRecord(file.metadata).sortOrder, 0),
      })),
    );

    return photos.filter(
      (photo): photo is { id: string; url: string; order: number } =>
        typeof photo.url === "string" && photo.url.length > 0,
    );
  },
});

export const saveListingPhoto = mutationGeneric({
  args: {
    storageId: v.string(),
    storageKey: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const existingPhotos = filterListingFilesByKind(
      await getListingFiles(ctx as never, listing._id),
      "photo",
    );
    const effectiveTier = getEffectivePlanTier(
      workspace.planTier,
      workspace.subscriptionStatus,
    );
    const photoLimit = PHOTO_LIMITS[effectiveTier];

    if (existingPhotos.length >= photoLimit) {
      throw new ConvexError(
        `Maximum ${photoLimit} photos allowed. Please delete an existing photo first.`,
      );
    }

    const sortOrder =
      existingPhotos.reduce(
        (maxOrder, photo) =>
          Math.max(maxOrder, readNumber(asRecord(photo.metadata).sortOrder, -1)),
        -1,
      ) + 1;

    const fileId = await createFileRecord(ctx as never, {
      workspaceId: workspace._id,
      listingId: listing._id,
      storageId: args.storageId,
      bucket: "listing-photos",
      storageKey: args.storageKey,
      filename: args.filename,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "public",
      metadata: { kind: "photo", sortOrder },
    });

    const url = await ctx.storage.getUrl(asId<"_storage">(args.storageId));
    await ctx.db.patch(asId<"listings">(listing._id), {
      updatedAt: new Date().toISOString(),
    });

    return {
      id: fileId,
      url,
      order: sortOrder,
      listingSlug: readString(listing.slug),
    };
  },
});

export const deleteListingPhoto = mutationGeneric({
  args: {
    photoId: v.string(),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const photo = await ctx.db.get(asId<"files">(args.photoId));
    if (!photo || photo.relatedId !== listing._id) {
      throw new ConvexError("Photo not found");
    }

    if (asRecord(photo.metadata).kind !== "photo") {
      throw new ConvexError("Photo not found");
    }

    await deleteFileRecords(ctx as never, [photo]);

    const remainingPhotos = filterListingFilesByKind(
      await getListingFiles(ctx as never, listing._id),
      "photo",
    ).sort(
      (a, b) =>
        readNumber(asRecord(a.metadata).sortOrder, 0) -
        readNumber(asRecord(b.metadata).sortOrder, 0),
    );

    for (const [index, file] of remainingPhotos.entries()) {
      await ctx.db.patch(asId<"files">(file._id), {
        metadata: {
          ...asRecord(file.metadata),
          sortOrder: index,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    await ctx.db.patch(asId<"listings">(listing._id), {
      updatedAt: new Date().toISOString(),
    });

    return { listingSlug: readString(listing.slug) };
  },
});

export const reorderListingPhotos = mutationGeneric({
  args: {
    photoIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const listingPhotos = filterListingFilesByKind(
      await getListingFiles(ctx as never, listing._id),
      "photo",
    );
    const validPhotoIds = new Set(listingPhotos.map((photo) => photo._id));

    for (const [index, photoId] of args.photoIds.entries()) {
      if (!validPhotoIds.has(photoId)) {
        continue;
      }

      const file = listingPhotos.find((photo) => photo._id === photoId);
      if (!file) {
        continue;
      }

      await ctx.db.patch(asId<"files">(file._id), {
        metadata: {
          ...asRecord(file.metadata),
          sortOrder: index,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    await ctx.db.patch(asId<"listings">(listing._id), {
      updatedAt: new Date().toISOString(),
    });

    return { success: true, listingSlug: readString(listing.slug) };
  },
});

export const updateListingVideoUrl = mutationGeneric({
  args: {
    videoUrl: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const effectiveTier = getEffectivePlanTier(
      workspace.planTier,
      workspace.subscriptionStatus,
    );
    if (effectiveTier === "free" && args.videoUrl) {
      throw new ConvexError(
        "Video embed is a premium feature. Please upgrade your plan.",
      );
    }

    await ctx.db.patch(asId<"listings">(listing._id), {
      metadata: {
        ...asRecord(listing.metadata),
        videoUrl: args.videoUrl,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true, listingSlug: readString(listing.slug) };
  },
});

export const getListingVideoUrl = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    return readString(asRecord(listing.metadata).videoUrl);
  },
});

// ---------------------------------------------------------------------------
// Social asset storage
// ---------------------------------------------------------------------------

function filterSocialFiles(
  files: ConvexDoc[],
  kind: "social-post" | "social-manifest",
  brandHash?: string,
) {
  return files.filter((file) => {
    if (readString(file.bucket) !== "social-posts") return false;
    const meta = asRecord(file.metadata);
    if (readString(meta.kind) !== kind) return false;
    if (brandHash !== undefined && readString(meta.brandHash) !== brandHash) return false;
    return true;
  });
}

export const getSocialAssetsStatus = queryGeneric({
  args: {
    brandHash: v.string(),
  },
  handler: async (ctx, args: { brandHash: string }) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const files = await getListingFiles(ctx as never, listing._id);
    const posts = filterSocialFiles(files, "social-post", args.brandHash);
    const manifests = filterSocialFiles(files, "social-manifest", args.brandHash);

    return {
      ready: manifests.length > 0,
      generating: false,
      brandHash: args.brandHash,
      assetCount: posts.length,
    };
  },
});

export const saveSocialAsset = mutationGeneric({
  args: {
    storageId: v.string(),
    templateId: v.string(),
    brandHash: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  handler: async (
    ctx,
    args: {
      storageId: string;
      templateId: string;
      brandHash: string;
      mimeType: string;
      byteSize: number;
    },
  ) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const fileId = await createFileRecord(ctx as never, {
      workspaceId: workspace._id,
      listingId: listing._id,
      storageId: args.storageId,
      bucket: "social-posts",
      storageKey: `social/${args.brandHash}/${args.templateId}.png`,
      filename: `${args.templateId}.png`,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "public",
      metadata: { kind: "social-post", templateId: args.templateId, brandHash: args.brandHash },
    });

    return { id: fileId };
  },
});

export const saveSocialManifest = mutationGeneric({
  args: {
    brandHash: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args: { brandHash: string; count: number }) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const files = await getListingFiles(ctx as never, listing._id);

    // Delete existing manifests for this listing
    const oldManifests = filterSocialFiles(files, "social-manifest");
    await deleteFileRecords(ctx as never, oldManifests);

    // Delete old social-post files with a different brandHash
    const stalePosts = files.filter((file) => {
      if (readString(file.bucket) !== "social-posts") return false;
      const meta = asRecord(file.metadata);
      if (readString(meta.kind) !== "social-post") return false;
      return readString(meta.brandHash) !== args.brandHash;
    });
    await deleteFileRecords(ctx as never, stalePosts);

    // Create manifest record (no actual file blob — use a dummy storageKey)
    const now = new Date().toISOString();
    await ctx.db.insert("files", {
      workspaceId: asId<"workspaces">(workspace._id),
      bucket: "social-posts",
      storageKey: `social/${args.brandHash}/manifest.json`,
      filename: "manifest.json",
      mimeType: "application/json",
      byteSize: 0,
      visibility: "private" as const,
      relatedTable: "listings",
      relatedId: listing._id,
      metadata: {
        kind: "social-manifest",
        brandHash: args.brandHash,
        count: args.count,
        generatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const cleanupOldSocialAssets = mutationGeneric({
  args: {
    currentBrandHash: v.string(),
  },
  handler: async (ctx, args: { currentBrandHash: string }) => {
    const { listing } = await requireCurrentWorkspaceContext(ctx as never);
    if (!listing) {
      throw new ConvexError("Listing not found");
    }

    const files = await getListingFiles(ctx as never, listing._id);
    const staleFiles = files.filter((file) => {
      if (readString(file.bucket) !== "social-posts") return false;
      const meta = asRecord(file.metadata);
      const kind = readString(meta.kind);
      if (kind !== "social-post" && kind !== "social-manifest") return false;
      return readString(meta.brandHash) !== args.currentBrandHash;
    });

    await deleteFileRecords(ctx as never, staleFiles);

    return { deleted: staleFiles.length };
  },
});
