import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type ConvexDoc = Record<string, unknown> & { _id: string };
type ConvexCtx = QueryCtx | MutationCtx;
type AgreementLinkType = "generic" | "assigned";

const AGREEMENT_LINK_TOKEN_TYPE = "agreement_link";
const ASSIGNED_AGREEMENT_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const agreementSettingsValidator = v.object({
  requireSignature: v.optional(v.boolean()),
  notifyOnSubmission: v.optional(v.boolean()),
  expiresInDays: v.optional(v.union(v.number(), v.null())),
});

const agreementFormDataValidator = v.record(
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getWorkspacePacketRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("agreementPackets")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function getPacketArtifactRows(
  ctx: ConvexCtx,
  packetId: string,
) {
  return ctx.db
    .query("agreementArtifacts")
    .withIndex("by_packet", (q) =>
      q.eq("packetId", asId<"agreementPackets">(packetId)),
    )
    .collect();
}

async function getPublishedListingForWorkspace(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();

  return (
    listings.find((listing) => listing.status === "published" && !listing.deletedAt) ??
    null
  );
}

function buildPublicBrandingSettings(workspace: ConvexDoc) {
  const settings = asRecord(workspace.settings);
  const intakeSettings = asRecord(settings.intakeFormSettings);

  return {
    background_color: readString(intakeSettings.background_color) ?? "#0866FF",
    show_powered_by:
      typeof intakeSettings.show_powered_by === "boolean"
        ? intakeSettings.show_powered_by
        : true,
  };
}

async function getAgreementLinkTokenRow(
  ctx: ConvexCtx,
  token: string,
) {
  const tokens = await ctx.db
    .query("intakeTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();

  const tokenRow = (tokens as ConvexDoc[])[0] ?? null;
  if (
    !tokenRow ||
    readString(tokenRow.subjectType) !== AGREEMENT_LINK_TOKEN_TYPE ||
    !readString(tokenRow.subjectId)
  ) {
    return null;
  }

  return tokenRow;
}

async function validateAgreementLinkToken(params: {
  ctx: ConvexCtx;
  token: string;
  packetId: string;
}) {
  const tokenRow = await getAgreementLinkTokenRow(params.ctx, params.token);
  if (!tokenRow) {
    throw new ConvexError("This agreement link is invalid.");
  }

  const payload = asRecord(tokenRow.payload);
  const payloadPacketId = readString(payload.packetId) ?? readString(tokenRow.subjectId);
  if (payloadPacketId !== params.packetId) {
    throw new ConvexError("This agreement link is invalid.");
  }

  if (tokenRow.expiresAt && new Date(String(tokenRow.expiresAt)) < new Date()) {
    throw new ConvexError("This agreement link has expired.");
  }

  const reusable = payload.reusable !== false;
  if (!reusable && readString(payload.usedAt)) {
    throw new ConvexError("This agreement link has already been used.");
  }
  const linkType: AgreementLinkType =
    readString(payload.linkType) === "assigned" ? "assigned" : "generic";

  return {
    tokenRow,
    linkType,
    clientId: readString(payload.clientId),
    reusable,
  };
}

async function ensureUniqueSlug(
  ctx: ConvexCtx,
  title: string,
  excludeId?: string,
) {
  const base = slugify(title) || "agreement-packet";
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await ctx.db
      .query("agreementPackets")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .collect();
    const conflict = rows.find(
      (row) => !row.deletedAt && row._id !== excludeId,
    );
    if (!conflict) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function mapPacket(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const settings = asRecord(payload.settings);
  return {
    id: row._id,
    workspaceId: String(row.workspaceId),
    slug: readString(row.slug),
    status: readString(row.status) ?? "draft",
    title: readString(payload.title) ?? "",
    description: readString(payload.description),
    documents: asArray(payload.documents),
    settings: {
      requireSignature: settings.requireSignature === true,
      notifyOnSubmission: settings.notifyOnSubmission === true,
      expiresInDays:
        typeof settings.expiresInDays === "number"
          ? settings.expiresInDays
          : null,
    },
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
    deletedAt: readString(row.deletedAt),
  };
}

function mapArtifact(row: ConvexDoc) {
  return {
    id: row._id,
    workspaceId: String(row.workspaceId),
    packetId: row.packetId ? String(row.packetId) : null,
    versionId: readString(row.versionId),
    submissionId: readString(row.submissionId),
    fileId: row.fileId ? String(row.fileId) : null,
    artifactType: readString(row.artifactType) ?? "document",
    payload: asRecord(row.payload),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
  };
}

function formatClientName(payload: Record<string, unknown>) {
  return [readString(payload.firstName), readString(payload.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getAgreementDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    const listingRows = await ctx.db
      .query("listings")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )
      .collect();
    const listing =
      listingRows.find((row) => row.status === "published" && !row.deletedAt) ??
      listingRows.find((row) => !row.deletedAt) ??
      null;

    const clientRows = await ctx.db
      .query("crmRecords")
      .withIndex("by_workspace_and_type", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)).eq("recordType", "client"),
      )
      .collect();
    const clients = clientRows
      .filter((row) => !row.deletedAt)
      .map((row) => {
        const payload = asRecord(row.payload);
        return {
          id: String(row._id),
          name: formatClientName(payload) || "Unnamed Client",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const clientNameById = new Map(clients.map((client) => [client.id, client.name]));

    const packetRows = await getWorkspacePacketRows(ctx, workspaceId);
    const activePackets = packetRows
      .filter((row) => !row.deletedAt)
      .sort(
        (a, b) =>
          new Date(readString(b.updatedAt) ?? 0).getTime() -
          new Date(readString(a.updatedAt) ?? 0).getTime(),
      );

    const packets = [];
    const submissions = [];

    for (const row of activePackets) {
      const packet = mapPacket(row as unknown as ConvexDoc);
      const artifactRows = await getPacketArtifactRows(ctx, row._id);
      const documentArtifacts = artifactRows
        .filter((artifact) => artifact.artifactType === "document" && !artifact.deletedAt)
        .sort((a, b) => {
          const aPayload = asRecord(a.payload);
          const bPayload = asRecord(b.payload);
          const aOrder =
            typeof aPayload.sortOrder === "number" ? aPayload.sortOrder : 0;
          const bOrder =
            typeof bPayload.sortOrder === "number" ? bPayload.sortOrder : 0;
          return aOrder - bOrder;
        });

      const documents = [];
      for (const [index, artifact] of documentArtifacts.entries()) {
        const payload = asRecord(artifact.payload);
        const file = artifact.fileId
          ? await ctx.db.get(asId<"files">(String(artifact.fileId)))
          : null;
        documents.push({
          id: String(artifact._id),
          packet_id: String(row._id),
          packet_version_id: row.status === "published" ? String(row._id) : undefined,
          label: readString(payload.title),
          description: readString(payload.description),
          file_name: readString(file?.filename) ?? "document.pdf",
          file_path: readString(file?.storageKey) ?? "",
          file_size: typeof file?.byteSize === "number" ? file.byteSize : 0,
          file_type: readString(file?.mimeType) ?? "application/pdf",
          sha256: readString(asRecord(file?.metadata).sha256) ?? "",
          sort_order:
            typeof payload.sortOrder === "number" ? payload.sortOrder : index + 1,
          created_at: readString(artifact.createdAt) ?? undefined,
          deleted_at: readString(artifact.deletedAt),
        });
      }

      packets.push({
        id: String(row._id),
        title: packet.title,
        description: packet.description,
        slug: packet.slug ?? "",
        created_at: packet.createdAt,
        updated_at: packet.updatedAt,
        latest_version_id: row.status === "published" ? String(row._id) : null,
        latest_version_number: row.status === "published" ? 1 : null,
        latest_published_at:
          row.status === "published" ? readString(row.updatedAt) ?? readString(row.createdAt) : null,
        documents,
        versions:
          row.status === "published"
            ? [{
                id: String(row._id),
                version_number: 1,
                published_at: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
              }]
            : [],
      });

      const submissionArtifacts = artifactRows
        .filter((artifact) => artifact.artifactType === "submission" && !artifact.deletedAt)
        .sort(
          (a, b) =>
            new Date(readString(b.createdAt) ?? 0).getTime() -
            new Date(readString(a.createdAt) ?? 0).getTime(),
        );

      for (const artifact of submissionArtifacts) {
        const payload = asRecord(artifact.payload);
        const clientId = readString(payload.clientId);
        const file = artifact.fileId
          ? await ctx.db.get(asId<"files">(String(artifact.fileId)))
          : null;
        submissions.push({
          id: String(artifact._id),
          packet_id: String(row._id),
          packet_title: packet.title,
          packet_version_number: 1,
          client_id: clientId,
          client_name:
            (clientId ? clientNameById.get(clientId) : null) ??
            readString(payload.clientName) ??
            "Unlinked Client",
          signer_name: readString(payload.signerName) ?? "",
          submitted_at: readString(payload.signedAt) ?? readString(artifact.createdAt) ?? new Date().toISOString(),
          link_type: readString(payload.linkType) === "assigned" ? "assigned" : "generic",
          status: clientId ? "linked" : "unlinked",
          signed_pdf_path: readString(file?.storageKey) ?? "",
          linked_client_label: clientId ? clientNameById.get(clientId) ?? null : null,
        });
      }
    }

    return {
      listing: {
        slug: readString(listing?.slug),
        logoUrl: readString(asRecord(listing?.metadata).logoUrl),
        profileId: workspaceId,
      },
      profile: {
        agencyName: readString(workspace.agencyName) ?? "Your Agency",
        website: readString(asRecord(workspace.settings).website),
        planTier: readString(workspace.planTier) ?? "free",
        subscriptionStatus: readString(workspace.subscriptionStatus),
        intakeFormSettings: buildPublicBrandingSettings(workspace as ConvexDoc),
      },
      packets,
      submissions,
      clients,
    };
  },
});

export const getAgreementPackets = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspacePacketRows(ctx, workspaceId);

    return rows
      .filter((row) => !row.deletedAt)
      .filter((row) => !args.status || row.status === args.status)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      )
      .map(mapPacket);
  },
});

export const getAgreementPacketById = query({
  args: {
    packetId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      return null;
    }

    const artifactRows = await getPacketArtifactRows(ctx, args.packetId);
    const artifacts = artifactRows
      .filter((row) => !row.deletedAt)
      .map(mapArtifact);

    return {
      ...mapPacket(packet as unknown as ConvexDoc),
      artifacts,
    };
  },
});

export const getAgreementPublicPageData = query({
  args: {
    providerSlug: v.string(),
    packetSlug: v.string(),
    token: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const listingRows = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", args.providerSlug))
      .collect();
    const listing = listingRows.find(
      (row) => row.status === "published" && !row.deletedAt,
    );
    if (!listing) {
      return null;
    }

    const workspace = await ctx.db.get(
      asId<"workspaces">(String(listing.workspaceId)),
    );
    if (!workspace) {
      return null;
    }

    const rows = await ctx.db
      .query("agreementPackets")
      .withIndex("by_slug", (q) => q.eq("slug", args.packetSlug))
      .collect();

    const packet = rows.find(
      (row: ConvexDoc) =>
        row.status === "published" &&
        !row.deletedAt &&
        String(row.workspaceId) === String(listing.workspaceId),
    ) as ConvexDoc | undefined;

    if (!packet) {
      return null;
    }

    const artifactRows = await getPacketArtifactRows(
      ctx,
      packet._id,
    );
    const documents = artifactRows
      .filter((row) => row.artifactType === "document" && !row.deletedAt)
      .map(mapArtifact);

    const payload = asRecord(packet.payload);
    let link: {
      token: string | null;
      type: AgreementLinkType;
      clientNamePrefill: string;
    } = {
      token: args.token ?? null,
      type: "generic",
      clientNamePrefill: "",
    };

    if (args.token) {
      const validatedToken = await validateAgreementLinkToken({
        ctx,
        token: args.token,
        packetId: packet._id,
      });

      let clientNamePrefill = "";
      if (validatedToken.clientId) {
        const client = await ctx.db.get(
          asId<"crmRecords">(validatedToken.clientId),
        );
        const clientPayload = asRecord(client?.payload);
        clientNamePrefill = [
          readString(clientPayload.firstName),
          readString(clientPayload.lastName),
        ]
          .filter(Boolean)
          .join(" ");
      }

      link = {
        token: args.token,
        type: validatedToken.linkType,
        clientNamePrefill,
      };
    }

    return {
      listing: {
        slug: readString(listing.slug) ?? args.providerSlug,
        logoUrl: readString(asRecord(listing.metadata).logoUrl),
        profileId: String(listing.workspaceId),
      },
      profile: {
        agencyName: readString(workspace.agencyName) ?? "",
        website: readString(asRecord(workspace.settings).website),
        intakeFormSettings: buildPublicBrandingSettings(workspace as ConvexDoc),
        planTier: readString(workspace.planTier) ?? "free",
        subscriptionStatus: readString(workspace.subscriptionStatus),
      },
      packet: {
        ...mapPacket(packet),
        description: readString(payload.description),
      },
      documents,
      link,
    };
  },
});

export const getAgreementSubmissions = query({
  args: {
    packetId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId) {
      throw new ConvexError("Packet not found");
    }

    const artifactRows = await getPacketArtifactRows(ctx, args.packetId);
    const submissions = artifactRows
      .filter((row) => row.artifactType === "submission" && !row.deletedAt)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      )
      .map(mapArtifact);

    return {
      submissions: submissions.slice(offset, offset + limit),
      total: submissions.length,
    };
  },
});

export const getAgreementSubmissionById = query({
  args: {
    submissionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const artifact = await ctx.db.get(
      asId<"agreementArtifacts">(args.submissionId),
    );
    if (
      !artifact ||
      String(artifact.workspaceId) !== workspaceId ||
      artifact.artifactType !== "submission"
    ) {
      return null;
    }

    // Fetch sibling artifacts for the same packet
    const packetId = artifact.packetId ? String(artifact.packetId) : null;
    let relatedArtifacts: ReturnType<typeof mapArtifact>[] = [];
    if (packetId) {
      const siblings = await getPacketArtifactRows(ctx, packetId);
      relatedArtifacts = siblings
        .filter(
          (row) =>
            row.submissionId === artifact.submissionId &&
            row._id !== artifact._id &&
            !row.deletedAt,
        )
        .map(mapArtifact);
    }

    return {
      ...mapArtifact(artifact as unknown as ConvexDoc),
      relatedArtifacts,
    };
  },
});

export const getArtifactUrl = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(asId<"files">(args.fileId));
    if (!file) {
      return null;
    }

    const storageId = file.storageId;
    if (!storageId) {
      return null;
    }

    const url = await ctx.storage.getUrl(storageId as string);
    return url ?? null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createAgreementPacket = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    settings: v.optional(agreementSettingsValidator),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("agreementPackets", {
      workspaceId: asId<"workspaces">(workspaceId),
      slug: undefined,
      status: "draft",
      payload: {
        title: args.title,
        description: args.description ?? null,
        documents: [],
        settings: args.settings ?? {
          requireSignature: true,
          notifyOnSubmission: true,
          expiresInDays: null,
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateAgreementPacket = mutation({
  args: {
    packetId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    settings: v.optional(agreementSettingsValidator),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    const payload = asRecord(packet.payload);
    const updatedPayload = {
      ...payload,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
      ...(args.settings !== undefined ? { settings: args.settings } : {}),
    };

    await ctx.db.patch(asId<"agreementPackets">(packet._id), {
      payload: updatedPayload,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const deleteAgreementPacket = mutation({
  args: {
    packetId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId) {
      throw new ConvexError("Packet not found");
    }

    await ctx.db.patch(asId<"agreementPackets">(packet._id), {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const publishAgreementPacket = mutation({
  args: {
    packetId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    const payload = asRecord(packet.payload);
    const title = readString(payload.title) ?? "agreement-packet";
    const slug = await ensureUniqueSlug(ctx, title, packet._id);

    await ctx.db.patch(asId<"agreementPackets">(packet._id), {
      status: "published",
      slug,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, slug };
  },
});

export const createAgreementLink = mutation({
  args: {
    packetId: v.string(),
    clientId: v.optional(v.union(v.string(), v.null())),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId, userId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Agreement form not found");
    }

    let packetSlug = readString(packet.slug);
    if (packet.status !== "published" || !packetSlug) {
      const payload = asRecord(packet.payload);
      const title = readString(payload.title) ?? "agreement-packet";
      packetSlug = await ensureUniqueSlug(ctx, title, packet._id);
      await ctx.db.patch(asId<"agreementPackets">(packet._id), {
        status: "published",
        slug: packetSlug,
        updatedAt: new Date().toISOString(),
      });
    }

    const listing = await getPublishedListingForWorkspace(ctx, workspaceId);
    const providerSlug = readString(listing?.slug);
    if (!providerSlug || !packetSlug) {
      throw new ConvexError(
        "A published listing is required before sharing your agreement form.",
      );
    }

    let clientId: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
      if (
        !client ||
        String(client.workspaceId) !== workspaceId ||
        client.recordType !== "client" ||
        client.deletedAt
      ) {
        throw new ConvexError("Client not found");
      }
      clientId = args.clientId;
    }

    const duplicateTokens = await ctx.db
      .query("intakeTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    if (duplicateTokens.length > 0) {
      throw new ConvexError("Failed to create agreement link");
    }

    const linkType: AgreementLinkType = clientId ? "assigned" : "generic";
    const ts = new Date().toISOString();
    await ctx.db.insert("intakeTokens", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: AGREEMENT_LINK_TOKEN_TYPE,
      subjectId: args.packetId,
      token: args.token,
      expiresAt: clientId
        ? new Date(Date.now() + ASSIGNED_AGREEMENT_LINK_TTL_MS).toISOString()
        : undefined,
      payload: {
        packetId: args.packetId,
        packetSlug,
        clientId,
        linkType,
        reusable: !clientId,
        createdByUserId: String(userId),
      },
      createdAt: ts,
      updatedAt: ts,
    });

    return {
      token: args.token,
      packetSlug,
      providerSlug,
      linkType,
    };
  },
});

export const unpublishAgreementPacket = mutation({
  args: {
    packetId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    await ctx.db.patch(asId<"agreementPackets">(packet._id), {
      status: "draft",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const addAgreementDocument = mutation({
  args: {
    packetId: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    fileId: v.optional(v.union(v.string(), v.null())),
    templateContent: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    const payload = asRecord(packet.payload);
    const documents = asArray(payload.documents) as Array<Record<string, unknown>>;
    const maxSort = documents.reduce(
      (max, doc) =>
        Math.max(max, typeof doc.sortOrder === "number" ? doc.sortOrder : 0),
      0,
    );

    const now = new Date().toISOString();
    const artifactId = await ctx.db.insert("agreementArtifacts", {
      workspaceId: asId<"workspaces">(workspaceId),
      packetId: asId<"agreementPackets">(args.packetId),
      artifactType: "document",
      fileId: args.fileId ? asId<"files">(args.fileId) : undefined,
      payload: {
        title: args.title,
        description: args.description ?? null,
        sortOrder: maxSort + 1,
        templateContent: args.templateContent ?? null,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Also update the documents array in the packet payload
    const newDoc = {
      id: artifactId,
      title: args.title,
      description: args.description ?? null,
      sortOrder: maxSort + 1,
      fileId: args.fileId ?? null,
      templateContent: args.templateContent ?? null,
    };
    await ctx.db.patch(asId<"agreementPackets">(packet._id), {
      payload: {
        ...payload,
        documents: [...documents, newDoc],
      },
      updatedAt: now,
    });

    return { id: artifactId };
  },
});

export const updateAgreementDocument = mutation({
  args: {
    artifactId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    fileId: v.optional(v.union(v.string(), v.null())),
    templateContent: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const artifact = await ctx.db.get(
      asId<"agreementArtifacts">(args.artifactId),
    );
    if (
      !artifact ||
      String(artifact.workspaceId) !== workspaceId ||
      artifact.artifactType !== "document"
    ) {
      throw new ConvexError("Document not found");
    }

    const artifactPayload = asRecord(artifact.payload);
    const updatedArtifactPayload = {
      ...artifactPayload,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.templateContent !== undefined
        ? { templateContent: args.templateContent }
        : {}),
    };

    const now = new Date().toISOString();
    await ctx.db.patch(asId<"agreementArtifacts">(artifact._id), {
      ...(args.fileId !== undefined
        ? { fileId: args.fileId ? asId<"files">(args.fileId) : undefined }
        : {}),
      payload: updatedArtifactPayload,
      updatedAt: now,
    });

    // Update the corresponding document entry in the packet payload
    if (artifact.packetId) {
      const packet = await ctx.db.get(
        asId<"agreementPackets">(String(artifact.packetId)),
      );
      if (packet) {
        const packetPayload = asRecord(packet.payload);
        const documents = asArray(packetPayload.documents) as Array<
          Record<string, unknown>
        >;
        const updatedDocuments = documents.map((doc) => {
          if (doc.id === artifact._id) {
            return {
              ...doc,
              ...(args.title !== undefined ? { title: args.title } : {}),
              ...(args.description !== undefined
                ? { description: args.description }
                : {}),
              ...(args.fileId !== undefined ? { fileId: args.fileId } : {}),
              ...(args.templateContent !== undefined
                ? { templateContent: args.templateContent }
                : {}),
            };
          }
          return doc;
        });
        await ctx.db.patch(
          asId<"agreementPackets">(String(artifact.packetId)),
          {
            payload: { ...packetPayload, documents: updatedDocuments },
            updatedAt: now,
          },
        );
      }
    }

    return { success: true };
  },
});

export const deleteAgreementDocument = mutation({
  args: {
    artifactId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const artifact = await ctx.db.get(
      asId<"agreementArtifacts">(args.artifactId),
    );
    if (
      !artifact ||
      String(artifact.workspaceId) !== workspaceId ||
      artifact.artifactType !== "document"
    ) {
      throw new ConvexError("Document not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(asId<"agreementArtifacts">(artifact._id), {
      deletedAt: now,
      updatedAt: now,
    });

    // Remove from packet payload documents array
    if (artifact.packetId) {
      const packet = await ctx.db.get(
        asId<"agreementPackets">(String(artifact.packetId)),
      );
      if (packet) {
        const packetPayload = asRecord(packet.payload);
        const documents = asArray(packetPayload.documents) as Array<
          Record<string, unknown>
        >;
        const updatedDocuments = documents.filter(
          (doc) => doc.id !== artifact._id,
        );
        await ctx.db.patch(
          asId<"agreementPackets">(String(artifact.packetId)),
          {
            payload: { ...packetPayload, documents: updatedDocuments },
            updatedAt: now,
          },
        );
      }
    }

    return { success: true };
  },
});

async function applyAgreementDocumentOrder(params: {
  ctx: MutationCtx;
  workspaceId: string;
  packet: ConvexDoc;
  documentOrder: Array<{ id: string; sortOrder: number }>;
}) {
  const { ctx, workspaceId, packet, documentOrder } = params;
  const timestamp = new Date().toISOString();
  const orderMap = new Map(documentOrder.map((item) => [item.id, item.sortOrder]));

  for (const item of documentOrder) {
    const artifact = await ctx.db.get(asId<"agreementArtifacts">(item.id));
    if (artifact && String(artifact.workspaceId) === workspaceId) {
      const artifactPayload = asRecord(artifact.payload);
      await ctx.db.patch(asId<"agreementArtifacts">(artifact._id), {
        payload: { ...artifactPayload, sortOrder: item.sortOrder },
        updatedAt: timestamp,
      });
    }
  }

  const packetPayload = asRecord(packet.payload);
  const documents = asArray(packetPayload.documents) as Array<Record<string, unknown>>;
  const updatedDocuments = documents
    .map((doc) => ({
      ...doc,
      sortOrder: orderMap.get(String(doc.id)) ?? doc.sortOrder,
    }))
    .sort((a, b) => {
      const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
      const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;
      return aOrder - bOrder;
    });

  await ctx.db.patch(asId<"agreementPackets">(packet._id), {
    payload: { ...packetPayload, documents: updatedDocuments },
    updatedAt: timestamp,
  });
}

export const reorderAgreementDocuments = mutation({
  args: {
    packetId: v.string(),
    documentOrder: v.array(v.object({ id: v.string(), sortOrder: v.number() })),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    await applyAgreementDocumentOrder({
      ctx,
      workspaceId,
      packet: packet as unknown as ConvexDoc,
      documentOrder: args.documentOrder,
    });

    return { success: true };
  },
});

export const moveAgreementPacketDocument = mutation({
  args: {
    documentId: v.string(),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const artifact = await ctx.db.get(
      asId<"agreementArtifacts">(args.documentId),
    );

    if (
      !artifact ||
      String(artifact.workspaceId) !== workspaceId ||
      artifact.artifactType !== "document" ||
      artifact.deletedAt ||
      !artifact.packetId
    ) {
      throw new ConvexError("Document not found");
    }

    const packet = await ctx.db.get(
      asId<"agreementPackets">(String(artifact.packetId)),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId || packet.deletedAt) {
      throw new ConvexError("Packet not found");
    }

    const siblings = await getPacketArtifactRows(ctx, String(artifact.packetId));
    const orderedDocuments = siblings
      .filter((row) => row.artifactType === "document" && !row.deletedAt)
      .sort((a, b) => {
        const aOrder = asRecord(a.payload).sortOrder;
        const bOrder = asRecord(b.payload).sortOrder;
        return (
          (typeof aOrder === "number" ? aOrder : 0) -
          (typeof bOrder === "number" ? bOrder : 0)
        );
      });

    const currentIndex = orderedDocuments.findIndex(
      (row) => row._id === artifact._id,
    );
    const targetIndex =
      args.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= orderedDocuments.length
    ) {
      return { success: true };
    }

    const reordered = [...orderedDocuments];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await applyAgreementDocumentOrder({
      ctx,
      workspaceId,
      packet: packet as unknown as ConvexDoc,
      documentOrder: reordered.map((row, index) => ({
        id: row._id,
        sortOrder: index + 1,
      })),
    });

    return { success: true };
  },
});

export const submitAgreementPacket = mutation({
  args: {
    packetId: v.string(),
    signerName: v.string(),
    signerEmail: v.string(),
    signedAt: v.string(),
    ipAddress: v.optional(v.union(v.string(), v.null())),
    formData: v.optional(agreementFormDataValidator),
    clientId: v.optional(v.union(v.string(), v.null())),
    linkToken: v.optional(v.union(v.string(), v.null())),
    fileId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Unauthenticated: public submission
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || packet.status !== "published" || packet.deletedAt) {
      throw new ConvexError("Packet not found or not published");
    }

    let clientId = args.clientId ?? null;
    let linkType: AgreementLinkType = clientId ? "assigned" : "generic";
    let tokenRow: ConvexDoc | null = null;
    let reusableLink = true;
    if (args.linkToken) {
      const validatedToken = await validateAgreementLinkToken({
        ctx,
        token: args.linkToken,
        packetId: args.packetId,
      });
      tokenRow = validatedToken.tokenRow;
      clientId = validatedToken.clientId ?? clientId;
      linkType = validatedToken.linkType;
      reusableLink = validatedToken.reusable;
    }

    const now = new Date().toISOString();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const id = await ctx.db.insert("agreementArtifacts", {
      workspaceId: asId<"workspaces">(String(packet.workspaceId)),
      packetId: asId<"agreementPackets">(args.packetId),
      submissionId,
      artifactType: "submission",
      fileId: args.fileId ? asId<"files">(args.fileId) : undefined,
      payload: {
        signerName: args.signerName,
        signerEmail: args.signerEmail,
        signedAt: args.signedAt,
        ipAddress: args.ipAddress ?? null,
        formData: args.formData ?? {},
        clientId,
        linkToken: args.linkToken ?? null,
        linkType,
      },
      createdAt: now,
      updatedAt: now,
    });

    if (tokenRow && !reusableLink) {
      await ctx.db.patch(asId<"intakeTokens">(tokenRow._id), {
        payload: {
          ...asRecord(tokenRow.payload),
          usedAt: now,
        },
        updatedAt: now,
      });
    }

    return { id, submissionId };
  },
});

export const linkSubmissionToClient = mutation({
  args: {
    artifactId: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const artifact = await ctx.db.get(
      asId<"agreementArtifacts">(args.artifactId),
    );
    if (
      !artifact ||
      String(artifact.workspaceId) !== workspaceId ||
      artifact.artifactType !== "submission"
    ) {
      throw new ConvexError("Submission not found");
    }

    const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !client ||
      String(client.workspaceId) !== workspaceId ||
      client.recordType !== "client" ||
      client.deletedAt
    ) {
      throw new ConvexError("Client not found");
    }

    const payload = asRecord(artifact.payload);
    await ctx.db.patch(asId<"agreementArtifacts">(artifact._id), {
      payload: {
        ...payload,
        clientId: args.clientId,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const saveAgreementArtifactFile = mutation({
  args: {
    packetId: v.string(),
    fileId: v.string(),
    artifactType: v.string(),
    submissionId: v.optional(v.union(v.string(), v.null())),
    versionId: v.optional(v.union(v.string(), v.null())),
    payload: v.optional(agreementFormDataValidator),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const packet = await ctx.db.get(
      asId<"agreementPackets">(args.packetId),
    );
    if (!packet || String(packet.workspaceId) !== workspaceId) {
      throw new ConvexError("Packet not found");
    }

    const now = new Date().toISOString();
    const id = await ctx.db.insert("agreementArtifacts", {
      workspaceId: asId<"workspaces">(workspaceId),
      packetId: asId<"agreementPackets">(args.packetId),
      fileId: asId<"files">(args.fileId),
      artifactType: args.artifactType,
      submissionId: args.submissionId ?? undefined,
      versionId: args.versionId ?? undefined,
      payload: args.payload ?? {},
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});
