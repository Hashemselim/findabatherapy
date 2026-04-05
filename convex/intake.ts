import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;

const CLIENT_DOCUMENT_UPLOAD_TOKEN_TYPE = "client_document_upload";
const CLIENT_INTAKE_TOKEN_TYPE = "client_intake";
const CLIENT_DOCUMENT_LIMIT = 50;
const INTERNAL_TEST_EMAIL_DOMAIN = "@test.findabatherapy.com";
const CLIENT_INTAKE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const intakeFieldConfigValidator = v.object({
  enabled: v.boolean(),
  required: v.boolean(),
});

const intakeFieldsConfigValidator = v.record(
  v.string(),
  intakeFieldConfigValidator,
);

const intakeFormSettingsUpdateValidator = v.object({
  background_color: v.optional(v.string()),
  show_powered_by: v.optional(v.boolean()),
  instructions: v.optional(v.string()),
  enabled: v.optional(v.boolean()),
  fields: v.optional(intakeFieldsConfigValidator),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function now() {
  return new Date().toISOString();
}

function createTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

function isInternalTestEmail(email: string | null) {
  return email?.trim().toLowerCase().endsWith(INTERNAL_TEST_EMAIL_DOMAIN) ?? false;
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

async function getPublishedListingBySlug(
  ctx: ConvexCtx,
  slug: string,
) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .collect();

  const listing = (listings as ConvexDoc[]).find(
    (row) => readString(row.status) === "published",
  );
  if (!listing) {
    return null;
  }

  const workspace = await ctx.db.get(asId<"workspaces">(String(listing.workspaceId)));
  if (!workspace || isInternalTestEmail(readString(workspace.contactEmail))) {
    return null;
  }

  return {
    listing,
    workspace: workspace as ConvexDoc,
  };
}

function buildPublicIntakeSettings(workspace: ConvexDoc) {
  const settings = asRecord(workspace.settings);
  const intakeSettings = asRecord(settings.intakeFormSettings);

  return {
    background_color: readString(intakeSettings.background_color) ?? "#0866FF",
    show_powered_by: readBoolean(intakeSettings.show_powered_by, true),
    fields: settings.intake
      ? asRecord(settings.intake).fields ?? undefined
      : undefined,
  };
}

function isPremiumWorkspace(workspace: ConvexDoc) {
  const planTier = readString(workspace.planTier) ?? "free";
  const subscriptionStatus = readString(workspace.subscriptionStatus);
  return (
    planTier !== "free" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing")
  );
}

async function getTokenRowByToken(
  ctx: ConvexCtx,
  token: string,
) {
  const tokens = await ctx.db
    .query("intakeTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();

  return (tokens as ConvexDoc[])[0] ?? null;
}

async function requireValidClientDocumentUploadToken(ctx: ConvexCtx, token: string) {
  const tokenRow = await getTokenRowByToken(ctx, token);
  if (
    !tokenRow ||
    readString(tokenRow.subjectType) !== CLIENT_DOCUMENT_UPLOAD_TOKEN_TYPE ||
    !readString(tokenRow.subjectId)
  ) {
    throw new ConvexError("Invalid or expired document upload link");
  }

  if (tokenRow.expiresAt && new Date(String(tokenRow.expiresAt)) < new Date()) {
    throw new ConvexError("This document upload link has expired");
  }

  const clientId = readString(tokenRow.subjectId);
  const client = clientId
    ? await ctx.db.get(asId<"crmRecords">(clientId))
    : null;
  if (
    !client ||
    client.recordType !== "client" ||
    client.deletedAt ||
    String(client.workspaceId) !== String(tokenRow.workspaceId)
  ) {
    throw new ConvexError("Invalid or expired document upload link");
  }

  return {
    tokenRow,
    client,
    workspaceId: String(tokenRow.workspaceId),
    clientId: client._id,
  };
}

async function getPublicClientDocuments(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const rows = await ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", "client_document"),
    )
    .collect();

  return rows
    .filter((row) => {
      if (row.deletedAt) return false;
      const relatedIds = asRecord(row.relatedIds);
      return readString(relatedIds.clientId) === clientId;
    })
    .sort(
      (a, b) =>
        new Date(readString(b.createdAt) ?? 0).getTime() -
        new Date(readString(a.createdAt) ?? 0).getTime(),
    );
}

function mapPublicClientDocument(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    label: readString(payload.label) ?? readString(payload.filename),
    documentType:
      readString(payload.documentType) ?? readString(payload.category) ?? null,
    fileName: readString(payload.filename),
    fileSize: typeof payload.byteSize === "number" ? payload.byteSize : null,
    createdAt: readString(row.createdAt) ?? now(),
  };
}

/* ------------------------------------------------------------------ */
/*  getContactPageData - public (no auth): listing data by slug       */
/* ------------------------------------------------------------------ */
export const getContactPageData = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const listing = (listings as ConvexDoc[])[0];
    if (!listing) {
      return null;
    }

    const workspace = await ctx.db.get(asId<"workspaces">(String(listing.workspaceId)));
    if (!workspace) {
      return null;
    }

    const metadata = asRecord(listing.metadata);
    const settings = asRecord((workspace as unknown as ConvexDoc).settings);
    const branding = asRecord(settings.branding);

    return {
      listingId: listing._id,
      workspaceId: String(listing.workspaceId),
      slug: readString(listing.slug) ?? "",
      agencyName: readString((workspace as unknown as ConvexDoc).agencyName) ?? "",
      contactEmail: readString((workspace as unknown as ConvexDoc).contactEmail),
      phone: readString(metadata.phone),
      address: readString(metadata.address),
      logoUrl: readString(branding.logoUrl),
      description: readString(metadata.description),
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getClientIntakePageData - public (no auth): intake form by slug   */
/* ------------------------------------------------------------------ */
export const getClientIntakePageData = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getPublishedListingBySlug(ctx, args.slug);
    if (!row) {
      return null;
    }

    const { listing, workspace } = row;
    const metadata = asRecord(listing.metadata);
    const settings = asRecord(workspace.settings);
    const branding = asRecord(settings.branding);
    const clientIntakeEnabled = isPremiumWorkspace(workspace)
      ? readBoolean(metadata.clientIntakeEnabled, false)
      : false;

    return {
      listing: {
        id: listing._id,
        slug: readString(listing.slug) ?? "",
        logoUrl: readString(branding.logoUrl) ?? readString(metadata.logoUrl),
        clientIntakeEnabled,
        profileId: String(listing.workspaceId),
      },
      profile: {
        agencyName: readString(workspace.agencyName) ?? "",
        website: readString(settings.website),
        planTier: readString(workspace.planTier) ?? "free",
        subscriptionStatus: readString(workspace.subscriptionStatus),
        intakeFormSettings: buildPublicIntakeSettings(workspace),
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/*  getClientResourcesPageData - public (no auth): resources by slug  */
/* ------------------------------------------------------------------ */
export const getClientResourcesPageData = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getPublishedListingBySlug(ctx, args.slug);
    if (!row) {
      return null;
    }

    const { listing, workspace } = row;
    const settings = asRecord(workspace.settings);
    const branding = asRecord(settings.branding);

    return {
      listing: {
        id: listing._id,
        slug: readString(listing.slug) ?? "",
        logoUrl:
          readString(branding.logoUrl) ?? readString(asRecord(listing.metadata).logoUrl),
      },
      profile: {
        agencyName: readString(workspace.agencyName) ?? "",
        website: readString(settings.website),
        planTier: readString(workspace.planTier) ?? "free",
        subscriptionStatus: readString(workspace.subscriptionStatus),
        intakeFormSettings: buildPublicIntakeSettings(workspace),
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/*  createIntakeToken                                                 */
/* ------------------------------------------------------------------ */
export const createIntakeToken = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !client ||
      client.recordType !== "client" ||
      client.deletedAt ||
      String(client.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Client not found");
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )
      .collect();
    const listing =
      listings.find((row) => row.status === "published" && !row.deletedAt) ??
      listings.find((row) => !row.deletedAt) ??
      null;
    const slug = readString(listing?.slug);
    if (!slug) {
      throw new ConvexError("No published listing found");
    }

    let token = createTokenValue();
    while (await getTokenRowByToken(ctx, token)) {
      token = createTokenValue();
    }

    const ts = now();
    await ctx.db.insert("intakeTokens", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: CLIENT_INTAKE_TOKEN_TYPE,
      subjectId: args.clientId,
      token,
      expiresAt: new Date(Date.now() + CLIENT_INTAKE_TOKEN_TTL_MS).toISOString(),
      payload: {},
      createdAt: ts,
      updatedAt: ts,
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
    return {
      token,
      url: `${origin}/intake/${slug}/client?token=${token}`,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  createClientDocumentUploadToken                                   */
/* ------------------------------------------------------------------ */
export const createClientDocumentUploadToken = mutation({
  args: {
    clientId: v.string(),
    token: v.string(),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !client ||
      client.recordType !== "client" ||
      client.deletedAt ||
      String(client.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Client not found");
    }

    const existingTokens = await ctx.db
      .query("intakeTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    if (existingTokens.length > 0) {
      throw new ConvexError("Failed to create document upload link");
    }

    const ts = now();
    const id = await ctx.db.insert("intakeTokens", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: CLIENT_DOCUMENT_UPLOAD_TOKEN_TYPE,
      subjectId: args.clientId,
      token: args.token,
      expiresAt:
        args.expiresAt ??
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      payload: {},
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  getIntakeTokenData - public (no auth): validate and return token  */
/* ------------------------------------------------------------------ */
export const getIntakeTokenData = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("intakeTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();

    const tokenRow = (tokens as ConvexDoc[])[0];
    if (!tokenRow) {
      return null;
    }

    const tokenPayload = asRecord(tokenRow.payload);
    const isExpired =
      tokenRow.expiresAt && new Date(String(tokenRow.expiresAt)) < new Date();
    const isUsed = !!tokenPayload.usedAt;

    return {
      id: tokenRow._id,
      workspaceId: String(tokenRow.workspaceId),
      subjectType: readString(tokenRow.subjectType) ?? "",
      subjectId: readString(tokenRow.subjectId),
      isValid: !isExpired && !isUsed,
      isExpired: !!isExpired,
      isUsed,
      payload: tokenPayload,
      createdAt: readString(tokenRow.createdAt),
    };
  },
});

/* ------------------------------------------------------------------ */
/*  markIntakeTokenUsed                                               */
/* ------------------------------------------------------------------ */
export const markIntakeTokenUsed = mutation({
  args: {
    tokenId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(asId<"intakeTokens">(args.tokenId));
    if (!row) {
      throw new ConvexError("Token not found");
    }

    const payload = asRecord(row.payload);
    await ctx.db.patch(asId<"intakeTokens">(row._id), {
      payload: { ...payload, usedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getClientDocumentUploadTokenData - public document page           */
/* ------------------------------------------------------------------ */
export const getClientDocumentUploadTokenData = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { client, workspaceId, clientId } =
      await requireValidClientDocumentUploadToken(ctx, args.token);
    const payload = asRecord(client.payload);
    const documents = await getPublicClientDocuments(
      ctx,
      workspaceId,
      clientId,
    );

    return {
      clientId,
      profileId: workspaceId,
      workspaceId,
      clientName:
        [
          readString(payload.firstName),
          readString(payload.lastName),
        ]
          .filter(Boolean)
          .join(" ") || "your child",
      uploadedDocuments: documents.map(mapPublicClientDocument),
    };
  },
});

/* ------------------------------------------------------------------ */
/*  generateClientDocumentUploadUrl - public token-scoped upload URL  */
/* ------------------------------------------------------------------ */
export const generateClientDocumentUploadUrl = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireValidClientDocumentUploadToken(ctx, args.token);
    return ctx.storage.generateUploadUrl();
  },
});

/* ------------------------------------------------------------------ */
/*  submitPublicClientDocumentUpload                                  */
/* ------------------------------------------------------------------ */
export const submitPublicClientDocumentUpload = mutation({
  args: {
    token: v.string(),
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    label: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    fileDescription: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId, clientId } =
      await requireValidClientDocumentUploadToken(ctx, args.token);

    const existingDocuments = await getPublicClientDocuments(
      ctx,
      workspaceId,
      clientId,
    );
    if (existingDocuments.length >= CLIENT_DOCUMENT_LIMIT) {
      throw new ConvexError(
        `Document limit reached (${CLIENT_DOCUMENT_LIMIT} per client). Please contact the provider for help.`,
      );
    }

    const ts = now();
    const fileId = await ctx.db.insert("files", {
      workspaceId: asId<"workspaces">(workspaceId),
      storageId: asId<"_storage">(args.storageId),
      bucket: "client-documents",
      storageKey: `clients/${clientId}/${args.filename}`,
      filename: args.filename,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "private",
      relatedTable: "crmRecords",
      relatedId: clientId,
      createdAt: ts,
      updatedAt: ts,
    });

    const documentId = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client_document",
      payload: {
        fileId: String(fileId),
        filename: args.filename,
        mimeType: args.mimeType,
        byteSize: args.byteSize,
        label: args.label ?? args.filename,
        category: args.category ?? null,
        documentType: args.category ?? null,
        fileDescription: args.fileDescription ?? null,
        notes: args.notes ?? null,
        uploadSource: "intake_form",
      },
      relatedIds: { clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    return { id: documentId };
  },
});

/* ------------------------------------------------------------------ */
/*  updateIntakeFormSettings                                          */
/* ------------------------------------------------------------------ */
export const updateIntakeFormSettings = mutation({
  args: {
    settings: intakeFormSettingsUpdateValidator,
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    const settings = asRecord(workspace.settings);
    const intake = asRecord(settings.intake);
    const intakeSettings = asRecord(settings.intakeFormSettings);
    const updates = args.settings;

    const updatedIntake = {
      ...intake,
      ...(updates.instructions !== undefined
        ? { instructions: updates.instructions }
        : {}),
      ...(updates.fields !== undefined ? { fields: updates.fields } : {}),
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
    };

    await ctx.db.patch(asId<"workspaces">(workspaceId), {
      settings: {
        ...settings,
        intake: updatedIntake,
        intakeFormSettings: {
          ...intakeSettings,
          ...(updates.background_color !== undefined
            ? { background_color: updates.background_color }
            : {}),
          ...(updates.show_powered_by !== undefined
            ? { show_powered_by: updates.show_powered_by }
            : {}),
        },
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getIntakeFieldsConfig                                             */
/* ------------------------------------------------------------------ */
export const getIntakeFieldsConfig = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    const settings = asRecord(workspace.settings);
    const intake = asRecord(settings.intake);

    return {
      fields: intake.fields ?? null,
      instructions: readString(intake.instructions),
      enabled: intake.enabled ?? false,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  updateIntakeFieldsConfig                                          */
/* ------------------------------------------------------------------ */
export const updateIntakeFieldsConfig = mutation({
  args: {
    fieldsConfig: intakeFieldsConfigValidator,
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    const settings = asRecord(workspace.settings);
    const intake = asRecord(settings.intake);

    await ctx.db.patch(asId<"workspaces">(workspaceId), {
      settings: {
        ...settings,
        intake: { ...intake, fields: args.fieldsConfig },
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getPublicAgencyLocations - public (no auth): locations by slug    */
/* ------------------------------------------------------------------ */
export const getPublicAgencyLocations = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const listing = (listings as ConvexDoc[])[0];
    if (!listing) {
      return [];
    }

    const locations = await ctx.db
      .query("locations")
      .withIndex("by_listing", (q) =>
        q.eq("listingId", asId<"listings">(listing._id)),
      )
      .collect();

    return (locations as ConvexDoc[])
      .filter((loc) => loc.status !== "archived")
      .map((loc) => {
        const metadata = asRecord(loc.metadata);
        return {
          id: loc._id,
          slug: readString(loc.slug),
          name: readString(metadata.name) ?? "",
          address: readString(metadata.address),
          city: readString(metadata.city),
          state: readString(metadata.state),
          zip: readString(metadata.zip),
          phone: readString(metadata.phone),
          lat: metadata.lat ?? null,
          lng: metadata.lng ?? null,
        };
      });
  },
});
