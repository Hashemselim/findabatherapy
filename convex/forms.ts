import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  asId,
  asRecord,
  generateSlug,
  now,
  readBoolean,
  readString,
  requireCurrentWorkspace,
  type ConvexDoc,
} from "./_helpers";
import { getPublicListingLogoUrl } from "./lib/public_branding";

type ConvexCtx = QueryCtx | MutationCtx;

const FORM_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const optionalString = v.optional(v.union(v.string(), v.null()));

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function createToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildPublicFormAccessUrl(siteUrl: string, providerSlug: string, formSlug: string, token: string) {
  return `${siteUrl}/forms/${providerSlug}/${formSlug}/access?token=${token}`;
}

function getClientName(row: ConvexDoc | null) {
  const payload = asRecord(row?.payload);
  return (
    [
      readString(payload.firstName) ?? readString(payload.child_first_name),
      readString(payload.lastName) ?? readString(payload.child_last_name),
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Client"
  );
}

function getTemplateQuestionCount(draftSchemaJson: string) {
  return parseJsonArray(draftSchemaJson).length;
}

async function getClientPortalAccessState(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const [portalSettingsRows, guardianRows] = await Promise.all([
    ctx.db
      .query("crmRecords")
      .withIndex("by_workspace_and_type", (q) =>
        q
          .eq("workspaceId", asId<"workspaces">(workspaceId))
          .eq("recordType", "client_portal_settings"),
      )
      .collect(),
    ctx.db
      .query("crmRecords")
      .withIndex("by_workspace_and_type", (q) =>
        q
          .eq("workspaceId", asId<"workspaces">(workspaceId))
          .eq("recordType", "client_parent"),
      )
      .collect(),
  ]);

  const portalSettings = portalSettingsRows.find((row) => {
    if (row.deletedAt) {
      return false;
    }

    const relatedIds = asRecord(row.relatedIds);
    return readString(relatedIds.clientId) === clientId;
  });

  const guardianAccessConfigured = guardianRows.some((row) => {
    if (row.deletedAt) {
      return false;
    }

    const relatedIds = asRecord(row.relatedIds);
    if (readString(relatedIds.clientId) !== clientId) {
      return false;
    }

    const payload = asRecord(row.payload);
    const accessStatus = readString(payload.portalAccessStatus) ?? "draft";
    return (
      accessStatus === "active" ||
      accessStatus === "invited" ||
      accessStatus === "ready"
    );
  });

  return {
    enabled: readBoolean(asRecord(portalSettings?.payload).enabled, false),
    guardianAccessConfigured,
  };
}

function normalizeSubmissionAnswers(answersJson: string) {
  return parseJsonRecord(answersJson);
}

function isAnswerFilled(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      isAnswerFilled(entry),
    );
  }

  return true;
}

function evaluateCondition(
  condition: Record<string, unknown>,
  answers: Record<string, unknown>,
) {
  const sourceQuestionId = readString(condition.sourceQuestionId);
  const operator = readString(condition.operator) ?? "equals";
  if (!sourceQuestionId) {
    return true;
  }

  const answer = answers[sourceQuestionId];
  const expected = condition.value;

  switch (operator) {
    case "equals":
      return answer === expected;
    case "not_equals":
      return answer !== expected;
    case "includes":
      if (Array.isArray(answer)) {
        return Array.isArray(expected)
          ? expected.every((entry) => answer.includes(entry))
          : answer.includes(expected);
      }
      return typeof answer === "string" && typeof expected === "string"
        ? answer.includes(expected)
        : false;
    case "not_includes":
      if (Array.isArray(answer)) {
        return Array.isArray(expected)
          ? expected.every((entry) => !answer.includes(entry))
          : !answer.includes(expected);
      }
      return typeof answer === "string" && typeof expected === "string"
        ? !answer.includes(expected)
        : true;
    case "is_empty":
      return !isAnswerFilled(answer);
    case "is_not_empty":
      return isAnswerFilled(answer);
    default:
      return true;
  }
}

function isQuestionVisible(
  question: Record<string, unknown>,
  answers: Record<string, unknown>,
) {
  const conditions = Array.isArray(question.conditions)
    ? question.conditions.filter(
        (entry): entry is Record<string, unknown> =>
          entry !== null && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];

  if (conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluateCondition(condition, answers));
}

function validateRequiredAnswers(
  schemaJson: string,
  answersJson: string,
) {
  const questions = parseJsonArray(schemaJson).filter(
    (entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === "object" && !Array.isArray(entry),
  );
  const answers = normalizeSubmissionAnswers(answersJson);

  for (const question of questions) {
    const questionId = readString(question.id);
    const questionType = readString(question.type) ?? "short_text";
    const required = readBoolean(question.required);

    if (!questionId || questionType === "static_text") {
      continue;
    }

    if (!isQuestionVisible(question, answers)) {
      continue;
    }

    if (!required) {
      continue;
    }

    if (!isAnswerFilled(answers[questionId])) {
      throw new ConvexError("Please complete all required questions before submitting.");
    }
  }
}

async function getWorkspaceListing(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  const rows = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();

  return (
    rows.find((row) => !row.deletedAt && row.status === "published") ??
    rows.find((row) => !row.deletedAt) ??
    null
  );
}

async function getWorkspaceByProviderSlug(
  ctx: ConvexCtx,
  providerSlug: string,
) {
  const listingRows = await ctx.db
    .query("listings")
    .withIndex("by_slug", (q) => q.eq("slug", providerSlug))
    .collect();

  const listing =
    listingRows.find((row) => !row.deletedAt && row.status === "published") ??
    listingRows.find((row) => !row.deletedAt) ??
    null;
  if (!listing) {
    return null;
  }

  const workspace = await ctx.db.get(asId<"workspaces">(listing.workspaceId));
  if (!workspace || workspace.deletedAt) {
    return null;
  }

  return {
    listing,
    workspace: workspace as ConvexDoc,
  };
}

async function getWorkspaceTemplates(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("formTemplates")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

async function getTemplateById(
  ctx: ConvexCtx,
  workspaceId: string,
  templateId: string,
) {
  const template = await ctx.db.get(asId<"formTemplates">(templateId));
  if (
    !template ||
    template.deletedAt ||
    String(template.workspaceId) !== workspaceId
  ) {
    throw new ConvexError("Form not found");
  }

  return template;
}

async function getTemplateBySlug(
  ctx: ConvexCtx,
  workspaceId: string,
  slug: string,
) {
  const rows = await ctx.db
    .query("formTemplates")
    .withIndex("by_workspace_and_slug", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("slug", slug),
    )
    .collect();

  return rows.find((row) => !row.deletedAt) ?? null;
}

async function getLatestPublishedVersion(
  ctx: ConvexCtx,
  template: ConvexDoc,
) {
  const versionId = template.latestPublishedVersionId
    ? String(template.latestPublishedVersionId)
    : null;
  if (!versionId) {
    return null;
  }

  const version = await ctx.db.get(asId<"formVersions">(versionId));
  if (!version || version.deletedAt) {
    return null;
  }

  return version as ConvexDoc;
}

async function ensureUniqueTemplateSlug(
  ctx: ConvexCtx,
  workspaceId: string,
  title: string,
  excludeId?: string,
) {
  const templates = await getWorkspaceTemplates(ctx, workspaceId);
  const activeSlugs = new Set(
    templates
      .filter((row) => !row.deletedAt && row._id !== excludeId)
      .map((row) => row.slug),
  );

  const base = generateSlug(title) || "custom-form";
  let candidate = base;
  let suffix = 2;

  while (activeSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function getLinkByToken(
  ctx: ConvexCtx,
  token: string,
) {
  const rows = await ctx.db
    .query("formLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();

  return rows.find((row) => !row.deletedAt) ?? null;
}

async function validatePublicLinkToken(
  ctx: ConvexCtx,
  token: string,
) {
  const link = await getLinkByToken(ctx, token);
  if (!link) {
    throw new ConvexError("This form link is invalid or expired.");
  }

  if (link.status === "disabled") {
    throw new ConvexError("This form link is no longer active.");
  }

  if (link.expiresAt && new Date(String(link.expiresAt)) < new Date()) {
    throw new ConvexError("This form link has expired.");
  }

  const template = await ctx.db.get(asId<"formTemplates">(link.templateId));
  const version = await ctx.db.get(asId<"formVersions">(link.versionId));
  if (!template || !version || template.deletedAt || version.deletedAt) {
    throw new ConvexError("This form is no longer available.");
  }

  const workspace = await ctx.db.get(asId<"workspaces">(link.workspaceId));
  if (!workspace || workspace.deletedAt) {
    throw new ConvexError("This form is no longer available.");
  }

  const listing = await getWorkspaceListing(ctx, String(link.workspaceId));
  if (!listing || !readString(listing.slug)) {
    throw new ConvexError("This form is no longer available.");
  }

  const assignment = link.assignmentId
    ? await ctx.db.get(asId<"formAssignments">(link.assignmentId))
    : null;
  const client = link.clientId
    ? await ctx.db.get(asId<"crmRecords">(link.clientId))
    : assignment?.clientId
      ? await ctx.db.get(asId<"crmRecords">(assignment.clientId))
      : null;

  return {
    link: link as ConvexDoc,
    template: template as ConvexDoc,
    version: version as ConvexDoc,
    assignment: assignment && !assignment.deletedAt ? (assignment as ConvexDoc) : null,
    client: client && !client.deletedAt ? (client as ConvexDoc) : null,
    workspace: workspace as ConvexDoc,
    listing: listing as ConvexDoc,
  };
}

async function getWorkspaceClients(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  const rows = await ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", "client"),
    )
    .collect();

  return rows.filter((row) => !row.deletedAt) as ConvexDoc[];
}

function mapTemplateSummary(
  template: ConvexDoc,
  submissions: ConvexDoc[],
  assignments: ConvexDoc[],
) {
  const latestVersionId = template.latestPublishedVersionId
    ? String(template.latestPublishedVersionId)
    : null;

  return {
    id: template._id,
    slug: readString(template.slug) ?? "",
    title: readString(template.title) ?? "Untitled form",
    description: readString(template.description),
    status: readString(template.status) ?? "draft",
    questionCount: getTemplateQuestionCount(readString(template.draftSchemaJson) ?? "[]"),
    latestPublishedVersionId: latestVersionId,
    latestVersionNumber:
      typeof template.latestVersionNumber === "number"
        ? template.latestVersionNumber
        : null,
    publishedAt: readString(template.publishedAt),
    archivedAt: readString(template.archivedAt),
    updatedAt: readString(template.updatedAt) ?? now(),
    submissionCount: submissions.length,
    unassignedSubmissionCount: submissions.filter((row) => !row.clientId).length,
    pendingAssignments: assignments.filter((row) => row.status === "pending").length,
    completedAssignments: assignments.filter((row) => row.status === "completed").length,
  };
}

export const getFormsDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, workspace } = await requireCurrentWorkspace(ctx);
    const [listing, templates, submissionRows, assignmentRows, clients] = await Promise.all([
      getWorkspaceListing(ctx, workspaceId),
      getWorkspaceTemplates(ctx, workspaceId),
      ctx.db
        .query("formSubmissions")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", asId<"workspaces">(workspaceId)),
        )
        .order("desc")
        .take(250),
      ctx.db
        .query("formAssignments")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", asId<"workspaces">(workspaceId)),
        )
        .take(500),
      getWorkspaceClients(ctx, workspaceId),
    ]);

    const clientMap = new Map(clients.map((row) => [String(row._id), row as ConvexDoc]));
    const templateMap = new Map(templates.map((row) => [String(row._id), row as ConvexDoc]));
    const versionIds = Array.from(
      new Set(
        submissionRows
          .map((row) => String(row.versionId))
          .filter((value) => value.length > 0),
      ),
    );
    const versions = await Promise.all(
      versionIds.map(async (versionId) => ctx.db.get(asId<"formVersions">(versionId))),
    );
    const versionMap = new Map(
      versions
        .filter((row) => Boolean(row))
        .map((row) => {
          const version = row as NonNullable<typeof row>;
          return [String(version._id), version];
        }),
    );

    return {
      listing: {
        slug: readString(listing?.slug),
        logoUrl:
          listing && workspace
            ? await getPublicListingLogoUrl(ctx, listing, workspace as ConvexDoc)
            : null,
      },
      workspace: {
        id: workspaceId,
        agencyName: readString(workspace.agencyName) ?? "GoodABA",
        contactEmail: readString(workspace.contactEmail),
        planTier: readString(workspace.planTier) ?? "free",
      },
      forms: templates
        .filter((row) => !row.deletedAt)
        .sort(
          (left, right) =>
            new Date(readString(right.updatedAt) ?? 0).getTime() -
            new Date(readString(left.updatedAt) ?? 0).getTime(),
        )
        .map((row) =>
          mapTemplateSummary(
            row as ConvexDoc,
            submissionRows.filter((submission) => String(submission.templateId) === row._id),
            assignmentRows.filter((assignment) => String(assignment.templateId) === row._id),
          ),
        ),
      submissions: submissionRows.map((row) => {
        const template = templateMap.get(String(row.templateId));
        const version = versionMap.get(String(row.versionId));
        const client = row.clientId ? clientMap.get(String(row.clientId)) : null;
        return {
          id: row._id,
          templateId: String(row.templateId),
          templateTitle: readString(template?.title) ?? "Untitled form",
          versionId: String(row.versionId),
          versionNumber:
            typeof version?.versionNumber === "number" ? version.versionNumber : 1,
          assignmentId: row.assignmentId ? String(row.assignmentId) : null,
          clientId: row.clientId ? String(row.clientId) : null,
          clientName: client ? getClientName(client) : null,
          reviewState: readString(row.reviewState) ?? "submitted",
          status: readString(row.status) ?? "submitted",
          responderName: readString(row.responderName),
          responderEmail: readString(row.responderEmail),
          submittedAt: readString(row.submittedAt) ?? readString(row.createdAt) ?? now(),
        };
      }),
      clients: clients.map((client) => ({
        id: client._id,
        name: getClientName(client),
      })),
    };
  },
});

export const getFormBuilderData = query({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const [template, versions, links] = await Promise.all([
      getTemplateById(ctx, workspaceId, args.templateId),
      ctx.db
        .query("formVersions")
        .withIndex("by_template", (q) =>
          q.eq("templateId", asId<"formTemplates">(args.templateId)),
        )
        .collect(),
      ctx.db
        .query("formLinks")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", asId<"workspaces">(workspaceId)),
        )
        .order("desc")
        .take(50),
    ]);

    return {
      id: template._id,
      slug: readString(template.slug) ?? "",
      title: readString(template.title) ?? "Untitled form",
      description: readString(template.description),
      status: readString(template.status) ?? "draft",
      draftSchemaJson: readString(template.draftSchemaJson) ?? "[]",
      latestPublishedVersionId: template.latestPublishedVersionId
        ? String(template.latestPublishedVersionId)
        : null,
      latestVersionNumber:
        typeof template.latestVersionNumber === "number"
          ? template.latestVersionNumber
          : null,
      publishedAt: readString(template.publishedAt),
      versions: versions
        .filter((row) => !row.deletedAt)
        .sort((left, right) => right.versionNumber - left.versionNumber)
        .map((row) => ({
          id: row._id,
          versionNumber: row.versionNumber,
          publishedAt: readString(row.publishedAt) ?? readString(row.createdAt) ?? now(),
        })),
      recentLinks: links
        .filter((row) => String(row.templateId) === template._id && !row.deletedAt)
        .map((row) => ({
          id: row._id,
          token: readString(row.token) ?? "",
          linkType: readString(row.linkType) ?? "generic",
          clientId: row.clientId ? String(row.clientId) : null,
          status: readString(row.status) ?? "active",
          createdAt: readString(row.createdAt) ?? now(),
          lastUsedAt: readString(row.lastUsedAt),
        })),
    };
  },
});

export const getPublishedFormTemplateOptions = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const rows = await ctx.db
      .query("formTemplates")
      .withIndex("by_workspace_and_status", (q) =>
        q
          .eq("workspaceId", asId<"workspaces">(workspaceId))
          .eq("status", "published"),
      )
      .collect();

    return rows
      .filter((row) => !row.deletedAt && row.latestPublishedVersionId)
      .map((row) => ({
        id: row._id,
        title: readString(row.title) ?? "Untitled form",
        description: readString(row.description),
        slug: readString(row.slug) ?? "",
        latestVersionId: String(row.latestPublishedVersionId),
        latestVersionNumber:
          typeof row.latestVersionNumber === "number" ? row.latestVersionNumber : 1,
      }));
  },
});

export const getClientFormsData = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const [client, assignments, submissions, templates, unassignedRows, listing] = await Promise.all([
      ctx.db.get(asId<"crmRecords">(args.clientId)),
      ctx.db
        .query("formAssignments")
        .withIndex("by_client", (q) => q.eq("clientId", asId<"crmRecords">(args.clientId)))
        .collect(),
      ctx.db
        .query("formSubmissions")
        .withIndex("by_client", (q) => q.eq("clientId", asId<"crmRecords">(args.clientId)))
        .collect(),
      getWorkspaceTemplates(ctx, workspaceId),
      ctx.db
        .query("formSubmissions")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", asId<"workspaces">(workspaceId)),
        )
        .order("desc")
        .take(200),
      getWorkspaceListing(ctx, workspaceId),
    ]);

    if (
      !client ||
      client.deletedAt ||
      client.recordType !== "client" ||
      String(client.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Client not found");
    }

    const templateMap = new Map(templates.map((row) => [String(row._id), row as ConvexDoc]));
    const versionIds = Array.from(
      new Set(
        [...assignments.map((row) => String(row.versionId)), ...submissions.map((row) => String(row.versionId))]
          .filter((value) => value.length > 0),
      ),
    );
    const versions = await Promise.all(
      versionIds.map(async (versionId) => ctx.db.get(asId<"formVersions">(versionId))),
    );
    const linkIds = Array.from(
      new Set(
        assignments
          .map((row) => (row.linkId ? String(row.linkId) : null))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const links = await Promise.all(
      linkIds.map(async (linkId) => ctx.db.get(asId<"formLinks">(linkId))),
    );
    const versionMap = new Map(
      versions
        .filter((row) => Boolean(row))
        .map((row) => {
          const version = row as NonNullable<typeof row>;
          return [String(version._id), version];
        }),
    );
    const linkMap = new Map(
      links
        .filter((row) => Boolean(row))
        .map((row) => {
          const link = row as NonNullable<typeof row>;
          return [String(link._id), link];
        }),
    );
    const providerSlug = readString(listing?.slug);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";

    return {
      client: {
        id: client._id,
        name: getClientName(client as ConvexDoc),
      },
      assignments: assignments
        .filter((row) => !row.deletedAt)
        .sort(
          (left, right) =>
            new Date(readString(right.createdAt) ?? 0).getTime() -
            new Date(readString(left.createdAt) ?? 0).getTime(),
        )
        .map((row) => {
          const template = templateMap.get(String(row.templateId));
          const version = versionMap.get(String(row.versionId));
          return {
            id: row._id,
            templateId: String(row.templateId),
            templateTitle: readString(template?.title) ?? readString(row.titleSnapshot) ?? "Untitled form",
            versionNumber:
              typeof version?.versionNumber === "number" ? version.versionNumber : 1,
            dueDate: readString(row.dueDate),
            status: readString(row.status) ?? "pending",
            createdAt: readString(row.createdAt) ?? now(),
            completedAt: readString(row.completedAt),
            taskId: row.taskId ? String(row.taskId) : null,
            linkUrl:
              providerSlug && row.linkId
                ? (() => {
                    const link = linkMap.get(String(row.linkId));
                    const token = readString(link?.token);
                    const templateSlug = readString(template?.slug);
                    return token && templateSlug
                      ? buildPublicFormAccessUrl(siteUrl, providerSlug, templateSlug, token)
                      : null;
                  })()
                : null,
          };
        }),
      submissions: submissions
        .filter((row) => !row.deletedAt)
        .sort(
          (left, right) =>
            new Date(readString(right.submittedAt) ?? 0).getTime() -
            new Date(readString(left.submittedAt) ?? 0).getTime(),
        )
        .map((row) => {
          const template = templateMap.get(String(row.templateId));
          const version = versionMap.get(String(row.versionId));
          return {
            id: row._id,
            templateId: String(row.templateId),
            templateTitle: readString(template?.title) ?? "Untitled form",
            versionNumber:
              typeof version?.versionNumber === "number" ? version.versionNumber : 1,
            reviewState: readString(row.reviewState) ?? "submitted",
            submittedAt: readString(row.submittedAt) ?? now(),
            assignmentId: row.assignmentId ? String(row.assignmentId) : null,
          };
        }),
      unassignedSubmissions: unassignedRows
        .filter((row) => !row.deletedAt && !row.clientId)
        .map((row) => {
          const template = templateMap.get(String(row.templateId));
          const version = versionMap.get(String(row.versionId));
          return {
            id: row._id,
            templateId: String(row.templateId),
            templateTitle: readString(template?.title) ?? "Untitled form",
            versionNumber:
              typeof version?.versionNumber === "number" ? version.versionNumber : 1,
            responderName: readString(row.responderName),
            responderEmail: readString(row.responderEmail),
            submittedAt: readString(row.submittedAt) ?? now(),
          };
        }),
    };
  },
});

export const getFormSubmissionDetail = query({
  args: {
    submissionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const submission = await ctx.db.get(asId<"formSubmissions">(args.submissionId));
    if (
      !submission ||
      submission.deletedAt ||
      String(submission.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Submission not found");
    }

    const [template, version, client, assignment] = await Promise.all([
      ctx.db.get(asId<"formTemplates">(submission.templateId)),
      ctx.db.get(asId<"formVersions">(submission.versionId)),
      submission.clientId ? ctx.db.get(asId<"crmRecords">(submission.clientId)) : null,
      submission.assignmentId
        ? ctx.db.get(asId<"formAssignments">(submission.assignmentId))
        : null,
    ]);

    return {
      id: submission._id,
      templateId: String(submission.templateId),
      templateTitle: readString(template?.title) ?? "Untitled form",
      versionId: String(submission.versionId),
      versionNumber:
        typeof version?.versionNumber === "number" ? version.versionNumber : 1,
      description: readString(version?.description) ?? readString(template?.description),
      questionsJson: readString(version?.schemaJson) ?? "[]",
      answersJson: readString(submission.answersJson) ?? "{}",
      reviewState: readString(submission.reviewState) ?? "submitted",
      status: readString(submission.status) ?? "submitted",
      submittedAt: readString(submission.submittedAt) ?? now(),
      responderName: readString(submission.responderName),
      responderEmail: readString(submission.responderEmail),
      clientId: submission.clientId ? String(submission.clientId) : null,
      clientName: client ? getClientName(client as ConvexDoc) : null,
      assignmentId: assignment ? assignment._id : null,
      taskId: submission.taskId ? String(submission.taskId) : null,
    };
  },
});

export const getPublicFormPageData = query({
  args: {
    providerSlug: v.string(),
    formSlug: v.string(),
    token: optionalString,
  },
  handler: async (ctx, args) => {
    const provider = await getWorkspaceByProviderSlug(ctx, args.providerSlug);
    if (!provider) {
      throw new ConvexError("Form not found");
    }

    const template = await getTemplateBySlug(
      ctx,
      String(provider.workspace._id),
      args.formSlug,
    );
    if (!template || template.deletedAt) {
      throw new ConvexError("Form not found");
    }

    const accessToken = readString(args.token);
    if (!accessToken) {
      throw new ConvexError("A valid form link is required.");
    }

    const validated = await validatePublicLinkToken(ctx, accessToken);
    if (validated.template._id !== template._id) {
      throw new ConvexError("This form link is invalid.");
    }

    const draftRows = await ctx.db
      .query("formDrafts")
      .withIndex("by_link", (q) =>
        q.eq("linkId", asId<"formLinks">(validated.link._id)),
      )
      .collect();
    const existingDraft = draftRows.find((row) => !row.deletedAt) ?? null;

    const submissionRows = validated.assignment
      ? await ctx.db
          .query("formSubmissions")
          .withIndex("by_assignment", (q) =>
            q.eq("assignmentId", asId<"formAssignments">(validated.assignment!._id)),
          )
          .collect()
      : await ctx.db
          .query("formSubmissions")
          .withIndex("by_link", (q) =>
            q.eq("linkId", asId<"formLinks">(validated.link._id)),
          )
          .collect();
    const existingSubmission = submissionRows.find((row) => !row.deletedAt) ?? null;
    const portalAccess = validated.client
      ? await getClientPortalAccessState(
          ctx,
          String(validated.workspace._id),
          String(validated.client._id),
        )
      : { enabled: false, guardianAccessConfigured: false };

    return {
      providerSlug: readString(validated.listing.slug) ?? args.providerSlug,
      listing: {
        slug: readString(validated.listing.slug) ?? args.providerSlug,
        logoUrl: await getPublicListingLogoUrl(
          ctx,
          validated.listing,
          validated.workspace,
        ),
      },
      workspace: {
        agencyName: readString(validated.workspace.agencyName) ?? "GoodABA",
        contactEmail: readString(validated.workspace.contactEmail),
        planTier: readString(validated.workspace.planTier) ?? "free",
        website: readString(asRecord(validated.workspace.settings).website),
        branding: asRecord(asRecord(validated.workspace.settings).intakeFormSettings),
      },
      template: {
        id: validated.template._id,
        slug: readString(validated.template.slug) ?? args.formSlug,
        title: readString(validated.version.title) ?? readString(validated.template.title) ?? "Untitled form",
        description: readString(validated.version.description) ?? readString(validated.template.description),
        status: readString(validated.template.status) ?? "published",
      },
      version: {
        id: validated.version._id,
        versionNumber:
          typeof validated.version.versionNumber === "number"
            ? validated.version.versionNumber
            : 1,
        schemaJson: readString(validated.version.schemaJson) ?? "[]",
      },
      link: {
        id: validated.link._id,
        type: readString(validated.link.linkType) ?? "generic",
        clientId: validated.client ? validated.client._id : null,
        clientName: validated.client ? getClientName(validated.client) : null,
      },
      portal: portalAccess,
      draftAnswersJson: readString(existingDraft?.answersJson) ?? "{}",
      existingSubmission: existingSubmission
        ? {
            id: existingSubmission._id,
            answersJson: readString(existingSubmission.answersJson) ?? "{}",
            submittedAt: readString(existingSubmission.submittedAt) ?? now(),
            reviewState: readString(existingSubmission.reviewState) ?? "submitted",
          }
        : null,
    };
  },
});

export const createFormTemplate = mutation({
  args: {
    title: optionalString,
    description: optionalString,
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const ts = now();
    const title = readString(args.title) ?? "Untitled form";
    const slug = await ensureUniqueTemplateSlug(ctx, workspaceId, title);

    const id = await ctx.db.insert("formTemplates", {
      workspaceId: asId<"workspaces">(workspaceId),
      slug,
      status: "draft",
      title,
      description: args.description ?? null,
      draftSchemaJson: "[]",
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

export const updateFormTemplateDraft = mutation({
  args: {
    templateId: v.string(),
    title: v.string(),
    description: optionalString,
    draftSchemaJson: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const template = await getTemplateById(ctx, workspaceId, args.templateId);
    if (template.status === "archived") {
      throw new ConvexError("Archived forms cannot be edited.");
    }

    const slug = await ensureUniqueTemplateSlug(ctx, workspaceId, args.title, template._id);
    await ctx.db.patch(asId<"formTemplates">(template._id), {
      title: args.title,
      description: args.description ?? null,
      slug,
      draftSchemaJson: args.draftSchemaJson,
      updatedAt: now(),
    });

    return { success: true };
  },
});

export const publishFormTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const template = await getTemplateById(ctx, workspaceId, args.templateId);
    if (template.status === "archived") {
      throw new ConvexError("Archived forms cannot be published.");
    }

    const questions = parseJsonArray(readString(template.draftSchemaJson) ?? "[]");
    if (questions.length === 0) {
      throw new ConvexError("Add at least one question before publishing.");
    }

    const nextVersionNumber =
      typeof template.latestVersionNumber === "number"
        ? template.latestVersionNumber + 1
        : 1;
    const ts = now();
    const versionId = await ctx.db.insert("formVersions", {
      workspaceId: asId<"workspaces">(workspaceId),
      templateId: asId<"formTemplates">(template._id),
      versionNumber: nextVersionNumber,
      title: readString(template.title) ?? "Untitled form",
      description: readString(template.description) ?? null,
      schemaJson: readString(template.draftSchemaJson) ?? "[]",
      publishedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    await ctx.db.patch(asId<"formTemplates">(template._id), {
      status: "published",
      latestPublishedVersionId: versionId,
      latestVersionNumber: nextVersionNumber,
      publishedAt: ts,
      updatedAt: ts,
    });

    return {
      id: template._id,
      versionId,
      versionNumber: nextVersionNumber,
    };
  },
});

export const archiveFormTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const template = await getTemplateById(ctx, workspaceId, args.templateId);
    const ts = now();

    await ctx.db.patch(asId<"formTemplates">(template._id), {
      status: "archived",
      archivedAt: ts,
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const restoreFormTemplate = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const template = await getTemplateById(ctx, workspaceId, args.templateId);
    const ts = now();
    const restoredStatus = readString(template.latestPublishedVersionId) ? "published" : "draft";

    await ctx.db.patch(asId<"formTemplates">(template._id), {
      status: restoredStatus,
      updatedAt: ts,
    });

    return { success: true, status: restoredStatus };
  },
});

export const createGenericFormLink = mutation({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const template = await getTemplateById(ctx, workspaceId, args.templateId);
    const version = await getLatestPublishedVersion(ctx, template as ConvexDoc);
    const listing = await getWorkspaceListing(ctx, workspaceId);

    if (!version || !listing || !readString(listing.slug)) {
      throw new ConvexError("Publish the form before creating a share link.");
    }

    let token = createToken();
    while (await getLinkByToken(ctx, token)) {
      token = createToken();
    }

    const ts = now();
    const linkId = await ctx.db.insert("formLinks", {
      workspaceId: asId<"workspaces">(workspaceId),
      templateId: asId<"formTemplates">(template._id),
      versionId: asId<"formVersions">(version._id),
      linkType: "generic",
      token,
      status: "active",
      expiresAt: new Date(Date.now() + FORM_LINK_TTL_MS).toISOString(),
      createdAt: ts,
      updatedAt: ts,
    });

    const providerSlug = readString(listing.slug) ?? "";
    return {
      id: linkId,
      token,
      url: buildPublicFormAccessUrl(
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org",
        providerSlug,
        readString(template.slug) ?? "",
        token,
      ),
    };
  },
});

export const assignFormsToClient = mutation({
  args: {
    clientId: v.string(),
    templateIds: v.array(v.string()),
    dueDate: optionalString,
  },
  handler: async (ctx, args) => {
    const { workspaceId, workspace } = await requireCurrentWorkspace(ctx);
    const client = await ctx.db.get(asId<"crmRecords">(args.clientId));
    const listing = await getWorkspaceListing(ctx, workspaceId);
    if (
      !client ||
      client.deletedAt ||
      client.recordType !== "client" ||
      String(client.workspaceId) !== workspaceId ||
      !listing ||
      !readString(listing.slug)
    ) {
      throw new ConvexError("Client not found");
    }

    const providerSlug = readString(listing.slug) ?? "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
    const results: Array<{
      assignmentId: string;
      linkUrl: string;
      title: string;
      taskId: string;
    }> = [];

    for (const templateId of args.templateIds) {
      const template = await getTemplateById(ctx, workspaceId, templateId);
      const version = await getLatestPublishedVersion(ctx, template as ConvexDoc);
      if (!version) {
        throw new ConvexError("Every assigned form must be published first.");
      }

      const ts = now();
      const assignmentId = await ctx.db.insert("formAssignments", {
        workspaceId: asId<"workspaces">(workspaceId),
        templateId: asId<"formTemplates">(template._id),
        versionId: asId<"formVersions">(version._id),
        clientId: asId<"crmRecords">(client._id),
        titleSnapshot: readString(version.title) ?? readString(template.title) ?? "Untitled form",
        descriptionSnapshot: readString(version.description) ?? readString(template.description) ?? null,
        dueDate: args.dueDate ?? null,
        status: "pending",
        createdAt: ts,
        updatedAt: ts,
      });

      let token = createToken();
      while (await getLinkByToken(ctx, token)) {
        token = createToken();
      }

      const linkId = await ctx.db.insert("formLinks", {
        workspaceId: asId<"workspaces">(workspaceId),
        templateId: asId<"formTemplates">(template._id),
        versionId: asId<"formVersions">(version._id),
        linkType: "client_specific",
        token,
        clientId: asId<"crmRecords">(client._id),
        assignmentId: asId<"formAssignments">(assignmentId),
        status: "active",
        expiresAt: new Date(Date.now() + FORM_LINK_TTL_MS).toISOString(),
        createdAt: ts,
        updatedAt: ts,
      });

      const linkUrl = buildPublicFormAccessUrl(
        siteUrl,
        providerSlug,
        readString(template.slug) ?? "",
        token,
      );
      const taskId = await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspaceId),
        recordType: "client_task",
        status: "pending",
        payload: {
          title: readString(version.title) ?? readString(template.title) ?? "Untitled form",
          description: readString(version.description) ?? readString(template.description) ?? null,
          instructions: readString(version.description) ?? readString(template.description) ?? null,
          dueDate: args.dueDate ?? null,
          taskType: "form_completion",
          completionMethod: "form_link",
          taskSource: "client_portal",
          externalUrl: linkUrl,
          formTemplateId: template._id,
          formVersionId: version._id,
          formAssignmentId: assignmentId,
          formLinkId: linkId,
        },
        relatedIds: { clientId: client._id },
        createdAt: ts,
        updatedAt: ts,
      });

      await ctx.db.patch(asId<"formAssignments">(assignmentId), {
        linkId,
        taskId,
        updatedAt: now(),
      });

      results.push({
        assignmentId,
        linkUrl,
        title: readString(version.title) ?? readString(template.title) ?? "Untitled form",
        taskId,
      });
    }

    return {
      clientId: client._id,
      clientName: getClientName(client as ConvexDoc),
      providerSlug,
      agencyName: readString(workspace.agencyName) ?? "GoodABA",
      assignments: results,
    };
  },
});

export const attachFormSubmissionToClient = mutation({
  args: {
    submissionId: v.string(),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const [submission, client] = await Promise.all([
      ctx.db.get(asId<"formSubmissions">(args.submissionId)),
      ctx.db.get(asId<"crmRecords">(args.clientId)),
    ]);

    if (
      !submission ||
      submission.deletedAt ||
      String(submission.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Submission not found");
    }

    if (
      !client ||
      client.deletedAt ||
      client.recordType !== "client" ||
      String(client.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Client not found");
    }

    await ctx.db.patch(asId<"formSubmissions">(submission._id), {
      clientId: asId<"crmRecords">(client._id),
      status: "attached",
      updatedAt: now(),
    });

    return { success: true };
  },
});

export const updateFormSubmissionReviewState = mutation({
  args: {
    submissionId: v.string(),
    reviewState: v.union(
      v.literal("submitted"),
      v.literal("reviewed"),
      v.literal("flagged"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const submission = await ctx.db.get(asId<"formSubmissions">(args.submissionId));
    if (
      !submission ||
      submission.deletedAt ||
      String(submission.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Submission not found");
    }

    await ctx.db.patch(asId<"formSubmissions">(submission._id), {
      reviewState: args.reviewState,
      updatedAt: now(),
    });

    return { success: true };
  },
});

export const upsertPublicFormDraft = mutation({
  args: {
    token: v.string(),
    answersJson: v.string(),
  },
  handler: async (ctx, args) => {
    const validated = await validatePublicLinkToken(ctx, args.token);
    const ts = now();
    const existingRows = await ctx.db
      .query("formDrafts")
      .withIndex("by_link", (q) =>
        q.eq("linkId", asId<"formLinks">(validated.link._id)),
      )
      .collect();
    const existing = existingRows.find((row) => !row.deletedAt) ?? null;

    if (existing) {
      await ctx.db.patch(asId<"formDrafts">(existing._id), {
        answersJson: args.answersJson,
        lastSavedAt: ts,
        updatedAt: ts,
      });
      return { id: existing._id };
    }

    const id = await ctx.db.insert("formDrafts", {
      workspaceId: asId<"workspaces">(validated.workspace._id),
      templateId: asId<"formTemplates">(validated.template._id),
      versionId: asId<"formVersions">(validated.version._id),
      assignmentId: validated.assignment
        ? asId<"formAssignments">(validated.assignment._id)
        : undefined,
      linkId: asId<"formLinks">(validated.link._id),
      clientId: validated.client ? asId<"crmRecords">(validated.client._id) : undefined,
      taskId:
        validated.assignment?.taskId
          ? asId<"crmRecords">(validated.assignment.taskId)
          : undefined,
      tokenFingerprint: args.token.slice(0, 16),
      answersJson: args.answersJson,
      lastSavedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

export const generatePublicFormUploadUrl = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await validatePublicLinkToken(ctx, args.token);
    return { url: await ctx.storage.generateUploadUrl() };
  },
});

export const registerPublicFormUpload = mutation({
  args: {
    token: v.string(),
    storageId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  handler: async (ctx, args) => {
    const validated = await validatePublicLinkToken(ctx, args.token);
    const ts = now();
    const storageDoc = await ctx.db.system.get(
      "_storage",
      asId<"_storage">(args.storageId),
    );

    const fileId = await ctx.db.insert("files", {
      workspaceId: asId<"workspaces">(validated.workspace._id),
      storageId: asId<"_storage">(args.storageId),
      bucket: "form-uploads",
      storageKey: `forms/${validated.template._id}/${args.storageId}`,
      filename: args.fileName,
      mimeType: readString(storageDoc?.contentType) ?? args.mimeType,
      byteSize:
        typeof storageDoc?.size === "number" ? storageDoc.size : args.byteSize,
      visibility: "private",
      relatedTable: "formLinks",
      relatedId: validated.link._id,
      metadata: {
        formTemplateId: validated.template._id,
        formVersionId: validated.version._id,
        formLinkId: validated.link._id,
      },
      createdAt: ts,
      updatedAt: ts,
    });

    return {
      fileId,
      fileName: args.fileName,
      mimeType: readString(storageDoc?.contentType) ?? args.mimeType,
      byteSize:
        typeof storageDoc?.size === "number" ? storageDoc.size : args.byteSize,
    };
  },
});

export const submitPublicForm = mutation({
  args: {
    token: v.string(),
    answersJson: v.string(),
    responderName: optionalString,
    responderEmail: optionalString,
  },
  handler: async (ctx, args) => {
    const validated = await validatePublicLinkToken(ctx, args.token);

    if (validated.assignment) {
      const existingRows = await ctx.db
        .query("formSubmissions")
        .withIndex("by_assignment", (q) =>
          q.eq("assignmentId", asId<"formAssignments">(validated.assignment!._id)),
        )
        .collect();
      const existing = existingRows.find((row) => !row.deletedAt) ?? null;
      if (existing) {
        throw new ConvexError("This form has already been submitted.");
      }
    }

    validateRequiredAnswers(
      readString(validated.version.schemaJson) ?? "[]",
      args.answersJson,
    );

    const ts = now();
    const taskId = validated.assignment?.taskId
      ? String(validated.assignment.taskId)
      : null;
    const submissionId = await ctx.db.insert("formSubmissions", {
      workspaceId: asId<"workspaces">(validated.workspace._id),
      templateId: asId<"formTemplates">(validated.template._id),
      versionId: asId<"formVersions">(validated.version._id),
      assignmentId: validated.assignment
        ? asId<"formAssignments">(validated.assignment._id)
        : undefined,
      linkId: asId<"formLinks">(validated.link._id),
      clientId: validated.client ? asId<"crmRecords">(validated.client._id) : undefined,
      taskId: taskId ? asId<"crmRecords">(taskId) : undefined,
      reviewState: "submitted",
      status: validated.client ? "attached" : "submitted",
      responderType: validated.client ? "client" : "public",
      responderName: args.responderName ?? null,
      responderEmail: args.responderEmail ?? null,
      answersJson: args.answersJson,
      submittedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    if (validated.assignment) {
      await ctx.db.patch(asId<"formAssignments">(validated.assignment._id), {
        status: "completed",
        completedAt: ts,
        updatedAt: ts,
      });
    }

    if (taskId) {
      const task = await ctx.db.get(asId<"crmRecords">(taskId));
      if (task && !task.deletedAt && task.recordType === "client_task") {
        const payload = asRecord(task.payload);
        await ctx.db.patch(asId<"crmRecords">(task._id), {
          status: "completed",
          payload: {
            ...payload,
            submittedAt: ts,
            completedAt: ts,
            formSubmissionId: submissionId,
          },
          updatedAt: ts,
        });
      }
    }

    await ctx.db.patch(asId<"formLinks">(validated.link._id), {
      status: validated.link.linkType === "client_specific" ? "submitted" : "active",
      usedAt: ts,
      lastUsedAt: ts,
      updatedAt: ts,
    });

    const draftRows = await ctx.db
      .query("formDrafts")
      .withIndex("by_link", (q) =>
        q.eq("linkId", asId<"formLinks">(validated.link._id)),
      )
      .collect();
    for (const row of draftRows) {
      await ctx.db.delete(asId<"formDrafts">(row._id));
    }

    await ctx.db.insert("notificationRecords", {
      workspaceId: asId<"workspaces">(validated.workspace._id),
      notificationType: "system",
      status: "unread",
      payload: {
        title: validated.client
          ? `${readString(validated.version.title) ?? readString(validated.template.title) ?? "Form"} submitted by ${getClientName(validated.client)}`
          : `${readString(validated.version.title) ?? readString(validated.template.title) ?? "Form"} submitted from shared link`,
        body: validated.client
          ? `${getClientName(validated.client)} completed a form.`
          : `${readString(args.responderName) ?? "A family"} completed a shared form.`,
        link: `/dashboard/forms/custom?tab=submissions&submissionId=${submissionId}`,
        entityId: submissionId,
        entityType: "form_submission",
      },
      createdAt: ts,
      updatedAt: ts,
    });

    return {
      submissionId,
      clientId: validated.client ? validated.client._id : null,
      providerEmail: readString(validated.workspace.contactEmail),
      providerAgencyName: readString(validated.workspace.agencyName) ?? "GoodABA",
      formTitle: readString(validated.version.title) ?? readString(validated.template.title) ?? "Untitled form",
      clientName: validated.client ? getClientName(validated.client) : null,
      providerSlug: readString(validated.listing.slug) ?? "",
    };
  },
});

export const getFormFileUrl = query({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const file = await ctx.db.get(asId<"files">(args.fileId));
    if (!file || file.deletedAt || String(file.workspaceId) !== workspaceId) {
      throw new ConvexError("File not found");
    }

    const storageId = readString(file.storageId);
    if (!storageId) {
      throw new ConvexError("File not found");
    }

    const url = await ctx.storage.getUrl(asId<"_storage">(storageId));
    if (!url) {
      throw new ConvexError("File not found");
    }

    return {
      url,
      fileName: readString(file.filename) ?? "download",
    };
  },
});

export const getPublicFormFileUrl = query({
  args: {
    token: v.string(),
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const validated = await validatePublicLinkToken(ctx, args.token);
    const file = await ctx.db.get(asId<"files">(args.fileId));
    if (
      !file ||
      file.deletedAt ||
      String(file.workspaceId) !== String(validated.workspace._id) ||
      readString(file.relatedTable) !== "formLinks" ||
      readString(file.relatedId) !== String(validated.link._id)
    ) {
      throw new ConvexError("File not found");
    }

    const storageId = readString(file.storageId);
    if (!storageId) {
      throw new ConvexError("File not found");
    }

    const url = await ctx.storage.getUrl(asId<"_storage">(storageId));
    if (!url) {
      throw new ConvexError("File not found");
    }

    return {
      url,
      fileName: readString(file.filename) ?? "download",
    };
  },
});
