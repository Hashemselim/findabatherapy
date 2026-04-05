import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  asRecord,
  readString,
  asId,
  now,
  requireCurrentWorkspace,
  type ConvexDoc,
} from "./_helpers";

const CLIENT_DOCUMENT_LIMIT = 50;
const CLIENT_DOCUMENT_UPLOAD_TOKEN_TYPE = "client_document_upload";
type ConvexCtx = QueryCtx | MutationCtx;

const publicIntakeValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
  v.array(v.string()),
);

const publicIntakeRecordDataValidator = v.record(
  v.string(),
  publicIntakeValueValidator,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCrmRecordsByWorkspaceAndType(
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

async function getCrmRecordsByWorkspace(
  ctx: ConvexCtx,
  workspaceId: string,
) {
  return ctx.db
    .query("crmRecords")
    .withIndex("by_workspace", (q) =>
      q.eq("workspaceId", asId<"workspaces">(workspaceId)),
    )
    .collect();
}

/**
 * Query sub-records for a specific client by record type.
 *
 * Uses the `by_workspace_and_type` index so we only scan records of a single
 * type instead of the entire workspace, then filters for the target clientId.
 */
async function getSubRecordsForClient(
  ctx: ConvexCtx,
  workspaceId: string,
  clientId: string,
  recordType: string,
) {
  const records = await ctx.db
    .query("crmRecords")
    .withIndex("by_workspace_and_type", (q) =>
      q
        .eq("workspaceId", asId<"workspaces">(workspaceId))
        .eq("recordType", recordType),
    )
    .collect();

  return records.filter((r) => {
    if (r.deletedAt) return false;
    const related = asRecord(r.relatedIds);
    return readString(related.clientId) === clientId;
  });
}

function isNotDeleted(row: ConvexDoc): boolean {
  return !row.deletedAt;
}

function mapClient(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  return {
    id: row._id,
    workspaceId: String(row.workspaceId),
    firstName: readString(payload.firstName) ?? "",
    lastName: readString(payload.lastName) ?? "",
    dateOfBirth: readString(payload.dateOfBirth),
    email: readString(payload.email),
    phone: readString(payload.phone),
    referralSource: readString(payload.referralSource),
    referralSourceDetail: readString(payload.referralSourceDetail),
    notes: readString(payload.notes),
    stage: readString(payload.stage) ?? "inquiry",
    priority: readString(payload.priority),
    assignedTo: readString(payload.assignedTo),
    status: readString(row.status),
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
  };
}

function mapSubRecord(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const relatedIds = asRecord(row.relatedIds);
  return {
    id: row._id,
    clientId: readString(relatedIds.clientId),
    ...payload,
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
  };
}

function mapTask(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const relatedIds = asRecord(row.relatedIds);
  return {
    id: row._id,
    clientId: readString(relatedIds.clientId),
    title: readString(payload.title) ?? "",
    description: readString(payload.description),
    dueDate: readString(payload.dueDate),
    priority: readString(payload.priority),
    assignedTo: readString(payload.assignedTo),
    taskType: readString(payload.taskType),
    status: readString(row.status) ?? "pending",
    createdAt: readString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(row.updatedAt) ?? new Date().toISOString(),
  };
}

function mapDocument(row: ConvexDoc) {
  const payload = asRecord(row.payload);
  const relatedIds = asRecord(row.relatedIds);
  const label = readString(payload.label);
  const documentType = readString(payload.documentType) ?? readString(payload.category);
  const fileDescription =
    readString(payload.fileDescription) ?? readString(payload.description);
  const filename = readString(payload.filename) ?? "";
  const byteSize = typeof payload.byteSize === "number" ? payload.byteSize : 0;
  const createdAt = readString(row.createdAt) ?? new Date().toISOString();
  const updatedAt = readString(row.updatedAt) ?? new Date().toISOString();

  return {
    id: row._id,
    clientId: readString(relatedIds.clientId),
    fileId: readString(payload.fileId),
    filename,
    file_name: filename,
    mimeType: readString(payload.mimeType),
    file_type: readString(payload.mimeType),
    byteSize,
    file_size: byteSize,
    label: label ?? filename,
    documentType,
    document_type: documentType,
    category: readString(payload.category),
    fileDescription,
    file_description: fileDescription,
    notes: readString(payload.notes),
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
    sort_order: 0,
  };
}

// ---------------------------------------------------------------------------
// Client CRUD
// ---------------------------------------------------------------------------

export const getClients = query({
  args: {
    filters: v.optional(v.object({
      status: v.optional(v.array(v.string())),
      search: v.optional(v.string()),
    })),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.max(1, args.pageSize ?? args.limit ?? 50);
    const offset = Math.max(0, args.offset ?? (page - 1) * pageSize);
    const statusFilters = new Set(
      args.filters?.status?.length
        ? args.filters.status
        : args.status
          ? [args.status]
          : [],
    );
    const searchLower = (args.filters?.search ?? args.search)?.toLowerCase();

    const rows = await getCrmRecordsByWorkspaceAndType(
      ctx,
      workspaceId,
      "client",
    );

    const filtered = rows
      .filter(isNotDeleted)
      .filter((row) => {
        if (statusFilters.size === 0) return true;
        const payload = asRecord(row.payload);
        const clientStatus = readString(row.status) ?? readString(payload.stage);
        return clientStatus ? statusFilters.has(clientStatus) : false;
      })
      .filter((row) => {
        if (!searchLower) return true;
        const payload = asRecord(row.payload);
        const firstName = (readString(payload.firstName) ?? "").toLowerCase();
        const lastName = (readString(payload.lastName) ?? "").toLowerCase();
        const email = (readString(payload.email) ?? "").toLowerCase();
        const phone = (readString(payload.phone) ?? "").toLowerCase();
        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          `${firstName} ${lastName}`.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower)
        );
      })
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      );

    const counts = {
      total: filtered.length,
      inquiry: 0,
      intake_pending: 0,
      waitlist: 0,
      assessment: 0,
      authorization: 0,
      active: 0,
      on_hold: 0,
      discharged: 0,
    };

    for (const row of filtered) {
      const payload = asRecord(row.payload);
      const clientStatus = readString(row.status) ?? readString(payload.stage);
      if (
        clientStatus &&
        Object.prototype.hasOwnProperty.call(counts, clientStatus)
      ) {
        counts[clientStatus as keyof Omit<typeof counts, "total">] += 1;
      }
    }

    const clients = filtered.slice(offset, offset + pageSize).map((row) => {
      const payload = asRecord(row.payload);
      const createdAt = readString(row.createdAt) ?? new Date().toISOString();
      const updatedAt = readString(row.updatedAt) ?? createdAt;
      return {
        id: row._id,
        status:
          (readString(row.status) ?? readString(payload.stage) ?? "inquiry") as string,
        child_first_name: readString(payload.firstName),
        child_last_name: readString(payload.lastName),
        child_date_of_birth: readString(payload.dateOfBirth),
        created_at: createdAt,
        updated_at: updatedAt,
        primary_parent_name: null,
        primary_parent_phone: readString(payload.phone),
        primary_parent_email: readString(payload.email),
        primary_insurance_name: null,
        primary_insurance_member_id: null,
      };
    });

    return {
      clients,
      counts,
      total: filtered.length,
    };
  },
});

export const getClientById = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const clientId = args.clientId;

    const record = await ctx.db.get(asId<"crmRecords">(clientId));
    if (
      !record ||
      String(record.workspaceId) !== workspaceId ||
      record.recordType !== "client" ||
      record.deletedAt
    ) {
      throw new ConvexError("Client not found");
    }

    const client = mapClient(record as ConvexDoc);

    // Fetch sub-records per type in parallel using the by_workspace_and_type
    // index. This avoids loading every CRM record in the workspace (N+1).
    const [
      parentRows,
      locationRows,
      insuranceRows,
      authorizationRows,
      authServiceRows,
      contactRows,
      taskRows,
      documentRows,
    ] = await Promise.all([
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_parent"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_location"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_insurance"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_authorization"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "authorization_service"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_contact"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_task"),
      getSubRecordsForClient(ctx, workspaceId, clientId, "client_document"),
    ]);

    const parents = parentRows.map(mapSubRecord);
    const locations = locationRows.map(mapSubRecord);
    const insurances = insuranceRows.map(mapSubRecord);
    const authorizations = authorizationRows.map((row) => {
      const mapped = mapSubRecord(row);
      // Attach authorization services for this specific authorization
      const services = authServiceRows
        .filter((s) => {
          const rel = asRecord(s.relatedIds);
          return readString(rel.authorizationId) === row._id;
        })
        .map(mapSubRecord);
      return { ...mapped, services };
    });
    const contacts = contactRows.map(mapSubRecord);
    const tasks = taskRows.map(mapTask);
    const documents = documentRows.map(mapDocument);

    return {
      ...client,
      parents,
      locations,
      insurances,
      authorizations,
      contacts,
      tasks,
      documents,
    };
  },
});

export const createClient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    referralSource: v.optional(v.union(v.string(), v.null())),
    referralSourceDetail: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    stage: v.optional(v.string()),
    priority: v.optional(v.union(v.string(), v.null())),
    assignedTo: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const ts = now();

    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client",
      status: args.stage ?? "inquiry",
      payload: {
        firstName: args.firstName,
        lastName: args.lastName,
        dateOfBirth: args.dateOfBirth ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        referralSource: args.referralSource ?? null,
        referralSourceDetail: args.referralSourceDetail ?? null,
        notes: args.notes ?? null,
        stage: args.stage ?? "inquiry",
        priority: args.priority ?? null,
        assignedTo: args.assignedTo ?? null,
      },
      createdAt: ts,
      updatedAt: ts,
      legacyTable: "clients",
    });

    return { id };
  },
});

export const createPublicIntakeClient = mutation({
  args: {
    profileId: v.string(),
    listingId: v.string(),
    clientData: publicIntakeRecordDataValidator,
    parentData: v.optional(publicIntakeRecordDataValidator),
    insuranceData: v.optional(publicIntakeRecordDataValidator),
    homeLocationData: v.optional(publicIntakeRecordDataValidator),
    serviceLocationData: v.optional(publicIntakeRecordDataValidator),
    documentUploadToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspaceId = args.profileId;
    const workspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    const listing = await ctx.db.get(asId<"listings">(args.listingId));

    if (
      !workspace ||
      !listing ||
      String(listing.workspaceId) !== workspaceId ||
      listing.status !== "published"
    ) {
      throw new ConvexError("Provider not found");
    }

    const planTier = readString(workspace.planTier) ?? "free";
    const subscriptionStatus = readString(workspace.subscriptionStatus);
    const isActivePaid =
      planTier !== "free" &&
      (subscriptionStatus === "active" || subscriptionStatus === "trialing");
    const listingMetadata = asRecord(listing.metadata);
    if (!isActivePaid || !listingMetadata.clientIntakeEnabled) {
      throw new ConvexError("This provider is not currently accepting intake submissions");
    }

    const ts = now();
    const rawClientData = asRecord(args.clientData);
    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client",
      status: "intake_pending",
      payload: {
        ...rawClientData,
        firstName: readString(rawClientData.child_first_name),
        lastName: readString(rawClientData.child_last_name),
        dateOfBirth: readString(rawClientData.child_date_of_birth),
        referralSource: readString(rawClientData.referral_source) ?? "public_intake",
        referralSourceDetail:
          readString(rawClientData.referral_source_other) ??
          readString(rawClientData.referral_source_detail),
        notes: readString(rawClientData.notes),
        stage: "intake_pending",
        listingId: args.listingId,
        referralDate: ts.split("T")[0],
      },
      relatedIds: { listingId: args.listingId },
      createdAt: ts,
      updatedAt: ts,
      legacyTable: "clients",
    });

    const parentData = asRecord(args.parentData);
    if (hasMeaningfulValues(parentData)) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspaceId),
        recordType: "client_parent",
        payload: {
          ...parentData,
          firstName: readString(parentData.first_name),
          lastName: readString(parentData.last_name),
          isPrimary: true,
          sortOrder: 0,
        },
        relatedIds: { clientId: id },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const insuranceData = asRecord(args.insuranceData);
    if (hasMeaningfulValues(insuranceData)) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspaceId),
        recordType: "client_insurance",
        payload: {
          ...insuranceData,
          providerName: readString(insuranceData.insurance_name),
          memberId: readString(insuranceData.member_id),
          groupNumber: readString(insuranceData.group_number),
          isPrimary: true,
          sortOrder: 0,
        },
        relatedIds: { clientId: id },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const homeLocationData = asRecord(args.homeLocationData);
    if (hasMeaningfulValues(homeLocationData)) {
      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspaceId),
        recordType: "client_location",
        payload: {
          ...homeLocationData,
          label: "Home",
          streetAddress: readString(homeLocationData.street_address),
          postalCode: readString(homeLocationData.postal_code),
          isPrimary: true,
          sortOrder: 0,
        },
        relatedIds: { clientId: id },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    const serviceLocationData = asRecord(args.serviceLocationData);
    if (hasMeaningfulValues(serviceLocationData)) {
      const sameAsHome = serviceLocationData.same_as_home === true;
      const agencyLocationId = readString(serviceLocationData.agency_location_id);
      const agencyLocation = agencyLocationId
        ? await ctx.db.get(asId<"locations">(agencyLocationId))
        : null;
      const agencyLocationMetadata = asRecord(agencyLocation?.metadata);

      const servicePayload = {
        ...serviceLocationData,
        ...(sameAsHome && hasMeaningfulValues(homeLocationData)
          ? {
              street_address: homeLocationData.street_address,
              city: homeLocationData.city,
              state: homeLocationData.state,
              postal_code: homeLocationData.postal_code,
              latitude: homeLocationData.latitude,
              longitude: homeLocationData.longitude,
              place_id: homeLocationData.place_id,
            }
          : {}),
      };

      if (agencyLocation && String(agencyLocation.workspaceId) === workspaceId) {
        servicePayload.street_address =
          readString(agencyLocationMetadata.street) ??
          readString(servicePayload.street_address);
        servicePayload.city =
          readString(agencyLocationMetadata.city) ?? readString(servicePayload.city);
        servicePayload.state =
          readString(agencyLocationMetadata.state) ?? readString(servicePayload.state);
        servicePayload.postal_code =
          readString(agencyLocationMetadata.postalCode) ??
          readString(servicePayload.postal_code);
        servicePayload.latitude =
          typeof agencyLocationMetadata.latitude === "number"
            ? agencyLocationMetadata.latitude
            : servicePayload.latitude;
        servicePayload.longitude =
          typeof agencyLocationMetadata.longitude === "number"
            ? agencyLocationMetadata.longitude
            : servicePayload.longitude;
      }

      await ctx.db.insert("crmRecords", {
        workspaceId: asId<"workspaces">(workspaceId),
        recordType: "client_location",
        payload: {
          ...servicePayload,
          label: readString(serviceLocationData.location_type) ?? "Service Location",
          streetAddress: readString(servicePayload.street_address),
          postalCode: readString(servicePayload.postal_code),
          isPrimary: false,
          sortOrder: 1,
        },
        relatedIds: { clientId: id },
        createdAt: ts,
        updatedAt: ts,
      });
    }

    let documentUploadToken: string | null = null;
    if (args.documentUploadToken) {
      documentUploadToken = args.documentUploadToken;
      await ctx.db.insert("intakeTokens", {
        workspaceId: asId<"workspaces">(workspaceId),
        subjectType: CLIENT_DOCUMENT_UPLOAD_TOKEN_TYPE,
        subjectId: String(id),
        token: args.documentUploadToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payload: {},
        createdAt: ts,
        updatedAt: ts,
      });
    }

    return {
      clientId: id,
      documentUploadToken,
      listingSlug: readString(listing.slug),
    };
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    referralSource: v.optional(v.union(v.string(), v.null())),
    referralSourceDetail: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    stage: v.optional(v.string()),
    priority: v.optional(v.union(v.string(), v.null())),
    assignedTo: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const record = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !record ||
      String(record.workspaceId) !== workspaceId ||
      record.recordType !== "client" ||
      record.deletedAt
    ) {
      throw new ConvexError("Client not found");
    }

    const existing = asRecord(record.payload);
    const { clientId: _, ...updates } = args;
    const newPayload = { ...existing };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        newPayload[key] = value;
      }
    }

    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(record._id), {
      payload: newPayload,
      status: readString(newPayload.stage) ?? record.status,
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const deleteClient = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const record = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !record ||
      String(record.workspaceId) !== workspaceId ||
      record.recordType !== "client"
    ) {
      throw new ConvexError("Client not found");
    }

    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(record._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const updateClientStatus = mutation({
  args: {
    clientId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const record = await ctx.db.get(asId<"crmRecords">(args.clientId));
    if (
      !record ||
      String(record.workspaceId) !== workspaceId ||
      record.recordType !== "client" ||
      record.deletedAt
    ) {
      throw new ConvexError("Client not found");
    }

    const existing = asRecord(record.payload);
    const ts = now();
    await ctx.db.patch(asId<"crmRecords">(record._id), {
      status: args.status,
      payload: { ...existing, stage: args.status },
      updatedAt: ts,
    });

    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Generic sub-record helpers
// ---------------------------------------------------------------------------

async function requireClientOwnership(
  ctx: ConvexCtx,
  clientId: string,
  workspaceId: string,
) {
  const client = await ctx.db.get(asId<"crmRecords">(clientId));
  if (
    !client ||
    String(client.workspaceId) !== workspaceId ||
    client.recordType !== "client" ||
    client.deletedAt
  ) {
    throw new ConvexError("Client not found");
  }

  return client;
}

async function requireSubRecord(
  ctx: ConvexCtx,
  recordId: string,
  workspaceId: string,
  expectedType: string,
) {
  const record = await ctx.db.get(asId<"crmRecords">(recordId));
  if (
    !record ||
    String(record.workspaceId) !== workspaceId ||
    record.recordType !== expectedType ||
    record.deletedAt
  ) {
    throw new ConvexError("Record not found");
  }

  return record;
}

async function createSubRecord(
  ctx: MutationCtx,
  workspaceId: string,
  clientId: string,
  recordType: string,
  payload: Record<string, unknown>,
  extraRelatedIds?: Record<string, unknown>,
) {
  await requireClientOwnership(ctx, clientId, workspaceId);
  const ts = now();

  const id = await ctx.db.insert("crmRecords", {
    workspaceId: asId<"workspaces">(workspaceId),
    recordType,
    payload,
    relatedIds: { clientId, ...extraRelatedIds },
    createdAt: ts,
    updatedAt: ts,
  });

  return { id };
}

async function updateSubRecord(
  ctx: MutationCtx,
  recordId: string,
  workspaceId: string,
  recordType: string,
  updates: Record<string, unknown>,
) {
  const record = await requireSubRecord(ctx, recordId, workspaceId, recordType);
  const existing = asRecord(record.payload);
  const newPayload = { ...existing };

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      newPayload[key] = value;
    }
  }

  const ts = now();
  await ctx.db.patch(asId<"crmRecords">(record._id), {
    payload: newPayload,
    updatedAt: ts,
  });

  return { success: true };
}

async function deleteSubRecord(
  ctx: MutationCtx,
  recordId: string,
  workspaceId: string,
  recordType: string,
) {
  const record = await requireSubRecord(ctx, recordId, workspaceId, recordType);
  const ts = now();
  await ctx.db.patch(asId<"crmRecords">(record._id), {
    deletedAt: ts,
    updatedAt: ts,
  });

  return { success: true };
}

function hasMeaningfulValues(payload: Record<string, unknown>) {
  return Object.values(payload).some(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0),
  );
}

// ---------------------------------------------------------------------------
// Client Parents
// ---------------------------------------------------------------------------

export const addClientParent = mutation({
  args: {
    clientId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    relationship: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...payload } = args;
    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "client_parent",
      payload,
    );
  },
});

export const updateClientParent = mutation({
  args: {
    recordId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    relationship: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_parent",
      updates,
    );
  },
});

export const deleteClientParent = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_parent",
    );
  },
});

// ---------------------------------------------------------------------------
// Client Locations
// ---------------------------------------------------------------------------

export const addClientLocation = mutation({
  args: {
    clientId: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    locationType: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...payload } = args;
    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "client_location",
      payload,
    );
  },
});

export const updateClientLocation = mutation({
  args: {
    recordId: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    locationType: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_location",
      updates,
    );
  },
});

export const deleteClientLocation = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_location",
    );
  },
});

// ---------------------------------------------------------------------------
// Client Insurances
// ---------------------------------------------------------------------------

export const addClientInsurance = mutation({
  args: {
    clientId: v.string(),
    provider: v.string(),
    policyNumber: v.optional(v.union(v.string(), v.null())),
    groupNumber: v.optional(v.union(v.string(), v.null())),
    subscriberName: v.optional(v.union(v.string(), v.null())),
    subscriberDob: v.optional(v.union(v.string(), v.null())),
    relationshipToSubscriber: v.optional(v.union(v.string(), v.null())),
    isPrimary: v.optional(v.boolean()),
    effectiveDate: v.optional(v.union(v.string(), v.null())),
    expirationDate: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...payload } = args;
    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "client_insurance",
      payload,
    );
  },
});

export const updateClientInsurance = mutation({
  args: {
    recordId: v.string(),
    provider: v.optional(v.string()),
    policyNumber: v.optional(v.union(v.string(), v.null())),
    groupNumber: v.optional(v.union(v.string(), v.null())),
    subscriberName: v.optional(v.union(v.string(), v.null())),
    subscriberDob: v.optional(v.union(v.string(), v.null())),
    relationshipToSubscriber: v.optional(v.union(v.string(), v.null())),
    isPrimary: v.optional(v.boolean()),
    effectiveDate: v.optional(v.union(v.string(), v.null())),
    expirationDate: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_insurance",
      updates,
    );
  },
});

export const deleteClientInsurance = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_insurance",
    );
  },
});

// ---------------------------------------------------------------------------
// Client Authorizations
// ---------------------------------------------------------------------------

export const addClientAuthorization = mutation({
  args: {
    clientId: v.string(),
    authorizationNumber: v.optional(v.union(v.string(), v.null())),
    insuranceId: v.optional(v.union(v.string(), v.null())),
    startDate: v.optional(v.union(v.string(), v.null())),
    endDate: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    totalUnits: v.optional(v.union(v.number(), v.null())),
    usedUnits: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...payload } = args;
    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "client_authorization",
      payload,
    );
  },
});

export const updateClientAuthorization = mutation({
  args: {
    recordId: v.string(),
    authorizationNumber: v.optional(v.union(v.string(), v.null())),
    insuranceId: v.optional(v.union(v.string(), v.null())),
    startDate: v.optional(v.union(v.string(), v.null())),
    endDate: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    totalUnits: v.optional(v.union(v.number(), v.null())),
    usedUnits: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_authorization",
      updates,
    );
  },
});

export const deleteClientAuthorization = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_authorization",
    );
  },
});

// ---------------------------------------------------------------------------
// Authorization Services
// ---------------------------------------------------------------------------

export const addAuthorizationService = mutation({
  args: {
    clientId: v.string(),
    authorizationId: v.string(),
    serviceCode: v.string(),
    serviceName: v.optional(v.union(v.string(), v.null())),
    authorizedUnits: v.optional(v.union(v.number(), v.null())),
    usedUnits: v.optional(v.union(v.number(), v.null())),
    unitType: v.optional(v.union(v.string(), v.null())),
    rate: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, authorizationId, ...payload } = args;

    // Verify authorization exists and belongs to the workspace
    await requireSubRecord(
      ctx,
      authorizationId,
      workspaceId,
      "client_authorization",
    );

    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "authorization_service",
      payload,
      { authorizationId },
    );
  },
});

export const updateAuthorizationService = mutation({
  args: {
    recordId: v.string(),
    serviceCode: v.optional(v.string()),
    serviceName: v.optional(v.union(v.string(), v.null())),
    authorizedUnits: v.optional(v.union(v.number(), v.null())),
    usedUnits: v.optional(v.union(v.number(), v.null())),
    unitType: v.optional(v.union(v.string(), v.null())),
    rate: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "authorization_service",
      updates,
    );
  },
});

export const deleteAuthorizationService = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "authorization_service",
    );
  },
});

// ---------------------------------------------------------------------------
// Client Contacts
// ---------------------------------------------------------------------------

export const addClientContact = mutation({
  args: {
    clientId: v.string(),
    contactType: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    organization: v.optional(v.union(v.string(), v.null())),
    title: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...payload } = args;
    return createSubRecord(
      ctx,
      workspaceId,
      clientId,
      "client_contact",
      payload,
    );
  },
});

export const updateClientContact = mutation({
  args: {
    recordId: v.string(),
    contactType: v.optional(v.string()),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    organization: v.optional(v.union(v.string(), v.null())),
    title: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, ...updates } = args;
    return updateSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_contact",
      updates,
    );
  },
});

export const deleteClientContact = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_contact",
    );
  },
});

// ---------------------------------------------------------------------------
// Client Documents
// ---------------------------------------------------------------------------

export const addClientDocument = mutation({
  args: {
    clientId: v.string(),
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
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    await requireClientOwnership(ctx, args.clientId, workspaceId);

    if (!args.storageId) {
      throw new ConvexError("Storage ID is required");
    }

    const existingDocuments = await getSubRecordsForClient(
      ctx,
      workspaceId,
      args.clientId,
      "client_document",
    );
    if (existingDocuments.length >= CLIENT_DOCUMENT_LIMIT) {
      throw new ConvexError(
        `Document limit reached (${CLIENT_DOCUMENT_LIMIT} per client). Please remove old documents first.`,
      );
    }

    const ts = now();

    // Create file record
    const fileId = await ctx.db.insert("files", {
      workspaceId: asId<"workspaces">(workspaceId),
      storageId: asId<"_storage">(args.storageId),
      bucket: "client-documents",
      storageKey: `clients/${args.clientId}/${args.filename}`,
      filename: args.filename,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      visibility: "private" as const,
      relatedTable: "crmRecords",
      relatedId: args.clientId,
      createdAt: ts,
      updatedAt: ts,
    });

    // Create CRM record linking to file
    const crmId = await ctx.db.insert("crmRecords", {
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
      },
      relatedIds: { clientId: args.clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    return { id: crmId, fileId: String(fileId) };
  },
});

export const updateClientDocument = mutation({
  args: {
    recordId: v.string(),
    label: v.optional(v.union(v.string(), v.null())),
    category: v.optional(v.union(v.string(), v.null())),
    fileDescription: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const record = await requireSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_document",
    );

    const payload = asRecord(record.payload);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(record._id), {
      payload: {
        ...payload,
        ...(args.label !== undefined ? { label: args.label } : {}),
        ...(args.category !== undefined
          ? {
              category: args.category,
              documentType: args.category,
            }
          : {}),
        ...(args.fileDescription !== undefined
          ? { fileDescription: args.fileDescription }
          : {}),
        ...(args.notes !== undefined ? { notes: args.notes } : {}),
      },
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const deleteClientDocument = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const record = await requireSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_document",
    );

    const ts = now();

    // Soft-delete the CRM record
    await ctx.db.patch(asId<"crmRecords">(record._id), {
      deletedAt: ts,
      updatedAt: ts,
    });

    // Soft-delete the file record if it exists
    const payload = asRecord(record.payload);
    const fileId = readString(payload.fileId);
    if (fileId) {
      const file = await ctx.db.get(asId<"files">(fileId));
      if (file && String(file.workspaceId) === workspaceId) {
        await ctx.db.patch(asId<"files">(file._id), {
          deletedAt: ts,
          updatedAt: ts,
        });
      }
    }

    return { success: true };
  },
});

export const getDocumentUrl = query({
  args: {
    storageId: v.optional(v.string()),
    recordId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    let storageId = args.storageId ?? null;
    let fileName: string | null = null;

    if (args.recordId) {
      const record = await requireSubRecord(
        ctx,
        args.recordId,
        workspaceId,
        "client_document",
      );
      const payload = asRecord(record.payload);
      fileName = readString(payload.filename) ?? readString(payload.label);
      const fileId = readString(payload.fileId);
      if (!fileId) {
        throw new ConvexError("Document not found");
      }

      const file = await ctx.db.get(asId<"files">(fileId));
      if (!file || String(file.workspaceId) !== workspaceId || file.deletedAt) {
        throw new ConvexError("Document not found");
      }

      storageId = readString(file.storageId);
      fileName = fileName ?? readString(file.filename);
      if (!storageId) {
        throw new ConvexError("Document not found");
      }
    }

    if (!storageId) {
      throw new ConvexError("Document not found");
    }

    const url = await ctx.storage.getUrl(asId<"_storage">(storageId));
    if (!url) {
      throw new ConvexError("Document not found");
    }

    return {
      url,
      fileName,
    };
  },
});

// ---------------------------------------------------------------------------
// Client Tasks
// ---------------------------------------------------------------------------

export const addClientTask = mutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.union(v.string(), v.null())),
    taskType: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { clientId, ...rest } = args;

    const ts = now();
    const id = await ctx.db.insert("crmRecords", {
      workspaceId: asId<"workspaces">(workspaceId),
      recordType: "client_task",
      status: "pending",
      payload: {
        title: rest.title,
        description: rest.description ?? null,
        dueDate: rest.dueDate ?? null,
        priority: rest.priority ?? "medium",
        assignedTo: rest.assignedTo ?? null,
        taskType: rest.taskType ?? null,
      },
      relatedIds: { clientId },
      createdAt: ts,
      updatedAt: ts,
    });

    return { id };
  },
});

export const updateClientTask = mutation({
  args: {
    recordId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.union(v.string(), v.null())),
    taskType: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const { recordId, status, ...updates } = args;

    const record = await requireSubRecord(
      ctx,
      recordId,
      workspaceId,
      "client_task",
    );

    const existing = asRecord(record.payload);
    const newPayload = { ...existing };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        newPayload[key] = value;
      }
    }

    const ts = now();
    const patch: Record<string, unknown> = {
      payload: newPayload,
      updatedAt: ts,
    };

    if (status !== undefined) {
      patch.status = status;
    }

    await ctx.db.patch(asId<"crmRecords">(record._id), patch);

    return { success: true };
  },
});

export const completeClientTask = mutation({
  args: {
    recordId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const record = await requireSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_task",
    );

    const existing = asRecord(record.payload);
    const ts = now();

    await ctx.db.patch(asId<"crmRecords">(record._id), {
      status: "completed",
      payload: { ...existing, completedAt: ts },
      updatedAt: ts,
    });

    return { success: true };
  },
});

export const deleteClientTask = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    return deleteSubRecord(
      ctx,
      args.recordId,
      workspaceId,
      "client_task",
    );
  },
});

export const getTasks = query({
  args: {
    status: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    clientId: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const rows = await getCrmRecordsByWorkspaceAndType(
      ctx,
      workspaceId,
      "client_task",
    );

    const filtered = rows
      .filter(isNotDeleted)
      .filter((row) => {
        if (!args.status) return true;
        return row.status === args.status;
      })
      .filter((row) => {
        if (!args.assignedTo) return true;
        const payload = asRecord(row.payload);
        return readString(payload.assignedTo) === args.assignedTo;
      })
      .filter((row) => {
        if (!args.clientId) return true;
        const related = asRecord(row.relatedIds);
        return readString(related.clientId) === args.clientId;
      })
      .sort((a, b) => {
        // Sort by due date ascending, nulls last
        const aPayload = asRecord(a.payload);
        const bPayload = asRecord(b.payload);
        const aDate = readString(aPayload.dueDate);
        const bDate = readString(bPayload.dueDate);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

    return {
      tasks: filtered.slice(offset, offset + limit).map(mapTask),
      total: filtered.length,
    };
  },
});

export const getActionableTaskCount = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const rows = await getCrmRecordsByWorkspaceAndType(
      ctx,
      workspaceId,
      "client_task",
    );

    const today = new Date();
    let pending = 0;
    let overdue = 0;

    for (const row of rows) {
      if (row.deletedAt) continue;
      if (row.status === "completed" || row.status === "cancelled") continue;

      pending++;

      const payload = asRecord(row.payload);
      const dueDate = readString(payload.dueDate);
      if (dueDate && new Date(dueDate) < today) {
        overdue++;
      }
    }

    return { pending, overdue, total: pending };
  },
});

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  "inquiry",
  "intake",
  "active",
  "on_hold",
  "discharged",
  "waitlist",
] as const;

export const getPipelineData = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await requireCurrentWorkspace(ctx);

    const rows = await getCrmRecordsByWorkspaceAndType(
      ctx,
      workspaceId,
      "client",
    );

    const stages: Record<
      string,
      { stage: string; count: number; clients: ReturnType<typeof mapClient>[] }
    > = {};

    for (const stage of PIPELINE_STAGES) {
      stages[stage] = { stage, count: 0, clients: [] };
    }

    for (const row of rows) {
      if (row.deletedAt) continue;
      const payload = asRecord(row.payload);
      const stage = readString(payload.stage) ?? "inquiry";
      if (!stages[stage]) {
        stages[stage] = { stage, count: 0, clients: [] };
      }
      stages[stage].count++;
      stages[stage].clients.push(mapClient(row));
    }

    return {
      stages: PIPELINE_STAGES.map((s) => stages[s]),
      totalClients: rows.filter(isNotDeleted).length,
    };
  },
});
