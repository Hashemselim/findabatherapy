import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import {
  asId,
  asRecord,
  now,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
  requireCurrentWorkspace,
  requireIdentity,
  type ConvexDoc,
} from "./_helpers";
import { getPublicListingLogoUrl } from "./lib/public_branding";

type ConvexCtx = QueryCtx | MutationCtx;

const PORTAL_GUARDIAN_TOKEN_TYPE = "client_portal_guardian";
const PORTAL_ACTIVITY_TYPE = "client_portal_activity";
const PORTAL_SETTINGS_TYPE = "client_portal_settings";
const PORTAL_RESOURCE_TYPE = "client_portal_resource";
const PORTAL_TOOL_TYPE = "client_portal_tool";
const CLIENT_INTAKE_TOKEN_TYPE = "client_intake";
const CLIENT_INTAKE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const optionalString = v.optional(v.union(v.string(), v.null()));

const portalTaskInputValidator = {
  recordId: v.optional(v.string()),
  clientId: v.string(),
  title: v.string(),
  instructions: optionalString,
  dueDate: optionalString,
  taskType: v.string(),
  formKey: optionalString,
  status: optionalString,
  externalUrl: optionalString,
  linkedDocumentId: optionalString,
  requiredDocumentType: optionalString,
  completionNote: optionalString,
};

const portalDocumentInputValidator = {
  recordId: v.optional(v.string()),
  clientId: v.string(),
  existingDocumentId: v.optional(v.string()),
  label: optionalString,
  category: optionalString,
  note: optionalString,
  visibility: optionalString,
  acknowledgementRequired: v.optional(v.boolean()),
  notifyFamily: v.optional(v.boolean()),
  linkedTaskId: optionalString,
};

const portalMessageInputValidator = {
  recordId: v.optional(v.string()),
  clientId: v.string(),
  subject: v.string(),
  body: v.string(),
  messageType: optionalString,
  audience: optionalString,
  emailNotify: v.optional(v.boolean()),
};

const portalResourceInputValidator = {
  recordId: v.optional(v.string()),
  clientId: v.string(),
  title: v.string(),
  description: optionalString,
  href: optionalString,
  category: optionalString,
  recommendedStage: optionalString,
  pinned: v.optional(v.boolean()),
  visibility: optionalString,
};

const portalToolInputValidator = {
  recordId: v.optional(v.string()),
  clientId: v.string(),
  name: v.string(),
  description: optionalString,
  url: optionalString,
  category: optionalString,
  whenToUse: optionalString,
  logoLabel: optionalString,
  visibility: optionalString,
};

const profileUpdateValidator = {
  phone: optionalString,
  email: optionalString,
  streetAddress: optionalString,
  city: optionalString,
  state: optionalString,
  postalCode: optionalString,
  insuranceName: optionalString,
  insuranceMemberId: optionalString,
  insuranceGroupNumber: optionalString,
  emergencyContactName: optionalString,
  emergencyContactPhone: optionalString,
  emergencyContactRelationship: optionalString,
};

function readPayloadString(
  payload: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = readString(payload[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function hasDefinedValue(values: Array<unknown>) {
  return values.some((value) => value !== undefined);
}

function createPortalTokenValue() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function getWorkspaceListing(ctx: ConvexCtx, workspaceId: string) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();

  return (
    listings.find((listing) => !listing.deletedAt && listing.status === "published") ??
    listings.find((listing) => !listing.deletedAt) ??
    null
  );
}

async function getPublishedListingBySlug(ctx: ConvexCtx, slug: string) {
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .collect();

  const listing =
    listings.find((row) => !row.deletedAt && row.status === "published") ?? null;
  if (!listing) {
    return null;
  }

  const workspace = await ctx.db.get(asId<"workspaces">(String(listing.workspaceId)));
  if (!workspace || workspace.deletedAt) {
    return null;
  }

  return {
    listing,
    workspace: workspace as ConvexDoc,
  };
}

async function getTokenRowByToken(ctx: ConvexCtx, token: string) {
  const rows = await ctx.db
    .query("intakeTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();

  return (rows as ConvexDoc[])[0] ?? null;
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}

function getGuardianEmail(guardian: ConvexDoc) {
  return readPayloadString(asRecord(guardian.payload), "email");
}

function getGuardianClientId(guardian: ConvexDoc) {
  return readPayloadString(asRecord(guardian.relatedIds), "clientId");
}

function getGuardianLinkedClerkUserId(guardian: ConvexDoc) {
  return readPayloadString(asRecord(guardian.payload), "portalClerkUserId");
}

function isGuardianRevoked(guardian: ConvexDoc) {
  return readPayloadString(asRecord(guardian.payload), "portalAccessStatus") === "revoked";
}

function guardianMatchesIdentity(
  guardian: ConvexDoc,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
) {
  if (guardian.deletedAt || guardian.recordType !== "client_parent" || isGuardianRevoked(guardian)) {
    return false;
  }

  const linkedClerkUserId = getGuardianLinkedClerkUserId(guardian);
  if (linkedClerkUserId && linkedClerkUserId === identity.subject) {
    return true;
  }

  const guardianEmail = normalizeEmail(getGuardianEmail(guardian));
  const identityEmail = normalizeEmail(identity.email ?? undefined);
  return Boolean(guardianEmail && identityEmail && guardianEmail === identityEmail);
}

function choosePreferredGuardian(current: ConvexDoc | null, candidate: ConvexDoc) {
  if (!current) {
    return candidate;
  }

  const currentPayload = asRecord(current.payload);
  const candidatePayload = asRecord(candidate.payload);
  const currentLinked = Boolean(readPayloadString(currentPayload, "portalClerkUserId"));
  const candidateLinked = Boolean(readPayloadString(candidatePayload, "portalClerkUserId"));

  if (candidateLinked && !currentLinked) {
    return candidate;
  }

  const currentPrimary = readBoolean(currentPayload.isPrimary ?? currentPayload.is_primary);
  const candidatePrimary = readBoolean(candidatePayload.isPrimary ?? candidatePayload.is_primary);
  if (candidatePrimary && !currentPrimary) {
    return candidate;
  }

  return current;
}

async function linkGuardianIdentityIfNeeded(
  ctx: MutationCtx,
  guardian: ConvexDoc,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
  options?: {
    forceActive?: boolean;
  },
) {
  const payload = asRecord(guardian.payload);
  const linkedClerkUserId = readPayloadString(payload, "portalClerkUserId");
  const ts = now();

  if (linkedClerkUserId && linkedClerkUserId !== identity.subject) {
    throw new ConvexError("This guardian access is already linked to another account");
  }

  if (linkedClerkUserId === identity.subject && !options?.forceActive) {
    return guardian;
  }

  const nextAccessStatus =
    options?.forceActive
      ? "active"
      : readPayloadString(payload, "portalAccessStatus") ?? "active";

  await ctx.db.patch(asId<"crmRecords">(guardian._id), {
    payload: {
      ...payload,
      portalClerkUserId: identity.subject,
      portalLinkedEmail: normalizeEmail(identity.email ?? undefined),
      portalAccountLinkedAt: readPayloadString(payload, "portalAccountLinkedAt") ?? ts,
      portalAccessStatus: nextAccessStatus,
      portalInviteAcceptedAt:
        options?.forceActive
          ? readPayloadString(payload, "portalInviteAcceptedAt") ?? ts
          : readPayloadString(payload, "portalInviteAcceptedAt"),
      portalLastViewedAt: ts,
    },
    updatedAt: ts,
  });

  return {
    ...guardian,
    payload: {
      ...payload,
      portalClerkUserId: identity.subject,
      portalLinkedEmail: normalizeEmail(identity.email ?? undefined),
      portalAccountLinkedAt: readPayloadString(payload, "portalAccountLinkedAt") ?? ts,
      portalAccessStatus: nextAccessStatus,
      portalInviteAcceptedAt:
        options?.forceActive
          ? readPayloadString(payload, "portalInviteAcceptedAt") ?? ts
          : readPayloadString(payload, "portalInviteAcceptedAt"),
      portalLastViewedAt: ts,
    },
    updatedAt: ts,
  } satisfies ConvexDoc;
}

async function getAuthenticatedPortalGuardiansForWorkspace(
  ctx: ConvexCtx,
  workspaceId: string,
  identity: Awaited<ReturnType<typeof requireIdentity>>,
) {
  const guardians = await getWorkspaceCrmRecordsByType(ctx, workspaceId, "client_parent");
  const preferredByClientId = new Map<string, ConvexDoc>();

  for (const row of guardians as ConvexDoc[]) {
    if (!guardianMatchesIdentity(row, identity)) {
      continue;
    }

    const clientId = getGuardianClientId(row);
    if (!clientId) {
      continue;
    }

    preferredByClientId.set(
      clientId,
      choosePreferredGuardian(preferredByClientId.get(clientId) ?? null, row),
    );
  }

  return [...preferredByClientId.entries()].map(([clientId, guardian]) => ({
    clientId,
    guardian,
  }));
}

async function getClientRecord(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const client = await ctx.db.get(asId<"crmRecords">(clientId));
  if (
    !client ||
    client.deletedAt ||
    client.recordType !== "client" ||
    String(client.workspaceId) !== workspaceId
  ) {
    throw new ConvexError("Client not found");
  }

  return client as ConvexDoc;
}

async function getWorkspaceCrmRecordsByType(
  ctx: ConvexCtx,
  workspaceId: string,
  recordType: string,
) {
  return ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", recordType),
    )
    .collect();
}

async function getClientSubRecords(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
  recordType: string,
) {
  const rows = await getWorkspaceCrmRecordsByType(ctx, workspaceId, recordType);

  return rows.filter((row) => {
    if (row.deletedAt) {
      return false;
    }

    const relatedIds = asRecord(row.relatedIds);
    return readString(relatedIds.clientId) === clientId;
  }) as ConvexDoc[];
}

async function getClientPortalSettingsRecord(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const rows = await getClientSubRecords(
    ctx,
    workspaceId,
    clientId,
    PORTAL_SETTINGS_TYPE,
  );
  return rows[0] ?? null;
}

async function ensureClientPortalSettingsRecord(
  ctx: MutationCtx,
  workspaceId: string,
  clientId: string,
) {
  const existing = await getClientPortalSettingsRecord(ctx, workspaceId, clientId);
  if (existing) {
    return existing;
  }

  const ts = now();
  const id = await ctx.db.insert("crmRecords", {
    workspaceId: asId<"workspaces">(workspaceId),
    recordType: PORTAL_SETTINGS_TYPE,
    status: "active",
    payload: {
      enabled: false,
      notifyOnNewTask: true,
      notifyOnNewDocument: true,
      notifyOnNewMessage: true,
      notifyOnReminder: true,
    },
    relatedIds: { clientId },
    createdAt: ts,
    updatedAt: ts,
  });

  const record = await ctx.db.get(id);
  if (!record) {
    throw new ConvexError("Failed to initialize portal settings");
  }
  return record as ConvexDoc;
}

function getPortalSettings(record: ConvexDoc | null) {
  const payload = asRecord(record?.payload);
  return {
    enabled: readBoolean(payload.enabled, false),
    notifyOnNewTask: readBoolean(payload.notifyOnNewTask, true),
    notifyOnNewDocument: readBoolean(payload.notifyOnNewDocument, true),
    notifyOnNewMessage: readBoolean(payload.notifyOnNewMessage, true),
    notifyOnReminder: readBoolean(payload.notifyOnReminder, true),
  };
}

function getClientName(client: ConvexDoc) {
  const payload = asRecord(client.payload);
  return (
    [
      readPayloadString(payload, "firstName", "child_first_name"),
      readPayloadString(payload, "lastName", "child_last_name"),
    ]
      .filter(Boolean)
      .join(" ") || "your child"
  );
}

function getGuardianName(guardian: ConvexDoc) {
  const payload = asRecord(guardian.payload);
  return (
    [
      readPayloadString(payload, "firstName", "first_name"),
      readPayloadString(payload, "lastName", "last_name"),
    ]
      .filter(Boolean)
      .join(" ") ||
    readPayloadString(payload, "relationship") ||
    "Guardian"
  );
}

function mapGuardian(guardian: ConvexDoc) {
  const payload = asRecord(guardian.payload);
  return {
    id: guardian._id,
    name: getGuardianName(guardian),
    firstName: readPayloadString(payload, "firstName", "first_name"),
    lastName: readPayloadString(payload, "lastName", "last_name"),
    relationship: readPayloadString(payload, "relationship") ?? "guardian",
    email: readPayloadString(payload, "email"),
    phone: readPayloadString(payload, "phone"),
    isPrimary: readBoolean(payload.isPrimary ?? payload.is_primary),
    accessStatus:
      readPayloadString(payload, "portalAccessStatus") ??
      (readPayloadString(payload, "email") ? "ready" : "draft"),
    notificationsEnabled: readBoolean(payload.portalNotificationsEnabled, true),
    invitedAt: readPayloadString(payload, "portalInviteSentAt"),
    acceptedAt: readPayloadString(payload, "portalInviteAcceptedAt"),
    revokedAt: readPayloadString(payload, "portalRevokedAt"),
    lastViewedAt: readPayloadString(payload, "portalLastViewedAt"),
  };
}

function mapTask(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const taskType = normalizePortalTaskType(payload);
  return {
    id: row._id,
    title: readPayloadString(payload, "title") ?? "Task",
    instructions:
      readPayloadString(payload, "instructions", "description") ?? null,
    dueDate: readPayloadString(payload, "dueDate"),
    category: readPayloadString(payload, "category") ?? "general",
    taskType,
    completionMethod: readPayloadString(payload, "completionMethod") ?? deriveCompletionMethod(taskType, readPayloadString(payload, "externalUrl")),
    status: readString(row.status) ?? "pending",
    visibility: readPayloadString(payload, "visibility") ?? "action_required",
    reminderRule: readPayloadString(payload, "reminderRule"),
    templateSource: readPayloadString(payload, "templateSource"),
    formKey: readPayloadString(payload, "formKey"),
    externalUrl: readPayloadString(payload, "externalUrl"),
    linkedDocumentId:
      readPayloadString(payload, "linkedDocumentId") ??
      (taskType === "review_and_sign"
        ? readPayloadString(payload, "submittedDocumentId")
        : null),
    linkedToolId: readPayloadString(payload, "linkedToolId"),
    submittedDocumentId: readPayloadString(payload, "submittedDocumentId"),
    requiredDocumentType: readPayloadString(payload, "requiredDocumentType"),
    completionNote: readPayloadString(payload, "completionNote"),
    completedAt: readPayloadString(payload, "completedAt", "submittedAt"),
    completedByGuardianId: readPayloadString(payload, "completedByGuardianId"),
    createdAt: readPayloadString(row, "createdAt") ?? now(),
    updatedAt: readPayloadString(row, "updatedAt") ?? now(),
  };
}

function mapDocument(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    label:
      readPayloadString(payload, "label", "filename") ?? "Document",
    category:
      readPayloadString(payload, "category", "documentType") ?? "other",
    note:
      readPayloadString(payload, "shareNote", "fileDescription", "notes") ?? null,
    visibility: readPayloadString(payload, "visibility") ?? "visible",
    acknowledgementRequired: readBoolean(payload.acknowledgementRequired),
    acknowledgedByGuardianIds: readStringArray(payload.acknowledgedByGuardianIds),
    fileId: readPayloadString(payload, "fileId"),
    filename: readPayloadString(payload, "filename"),
    mimeType: readPayloadString(payload, "mimeType"),
    byteSize: readNumber(payload.byteSize, 0),
    uploadSource: readPayloadString(payload, "uploadSource") ?? "dashboard",
    linkedTaskId: readPayloadString(payload, "linkedTaskId"),
    createdAt: readPayloadString(row, "createdAt") ?? now(),
    updatedAt: readPayloadString(row, "updatedAt") ?? now(),
  };
}

function normalizePortalTaskType(payload: Record<string, unknown>) {
  const explicitType = readPayloadString(payload, "taskType");
  if (
    explicitType === "form_completion" ||
    explicitType === "file_upload" ||
    explicitType === "review_and_sign" ||
    explicitType === "custom_task"
  ) {
    return explicitType;
  }

  const completionMethod = readPayloadString(payload, "completionMethod") ?? "manual";
  switch (completionMethod) {
    case "document_upload":
      return "file_upload";
    case "acknowledge_document":
      return "review_and_sign";
    case "profile_update":
      return "form_completion";
    default:
      return "custom_task";
  }
}

function deriveCompletionMethod(taskType: string, externalUrl: string | null | undefined) {
  switch (taskType) {
    case "form_completion":
      return "profile_update";
    case "file_upload":
      return "document_upload";
    case "review_and_sign":
      return "acknowledge_document";
    case "custom_task":
      return externalUrl ? "external_link" : "manual";
    default:
      return "manual";
  }
}

function mapMessage(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    subject: readPayloadString(payload, "subject") ?? "Update",
    body: readPayloadString(payload, "body") ?? "",
    preview:
      readPayloadString(payload, "preview") ??
      (readPayloadString(payload, "body") ?? "").slice(0, 140),
    messageType: readPayloadString(payload, "messageType") ?? "general_update",
    audience: readPayloadString(payload, "audience") ?? "client",
    emailNotify: readBoolean(payload.emailNotify),
    readByGuardianIds: readStringArray(payload.readByGuardianIds),
    createdAt: readPayloadString(row, "createdAt") ?? now(),
    updatedAt: readPayloadString(row, "updatedAt") ?? now(),
  };
}

function mapResource(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    title: readPayloadString(payload, "title") ?? "Resource",
    description: readPayloadString(payload, "description"),
    href: readPayloadString(payload, "href"),
    category: readPayloadString(payload, "category") ?? "general",
    recommendedStage: readPayloadString(payload, "recommendedStage"),
    pinned: readBoolean(payload.pinned),
    visibility: readPayloadString(payload, "visibility") ?? "visible",
    createdAt: readPayloadString(row, "createdAt") ?? now(),
    updatedAt: readPayloadString(row, "updatedAt") ?? now(),
  };
}

function mapTool(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    name: readPayloadString(payload, "name") ?? "Connected tool",
    description: readPayloadString(payload, "description"),
    url: readPayloadString(payload, "url"),
    category: readPayloadString(payload, "category") ?? "general",
    whenToUse: readPayloadString(payload, "whenToUse"),
    logoLabel: readPayloadString(payload, "logoLabel"),
    visibility: readPayloadString(payload, "visibility") ?? "visible",
    createdAt: readPayloadString(row, "createdAt") ?? now(),
    updatedAt: readPayloadString(row, "updatedAt") ?? now(),
  };
}

function mapActivity(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    title: readPayloadString(payload, "title") ?? "Portal activity",
    description: readPayloadString(payload, "description"),
    actorType: readPayloadString(payload, "actorType") ?? "system",
    actorName: readPayloadString(payload, "actorName"),
    entityType: readPayloadString(payload, "entityType"),
    entityId: readPayloadString(payload, "entityId"),
    createdAt: readPayloadString(row, "createdAt") ?? now(),
  };
}

function sortByNewest<T extends { createdAt: string }>(rows: T[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function sortTasks(rows: ReturnType<typeof mapTask>[]) {
  return [...rows].sort((left, right) => {
    const leftDone =
      left.status === "completed" ||
      left.status === "submitted" ||
      left.status === "cancelled";
    const rightDone =
      right.status === "completed" ||
      right.status === "submitted" ||
      right.status === "cancelled";

    if (leftDone !== rightDone) {
      return Number(leftDone) - Number(rightDone);
    }

    const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function buildPortalProfile(
  client: ConvexDoc,
  guardians: ConvexDoc[],
  locations: ConvexDoc[],
  insurances: ConvexDoc[],
  contacts: ConvexDoc[],
) {
  const clientPayload = asRecord(client.payload);
  const primaryGuardian =
    guardians.find((guardian) => readBoolean(asRecord(guardian.payload).isPrimary)) ??
    guardians[0] ??
    null;
  const primaryLocation =
    locations.find((location) => readBoolean(asRecord(location.payload).isPrimary)) ??
    locations[0] ??
    null;
  const primaryInsurance =
    insurances.find((insurance) => readBoolean(asRecord(insurance.payload).isPrimary)) ??
    insurances[0] ??
    null;
  const emergencyContact =
    contacts.find((contact) => {
      const payload = asRecord(contact.payload);
      return readPayloadString(payload, "contactType") === "emergency";
    }) ?? null;

  const primaryGuardianPayload = asRecord(primaryGuardian?.payload);
  const locationPayload = asRecord(primaryLocation?.payload);
  const insurancePayload = asRecord(primaryInsurance?.payload);
  const emergencyPayload = asRecord(emergencyContact?.payload);

  return {
    phone: readPayloadString(primaryGuardianPayload, "phone"),
    email: readPayloadString(primaryGuardianPayload, "email"),
    streetAddress: readPayloadString(locationPayload, "streetAddress", "street_address"),
    city: readPayloadString(locationPayload, "city"),
    state: readPayloadString(locationPayload, "state"),
    postalCode: readPayloadString(locationPayload, "postalCode", "postal_code"),
    insuranceName: readPayloadString(insurancePayload, "providerName", "insurance_name"),
    insuranceMemberId: readPayloadString(insurancePayload, "memberId", "member_id", "insurance_member_id"),
    insuranceGroupNumber: readPayloadString(insurancePayload, "groupNumber", "group_number", "insurance_group_number"),
    emergencyContactName:
      [
        readPayloadString(emergencyPayload, "firstName", "first_name", "label"),
        readPayloadString(emergencyPayload, "lastName", "last_name"),
      ]
        .filter(Boolean)
        .join(" ") || null,
    emergencyContactPhone: readPayloadString(emergencyPayload, "phone", "value"),
    emergencyContactRelationship: readPayloadString(emergencyPayload, "relationship"),
    childName: getClientName(client),
    childDateOfBirth: readPayloadString(clientPayload, "dateOfBirth", "child_date_of_birth"),
  };
}

async function getPortalCommunicationRows(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const rows = await ctx.db
    .query("communicationRecords")
    .withIndex("by_workspace_and_subject", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("subjectType", "client"),
    )
    .collect();

  return rows.filter((row) => {
    if (row.deletedAt) {
      return false;
    }

    const payload = asRecord(row.payload);
    return row.subjectId === clientId && readPayloadString(payload, "channel") === "portal";
  }) as ConvexDoc[];
}

async function logPortalActivity(
  ctx: MutationCtx,
  workspaceId: string,
  clientId: string,
  params: {
    title: string;
    description?: string | null;
    actorType: string;
    actorName?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
) {
  const ts = now();
  await ctx.db.insert("crmRecords", {
    workspaceId: asId<"workspaces">(workspaceId),
    recordType: PORTAL_ACTIVITY_TYPE,
    status: "logged",
    payload: {
      title: params.title,
      description: params.description ?? null,
      actorType: params.actorType,
      actorName: params.actorName ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
    },
    relatedIds: { clientId },
    createdAt: ts,
    updatedAt: ts,
  });
}

async function createPortalNotification(
  ctx: MutationCtx,
  workspaceId: string,
  params: {
    title: string;
    body?: string | null;
    link?: string | null;
    entityId?: string | null;
    entityType?: string | null;
  },
) {
  const ts = now();
  await ctx.db.insert("notificationRecords", {
    workspaceId: asId<"workspaces">(workspaceId),
    notificationType: "system",
    status: "unread",
    payload: {
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      entityId: params.entityId ?? null,
      entityType: params.entityType ?? null,
      readAt: null,
    },
    createdAt: ts,
    updatedAt: ts,
  });
}

async function requirePortalGuardianToken(ctx: ConvexCtx, token: string) {
  const tokenRow = await getTokenRowByToken(ctx, token);
  if (
    !tokenRow ||
    readPayloadString(tokenRow, "subjectType") !== PORTAL_GUARDIAN_TOKEN_TYPE ||
    !readPayloadString(tokenRow, "subjectId")
  ) {
    throw new ConvexError("Invalid or expired portal link");
  }

  if (tokenRow.expiresAt && new Date(String(tokenRow.expiresAt)) < new Date()) {
    throw new ConvexError("This portal link has expired");
  }

  const guardianId = readPayloadString(tokenRow, "subjectId");
  const tokenPayload = asRecord(tokenRow.payload);
  const clientId =
    readPayloadString(tokenPayload, "clientId") ?? null;
  if (!guardianId || !clientId) {
    throw new ConvexError("Invalid or expired portal link");
  }

  const guardian = await ctx.db.get(asId<"crmRecords">(guardianId));
  if (
    !guardian ||
    guardian.deletedAt ||
    guardian.recordType !== "client_parent" ||
    String(guardian.workspaceId) !== String(tokenRow.workspaceId)
  ) {
    throw new ConvexError("Invalid or expired portal link");
  }

  const guardianPayload = asRecord(guardian.payload);
  if (readPayloadString(guardianPayload, "portalAccessStatus") === "revoked") {
    throw new ConvexError("Portal access has been revoked");
  }

  const client = await getClientRecord(ctx, String(tokenRow.workspaceId), clientId);
  return {
    tokenRow,
    guardian: guardian as ConvexDoc,
    client,
    guardianId,
    clientId,
    workspaceId: String(tokenRow.workspaceId),
  };
}

async function requireAuthenticatedPortalAccess(
  ctx: ConvexCtx,
  slug: string,
  clientId?: string | null,
) {
  const identity = await requireIdentity(ctx);
  const listingRow = await getPublishedListingBySlug(ctx, slug);
  if (!listingRow) {
    throw new ConvexError("Portal not found");
  }

  const workspaceId = String(listingRow.listing.workspaceId);
  const matches = await getAuthenticatedPortalGuardiansForWorkspace(ctx, workspaceId, identity);
  if (matches.length === 0) {
    throw new ConvexError("No family portal access was found for this account");
  }

  const selected =
    clientId
      ? matches.find((match) => match.clientId === clientId) ?? null
      : matches.length === 1
        ? matches[0] ?? null
        : null;

  if (!selected) {
    throw new ConvexError("Select a child to continue");
  }

  const client = await getClientRecord(ctx, workspaceId, selected.clientId);

  return {
    guardian: selected.guardian,
    client,
    guardianId: selected.guardian._id,
    clientId: selected.clientId,
    workspaceId,
    listing: listingRow.listing as ConvexDoc,
    workspace: listingRow.workspace,
    identity,
  };
}

async function requireResolvedPortalAccess(
  ctx: ConvexCtx,
  args: {
    token?: string | null;
    slug?: string | null;
    clientId?: string | null;
  },
) {
  if (args.token) {
    return requirePortalGuardianToken(ctx, args.token);
  }

  if (args.slug) {
    return requireAuthenticatedPortalAccess(ctx, args.slug, args.clientId);
  }

  throw new ConvexError("Portal access is missing or expired");
}

async function mapPortalData(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
) {
  const [client, settingsRecord, guardians, tasks, documents, resources, tools, locations, insurances, contacts, activityRows, listing, messageRows, workspace] =
    await Promise.all([
      getClientRecord(ctx, workspaceId, clientId),
      getClientPortalSettingsRecord(ctx, workspaceId, clientId),
      getClientSubRecords(ctx, workspaceId, clientId, "client_parent"),
      getClientSubRecords(ctx, workspaceId, clientId, "client_task"),
      getClientSubRecords(ctx, workspaceId, clientId, "client_document"),
      getClientSubRecords(ctx, workspaceId, clientId, PORTAL_RESOURCE_TYPE),
      getClientSubRecords(ctx, workspaceId, clientId, PORTAL_TOOL_TYPE),
      getClientSubRecords(ctx, workspaceId, clientId, "client_location"),
      getClientSubRecords(ctx, workspaceId, clientId, "client_insurance"),
      getClientSubRecords(ctx, workspaceId, clientId, "client_contact"),
      getClientSubRecords(ctx, workspaceId, clientId, PORTAL_ACTIVITY_TYPE),
      getWorkspaceListing(ctx, workspaceId),
      getPortalCommunicationRows(ctx, workspaceId, clientId),
      ctx.db.get(asId<"workspaces">(workspaceId)),
    ]);

  const taskItems = sortTasks(tasks.map(mapTask));
  const documentItems = sortByNewest(documents.map(mapDocument));
  const messageItems = sortByNewest(messageRows.map(mapMessage));
  const resourceItems = sortByNewest(resources.map(mapResource));
  const toolItems = sortByNewest(tools.map(mapTool));
  const activity = sortByNewest(activityRows.map(mapActivity)).slice(0, 40);
  const guardianItems = guardians.map(mapGuardian);
  const settings = getPortalSettings(settingsRecord);
  const openTasks = taskItems.filter(
    (task) =>
      task.status !== "completed" &&
      task.status !== "submitted" &&
      task.status !== "cancelled",
  );
  const completedTasks = taskItems.filter(
    (task) => task.status === "completed" || task.status === "submitted",
  );
  const overdueTasks = openTasks.filter((task) => {
    if (!task.dueDate) {
      return false;
    }
    return new Date(task.dueDate).getTime() < Date.now();
  }).length;
  const dueSoonTasks = openTasks.filter((task) => {
    if (!task.dueDate) {
      return false;
    }
    const diff = new Date(task.dueDate).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const completionPercentage =
    taskItems.length === 0
      ? 100
      : Math.round((completedTasks.length / taskItems.length) * 100);
  const brandingSettings = asRecord(asRecord(workspace?.settings).intakeFormSettings);
  const logoUrl = listing && workspace
    ? await getPublicListingLogoUrl(ctx, listing, workspace as ConvexDoc)
    : null;

  return {
    client: {
      id: client._id,
      name: getClientName(client),
      status: readString(client.status) ?? "active",
    },
    branding: {
      agencyName: readString(workspace?.agencyName) ?? "GoodABA",
      planTier: readString(workspace?.planTier) ?? "free",
      website: readPayloadString(asRecord(workspace?.settings), "website"),
      backgroundColor:
        readPayloadString(brandingSettings, "background_color") ?? "#0866FF",
      showPoweredBy: readBoolean(brandingSettings.show_powered_by, true),
      logoUrl,
      slug: readString(listing?.slug),
    },
    portal: {
      enabled: settings.enabled,
      completionPercentage,
      openTasks: openTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks,
      dueSoonTasks,
      guardiansReady:
        guardianItems.filter(
          (guardian) =>
            guardian.accessStatus === "active" ||
            guardian.accessStatus === "invited" ||
            guardian.accessStatus === "ready",
        ).length,
      guardiansTotal: guardianItems.length,
      lastActivityAt: activity[0]?.createdAt ?? null,
      nextTaskId: openTasks[0]?.id ?? null,
      nextTaskTitle: openTasks[0]?.title ?? null,
      unreadMessages: messageItems.length,
    },
    guardians: guardianItems,
    tasks: taskItems,
    documents: documentItems,
    messages: messageItems,
    resources: resourceItems,
    connectedTools: toolItems,
    activity,
    profile: buildPortalProfile(client, guardians, locations, insurances, contacts),
  };
}

async function upsertPortalCommunication(
  ctx: MutationCtx,
  workspaceId: string,
  args: {
    recordId?: string;
    clientId: string;
    subject: string;
    body: string;
    messageType?: string | null;
    audience?: string | null;
    emailNotify?: boolean;
  },
) {
  const ts = now();

  if (args.recordId) {
    const row = await ctx.db.get(asId<"communicationRecords">(args.recordId));
    if (!row || row.deletedAt || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Message not found");
    }
    const payload = asRecord(row.payload);
    await ctx.db.patch(asId<"communicationRecords">(row._id), {
      payload: {
        ...payload,
        channel: "portal",
        subject: args.subject,
        body: args.body,
        preview: args.body.slice(0, 140),
        messageType: args.messageType ?? "general_update",
        audience: args.audience ?? "client",
        emailNotify: args.emailNotify ?? false,
      },
      updatedAt: ts,
    });
    return row._id;
  }

  return ctx.db.insert("communicationRecords", {
    workspaceId: asId<"workspaces">(workspaceId),
    subjectType: "client",
    subjectId: args.clientId,
    channel: "portal",
    status: "published",
    payload: {
      channel: "portal",
      subject: args.subject,
      body: args.body,
      preview: args.body.slice(0, 140),
      messageType: args.messageType ?? "general_update",
      audience: args.audience ?? "client",
      emailNotify: args.emailNotify ?? false,
      readByGuardianIds: [],
    },
    createdAt: ts,
    updatedAt: ts,
  });
}

export const getClientPortalData = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return mapPortalData(ctx, workspaceId, args.clientId);
  },
});

export const setClientPortalEnabled = mutation({
  args: {
    clientId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await getClientRecord(ctx, workspaceId, args.clientId);
    const settings = await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    const payload = asRecord(settings.payload);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(settings._id), {
      payload: {
        ...payload,
        enabled: args.enabled,
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: args.enabled ? "Portal enabled" : "Portal disabled",
      description: args.enabled
        ? "Families can now access the client portal."
        : "Family access was turned off for this client.",
      actorType: "provider",
      entityType: "portal_settings",
      entityId: settings._id,
    });

    return { success: true };
  },
});

export const saveGuardian = mutation({
  args: {
    recordId: v.optional(v.string()),
    clientId: v.string(),
    firstName: optionalString,
    lastName: optionalString,
    relationship: optionalString,
    email: optionalString,
    phone: optionalString,
    isPrimary: v.optional(v.boolean()),
    notificationsEnabled: v.optional(v.boolean()),
    accessStatus: optionalString,
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await getClientRecord(ctx, workspaceId, args.clientId);
    const ts = now();

    if (args.recordId) {
      const guardian = await ctx.db.get(asId<"crmRecords">(args.recordId));
      if (
        !guardian ||
        guardian.deletedAt ||
        guardian.recordType !== "client_parent" ||
        String(guardian.workspaceId) !== workspaceId
      ) {
        throw new ConvexError("Guardian not found");
      }

      const payload = asRecord(guardian.payload);
      await ctx.db.patch(asId<"crmRecords">(guardian._id), {
        payload: {
          ...payload,
          ...(args.firstName !== undefined ? { firstName: args.firstName } : {}),
          ...(args.lastName !== undefined ? { lastName: args.lastName } : {}),
          ...(args.relationship !== undefined ? { relationship: args.relationship } : {}),
          ...(args.email !== undefined ? { email: args.email } : {}),
          ...(args.phone !== undefined ? { phone: args.phone } : {}),
          ...(args.isPrimary !== undefined ? { isPrimary: args.isPrimary } : {}),
          ...(args.notificationsEnabled !== undefined
            ? { portalNotificationsEnabled: args.notificationsEnabled }
            : {}),
          ...(args.accessStatus !== undefined
            ? { portalAccessStatus: args.accessStatus }
            : {}),
        },
        updatedAt: ts,
      });

      await logPortalActivity(ctx, workspaceId, args.clientId, {
        title: "Guardian updated",
        description: `${getGuardianName(guardian as ConvexDoc)} access details were updated.`,
        actorType: "provider",
        entityType: "guardian",
        entityId: guardian._id,
      });

      return { id: guardian._id };
    }

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client_parent",
      status: "active",
      payload: {
        firstName: args.firstName ?? null,
        lastName: args.lastName ?? null,
        relationship: args.relationship ?? "guardian",
        email: args.email ?? null,
        phone: args.phone ?? null,
        isPrimary: args.isPrimary ?? false,
        portalNotificationsEnabled: args.notificationsEnabled ?? true,
        portalAccessStatus:
          args.accessStatus ?? (args.email ? "ready" : "draft"),
      },
      relatedIds: { clientId: args.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Guardian added",
      description: "A guardian was added to the client portal.",
      actorType: "provider",
      entityType: "guardian",
      entityId: id,
    });

    return { id };
  },
});

export const createGuardianInvite = mutation({
  args: {
    clientId: v.string(),
    guardianId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const listing = await getWorkspaceListing(ctx, workspaceId);
    const slug = readString(listing?.slug);
    if (!slug) {
      throw new ConvexError("No published listing found");
    }

    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    const guardian = await ctx.db.get(asId<"crmRecords">(args.guardianId));
    if (
      !guardian ||
      guardian.deletedAt ||
      guardian.recordType !== "client_parent" ||
      String(guardian.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Guardian not found");
    }

    const guardianPayload = asRecord(guardian.payload);
    const email = readPayloadString(guardianPayload, "email");
    if (!email) {
      throw new ConvexError("Guardian needs an email address before inviting");
    }
    const client = await getClientRecord(ctx, workspaceId, args.clientId);

    let token = crypto.randomUUID().replace(/-/g, "");
    while (await getTokenRowByToken(ctx, token)) {
      token = crypto.randomUUID().replace(/-/g, "");
    }

    const ts = now();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await ctx.db.insert("intakeTokens", {
      workspaceId: asId<"workspaces">(workspaceId),
      subjectType: PORTAL_GUARDIAN_TOKEN_TYPE,
      subjectId: args.guardianId,
      token,
      expiresAt,
      payload: {
        clientId: args.clientId,
        guardianEmail: email,
      },
      createdAt: ts,
      updatedAt: ts,
    });

    await ctx.db.patch(asId<"crmRecords">(guardian._id), {
      payload: {
        ...guardianPayload,
        portalAccessStatus: "invited",
        portalInviteSentAt: ts,
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Guardian invited",
      description: `${getGuardianName(guardian as ConvexDoc)} received portal access.`,
      actorType: "provider",
      entityType: "guardian",
      entityId: guardian._id,
    });

    return {
      token,
      slug,
      url:
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org"}` +
        `/portal/${slug}/sign-in?token=${token}&email=${encodeURIComponent(email)}`,
      expiresAt,
      email,
      guardianName: getGuardianName(guardian as ConvexDoc),
      clientName: getClientName(client),
      agencyName: readString((await ctx.db.get(asId<"workspaces">(workspaceId)))?.agencyName) ?? "GoodABA",
    };
  },
});

export const markGuardianInviteSent = mutation({
  args: {
    clientId: v.string(),
    guardianId: v.string(),
    linkedClerkUserId: v.optional(v.string()),
    linkedEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    const guardian = await ctx.db.get(asId<"crmRecords">(args.guardianId));
    if (
      !guardian ||
      guardian.deletedAt ||
      guardian.recordType !== "client_parent" ||
      String(guardian.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Guardian not found");
    }

    const guardianPayload = asRecord(guardian.payload);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(guardian._id), {
      payload: {
        ...guardianPayload,
        ...(args.linkedClerkUserId
          ? {
              portalClerkUserId: args.linkedClerkUserId,
              portalLinkedEmail: normalizeEmail(args.linkedEmail),
            }
          : {}),
        portalAccessStatus: "invited",
        portalInviteSentAt: ts,
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Guardian invited",
      description: `${getGuardianName(guardian as ConvexDoc)} received a portal sign-in email.`,
      actorType: "provider",
      entityType: "guardian",
      entityId: guardian._id,
    });

    return { success: true };
  },
});

export const savePortalTask = mutation({
  args: portalTaskInputValidator,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    await getClientRecord(ctx, workspaceId, args.clientId);
    const ts = now();

    if (args.recordId) {
      const task = await ctx.db.get(asId<"crmRecords">(args.recordId));
      if (
        !task ||
        task.deletedAt ||
        task.recordType !== "client_task" ||
        String(task.workspaceId) !== workspaceId
      ) {
        throw new ConvexError("Task not found");
      }

      const payload = asRecord(task.payload);
      const completionMethod = deriveCompletionMethod(args.taskType, args.externalUrl);
      await ctx.db.patch(asId<"crmRecords">(task._id), {
        status: args.status ?? task.status,
        payload: {
          ...payload,
          title: args.title,
          description: args.instructions ?? null,
          instructions: args.instructions ?? null,
          dueDate: args.dueDate ?? null,
          taskType: args.taskType,
          formKey: args.formKey ?? null,
          completionMethod,
          taskSource: "client_portal",
          externalUrl: args.externalUrl ?? null,
          linkedDocumentId: args.linkedDocumentId ?? null,
          submittedDocumentId:
            args.taskType === "review_and_sign"
              ? payload.submittedDocumentId ?? null
              : args.linkedDocumentId ?? null,
          requiredDocumentType: args.requiredDocumentType ?? null,
          completionNote: args.completionNote ?? null,
        },
        updatedAt: ts,
      });

      await logPortalActivity(ctx, workspaceId, args.clientId, {
        title: "Task updated",
        description: `${args.title} was updated in the portal.`,
        actorType: "provider",
        entityType: "task",
        entityId: task._id,
      });

      return { id: task._id };
    }

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client_task",
      status: args.status ?? "pending",
      payload: {
        title: args.title,
        description: args.instructions ?? null,
        instructions: args.instructions ?? null,
        dueDate: args.dueDate ?? null,
        taskType: args.taskType,
        formKey: args.formKey ?? null,
        completionMethod: deriveCompletionMethod(args.taskType, args.externalUrl),
        taskSource: "client_portal",
        externalUrl: args.externalUrl ?? null,
        linkedDocumentId: args.linkedDocumentId ?? null,
        submittedDocumentId: null,
        requiredDocumentType: args.requiredDocumentType ?? null,
        completionNote: args.completionNote ?? null,
      },
      relatedIds: { clientId: args.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Task assigned",
      description: `${args.title} was added to the family portal.`,
      actorType: "provider",
      entityType: "task",
      entityId: id,
    });

    return { id };
  },
});

export const deletePortalTask = mutation({
  args: { recordId: v.string(), clientId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const task = await ctx.db.get(asId<"crmRecords">(args.recordId));
    if (
      !task ||
      task.deletedAt ||
      task.recordType !== "client_task" ||
      String(task.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Task not found");
    }

    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(task._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Task removed",
      description: "A portal task was removed.",
      actorType: "provider",
      entityType: "task",
      entityId: task._id,
    });

    return { success: true };
  },
});

export const savePortalDocument = mutation({
  args: portalDocumentInputValidator,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    await getClientRecord(ctx, workspaceId, args.clientId);
    const ts = now();

    const recordId = args.existingDocumentId ?? args.recordId ?? null;
    if (!recordId) {
      throw new ConvexError("Select an existing document to share");
    }

    const doc = await ctx.db.get(asId<"crmRecords">(recordId));
    if (
      !doc ||
      doc.deletedAt ||
      doc.recordType !== "client_document" ||
      String(doc.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Document not found");
    }

    const payload = asRecord(doc.payload);
    await ctx.db.patch(asId<"crmRecords">(doc._id), {
      payload: {
        ...payload,
        ...(args.label !== undefined ? { label: args.label } : {}),
        ...(args.category !== undefined
          ? { category: args.category, documentType: args.category }
          : {}),
        ...(args.note !== undefined ? { shareNote: args.note } : {}),
        ...(args.visibility !== undefined ? { visibility: args.visibility } : {}),
        ...(args.acknowledgementRequired !== undefined
          ? { acknowledgementRequired: args.acknowledgementRequired }
          : {}),
        ...(args.linkedTaskId !== undefined ? { linkedTaskId: args.linkedTaskId } : {}),
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Document shared",
      description:
        `${readPayloadString(payload, "label", "filename") ?? "A document"} is now available in the client portal.`,
      actorType: "provider",
      entityType: "document",
      entityId: doc._id,
    });

    return { id: doc._id };
  },
});

export const savePortalMessage = mutation({
  args: portalMessageInputValidator,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    await getClientRecord(ctx, workspaceId, args.clientId);
    const id = await upsertPortalCommunication(ctx, workspaceId, args);

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: args.recordId ? "Message updated" : "Message published",
      description: args.subject,
      actorType: "provider",
      entityType: "message",
      entityId: id,
    });

    return { id };
  },
});

export const deletePortalMessage = mutation({
  args: { recordId: v.string(), clientId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"communicationRecords">(args.recordId));
    if (!row || row.deletedAt || String(row.workspaceId) !== workspaceId) {
      throw new ConvexError("Message not found");
    }

    const ts = now();
    await ctx.db.patch(asId<"communicationRecords">(row._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    await logPortalActivity(ctx, workspaceId, args.clientId, {
      title: "Message removed",
      description: "A client portal message was removed.",
      actorType: "provider",
      entityType: "message",
      entityId: row._id,
    });

    return { success: true };
  },
});

export const savePortalResource = mutation({
  args: portalResourceInputValidator,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    const ts = now();

    if (args.recordId) {
      const row = await ctx.db.get(asId<"crmRecords">(args.recordId));
      if (
        !row ||
        row.deletedAt ||
        row.recordType !== PORTAL_RESOURCE_TYPE ||
        String(row.workspaceId) !== workspaceId
      ) {
        throw new ConvexError("Resource not found");
      }

      const payload = asRecord(row.payload);
      await ctx.db.patch(asId<"crmRecords">(row._id), {
        payload: {
          ...payload,
          title: args.title,
          description: args.description ?? null,
          href: args.href ?? null,
          category: args.category ?? "general",
          recommendedStage: args.recommendedStage ?? null,
          pinned: args.pinned ?? false,
          visibility: args.visibility ?? "visible",
        },
        updatedAt: ts,
      });
      return { id: row._id };
    }

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: PORTAL_RESOURCE_TYPE,
      status: "published",
      payload: {
        title: args.title,
        description: args.description ?? null,
        href: args.href ?? null,
        category: args.category ?? "general",
        recommendedStage: args.recommendedStage ?? null,
        pinned: args.pinned ?? false,
        visibility: args.visibility ?? "visible",
      },
      relatedIds: { clientId: args.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

export const deletePortalResource = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.recordId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== PORTAL_RESOURCE_TYPE ||
      String(row.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Resource not found");
    }

    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(row._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const savePortalTool = mutation({
  args: portalToolInputValidator,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await ensureClientPortalSettingsRecord(ctx, workspaceId, args.clientId);
    const ts = now();

    if (args.recordId) {
      const row = await ctx.db.get(asId<"crmRecords">(args.recordId));
      if (
        !row ||
        row.deletedAt ||
        row.recordType !== PORTAL_TOOL_TYPE ||
        String(row.workspaceId) !== workspaceId
      ) {
        throw new ConvexError("Connected tool not found");
      }

      const payload = asRecord(row.payload);
      await ctx.db.patch(asId<"crmRecords">(row._id), {
        payload: {
          ...payload,
          name: args.name,
          description: args.description ?? null,
          url: args.url ?? null,
          category: args.category ?? "general",
          whenToUse: args.whenToUse ?? null,
          logoLabel: args.logoLabel ?? null,
          visibility: args.visibility ?? "visible",
        },
        updatedAt: ts,
      });
      return { id: row._id };
    }

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: PORTAL_TOOL_TYPE,
      status: "published",
      payload: {
        name: args.name,
        description: args.description ?? null,
        url: args.url ?? null,
        category: args.category ?? "general",
        whenToUse: args.whenToUse ?? null,
        logoLabel: args.logoLabel ?? null,
        visibility: args.visibility ?? "visible",
      },
      relatedIds: { clientId: args.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

export const deletePortalTool = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const row = await ctx.db.get(asId<"crmRecords">(args.recordId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== PORTAL_TOOL_TYPE ||
      String(row.workspaceId) !== workspaceId
    ) {
      throw new ConvexError("Connected tool not found");
    }

    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(row._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const getPortalBrandingBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getPublishedListingBySlug(ctx, args.slug);
    if (!row) {
      throw new ConvexError("Portal not found");
    }

    const brandingSettings = asRecord(asRecord(row.workspace.settings).intakeFormSettings);
    return {
      agencyName: readString(row.workspace.agencyName) ?? "GoodABA",
      backgroundColor:
        readPayloadString(brandingSettings, "background_color") ?? "#0866FF",
      showPoweredBy: readBoolean(brandingSettings.show_powered_by, true),
      website: readPayloadString(asRecord(row.workspace.settings), "website"),
      logoUrl: await getPublicListingLogoUrl(ctx, row.listing as ConvexDoc, row.workspace),
      slug: readString(row.listing.slug) ?? args.slug,
    };
  },
});

export const listAuthenticatedPortalTargets = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const listingRow = await getPublishedListingBySlug(ctx, args.slug);
    if (!listingRow) {
      throw new ConvexError("Portal not found");
    }

    const identity = await requireIdentity(ctx);
    const workspaceId = String(listingRow.listing.workspaceId);
    const matches = await getAuthenticatedPortalGuardiansForWorkspace(
      ctx,
      workspaceId,
      identity,
    );

    const brandingSettings = asRecord(asRecord(listingRow.workspace.settings).intakeFormSettings);
    const logoUrl = await getPublicListingLogoUrl(
      ctx,
      listingRow.listing as ConvexDoc,
      listingRow.workspace,
    );

    const entries = await Promise.all(
      matches.map(async (match) => {
        const client = await getClientRecord(ctx, workspaceId, match.clientId);
        return {
          clientId: match.clientId,
          clientName: getClientName(client),
          guardianId: match.guardian._id,
          guardianName: getGuardianName(match.guardian),
          accessStatus:
            readPayloadString(asRecord(match.guardian.payload), "portalAccessStatus") ?? "ready",
        };
      }),
    );

    return {
      branding: {
        agencyName: readString(listingRow.workspace.agencyName) ?? "GoodABA",
        backgroundColor:
          readPayloadString(brandingSettings, "background_color") ?? "#0866FF",
        showPoweredBy: readBoolean(brandingSettings.show_powered_by, true),
        website: readPayloadString(asRecord(listingRow.workspace.settings), "website"),
        logoUrl,
        slug: readString(listingRow.listing.slug) ?? args.slug,
      },
      entries,
    };
  },
});

export const listAuthenticatedPortalHome = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const guardians = await ctx.db
      .query("crmRecords")
      .withIndex("by_type", (q) => q.eq("recordType", "client_parent"))
      .collect();

    const preferredByScope = new Map<string, ConvexDoc>();
    for (const row of guardians as ConvexDoc[]) {
      if (!guardianMatchesIdentity(row, identity)) {
        continue;
      }

      const clientId = getGuardianClientId(row);
      if (!clientId) {
        continue;
      }

      const key = `${String(row.workspaceId)}:${clientId}`;
      preferredByScope.set(
        key,
        choosePreferredGuardian(preferredByScope.get(key) ?? null, row),
      );
    }

    const entries = await Promise.all(
      [...preferredByScope.values()].map(async (guardian) => {
        const workspaceId = String(guardian.workspaceId);
        const clientId = getGuardianClientId(guardian);
        if (!clientId) {
          return null;
        }

        const listing = await getWorkspaceListing(ctx, workspaceId);
        if (!listing || listing.deletedAt || !readString(listing.slug)) {
          return null;
        }

        const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
        if (!workspace || workspace.deletedAt) {
          return null;
        }

        const client = await getClientRecord(ctx, workspaceId, clientId);
        return {
          slug: readString(listing.slug) ?? "",
          clientId,
          clientName: getClientName(client),
          guardianId: guardian._id,
          guardianName: getGuardianName(guardian),
          agencyName: readString(workspace.agencyName) ?? "GoodABA",
          backgroundColor:
            readPayloadString(
              asRecord(asRecord(workspace.settings).intakeFormSettings),
              "background_color",
            ) ?? "#0866FF",
          logoUrl: await getPublicListingLogoUrl(
            ctx,
            listing as ConvexDoc,
            workspace as ConvexDoc,
          ),
        };
      }),
    );

    return entries.filter(Boolean);
  },
});

export const validatePortalAccessForSlug = query({
  args: {
    slug: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await getPublishedListingBySlug(ctx, args.slug);
    if (!row) {
      return false;
    }

    try {
      const { workspaceId } = await requirePortalGuardianToken(ctx, args.token);
      return workspaceId === String(row.listing.workspaceId);
    } catch {
      return false;
    }
  },
});

export const getPublicPortalData = query({
  args: {
    slug: v.string(),
    token: optionalString,
    clientId: optionalString,
  },
  handler: async (ctx, args) => {
    const row = await getPublishedListingBySlug(ctx, args.slug);
    if (!row) {
      throw new ConvexError("Portal not found");
    }

    const access = await requireResolvedPortalAccess(ctx, {
      token: args.token ?? null,
      slug: args.slug,
      clientId: args.clientId ?? null,
    });
    if (access.workspaceId !== String(row.listing.workspaceId)) {
      throw new ConvexError("Portal not found");
    }

    const portal = await mapPortalData(ctx, access.workspaceId, access.clientId);
    const guardian = mapGuardian(access.guardian);
    return {
      ...portal,
      guardian,
      portal: {
        ...portal.portal,
        inviteAccepted:
          guardian.accessStatus === "active" || Boolean(guardian.acceptedAt),
      },
      tasks: portal.tasks.filter((task) => task.visibility !== "internal"),
      documents: portal.documents.filter((doc) => doc.visibility !== "internal"),
      messages: portal.messages,
      resources: portal.resources.filter((resource) => resource.visibility !== "internal"),
      connectedTools: portal.connectedTools.filter((tool) => tool.visibility !== "internal"),
    };
  },
});

export const claimGuardianInviteForCurrentUser = mutation({
  args: {
    slug: v.string(),
    token: v.string(),
    authenticatedEmail: optionalString,
    authenticatedClerkUserId: optionalString,
  },
  handler: async (ctx, args) => {
    const listingRow = await getPublishedListingBySlug(ctx, args.slug);
    if (!listingRow) {
      throw new ConvexError("Portal not found");
    }

    const access = await requirePortalGuardianToken(ctx, args.token);
    if (access.workspaceId !== String(listingRow.listing.workspaceId)) {
      throw new ConvexError("Portal not found");
    }

    const identity = await requireIdentity(ctx);
    if (
      args.authenticatedClerkUserId &&
      args.authenticatedClerkUserId !== identity.subject
    ) {
      throw new ConvexError("Authenticated account mismatch");
    }

    const guardianEmail = normalizeEmail(getGuardianEmail(access.guardian));
    const identityEmail = normalizeEmail(
      args.authenticatedEmail ?? identity.email ?? undefined,
    );
    if (guardianEmail) {
      if (!identityEmail) {
        throw new ConvexError("This signed-in account does not have a matching invited email.");
      }

      if (guardianEmail !== identityEmail) {
        throw new ConvexError(`This portal invite was sent to ${guardianEmail}`);
      }
    }

    await linkGuardianIdentityIfNeeded(ctx, access.guardian, identity, {
      forceActive: true,
    });

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: "Guardian account linked",
      description: `${getGuardianName(access.guardian)} linked a portal account.`,
      actorType: "guardian",
      actorName: getGuardianName(access.guardian),
      entityType: "guardian",
      entityId: access.guardian._id,
    });

    return {
      clientId: access.clientId,
      slug: args.slug,
    };
  },
});

export const acceptPortalInvite = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const guardian =
      args.token || !("identity" in access)
        ? access.guardian
        : await linkGuardianIdentityIfNeeded(ctx, access.guardian, access.identity, {
            forceActive: true,
          });
    const guardianPayload = asRecord(guardian.payload);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(guardian._id), {
      payload: {
        ...guardianPayload,
        portalAccessStatus: "active",
        portalInviteAcceptedAt:
          readPayloadString(guardianPayload, "portalInviteAcceptedAt") ?? ts,
        portalLastViewedAt: ts,
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: "Guardian accepted portal invite",
      description: `${getGuardianName(guardian)} activated access.`,
      actorType: "guardian",
      actorName: getGuardianName(guardian),
      entityType: "guardian",
      entityId: guardian._id,
    });

    return { success: true };
  },
});

export const markPortalMessageRead = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const row = await ctx.db.get(asId<"communicationRecords">(args.messageId));
    if (
      !row ||
      row.deletedAt ||
      String(row.workspaceId) !== access.workspaceId ||
      row.subjectId !== access.clientId
    ) {
      throw new ConvexError("Message not found");
    }

    const payload = asRecord(row.payload);
    const readByGuardianIds = new Set(readStringArray(payload.readByGuardianIds));
    readByGuardianIds.add(access.guardianId);

    await ctx.db.patch(asId<"communicationRecords">(row._id), {
      payload: {
        ...payload,
        readByGuardianIds: Array.from(readByGuardianIds),
      },
      updatedAt: now(),
    });

    return { success: true };
  },
});

export const acknowledgePortalDocument = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const row = await ctx.db.get(asId<"crmRecords">(args.documentId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== "client_document" ||
      String(row.workspaceId) !== access.workspaceId
    ) {
      throw new ConvexError("Document not found");
    }

    const payload = asRecord(row.payload);
    const acknowledgedByGuardianIds = new Set(
      readStringArray(payload.acknowledgedByGuardianIds),
    );
    acknowledgedByGuardianIds.add(access.guardianId);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      payload: {
        ...payload,
        acknowledgedByGuardianIds: Array.from(acknowledgedByGuardianIds),
      },
      updatedAt: ts,
    });

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: "Document acknowledged",
      description: `${getGuardianName(access.guardian)} acknowledged a shared document.`,
      actorType: "guardian",
      actorName: getGuardianName(access.guardian),
      entityType: "document",
      entityId: row._id,
    });

    await createPortalNotification(ctx, access.workspaceId, {
      title: "Document acknowledged",
      body: `${getGuardianName(access.guardian)} acknowledged a portal document.`,
      link: `/dashboard/clients/${access.clientId}/portal`,
      entityId: row._id,
      entityType: "document",
    });

    return { success: true };
  },
});

export const startPortalTask = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const row = await ctx.db.get(asId<"crmRecords">(args.taskId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== "client_task" ||
      String(row.workspaceId) !== access.workspaceId
    ) {
      throw new ConvexError("Task not found");
    }

    const payload = asRecord(row.payload);
    await ctx.db.patch(asId<"crmRecords">(row._id), {
      status: "in_progress",
      payload: {
        ...payload,
        startedByGuardianId: access.guardianId,
      },
      updatedAt: now(),
    });

    return { success: true };
  },
});

export const completePortalTask = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    taskId: v.string(),
    markStatus: optionalString,
    completionNote: optionalString,
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const row = await ctx.db.get(asId<"crmRecords">(args.taskId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== "client_task" ||
      String(row.workspaceId) !== access.workspaceId
    ) {
      throw new ConvexError("Task not found");
    }

    const payload = asRecord(row.payload);
    const taskType = normalizePortalTaskType(payload);
    const status =
      args.markStatus ??
      (taskType === "custom_task" || taskType === "review_and_sign"
        ? "completed"
        : "submitted");
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(row._id), {
      status,
      payload: {
        ...payload,
        completionNote: args.completionNote ?? null,
        submittedAt: ts,
        completedAt: status === "completed" ? ts : null,
        completedByGuardianId: access.guardianId,
      },
      updatedAt: ts,
    });

    if (taskType === "review_and_sign") {
      const linkedDocumentId = readPayloadString(payload, "linkedDocumentId");
      if (linkedDocumentId) {
        const document = await ctx.db.get(asId<"crmRecords">(linkedDocumentId));
        if (
          document &&
          !document.deletedAt &&
          document.recordType === "client_document" &&
          String(document.workspaceId) === access.workspaceId
        ) {
          const documentPayload = asRecord(document.payload);
          const existingAcknowledged = readStringArray(documentPayload.acknowledgedByGuardianIds);
          const nextAcknowledged = existingAcknowledged.includes(access.guardianId)
            ? existingAcknowledged
            : [...existingAcknowledged, access.guardianId];

          await ctx.db.patch(asId<"crmRecords">(document._id), {
            payload: {
              ...documentPayload,
              acknowledgementRequired: true,
              acknowledgedByGuardianIds: nextAcknowledged,
              acknowledgedAt: ts,
            },
            updatedAt: ts,
          });
        }
      }
    }

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: status === "completed" ? "Task completed" : "Task submitted",
      description: `${getGuardianName(access.guardian)} finished "${readPayloadString(payload, "title") ?? "a portal task"}".`,
      actorType: "guardian",
      actorName: getGuardianName(access.guardian),
      entityType: "task",
      entityId: row._id,
    });

    await createPortalNotification(ctx, access.workspaceId, {
      title: status === "completed" ? "Portal task completed" : "Portal task submitted",
      body: `${getGuardianName(access.guardian)} finished ${readPayloadString(payload, "title") ?? "a task"}.`,
      link: `/dashboard/clients/${access.clientId}/portal`,
      entityId: row._id,
      entityType: "task",
    });

    return { success: true };
  },
});

export const createPortalIntakeFormLink = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const task = await ctx.db.get(asId<"crmRecords">(args.taskId));
    if (
      !task ||
      task.deletedAt ||
      task.recordType !== "client_task" ||
      String(task.workspaceId) !== access.workspaceId
    ) {
      throw new ConvexError("Task not found");
    }

    const taskPayload = asRecord(task.payload);
    if (normalizePortalTaskType(taskPayload) !== "form_completion") {
      throw new ConvexError("This task is not a form completion task");
    }

    const listing = await getWorkspaceListing(ctx, access.workspaceId);
    const slug = readString(listing?.slug);
    if (!slug) {
      throw new ConvexError("No published listing found");
    }

    let token = createPortalTokenValue();
    while (await getTokenRowByToken(ctx, token)) {
      token = createPortalTokenValue();
    }

    const ts = now();
    await ctx.db.insert("intakeTokens", {
      workspaceId: asId<"workspaces">(access.workspaceId),
      subjectType: CLIENT_INTAKE_TOKEN_TYPE,
      subjectId: access.clientId,
      token,
      expiresAt: new Date(Date.now() + CLIENT_INTAKE_TOKEN_TTL_MS).toISOString(),
      payload: {
        portalTaskId: args.taskId,
      },
      createdAt: ts,
      updatedAt: ts,
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
    return {
      url: `${origin}/intake/${slug}/client?token=${token}&portalTaskId=${args.taskId}`,
    };
  },
});

export const generatePortalUploadUrl = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
  },
  handler: async (ctx, args) => {
    await requireResolvedPortalAccess(ctx, args);
    return ctx.storage.generateUploadUrl();
  },
});

export const submitPortalUpload = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    label: optionalString,
    category: optionalString,
    note: optionalString,
    taskId: optionalString,
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const ts = now();

    const fileId = await ctx.db.insert("files", {
      workspaceId: asId<"workspaces">(access.workspaceId),
      storageId: asId<"_storage">(args.storageId),
      bucket: "client-documents",
      storageKey: `clients/${access.clientId}/${args.filename}`,
      filename: args.filename,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "private",
      relatedTable: "crmRecords",
      relatedId: access.clientId,
      createdAt: ts,
      updatedAt: ts,
    });

    const documentId = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(access.workspaceId),
      recordType: "client_document",
      status: "submitted",
      payload: {
        fileId: String(fileId),
        filename: args.filename,
        mimeType: args.mimeType,
        byteSize: args.byteSize,
        label: args.label ?? args.filename,
        category: args.category ?? "other",
        documentType: args.category ?? "other",
        shareNote: args.note ?? null,
        visibility: "visible",
        uploadSource: "portal_family",
        uploadedByGuardianId: access.guardianId,
        linkedTaskId: args.taskId ?? null,
      },
      relatedIds: { clientId: access.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    if (args.taskId) {
      const task = await ctx.db.get(asId<"crmRecords">(args.taskId));
      if (
        task &&
        !task.deletedAt &&
        task.recordType === "client_task" &&
        String(task.workspaceId) === access.workspaceId
      ) {
        const taskPayload = asRecord(task.payload);
        await ctx.db.patch(asId<"crmRecords">(task._id), {
          status: "submitted",
          payload: {
            ...taskPayload,
            submittedDocumentId: documentId,
            submittedAt: ts,
            completedByGuardianId: access.guardianId,
          },
          updatedAt: ts,
        });
      }
    }

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: "Document uploaded",
      description: `${getGuardianName(access.guardian)} uploaded ${args.label ?? args.filename}.`,
      actorType: "guardian",
      actorName: getGuardianName(access.guardian),
      entityType: "document",
      entityId: documentId,
    });

    await createPortalNotification(ctx, access.workspaceId, {
      title: "New family upload",
      body: `${getGuardianName(access.guardian)} uploaded a new portal document.`,
      link: `/dashboard/clients/${access.clientId}/portal`,
      entityId: documentId,
      entityType: "document",
    });

    return { id: documentId };
  },
});

export const updatePortalProfile = mutation({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    updates: v.object(profileUpdateValidator),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const { updates } = args;
    const ts = now();

    const [parents, locations, insurances, contacts] = await Promise.all([
      getClientSubRecords(ctx, access.workspaceId, access.clientId, "client_parent"),
      getClientSubRecords(ctx, access.workspaceId, access.clientId, "client_location"),
      getClientSubRecords(ctx, access.workspaceId, access.clientId, "client_insurance"),
      getClientSubRecords(ctx, access.workspaceId, access.clientId, "client_contact"),
    ]);

    const primaryGuardian =
      parents.find((guardian) => readBoolean(asRecord(guardian.payload).isPrimary)) ??
      parents[0] ??
      access.guardian;

    const guardianPayload = asRecord(primaryGuardian.payload);
    await ctx.db.patch(asId<"crmRecords">(primaryGuardian._id), {
      payload: {
        ...guardianPayload,
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.email !== undefined ? { email: updates.email } : {}),
      },
      updatedAt: ts,
    });

    const primaryLocation =
      locations.find((location) => readBoolean(asRecord(location.payload).isPrimary)) ??
      locations[0] ??
      null;
    if (primaryLocation) {
      const payload = asRecord(primaryLocation.payload);
      await ctx.db.patch(asId<"crmRecords">(primaryLocation._id), {
        payload: {
          ...payload,
          ...(updates.streetAddress !== undefined ? { streetAddress: updates.streetAddress } : {}),
          ...(updates.city !== undefined ? { city: updates.city } : {}),
          ...(updates.state !== undefined ? { state: updates.state } : {}),
          ...(updates.postalCode !== undefined ? { postalCode: updates.postalCode } : {}),
        },
        updatedAt: ts,
      });
    } else if (
      hasDefinedValue([
        updates.streetAddress,
        updates.city,
        updates.state,
        updates.postalCode,
      ])
    ) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(access.workspaceId),
        recordType: "client_location",
        status: "active",
        payload: {
          label: "Home",
          streetAddress: updates.streetAddress ?? null,
          street_address: updates.streetAddress ?? null,
          city: updates.city ?? null,
          state: updates.state ?? null,
          postalCode: updates.postalCode ?? null,
          postal_code: updates.postalCode ?? null,
          isPrimary: true,
          sortOrder: 0,
        },
        relatedIds: { clientId: access.clientId },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const primaryInsurance =
      insurances.find((insurance) => readBoolean(asRecord(insurance.payload).isPrimary)) ??
      insurances[0] ??
      null;
    if (primaryInsurance) {
      const payload = asRecord(primaryInsurance.payload);
      await ctx.db.patch(asId<"crmRecords">(primaryInsurance._id), {
        payload: {
          ...payload,
          ...(updates.insuranceName !== undefined ? { providerName: updates.insuranceName } : {}),
          ...(updates.insuranceMemberId !== undefined ? { memberId: updates.insuranceMemberId } : {}),
          ...(updates.insuranceGroupNumber !== undefined
            ? { groupNumber: updates.insuranceGroupNumber }
            : {}),
        },
        updatedAt: ts,
      });
    } else if (
      hasDefinedValue([
        updates.insuranceName,
        updates.insuranceMemberId,
        updates.insuranceGroupNumber,
      ])
    ) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(access.workspaceId),
        recordType: "client_insurance",
        status: "active",
        payload: {
          providerName: updates.insuranceName ?? null,
          insurance_name: updates.insuranceName ?? null,
          memberId: updates.insuranceMemberId ?? null,
          member_id: updates.insuranceMemberId ?? null,
          insurance_member_id: updates.insuranceMemberId ?? null,
          groupNumber: updates.insuranceGroupNumber ?? null,
          group_number: updates.insuranceGroupNumber ?? null,
          insurance_group_number: updates.insuranceGroupNumber ?? null,
          isPrimary: true,
          sortOrder: 0,
        },
        relatedIds: { clientId: access.clientId },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const emergencyContact =
      contacts.find((contact) => {
        const payload = asRecord(contact.payload);
        return readPayloadString(payload, "contactType") === "emergency";
      }) ?? null;

    if (emergencyContact) {
      const payload = asRecord(emergencyContact.payload);
      await ctx.db.patch(asId<"crmRecords">(emergencyContact._id), {
        payload: {
          ...payload,
          ...(updates.emergencyContactName !== undefined
            ? { label: updates.emergencyContactName, firstName: updates.emergencyContactName }
            : {}),
          ...(updates.emergencyContactPhone !== undefined
            ? { phone: updates.emergencyContactPhone, value: updates.emergencyContactPhone }
            : {}),
          ...(updates.emergencyContactRelationship !== undefined
            ? { relationship: updates.emergencyContactRelationship }
            : {}),
        },
        updatedAt: ts,
      });
    } else if (
      updates.emergencyContactName ||
      updates.emergencyContactPhone ||
      updates.emergencyContactRelationship
    ) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(access.workspaceId),
        recordType: "client_contact",
        status: "active",
        payload: {
          contactType: "emergency",
          label: updates.emergencyContactName ?? null,
          firstName: updates.emergencyContactName ?? null,
          relationship: updates.emergencyContactRelationship ?? null,
          phone: updates.emergencyContactPhone ?? null,
          value: updates.emergencyContactPhone ?? null,
        },
        relatedIds: { clientId: access.clientId },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    await logPortalActivity(ctx, access.workspaceId, access.clientId, {
      title: "Family information updated",
      description: `${getGuardianName(access.guardian)} updated profile details in the portal.`,
      actorType: "guardian",
      actorName: getGuardianName(access.guardian),
      entityType: "profile",
      entityId: access.clientId,
    });

    await createPortalNotification(ctx, access.workspaceId, {
      title: "Portal profile updated",
      body: `${getGuardianName(access.guardian)} updated family information.`,
      link: `/dashboard/clients/${access.clientId}/portal`,
      entityId: access.clientId,
      entityType: "client",
    });

    return { success: true };
  },
});

export const getPortalDocumentUrl = query({
  args: {
    token: optionalString,
    slug: optionalString,
    clientId: optionalString,
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await requireResolvedPortalAccess(ctx, args);
    const row = await ctx.db.get(asId<"crmRecords">(args.documentId));
    if (
      !row ||
      row.deletedAt ||
      row.recordType !== "client_document" ||
      String(row.workspaceId) !== access.workspaceId
    ) {
      throw new ConvexError("Document not found");
    }

    const payload = asRecord(row.payload);
    const fileId = readPayloadString(payload, "fileId");
    if (!fileId) {
      throw new ConvexError("Document not found");
    }

    const file = await ctx.db.get(asId<"files">(fileId));
    if (!file || file.deletedAt || String(file.workspaceId) !== access.workspaceId) {
      throw new ConvexError("Document not found");
    }

    const storageId = readPayloadString(file, "storageId");
    if (!storageId) {
      throw new ConvexError("Document not found");
    }

    const url = await ctx.storage.getUrl(asId<"_storage">(storageId));
    if (!url) {
      throw new ConvexError("Document not found");
    }

    return {
      url,
      fileName: readPayloadString(payload, "filename", "label") ?? "document",
    };
  },
});
