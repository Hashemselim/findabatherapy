import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

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

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

function slugifyTemplateName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractMergeFieldsFromText(...values: Array<string | string[] | undefined>) {
  const fields = new Set<string>();
  for (const value of values) {
    const source = Array.isArray(value) ? value.join(" ") : (value ?? "");
    for (const match of source.matchAll(/\{([a-z0-9_]+)\}/gi)) {
      if (match[1]) {
        fields.add(match[1]);
      }
    }
  }
  return [...fields];
}

const templateFiltersValidator = v.object({
  archived: v.optional(v.union(v.boolean(), v.literal("all"))),
});

const communicationFiltersValidator = v.object({
  clientId: v.optional(v.string()),
  templateSlug: v.optional(v.string()),
  dateFrom: v.optional(v.string()),
  dateTo: v.optional(v.string()),
});

const SYSTEM_TEMPLATE_SLUGS = new Set([
  "inquiry-received",
  "intake-received",
  "request-for-information",
  "eligibility-check-update",
  "assessment-auth-requested",
  "assessment-authorized",
  "assessment-auth-denied",
  "schedule-assessment",
  "assessment-confirmation",
  "assessment-report-progress",
  "report-submitted",
  "services-approved",
  "services-denied",
  "therapy-start-planning",
  "welcome-to-services",
  "parent-resources",
  "waitlist-update",
  "reassessment-notice",
  "reauthorization-update",
  "invoice-available",
  "discharge-end-of-services",
  "general-update",
]);

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

async function getWorkspaceCommunicationRows(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("communicationRecords")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function getWorkspaceCommunicationRowsBySubject(
  ctx: ConvexCtx,
  workspaceId: string,
  subjectType: string,
) {
  return ctx.db
    .query("communicationRecords")
    .withIndex("by_workspace_and_subject", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("subjectType", subjectType),
    )
    .collect();
}

function mapTemplate(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const lifecycleStage =
    readString(payload.lifecycleStage) ??
    readString(payload.lifecycle_stage) ??
    readString(payload.category) ??
    "general";
  const slug = readString(payload.slug) ?? slugifyTemplateName(readString(payload.name) ?? "");
  const archivedAt =
    readString(payload.archivedAt) ??
    (row.status === "archived" ? readString(row.updatedAt) : null);
  const isArchived = row.status === "archived";
  return {
    id: row._id,
    profile_id: row.workspaceId ? String(row.workspaceId) : null,
    base_template_id: null,
    name: readString(payload.name) ?? "",
    slug,
    lifecycle_stage: lifecycleStage,
    subject: readString(payload.subject) ?? "",
    body: readString(payload.body) ?? "",
    cc: readStringArray(payload.cc),
    merge_fields: readStringArray(payload.mergeFields ?? payload.variables),
    sort_order: typeof payload.sortOrder === "number" ? payload.sortOrder : 1000,
    is_active: !isArchived,
    archived_at: archivedAt,
    created_at: readString(row.createdAt) ?? new Date().toISOString(),
    updated_at: readString(row.updatedAt) ?? readString(row.createdAt) ?? new Date().toISOString(),
    source: "custom",
    is_archived: isArchived,
    can_delete: true,
    can_archive: true,
  };
}

function getTemplateSlugFromRow(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return readString(payload.slug) ?? slugifyTemplateName(readString(payload.name) ?? "");
}

function mapCommunication(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    client_id: readString(row.subjectId) ?? "",
    profile_id: row.workspaceId ? String(row.workspaceId) : "",
    template_slug: readString(payload.templateSlug),
    subject: readString(payload.subject) ?? "",
    body: readString(payload.body) ?? "",
    recipient_email: readString(payload.recipientEmail) ?? "",
    recipient_name: readString(payload.recipientName),
    client_name: null as string | null,
    status: (readString(row.status) ?? "sent") as
      | "pending"
      | "sent"
      | "failed"
      | "bounced",
    sent_at:
      readString(payload.sentAt) ??
      readString(row.createdAt) ??
      new Date().toISOString(),
    sent_by: readString(payload.sentByUserId),
    created_at: readString(row.createdAt) ?? new Date().toISOString(),
  };
}

async function mapCommunicationsWithClientNames(
  ctx: ConvexCtx,
  rows: ConvexDoc[],
) {
  const clientIds = [
    ...new Set(
      rows
        .map((row) => readString(row.subjectId))
        .filter((clientId): clientId is string => Boolean(clientId)),
    ),
  ];

  const clientRows = await Promise.all(
    clientIds.map((clientId) =>
      ctx.db.get(asId<"crmRecords">(clientId)),
    ),
  );
  const clientNameById = new Map<string, string>();
  clientRows.forEach((clientRow) => {
    if (!clientRow || clientRow.recordType !== "client" || clientRow.deletedAt) {
      return;
    }
    const payload = asRecord(clientRow.payload);
    const clientName = [
      readString(payload.firstName),
      readString(payload.lastName),
    ]
      .filter(Boolean)
      .join(" ");
    clientNameById.set(clientRow._id, clientName || "Unknown");
  });

  return rows.map((row) => {
    const mapped = mapCommunication(row);
    return {
      ...mapped,
      client_name:
        clientNameById.get(mapped.client_id) ??
        (mapped.client_id ? "Unknown" : null),
    };
  });
}

async function findWorkspaceListing(ctx: ConvexCtx, workspaceId: string) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
  return (
    listings.find((listing) => listing.status === "published") ??
    listings[0] ??
    null
  );
}

async function findPublishedAgreementPacket(ctx: ConvexCtx, workspaceId: string) {
  const packets = await ctx.db
    .query("agreementPackets")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();

  return (
    packets
      .filter((packet) => packet.status === "published")
      .sort(
        (a, b) =>
          new Date(readString(b.updatedAt) ?? readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.updatedAt) ?? readString(a.createdAt) ?? 0).getTime(),
      )[0] ??
    null
  );
}

async function findPrimaryClientParent(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const parentRows = await ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", "client_parent"),
    )
    .collect();

  return (
    parentRows.find((row) => {
      if (row.deletedAt) {
        return false;
      }
      const relatedIds = asRecord(row.relatedIds);
      const payload = asRecord(row.payload);
      const relatedClientId =
        readString(relatedIds.clientId) ??
        readString(relatedIds.parentClientId);
      return (
        relatedClientId === clientId &&
        payload.isPrimary === true
      );
    }) ??
    parentRows.find((row) => {
      if (row.deletedAt) {
        return false;
      }
      const relatedIds = asRecord(row.relatedIds);
      const relatedClientId =
        readString(relatedIds.clientId) ??
        readString(relatedIds.parentClientId);
      return relatedClientId === clientId;
    }) ??
    null
  );
}

async function resolveClientMergeValues(
  ctx: ConvexCtx,
  clientId: string,
  workspaceId: string,
) {
  const [workspace, client, listing, primaryParent] = await Promise.all([
    ctx.db.get(asId<"workspaces">(workspaceId)),
    ctx.db.get(asId<"crmRecords">(clientId)),
    findWorkspaceListing(ctx, workspaceId),
    findPrimaryClientParent(ctx, workspaceId, clientId),
  ]);

  if (!workspace || !client || client.recordType !== "client" || client.deletedAt) {
    throw new ConvexError("Client not found");
  }

  const payload = asRecord(client.payload);
  const parentPayload = asRecord(primaryParent?.payload);
  const workspaceSettings = asRecord(workspace.settings);
  const slug = readString(listing?.slug) ?? "";
  const agreementPacket = await findPublishedAgreementPacket(ctx, workspaceId);
  const agreementPacketSlug = readString(agreementPacket?.slug) ?? "";
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";

  return {
    client_name: [readString(payload.firstName), readString(payload.lastName)]
      .filter(Boolean)
      .join(" "),
    child_first_name: readString(payload.firstName) ?? "",
    child_last_name: readString(payload.lastName) ?? "",
    child_date_of_birth: readString(payload.dateOfBirth) ?? "",
    preferred_language: readString(payload.preferredLanguage) ?? "",
    service_start_date: readString(payload.serviceStartDate) ?? "",
    referral_source: readString(payload.referralSource) ?? "",
    referral_date: readString(payload.referralDate) ?? "",
    status: readString(payload.stage) ?? readString(client.status) ?? "",
    funding_source: readString(payload.fundingSource) ?? "",
    parent_name: [
      readString(parentPayload.firstName),
      readString(parentPayload.lastName),
    ]
      .filter(Boolean)
      .join(" "),
    parent_first_name: readString(parentPayload.firstName) ?? "",
    parent_last_name: readString(parentPayload.lastName) ?? "",
    parent_email: readString(parentPayload.email) ?? "",
    parent_phone: readString(parentPayload.phone) ?? "",
    parent_relationship: readString(parentPayload.relationship) ?? "",
    agency_name: readString(workspace.agencyName) ?? "",
    agency_phone: readString(workspaceSettings.contactPhone) ?? "",
    agency_email: readString(workspace.contactEmail) ?? "",
    contact_link: slug ? `${siteOrigin}/provider/${slug}/contact` : "",
    intake_link: slug ? `${siteOrigin}/provider/${slug}/intake` : "",
    brochure_link: slug ? `${siteOrigin}/p/${slug}` : "",
    resources_link: slug ? `${siteOrigin}/provider/${slug}/resources` : "",
    careers_link: slug ? `${siteOrigin}/provider/${slug}/careers` : "",
    agreement_link:
      slug && agreementPacketSlug
        ? `${siteOrigin}/agreements/${slug}/${agreementPacketSlug}`
        : "",
    assessment_date: "",
    assessment_time: "",
    assessment_location: "",
  };
}

async function ensureUniqueWorkspaceTemplateSlug(
  ctx: ConvexCtx,
  workspaceId: string,
  name: string,
  excludeTemplateId?: string | null,
) {
  const baseSlug = slugifyTemplateName(name) || "custom-template";
  const takenSlugs = new Set(SYSTEM_TEMPLATE_SLUGS);
  const rows = await getWorkspaceCommunicationRowsBySubject(
    ctx,
    workspaceId,
    "template",
  );

  rows.forEach((row) => {
    if (excludeTemplateId && row._id === excludeTemplateId) {
      return;
    }

    const slug = getTemplateSlugFromRow(row as unknown as ConvexDoc);
    if (slug) {
      takenSlugs.add(slug);
    }
  });

  if (!takenSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (takenSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

async function resolveAgencyPreviewValues(ctx: ConvexCtx, workspaceId: string) {
  const [workspace, listing] = await Promise.all([
    ctx.db.get(asId<"workspaces">(workspaceId)),
    findWorkspaceListing(ctx, workspaceId),
  ]);
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  const workspaceSettings = asRecord(workspace.settings);
  const slug = readString(listing?.slug) ?? "";
  const agreementPacket = await findPublishedAgreementPacket(ctx, workspaceId);
  const agreementPacketSlug = readString(agreementPacket?.slug) ?? "";
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";

  return {
    agency_name: readString(workspace.agencyName) ?? "",
    agency_phone: readString(workspaceSettings.contactPhone) ?? "",
    agency_email: readString(workspace.contactEmail) ?? "",
    contact_link: slug ? `${siteOrigin}/provider/${slug}/contact` : "",
    intake_link: slug ? `${siteOrigin}/provider/${slug}/intake` : "",
    brochure_link: slug ? `${siteOrigin}/p/${slug}` : "",
    resources_link: slug ? `${siteOrigin}/provider/${slug}/resources` : "",
    careers_link: slug ? `${siteOrigin}/provider/${slug}/careers` : "",
    agreement_link:
      slug && agreementPacketSlug
        ? `${siteOrigin}/agreements/${slug}/${agreementPacketSlug}`
        : "",
  };
}

/* ------------------------------------------------------------------ */
/*  getTemplates - list templates for workspace                       */
/* ------------------------------------------------------------------ */
export const getTemplates = query({
  args: {
    filters: v.optional(templateFiltersValidator),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceCommunicationRowsBySubject(
      ctx,
      workspaceId,
      "template",
    );

    const filtered = rows
      .filter((row) => {
        if (args.filters?.archived !== "all") {
          const wantsArchived = args.filters?.archived === true;
          if (wantsArchived !== (row.status === "archived")) {
            return false;
          }
        }
        if (args.filters?.archived === undefined && row.status === "archived") {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return filtered.map(mapTemplate);
  },
});

/* ------------------------------------------------------------------ */
/*  getTemplate - single template by ID                               */
/* ------------------------------------------------------------------ */
export const getTemplate = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await getWorkspaceCommunicationRowsBySubject(
      ctx,
      workspaceId,
      "template",
    );
    const row = rows.find((candidate) => {
      const payload = asRecord(candidate.payload);
      const slug =
        readString(payload.slug) ??
        slugifyTemplateName(readString(payload.name) ?? "");
      return slug === args.slug && candidate.status !== "archived";
    });
    return row ? mapTemplate(row as unknown as ConvexDoc) : null;
  },
});

/* ------------------------------------------------------------------ */
/*  saveTemplate - create or update a template                        */
/* ------------------------------------------------------------------ */
export const saveTemplate = mutation({
  args: {
    templateId: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    lifecycleStage: v.string(),
    subject: v.string(),
    body: v.string(),
    cc: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();
    const slug = await ensureUniqueWorkspaceTemplateSlug(
      ctx,
      workspaceId,
      args.name,
      args.templateId ?? null,
    );
    const cc = Array.from(
      new Set((args.cc ?? []).map((email) => email.trim()).filter(Boolean)),
    );

    const payload = {
      slug,
      name: args.name,
      lifecycleStage: args.lifecycleStage,
      subject: args.subject,
      body: args.body,
      category: args.lifecycleStage,
      cc,
      mergeFields: extractMergeFieldsFromText(args.subject, args.body, cc),
    };

    if (args.templateId) {
      const existing = await ctx.db.get(
        asId<"communicationRecords">(args.templateId),
      );
      if (!existing || String(existing.workspaceId) !== workspaceId) {
        throw new ConvexError("Template not found");
      }

      await ctx.db.patch(asId<"communicationRecords">(existing._id), {
        channel: "email",
        payload: { ...asRecord(existing.payload), ...payload },
        updatedAt: now,
      });

      return { id: existing._id };
    }

    const id = await ctx.db.insert("communicationRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: "template",
      channel: "email",
      status: "active",
      payload,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

/* ------------------------------------------------------------------ */
/*  archiveTemplate                                                   */
/* ------------------------------------------------------------------ */
export const archiveTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"communicationRecords">(args.templateId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(asId<"communicationRecords">(row._id), {
      status: "archived",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  unarchiveTemplate                                                 */
/* ------------------------------------------------------------------ */
export const unarchiveTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"communicationRecords">(args.templateId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.patch(asId<"communicationRecords">(row._id), {
      status: "active",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  deleteTemplate                                                    */
/* ------------------------------------------------------------------ */
export const deleteTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"communicationRecords">(args.templateId));
    if (!row || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Template not found");
    }

    await ctx.db.delete(asId<"communicationRecords">(row._id));

    return { success: true };
  },
});

/* ------------------------------------------------------------------ */
/*  getClientCommunications - communications for a specific client    */
/* ------------------------------------------------------------------ */
export const getClientCommunications = query({
  args: {
    clientId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getWorkspaceCommunicationRowsBySubject(
      ctx,
      workspaceId,
      "client",
    );

    const filtered = rows
      .filter((row) => row.subjectId === args.clientId)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return mapCommunicationsWithClientNames(
      ctx,
      filtered.slice(offset, offset + limit) as unknown as ConvexDoc[],
    );
  },
});

/* ------------------------------------------------------------------ */
/*  getAllCommunications - all for workspace with pagination           */
/* ------------------------------------------------------------------ */
export const getAllCommunications = query({
  args: {
    filters: v.optional(communicationFiltersValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.pageSize ?? 50;
    const offset = ((args.page ?? 1) - 1) * limit;

    const rows = await getWorkspaceCommunicationRows(ctx, workspaceId);

    const filtered = rows
      .filter((row) => row.subjectType !== "template")
      .filter((row) => !args.filters?.clientId || row.subjectId === args.filters.clientId)
      .filter((row) => {
        if (!args.filters?.templateSlug) {
          return true;
        }
        const payload = asRecord(row.payload);
        return readString(payload.templateSlug) === args.filters.templateSlug;
      })
      .filter((row) => {
        if (!args.filters?.dateFrom && !args.filters?.dateTo) {
          return true;
        }
        const sentAt = readString(asRecord(row.payload).sentAt) ?? readString(row.createdAt);
        if (!sentAt) {
          return false;
        }
        if (args.filters?.dateFrom && sentAt < args.filters.dateFrom) {
          return false;
        }
        if (args.filters?.dateTo && sentAt > args.filters.dateTo) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    return {
      communications: await mapCommunicationsWithClientNames(
        ctx,
        filtered.slice(offset, offset + limit) as unknown as ConvexDoc[],
      ),
      total: filtered.length,
    };
  },
});

/* ------------------------------------------------------------------ */
/*  recordSentCommunication - record that a communication was sent    */
/* ------------------------------------------------------------------ */
export const recordSentCommunication = mutation({
  args: {
    clientId: v.string(),
    templateSlug: v.optional(v.union(v.string(), v.null())),
    recipientEmail: v.string(),
    recipientName: v.optional(v.union(v.string(), v.null())),
    subject: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("bounced"),
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId, userId } = await requireCurrentWorkspace(ctx);
    const now = new Date().toISOString();
    const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !client ||
      String(client.workspaceId) !== workspaceId ||
      client.recordType !== "client" ||
      client.deletedAt
    ) {
      throw new ConvexError("Client not found");
    }

    const id = await ctx.db.insert("communicationRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: "client",
      subjectId: args.clientId,
      channel: "email",
      status: args.status,
      payload: {
        recipientEmail: args.recipientEmail,
        recipientName: args.recipientName ?? null,
        subject: args.subject,
        body: args.body,
        templateSlug: args.templateSlug ?? null,
        sentAt: now,
        sentByUserId: userId,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { communicationId: id };
  },
});

export const getClientMergeFieldValues = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return resolveClientMergeValues(ctx, args.clientId, workspaceId);
  },
});

export const getClientSendFieldValues = query({
  args: {
    clientId: v.string(),
    subject: v.string(),
    body: v.string(),
    cc: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return resolveClientMergeValues(ctx, args.clientId, workspaceId);
  },
});

export const populateMergeFields = query({
  args: {
    content: v.string(),
    clientId: v.string(),
    manualFieldValues: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const values: Record<string, string> = {
      ...(await resolveClientMergeValues(ctx, args.clientId, workspaceId)),
      ...(args.manualFieldValues ?? {}),
    };

    return args.content.replace(/\{([a-z0-9_]+)\}/gi, (match, key: string) =>
      values[key] ?? match,
    );
  },
});

export const getTemplateEditorFieldValues = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return resolveAgencyPreviewValues(ctx, workspaceId);
  },
});

/* ------------------------------------------------------------------ */
/*  getAgencyBranding - workspace branding info for email templates   */
/* ------------------------------------------------------------------ */
export const getAgencyBranding = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    const settings = asRecord(workspace.settings);
    const branding = asRecord(settings.branding);
    const intakeFormSettings = asRecord(settings.intakeFormSettings);

    return {
      agencyName: readString(workspace.agencyName) ?? "Our Agency",
      contactEmail: readString(workspace.contactEmail) ?? "",
      logoUrl: readString(branding.logoUrl),
      brandColor:
        readString(branding.primaryColor) ??
        readString(intakeFormSettings.background_color) ??
        "#0866FF",
      website:
        readString(branding.websiteUrl) ??
        readString(settings.website),
      phone: readString(settings.contactPhone),
    };
  },
});
