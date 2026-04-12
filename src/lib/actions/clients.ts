/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use server";

import { randomBytes } from "crypto";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { isConvexDataEnabled } from "@/lib/platform/config";
import {
  buildDocumentAccessPath,
  getDocumentAccessToken,
} from "@/lib/public-access";
import { z } from "zod";
import {
  clientSchema,
  clientParentSchema,
  clientLocationSchema,
  clientInsuranceSchema,
  clientAuthorizationSchema,
  clientAuthorizationServiceSchema,
  clientDocumentSchema,
  clientDocumentUploadSchema,
  clientTaskSchema,
  clientContactSchema,
  type Client,
  type ClientWithRelated,
  type ClientParent,
  type ClientLocation,
  type ClientInsurance,
  type ClientAuthorization,
  type ClientAuthorizationService,
  type ClientDocument,
  type ClientTask,
  type ClientContact,
  type ClientFilters,
  type ClientStatus,
} from "@/lib/validations/clients";
import {
  STORAGE_BUCKETS,
  DOCUMENT_LIMITS,
  isValidDocumentType,
  isValidDocumentSize,
  generateDocumentPath,
  verifyDocumentMagicBytes,
  DOCUMENT_MAX_SIZE,
} from "@/lib/storage/config";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getRequestOrigin } from "@/lib/utils/domains";

function legacyDataProviderRemoved(): never {
  throw new Error("Legacy data provider path has been removed. Expected Convex runtime.");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const createLegacyDataClient = async (): Promise<any> => legacyDataProviderRemoved();
const createAdminClient = async (): Promise<any> => legacyDataProviderRemoved();
const getCurrentProfileId = async (): Promise<any> => legacyDataProviderRemoved();
const getUser = async (): Promise<any> => legacyDataProviderRemoved();
/* eslint-enable @typescript-eslint/no-explicit-any */

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

interface ValidatedClientDocumentUploadToken {
  clientId: string;
  profileId: string;
}

export interface ClientDocumentUploadAccessData {
  clientId: string;
  profileId: string;
  clientName: string;
  uploadedDocuments: Array<{
    id: string;
    label: string | null;
    documentType: ClientDocument["document_type"] | null;
    fileName: string | null;
    fileSize: number | null;
    createdAt: string;
  }>;
}

export interface ClientListItem {
  id: string;
  status: ClientStatus;
  child_first_name: string | null;
  child_last_name: string | null;
  child_date_of_birth: string | null;
  created_at: string;
  updated_at: string;
  // Denormalized for list display
  primary_parent_name: string | null;
  primary_parent_phone: string | null;
  primary_parent_email: string | null;
  primary_insurance_name: string | null;
  primary_insurance_member_id: string | null;
}

export interface ClientDetail extends Client {
  id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
  parents: (ClientParent & { id: string; created_at: string })[];
  locations: (ClientLocation & { id: string; created_at: string })[];
  insurances: (ClientInsurance & { id: string; created_at: string })[];
  authorizations: (ClientAuthorization & {
    id: string;
    created_at: string;
    services?: (ClientAuthorizationService & { id: string })[];
  })[];
  documents: (ClientDocument & { id: string; created_at: string })[];
  tasks: (ClientTask & { id: string; created_at: string; completed_at: string | null })[];
  contacts: (ClientContact & { id: string; created_at: string })[];
}

export interface ClientCounts {
  total: number;
  inquiry: number;
  intake_pending: number;
  waitlist: number;
  assessment: number;
  authorization: number;
  active: number;
  on_hold: number;
  discharged: number;
}

function generatePublicUploadToken(): string {
  return randomBytes(16).toString("base64url");
}

function getClientDisplayName(client: {
  child_first_name?: string | null;
  child_last_name?: string | null;
}) {
  return [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "your child";
}

async function getCurrentSiteOrigin() {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
  try {
    const headersList = await headers();
    siteUrl = getRequestOrigin(headersList, "therapy");
  } catch {
    // Fall back to env-based origin when there is no active request context.
  }

  return siteUrl;
}

function buildConvexClientMutationArgs(
  data: Partial<Client>,
  options?: { requireNames?: boolean },
): {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  referralSource?: string | null;
  referralSourceDetail?: string | null;
  notes?: string | null;
  stage?: string;
  priority?: string | null;
  assignedTo?: string | null;
} {
  const requireNames = options?.requireNames ?? false;
  return {
    firstName:
      data.child_first_name !== undefined
        ? data.child_first_name
        : requireNames
          ? ""
          : undefined,
    lastName:
      data.child_last_name !== undefined
        ? data.child_last_name
        : requireNames
          ? ""
          : undefined,
    dateOfBirth:
      data.child_date_of_birth !== undefined ? data.child_date_of_birth ?? null : undefined,
    email: undefined,
    phone: undefined,
    referralSource: data.referral_source !== undefined ? data.referral_source ?? null : undefined,
    referralSourceDetail:
      data.referral_source_other !== undefined ? data.referral_source_other ?? null : undefined,
    notes: data.notes !== undefined ? data.notes ?? null : undefined,
    stage: data.status ?? undefined,
    priority: undefined,
    assignedTo: undefined,
  };
}

async function getPublishedListingSlugForProfile(
  profileId: string
): Promise<string | null> {
  const legacyDb = await createAdminClient();

  const { data: listings } = await legacyDb
    .from("listings")
    .select("slug")
    .eq("profile_id", profileId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1);

  return listings?.[0]?.slug ?? null;
}

async function createClientDocumentUploadLinkForProfile(params: {
  profileId: string;
  clientId: string;
}): Promise<ActionResult<{ token: string; url: string }>> {
  const legacyDb = await createAdminClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", params.clientId)
    .eq("profile_id", params.profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const listingSlug = await getPublishedListingSlugForProfile(params.profileId);
  if (!listingSlug) {
    return { success: false, error: "No published listing found" };
  }

  const token = generatePublicUploadToken();
  const { error } = await legacyDb.from("client_document_upload_tokens").insert({
    client_id: params.clientId,
    profile_id: params.profileId,
    token,
  });

  if (error) {
    console.error("[CLIENTS] Failed to create document upload token:", error);
    return { success: false, error: "Failed to create document upload link" };
  }

  const siteUrl = await getCurrentSiteOrigin();

  return {
    success: true,
    data: {
      token,
      url: `${siteUrl}${buildDocumentAccessPath(listingSlug)}?token=${token}`,
    },
  };
}

async function validateClientDocumentUploadToken(
  token: string
): Promise<ActionResult<ValidatedClientDocumentUploadToken>> {
  const legacyDb = await createAdminClient();

  const { data: tokenRow } = await legacyDb
    .from("client_document_upload_tokens")
    .select("client_id, profile_id, expires_at")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return { success: false, error: "Invalid or expired document upload link" };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { success: false, error: "This document upload link has expired" };
  }

  return {
    success: true,
    data: {
      clientId: tokenRow.client_id,
      profileId: tokenRow.profile_id,
    },
  };
}

// =============================================================================
// CLIENT CRUD
// =============================================================================

/**
 * Get all clients for the current user with filtering and pagination
 */
export async function getClients(
  filters?: ClientFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResult<{ clients: ClientListItem[]; counts: ClientCounts; total: number }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{ clients: ClientListItem[]; counts: ClientCounts; total: number }>(
        "crm:getClients",
        { filters, page, pageSize },
      );
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to fetch clients" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Build base query for clients
  let query = legacyDb
    .from("clients")
    .select(`
      id,
      status,
      child_first_name,
      child_last_name,
      child_date_of_birth,
      created_at,
      updated_at,
      client_parents (
        first_name,
        last_name,
        phone,
        email,
        is_primary,
        deleted_at
      ),
      client_insurances (
        insurance_name,
        member_id,
        is_primary,
        deleted_at
      )
    `, { count: "exact" })
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `child_first_name.ilike.${searchTerm},child_last_name.ilike.${searchTerm}`
    );
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: clients, error, count } = await query;

  if (error) {
    console.error("[CLIENTS] Failed to fetch clients:", error);
    return { success: false, error: "Failed to fetch clients" };
  }

  // Get counts by status
  const { data: statusCounts } = await legacyDb
    .from("clients")
    .select("status")
    .eq("profile_id", profileId)
    .is("deleted_at", null);

  let filteredStatusCounts = statusCounts;
  if (filters?.status && filters.status.length > 0) {
    const allowedStatuses = new Set(filters.status);
    filteredStatusCounts = (statusCounts || []).filter((client) =>
      allowedStatuses.has(client.status as ClientStatus)
    );
  }

  const counts: ClientCounts = {
    total: filteredStatusCounts?.length || 0,
    inquiry: 0,
    intake_pending: 0,
    waitlist: 0,
    assessment: 0,
    authorization: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
  };

  filteredStatusCounts?.forEach((c) => {
    const status = c.status as keyof Omit<ClientCounts, "total">;
    if (status in counts) {
      counts[status]++;
    }
  });

  // Transform data
  const clientList: ClientListItem[] = (clients || []).map((c) => {
    const parents = ((c.client_parents as {
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      email: string | null;
      is_primary: boolean;
      deleted_at?: string | null;
    }[] | null) || []).filter((parent) => !parent.deleted_at);
    const insurances = ((c.client_insurances as {
      insurance_name: string | null;
      member_id: string | null;
      is_primary: boolean;
      deleted_at?: string | null;
    }[] | null) || []).filter((insurance) => !insurance.deleted_at);

    const primaryParent = parents?.find((p) => p.is_primary) || parents?.[0];
    const primaryInsurance = insurances?.find((i) => i.is_primary) || insurances?.[0];

    return {
      id: c.id,
      status: c.status as ClientStatus,
      child_first_name: c.child_first_name,
      child_last_name: c.child_last_name,
      child_date_of_birth: c.child_date_of_birth,
      created_at: c.created_at,
      updated_at: c.updated_at,
      primary_parent_name: primaryParent
        ? [primaryParent.first_name, primaryParent.last_name].filter(Boolean).join(" ") || null
        : null,
      primary_parent_phone: primaryParent?.phone || null,
      primary_parent_email: primaryParent?.email || null,
      primary_insurance_name: primaryInsurance?.insurance_name || null,
      primary_insurance_member_id: primaryInsurance?.member_id || null,
    };
  });

  return {
    success: true,
    data: {
      clients: clientList,
      counts,
      total: count || 0,
    },
  };
}

/**
 * Get a simple list of client names for dropdowns/selectors
 */
export async function getClientsList(): Promise<ActionResult<{ id: string; name: string }[]>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{
        clients: { id: string; child_first_name: string | null; child_last_name: string | null }[];
      }>("crm:getClients", {});
      const mapped = (result.clients || []).map((c) => ({
        id: c.id,
        name: [c.child_first_name, c.child_last_name].filter(Boolean).join(" ") || "Unnamed Client",
      }));
      return { success: true, data: mapped };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to fetch clients" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: clients, error } = await legacyDb
    .from("clients")
    .select("id, child_first_name, child_last_name")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("child_first_name", { ascending: true });

  if (error) {
    console.error("[CLIENTS] Failed to fetch clients list:", error);
    return { success: false, error: "Failed to fetch clients" };
  }

  return {
    success: true,
    data: (clients || []).map((c) => ({
      id: c.id,
      name: [c.child_first_name, c.child_last_name].filter(Boolean).join(" ") || "Unnamed Client",
    })),
  };
}

/**
 * Get a single client with all related data
 */
export async function getClientById(
  clientId: string
): Promise<ActionResult<ClientDetail>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      // Convex returns camelCase fields; map to snake_case expected by ClientDetail
      const raw = await queryConvex<Record<string, unknown>>("crm:getClientById", { clientId });
      const mapped = {
        ...raw,
        // Map top-level client fields from Convex camelCase to expected snake_case
        child_first_name: raw.firstName as string | null ?? raw.child_first_name as string | null ?? null,
        child_last_name: raw.lastName as string | null ?? raw.child_last_name as string | null ?? null,
        child_date_of_birth: raw.dateOfBirth as string | null ?? raw.child_date_of_birth as string | null ?? null,
        child_diagnosis: raw.child_diagnosis ?? [],
        child_primary_concerns: raw.child_primary_concerns ?? null,
        child_aba_history: raw.child_aba_history ?? null,
        child_school_name: raw.child_school_name ?? null,
        child_school_district: raw.child_school_district ?? null,
        child_grade_level: raw.child_grade_level ?? null,
        child_other_therapies: raw.child_other_therapies ?? null,
        child_pediatrician_name: raw.child_pediatrician_name ?? null,
        child_pediatrician_phone: raw.child_pediatrician_phone ?? null,
        referral_source: raw.referralSource as string | null ?? raw.referral_source as string | null ?? null,
        referral_date: raw.referral_date ?? null,
        service_start_date: raw.service_start_date ?? null,
        service_end_date: raw.service_end_date ?? null,
        funding_source: raw.funding_source ?? null,
        preferred_language: raw.preferred_language ?? null,
        profile_id: raw.workspaceId as string ?? raw.profile_id as string ?? "",
        status: raw.status as string ?? raw.stage as string ?? "inquiry",
        created_at: raw.createdAt as string ?? raw.created_at as string ?? new Date().toISOString(),
        updated_at: raw.updatedAt as string ?? raw.updated_at as string ?? new Date().toISOString(),
        // Sub-records: map parent fields from Convex format
        parents: Array.isArray(raw.parents) ? (raw.parents as Record<string, unknown>[]).map((p) => ({
          ...p,
          first_name: p.first_name ?? p.firstName ?? null,
          last_name: p.last_name ?? p.lastName ?? null,
          is_primary: p.is_primary ?? p.isPrimary ?? false,
          created_at: p.createdAt ?? p.created_at ?? new Date().toISOString(),
        })) : [],
        locations: Array.isArray(raw.locations) ? (raw.locations as Record<string, unknown>[]).map((l) => ({
          ...l,
          is_primary: l.is_primary ?? l.isPrimary ?? false,
          street_address: l.street_address ?? l.streetAddress ?? null,
          postal_code: l.postal_code ?? l.postalCode ?? null,
          created_at: l.createdAt ?? l.created_at ?? new Date().toISOString(),
        })) : [],
        insurances: raw.insurances ?? [],
        authorizations: raw.authorizations ?? [],
        documents: raw.documents ?? [],
        tasks: raw.tasks ?? [],
        contacts: raw.contacts ?? [],
      } as unknown as ClientDetail;
      return { success: true, data: mapped };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Client not found" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Get client with all related data
  const { data: client, error } = await legacyDb
    .from("clients")
    .select(`
      *,
      client_parents (*),
      client_locations (*),
      client_insurances (*),
      client_authorizations (*),
      client_documents (*),
      client_tasks (*),
      client_contacts (*)
    `)
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (error || !client) {
    return { success: false, error: "Client not found" };
  }

  // Filter out soft-deleted related records
  const filterDeleted = <T extends { deleted_at?: string | null }>(items: T[] | null): T[] =>
    (items || []).filter((item) => !item.deleted_at);

  // Type-safe sort function for items with sort_order
  const sortByOrder = <T extends { sort_order: number }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.sort_order - b.sort_order);

  const parents = filterDeleted(client.client_parents) as Array<{ deleted_at?: string | null; sort_order: number }>;
  const locations = filterDeleted(client.client_locations) as Array<{ deleted_at?: string | null; sort_order: number }>;
  const insurances = filterDeleted(client.client_insurances) as Array<{ deleted_at?: string | null; sort_order: number }>;
  const documents = filterDeleted(client.client_documents) as Array<{ deleted_at?: string | null; sort_order: number }>;
  const contacts = filterDeleted(client.client_contacts) as Array<{ deleted_at?: string | null; sort_order: number }>;

  // Get authorizations and filter deleted ones
  const authorizations = filterDeleted(client.client_authorizations) as Array<{
    id: string;
    deleted_at?: string | null;
    [key: string]: unknown;
  }>;

  // Fetch services for all authorizations
  const authIds = authorizations.map((auth) => auth.id);
  let servicesMap: Record<string, (ClientAuthorizationService & { id: string })[]> = {};

  if (authIds.length > 0) {
    const { data: services } = await legacyDb
      .from("client_authorization_services")
      .select("*")
      .in("authorization_id", authIds)
      .is("deleted_at", null);

    if (services) {
      // Group services by authorization_id
      servicesMap = services.reduce((acc, svc) => {
        if (!acc[svc.authorization_id]) {
          acc[svc.authorization_id] = [];
        }
        acc[svc.authorization_id].push(svc as ClientAuthorizationService & { id: string });
        return acc;
      }, {} as Record<string, (ClientAuthorizationService & { id: string })[]>);
    }
  }

  // Attach services to authorizations
  const authorizationsWithServices = authorizations.map((auth) => ({
    ...auth,
    services: servicesMap[auth.id] || [],
  }));

  return {
    success: true,
    data: {
      ...client,
      parents: sortByOrder(parents),
      locations: sortByOrder(locations),
      insurances: sortByOrder(insurances),
      authorizations: authorizationsWithServices,
      documents: sortByOrder(documents),
      tasks: filterDeleted(client.client_tasks),
      contacts: sortByOrder(contacts),
    } as ClientDetail,
  };
}

/**
 * Create a new client
 */
export async function createClient(
  data: Partial<Client>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>(
        "crm:createClient",
        buildConvexClientMutationArgs(data, { requireNames: true }),
      );
      revalidatePath("/dashboard/clients");
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to create client" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const currentTier = await getCurrentPlanTier();
  if (currentTier === "free") {
    return {
      success: false,
      error: "Client management is in preview mode. Go Live to add real clients.",
    };
  }

  const parsed = clientSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Get user's listing (for linking)
  const { data: listing } = await legacyDb
    .from("listings")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  const { data: client, error } = await legacyDb
    .from("clients")
    .insert({
      profile_id: profileId,
      listing_id: listing?.id || null,
      ...parsed.data,
      // Convert empty strings to null for proper DB storage
      inquiry_id: parsed.data.inquiry_id || null,
      referral_source: parsed.data.referral_source || null,
      referral_date: parsed.data.referral_date || null,
      service_start_date: parsed.data.service_start_date || null,
      service_end_date: parsed.data.service_end_date || null,
      discharge_reason: parsed.data.discharge_reason || null,
      funding_source: parsed.data.funding_source || null,
      preferred_language: parsed.data.preferred_language || null,
      child_first_name: parsed.data.child_first_name || null,
      child_last_name: parsed.data.child_last_name || null,
      child_date_of_birth: parsed.data.child_date_of_birth || null,
      child_diagnosis: parsed.data.child_diagnosis || [],
      child_diagnosis_codes: parsed.data.child_diagnosis_codes || [],
      child_diagnosis_date: parsed.data.child_diagnosis_date || null,
      child_primary_concerns: parsed.data.child_primary_concerns || null,
      child_aba_history: parsed.data.child_aba_history || null,
      child_school_name: parsed.data.child_school_name || null,
      child_school_district: parsed.data.child_school_district || null,
      child_grade_level: parsed.data.child_grade_level || null,
      child_other_therapies: parsed.data.child_other_therapies || null,
      child_pediatrician_name: parsed.data.child_pediatrician_name || null,
      child_pediatrician_phone: parsed.data.child_pediatrician_phone || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !client) {
    console.error("[CLIENTS] Failed to create client:", error);
    return { success: false, error: "Failed to create client" };
  }

  // If this client was converted from an inquiry, mark the inquiry as converted
  if (parsed.data.inquiry_id) {
    await legacyDb
      .from("inquiries")
      .update({ status: "converted" })
      .eq("id", parsed.data.inquiry_id);

    revalidatePath("/dashboard/notifications");
  }

  revalidatePath("/dashboard/clients");
  return { success: true, data: { id: client.id } };
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  data: Partial<Client>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClient", {
        clientId,
        ...buildConvexClientMutationArgs(data),
      });
      revalidatePath("/dashboard/clients");
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update client" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership and fetch current status for change logging
  const { data: existing } = await legacyDb
    .from("clients")
    .select("id, status, child_first_name, child_last_name")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  const { error } = await legacyDb
    .from("clients")
    .update({
      ...parsed.data,
      // Handle empty strings
      inquiry_id: parsed.data.inquiry_id || null,
      referral_source: parsed.data.referral_source || null,
      referral_date: parsed.data.referral_date || null,
      service_start_date: parsed.data.service_start_date || null,
      service_end_date: parsed.data.service_end_date || null,
      discharge_reason: parsed.data.discharge_reason || null,
      preferred_language: parsed.data.preferred_language || null,
      child_first_name: parsed.data.child_first_name || null,
      child_last_name: parsed.data.child_last_name || null,
      child_date_of_birth: parsed.data.child_date_of_birth || null,
      child_diagnosis_date: parsed.data.child_diagnosis_date || null,
      child_primary_concerns: parsed.data.child_primary_concerns || null,
      child_aba_history: parsed.data.child_aba_history || null,
      child_school_name: parsed.data.child_school_name || null,
      child_school_district: parsed.data.child_school_district || null,
      child_grade_level: parsed.data.child_grade_level || null,
      child_other_therapies: parsed.data.child_other_therapies || null,
      child_pediatrician_name: parsed.data.child_pediatrician_name || null,
      child_pediatrician_phone: parsed.data.child_pediatrician_phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", clientId);

  if (error) {
    console.error("[CLIENTS] Failed to update client:", error);
    return { success: false, error: "Failed to update client" };
  }

  // Log status change for pipeline activity feed + create notification
  if (parsed.data.status && existing.status !== parsed.data.status) {
    await legacyDb
      .from("client_status_changes")
      .insert({
        client_id: clientId,
        profile_id: profileId,
        from_status: existing.status,
        to_status: parsed.data.status,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error("[CLIENTS] Failed to log status change:", logError);
        }
      });

    // Create in-app notification for status change
    const clientName = [existing.child_first_name, existing.child_last_name].filter(Boolean).join(" ") || "Client";
    const { createNotification } = await import("@/lib/actions/notifications");
    createNotification({
      profileId: profileId,
      type: "status_change",
      title: `${clientName} moved to ${parsed.data.status.replace(/_/g, " ")}`,
      body: `Status changed from ${existing.status.replace(/_/g, " ")}`,
      link: `/dashboard/clients/${clientId}`,
      entityId: clientId,
      entityType: "client_status_change",
    }).catch((err) => {
      console.error("[CLIENTS] Failed to create status change notification:", err);
    });
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true };
}

/**
 * Soft delete a client
 */
export async function deleteClient(clientId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClient", { clientId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete client" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership
  const { data: existing } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  // Soft delete
  const { error } = await legacyDb
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) {
    console.error("[CLIENTS] Failed to delete client:", error);
    return { success: false, error: "Failed to delete client" };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: ClientStatus
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientStatus", { clientId, status });
      revalidatePath("/dashboard/clients");
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update status" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Fetch current status and name for change logging
  const { data: current } = await legacyDb
    .from("clients")
    .select("status, child_first_name, child_last_name")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  const previousStatus = current?.status;

  const { error } = await legacyDb
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null);

  if (error) {
    console.error("[CLIENTS] Failed to update status:", error);
    return { success: false, error: "Failed to update status" };
  }

  // Log status change for pipeline activity feed + create notification
  if (previousStatus && previousStatus !== status) {
    await legacyDb
      .from("client_status_changes")
      .insert({
        client_id: clientId,
        profile_id: profileId,
        from_status: previousStatus,
        to_status: status,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error("[CLIENTS] Failed to log status change:", logError);
        }
      });

    const clientName = [current?.child_first_name, current?.child_last_name].filter(Boolean).join(" ") || "Client";
    const { createNotification } = await import("@/lib/actions/notifications");
    createNotification({
      profileId: profileId,
      type: "status_change",
      title: `${clientName} moved to ${status.replace(/_/g, " ")}`,
      body: `Status changed from ${previousStatus.replace(/_/g, " ")}`,
      link: `/dashboard/clients/${clientId}`,
      entityId: clientId,
      entityType: "client_status_change",
    }).catch((err) => {
      console.error("[CLIENTS] Failed to create status change notification:", err);
    });
  }

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true };
}

// =============================================================================
// CLIENT PARENTS
// =============================================================================

export async function addClientParent(
  clientId: string,
  data: Partial<ClientParent>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientParent", {
        clientId,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        relationship: data.relationship || undefined,
        email: data.email || null,
        phone: data.phone || null,
        isPrimary: data.is_primary || false,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add parent" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientParentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify client ownership
  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: parent, error } = await legacyDb
    .from("client_parents")
    .insert({
      client_id: clientId,
      first_name: parsed.data.first_name || null,
      last_name: parsed.data.last_name || null,
      date_of_birth: parsed.data.date_of_birth || null,
      relationship: parsed.data.relationship || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary || false,
      sort_order: parsed.data.sort_order || 0,
    })
    .select("id")
    .single();

  if (error || !parent) {
    console.error("[CLIENTS] Failed to add parent:", error);
    return { success: false, error: "Failed to add parent" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: parent.id } };
}

export async function updateClientParent(
  parentId: string,
  data: Partial<ClientParent>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientParent", {
        recordId: parentId,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        relationship: data.relationship ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        isPrimary: data.is_primary ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update parent" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientParentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership through client
  const { data: parent } = await legacyDb
    .from("client_parents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", parentId)
    .is("deleted_at", null)
    .single();

  if (!parent || (parent.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Parent not found" };
  }

  const { error } = await legacyDb
    .from("client_parents")
    .update({
      first_name: parsed.data.first_name || null,
      last_name: parsed.data.last_name || null,
      date_of_birth: parsed.data.date_of_birth || null,
      relationship: parsed.data.relationship || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", parentId);

  if (error) {
    console.error("[CLIENTS] Failed to update parent:", error);
    return { success: false, error: "Failed to update parent" };
  }

  revalidatePath(`/dashboard/clients/${parent.client_id}`);
  return { success: true };
}

export async function deleteClientParent(parentId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientParent", { recordId: parentId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete parent" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership
  const { data: parent } = await legacyDb
    .from("client_parents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", parentId)
    .is("deleted_at", null)
    .single();

  if (!parent || (parent.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Parent not found" };
  }

  const { error } = await legacyDb
    .from("client_parents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parentId);

  if (error) {
    console.error("[CLIENTS] Failed to delete parent:", error);
    return { success: false, error: "Failed to delete parent" };
  }

  revalidatePath(`/dashboard/clients/${parent.client_id}`);
  return { success: true };
}

// =============================================================================
// CLIENT LOCATIONS
// =============================================================================

export async function addClientLocation(
  clientId: string,
  data: Partial<ClientLocation>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientLocation", {
        clientId,
        address: data.street_address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.postal_code || undefined,
        locationType: data.label || undefined,
        isPrimary: data.is_primary || false,
        notes: data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add location" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientLocationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify client ownership
  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: location, error } = await legacyDb
    .from("client_locations")
    .insert({
      client_id: clientId,
      label: parsed.data.label || null,
      street_address: parsed.data.street_address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      postal_code: parsed.data.postal_code || null,
      country: parsed.data.country || "US",
      latitude: parsed.data.latitude || null,
      longitude: parsed.data.longitude || null,
      place_id: parsed.data.place_id || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary || false,
      sort_order: parsed.data.sort_order || 0,
    })
    .select("id")
    .single();

  if (error || !location) {
    console.error("[CLIENTS] Failed to add location:", error);
    return { success: false, error: "Failed to add location" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: location.id } };
}

export async function updateClientLocation(
  locationId: string,
  data: Partial<ClientLocation>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientLocation", {
        recordId: locationId,
        address: data.street_address ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        zipCode: data.postal_code ?? undefined,
        locationType: data.label ?? undefined,
        isPrimary: data.is_primary ?? undefined,
        notes: data.notes ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update location" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientLocationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership
  const { data: location } = await legacyDb
    .from("client_locations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", locationId)
    .is("deleted_at", null)
    .single();

  if (!location || (location.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Location not found" };
  }

  const { error } = await legacyDb
    .from("client_locations")
    .update({
      label: parsed.data.label || null,
      street_address: parsed.data.street_address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      postal_code: parsed.data.postal_code || null,
      country: parsed.data.country,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      place_id: parsed.data.place_id || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", locationId);

  if (error) {
    console.error("[CLIENTS] Failed to update location:", error);
    return { success: false, error: "Failed to update location" };
  }

  revalidatePath(`/dashboard/clients/${location.client_id}`);
  return { success: true };
}

export async function deleteClientLocation(locationId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientLocation", { recordId: locationId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete location" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: location } = await legacyDb
    .from("client_locations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", locationId)
    .is("deleted_at", null)
    .single();

  if (!location || (location.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Location not found" };
  }

  const { error } = await legacyDb
    .from("client_locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", locationId);

  if (error) {
    console.error("[CLIENTS] Failed to delete location:", error);
    return { success: false, error: "Failed to delete location" };
  }

  revalidatePath(`/dashboard/clients/${location.client_id}`);
  return { success: true };
}

// =============================================================================
// CLIENT INSURANCES
// =============================================================================

export async function addClientInsurance(
  clientId: string,
  data: Partial<ClientInsurance>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientInsurance", {
        clientId,
        provider: data.insurance_name || "",
        policyNumber: data.member_id || null,
        groupNumber: data.group_number || null,
        isPrimary: data.is_primary || false,
        effectiveDate: data.effective_date || null,
        expirationDate: data.expiration_date || null,
        notes: data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add insurance" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientInsuranceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: insurance, error } = await legacyDb
    .from("client_insurances")
    .insert({
      client_id: clientId,
      insurance_name: parsed.data.insurance_name || null,
      insurance_type: parsed.data.insurance_type || null,
      is_primary: parsed.data.is_primary || false,
      effective_date: parsed.data.effective_date || null,
      expiration_date: parsed.data.expiration_date || null,
      member_id: parsed.data.member_id || null,
      group_number: parsed.data.group_number || null,
      plan_name: parsed.data.plan_name || null,
      subscriber_relationship: parsed.data.subscriber_relationship || null,
      status: parsed.data.status || "pending_verification",
      copay_amount: parsed.data.copay_amount || null,
      coinsurance_percentage: parsed.data.coinsurance_percentage || null,
      deductible_total: parsed.data.deductible_total || null,
      deductible_remaining: parsed.data.deductible_remaining || null,
      oop_max_total: parsed.data.oop_max_total || null,
      oop_max_remaining: parsed.data.oop_max_remaining || null,
      notes: parsed.data.notes || null,
      sort_order: parsed.data.sort_order || 0,
    })
    .select("id")
    .single();

  if (error || !insurance) {
    console.error("[CLIENTS] Failed to add insurance:", error);
    return { success: false, error: "Failed to add insurance" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: insurance.id } };
}

export async function updateClientInsurance(
  insuranceId: string,
  data: Partial<ClientInsurance>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientInsurance", {
        recordId: insuranceId,
        provider: data.insurance_name ?? undefined,
        policyNumber: data.member_id ?? undefined,
        groupNumber: data.group_number ?? undefined,
        isPrimary: data.is_primary ?? undefined,
        effectiveDate: data.effective_date ?? undefined,
        expirationDate: data.expiration_date ?? undefined,
        notes: data.notes ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update insurance" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientInsuranceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: insurance } = await legacyDb
    .from("client_insurances")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", insuranceId)
    .is("deleted_at", null)
    .single();

  if (!insurance || (insurance.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Insurance not found" };
  }

  const { error } = await legacyDb
    .from("client_insurances")
    .update({
      insurance_name: parsed.data.insurance_name || null,
      insurance_type: parsed.data.insurance_type,
      is_primary: parsed.data.is_primary,
      effective_date: parsed.data.effective_date || null,
      expiration_date: parsed.data.expiration_date || null,
      member_id: parsed.data.member_id || null,
      group_number: parsed.data.group_number || null,
      plan_name: parsed.data.plan_name || null,
      subscriber_relationship: parsed.data.subscriber_relationship,
      status: parsed.data.status,
      copay_amount: parsed.data.copay_amount,
      coinsurance_percentage: parsed.data.coinsurance_percentage,
      deductible_total: parsed.data.deductible_total,
      deductible_remaining: parsed.data.deductible_remaining,
      oop_max_total: parsed.data.oop_max_total,
      oop_max_remaining: parsed.data.oop_max_remaining,
      notes: parsed.data.notes || null,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", insuranceId);

  if (error) {
    console.error("[CLIENTS] Failed to update insurance:", error);
    return { success: false, error: "Failed to update insurance" };
  }

  revalidatePath(`/dashboard/clients/${insurance.client_id}`);
  return { success: true };
}

export async function deleteClientInsurance(insuranceId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientInsurance", { recordId: insuranceId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete insurance" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: insurance } = await legacyDb
    .from("client_insurances")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", insuranceId)
    .is("deleted_at", null)
    .single();

  if (!insurance || (insurance.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Insurance not found" };
  }

  const { error } = await legacyDb
    .from("client_insurances")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", insuranceId);

  if (error) {
    console.error("[CLIENTS] Failed to delete insurance:", error);
    return { success: false, error: "Failed to delete insurance" };
  }

  revalidatePath(`/dashboard/clients/${insurance.client_id}`);
  return { success: true };
}

// =============================================================================
// CLIENT AUTHORIZATIONS
// =============================================================================

export async function addClientAuthorization(
  clientId: string,
  data: Partial<ClientAuthorization>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientAuthorization", {
        clientId,
        authorizationNumber: data.auth_reference_number || null,
        insuranceId: data.insurance_id || null,
        startDate: data.start_date || null,
        endDate: data.end_date || null,
        status: data.status || "draft",
        totalUnits: data.units_requested || null,
        usedUnits: data.units_used || null,
        notes: data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add authorization" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Create the authorization
  const { data: auth, error } = await legacyDb
    .from("client_authorizations")
    .insert({
      client_id: clientId,
      insurance_id: parsed.data.insurance_id || null,
      payor_type: parsed.data.payor_type || null,
      // Legacy fields (for backward compatibility)
      service_type: parsed.data.service_type || null,
      billing_code: parsed.data.billing_code || null,
      treatment_requested: parsed.data.treatment_requested || null,
      units_requested: parsed.data.units_requested || null,
      units_used: parsed.data.units_used || 0,
      units_per_week_authorized: parsed.data.units_per_week_authorized || null,
      rate_per_unit: parsed.data.rate_per_unit || null,
      // Active fields
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      status: parsed.data.status || "draft",
      auth_reference_number: parsed.data.auth_reference_number || null,
      requires_prior_auth: parsed.data.requires_prior_auth || false,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !auth) {
    console.error("[CLIENTS] Failed to add authorization:", error);
    return { success: false, error: error?.message || "Failed to add authorization" };
  }

  // If services were provided, create them
  if (parsed.data.services && parsed.data.services.length > 0) {
    const servicesToInsert = parsed.data.services.map((svc) => ({
      authorization_id: auth.id,
      service_type: svc.service_type,
      billing_code: svc.billing_code,
      custom_billing_code: svc.custom_billing_code || null,
      use_auth_dates: svc.use_auth_dates ?? true,
      start_date: svc.start_date || null,
      end_date: svc.end_date || null,
      hours_per_week: svc.hours_per_week || null,
      hours_per_auth: svc.hours_per_auth || null,
      units_per_week: svc.units_per_week || null,
      units_per_auth: svc.units_per_auth || null,
      units_used: svc.units_used || 0,
      use_calculated_values: svc.use_calculated_values ?? true,
      notes: svc.notes || null,
    }));

    const { error: svcError } = await legacyDb
      .from("client_authorization_services")
      .insert(servicesToInsert);

    if (svcError) {
      console.error("[CLIENTS] Failed to add authorization services:", svcError);
      // Don't fail the whole operation, just log it
    }
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: auth.id } };
}

export async function updateClientAuthorization(
  authId: string,
  data: Partial<ClientAuthorization>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientAuthorization", {
        recordId: authId,
        authorizationNumber: data.auth_reference_number ?? undefined,
        insuranceId: data.insurance_id ?? undefined,
        startDate: data.start_date ?? undefined,
        endDate: data.end_date ?? undefined,
        status: data.status ?? undefined,
        totalUnits: data.units_requested ?? undefined,
        usedUnits: data.units_used ?? undefined,
        notes: data.notes ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update authorization" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: auth } = await legacyDb
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Authorization not found" };
  }

  const { error } = await legacyDb
    .from("client_authorizations")
    .update({
      insurance_id: parsed.data.insurance_id || null,
      payor_type: parsed.data.payor_type,
      // Legacy fields
      service_type: parsed.data.service_type || null,
      billing_code: parsed.data.billing_code || null,
      treatment_requested: parsed.data.treatment_requested || null,
      units_requested: parsed.data.units_requested,
      units_used: parsed.data.units_used,
      units_per_week_authorized: parsed.data.units_per_week_authorized,
      rate_per_unit: parsed.data.rate_per_unit,
      // Active fields
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      status: parsed.data.status,
      auth_reference_number: parsed.data.auth_reference_number || null,
      requires_prior_auth: parsed.data.requires_prior_auth,
      notes: parsed.data.notes || null,
    })
    .eq("id", authId);

  if (error) {
    console.error("[CLIENTS] Failed to update authorization:", error);
    return { success: false, error: "Failed to update authorization" };
  }

  revalidatePath(`/dashboard/clients/${auth.client_id}`);
  return { success: true };
}

export async function deleteClientAuthorization(authId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientAuthorization", { recordId: authId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete authorization" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: auth } = await legacyDb
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Authorization not found" };
  }

  // Soft delete the authorization (cascade will handle services via FK)
  const { error } = await legacyDb
    .from("client_authorizations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", authId);

  if (error) {
    console.error("[CLIENTS] Failed to delete authorization:", error);
    return { success: false, error: "Failed to delete authorization" };
  }

  revalidatePath(`/dashboard/clients/${auth.client_id}`);
  return { success: true };
}

// =============================================================================
// CLIENT AUTHORIZATION SERVICES
// =============================================================================

export async function addAuthorizationService(
  authId: string,
  data: Partial<ClientAuthorizationService>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addAuthorizationService", {
        clientId: "", // The Convex function needs clientId; we pass authId and it resolves
        authorizationId: authId,
        serviceCode: data.billing_code || data.service_type || "",
        serviceName: data.service_type || null,
        authorizedUnits: data.units_per_auth || null,
        usedUnits: data.units_used || null,
        unitType: data.custom_billing_code || null,
        rate: null,
        notes: data.notes || null,
      });
      revalidatePath("/dashboard/clients");
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add service" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationServiceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership through authorization -> client
  const { data: auth } = await legacyDb
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Authorization not found" };
  }

  const { data: service, error } = await legacyDb
    .from("client_authorization_services")
    .insert({
      authorization_id: authId,
      service_type: parsed.data.service_type || "",
      billing_code: parsed.data.billing_code || "",
      custom_billing_code: parsed.data.custom_billing_code || null,
      use_auth_dates: parsed.data.use_auth_dates ?? true,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      hours_per_week: parsed.data.hours_per_week || null,
      hours_per_auth: parsed.data.hours_per_auth || null,
      units_per_week: parsed.data.units_per_week || null,
      units_per_auth: parsed.data.units_per_auth || null,
      units_used: parsed.data.units_used || 0,
      use_calculated_values: parsed.data.use_calculated_values ?? true,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !service) {
    console.error("[CLIENTS] Failed to add authorization service:", error);
    return { success: false, error: "Failed to add service" };
  }

  revalidatePath(`/dashboard/clients/${auth.client_id}`);
  return { success: true, data: { id: service.id } };
}

export async function updateAuthorizationService(
  serviceId: string,
  data: Partial<ClientAuthorizationService>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateAuthorizationService", {
        recordId: serviceId,
        serviceCode: data.billing_code ?? undefined,
        serviceName: data.service_type ?? undefined,
        authorizedUnits: data.units_per_auth ?? undefined,
        usedUnits: data.units_used ?? undefined,
        unitType: data.custom_billing_code ?? undefined,
        notes: data.notes ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update service" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationServiceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership through authorization -> client
  const { data: service } = await legacyDb
    .from("client_authorization_services")
    .select(`
      authorization_id,
      client_authorizations!inner(
        client_id,
        clients!inner(profile_id)
      )
    `)
    .eq("id", serviceId)
    .is("deleted_at", null)
    .single();

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  const clientAuth = service.client_authorizations as unknown as {
    client_id: string;
    clients: { profile_id: string };
  };

  if (clientAuth.clients.profile_id !== profileId) {
    return { success: false, error: "Service not found" };
  }

  const { error } = await legacyDb
    .from("client_authorization_services")
    .update({
      service_type: parsed.data.service_type,
      billing_code: parsed.data.billing_code,
      custom_billing_code: parsed.data.custom_billing_code || null,
      use_auth_dates: parsed.data.use_auth_dates,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      hours_per_week: parsed.data.hours_per_week,
      hours_per_auth: parsed.data.hours_per_auth,
      units_per_week: parsed.data.units_per_week,
      units_per_auth: parsed.data.units_per_auth,
      units_used: parsed.data.units_used,
      use_calculated_values: parsed.data.use_calculated_values,
      notes: parsed.data.notes || null,
    })
    .eq("id", serviceId);

  if (error) {
    console.error("[CLIENTS] Failed to update authorization service:", error);
    return { success: false, error: "Failed to update service" };
  }

  revalidatePath(`/dashboard/clients/${clientAuth.client_id}`);
  return { success: true };
}

export async function deleteAuthorizationService(serviceId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteAuthorizationService", { recordId: serviceId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete service" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership through authorization -> client
  const { data: service } = await legacyDb
    .from("client_authorization_services")
    .select(`
      authorization_id,
      client_authorizations!inner(
        client_id,
        clients!inner(profile_id)
      )
    `)
    .eq("id", serviceId)
    .is("deleted_at", null)
    .single();

  if (!service) {
    return { success: false, error: "Service not found" };
  }

  const clientAuth = service.client_authorizations as unknown as {
    client_id: string;
    clients: { profile_id: string };
  };

  if (clientAuth.clients.profile_id !== profileId) {
    return { success: false, error: "Service not found" };
  }

  // Soft delete
  const { error } = await legacyDb
    .from("client_authorization_services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", serviceId);

  if (error) {
    console.error("[CLIENTS] Failed to delete authorization service:", error);
    return { success: false, error: "Failed to delete service" };
  }

  revalidatePath(`/dashboard/clients/${clientAuth.client_id}`);
  return { success: true };
}

// =============================================================================
// CLIENT DOCUMENTS
// =============================================================================

export async function addClientDocument(
  clientId: string,
  data: Partial<ClientDocument>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientDocument", {
        clientId,
        storageId: "", // Metadata-only document, no storage file
        filename: data.label || data.file_path || "document",
        mimeType: "application/octet-stream",
        byteSize: 0,
        category: data.document_type || null,
        notes: data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientDocumentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: doc, error } = await legacyDb
    .from("client_documents")
    .insert({
      client_id: clientId,
      document_type: parsed.data.document_type || null,
      label: parsed.data.label || null,
      url: parsed.data.url || null,
      file_path: parsed.data.file_path || null,
      notes: parsed.data.notes || null,
      sort_order: parsed.data.sort_order || 0,
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("[CLIENTS] Failed to add document:", error);
    return { success: false, error: "Failed to add document" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: doc.id } };
}

export async function uploadClientDocument(
  clientId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      // In Convex mode, file uploads go through Convex storage
      const file = formData.get("file") as File | null;
      if (!file) {
        return { success: false, error: "No file provided" };
      }
      if (!isValidDocumentType(file.type)) {
        return { success: false, error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, WebP." };
      }
      if (!isValidDocumentSize(file.size)) {
        return { success: false, error: `File too large. Maximum size is ${Math.round(DOCUMENT_MAX_SIZE / 1024 / 1024)}MB.` };
      }

      const arrayBuffer = await file.arrayBuffer();
      if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
        return {
          success: false,
          error: "File content does not match its type. Please upload a valid file.",
        };
      }

      const metadata = clientDocumentUploadSchema.safeParse({
        label: formData.get("label") || file.name,
        document_type: formData.get("document_type") || undefined,
        file_description: formData.get("file_description") || undefined,
        notes: formData.get("notes") || undefined,
      });
      if (!metadata.success) {
        return {
          success: false,
          error: metadata.error.issues[0]?.message || "Invalid input",
        };
      }

      const { mutateConvex, uploadFileToConvexStorage } = await import("@/lib/platform/convex/server");
      const storageId = await uploadFileToConvexStorage(new Blob([arrayBuffer], { type: file.type }));

      const result = await mutateConvex<{ id: string }>("crm:addClientDocument", {
        clientId,
        storageId,
        filename: file.name,
        mimeType: file.type,
        byteSize: file.size,
        label: metadata.data.label,
        category: metadata.data.document_type || null,
        fileDescription: metadata.data.file_description || null,
        notes: metadata.data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to upload document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate clientId format
  if (!z.string().uuid().safeParse(clientId).success) {
    return { success: false, error: "Invalid client ID" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file MIME type
  if (!isValidDocumentType(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, WebP.",
    };
  }

  // Validate file size
  if (!isValidDocumentSize(file.size)) {
    return {
      success: false,
      error: `File too large. Maximum size is ${Math.round(DOCUMENT_MAX_SIZE / 1024 / 1024)}MB.`,
    };
  }

  // Validate file content (magic bytes) to prevent MIME spoofing
  const arrayBuffer = await file.arrayBuffer();
  if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
    return {
      success: false,
      error: "File content does not match its type. Please upload a valid file.",
    };
  }

  // Validate metadata through Zod schema
  const metadata = clientDocumentUploadSchema.safeParse({
    label: formData.get("label") || file.name,
    document_type: formData.get("document_type") || undefined,
    file_description: formData.get("file_description") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!metadata.success) {
    return { success: false, error: metadata.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify client ownership
  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Check document count limit
  const { count } = await legacyDb
    .from("client_documents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (count != null && count >= DOCUMENT_LIMITS.maxPerClient) {
    return {
      success: false,
      error: `Document limit reached (${DOCUMENT_LIMITS.maxPerClient} per client). Please remove old documents first.`,
    };
  }

  // Generate storage path and upload
  const storagePath = generateDocumentPath(profileId, clientId, file.name);

  const { error: uploadError } = await legacyDb.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[CLIENTS] Document upload error:", uploadError);
    return { success: false, error: "Failed to upload file" };
  }

  // Insert DB record
  const { data: doc, error: insertError } = await legacyDb
    .from("client_documents")
    .insert({
      client_id: clientId,
      document_type: metadata.data.document_type || null,
      label: metadata.data.label,
      file_path: storagePath,
      file_name: file.name,
      file_description: metadata.data.file_description || null,
      file_size: file.size,
      file_type: file.type,
      upload_source: "dashboard",
      uploaded_by: user.id,
      notes: metadata.data.notes || null,
    })
    .select("id")
    .single();

  if (insertError || !doc) {
    // Cleanup: remove uploaded file if DB insert fails
    const { error: cleanupError } = await legacyDb.storage
      .from(STORAGE_BUCKETS.documents)
      .remove([storagePath]);
    if (cleanupError) {
      console.error("[CLIENTS] ORPHANED FILE — manual cleanup needed:", storagePath, cleanupError);
    }
    console.error("[CLIENTS] Failed to save document record:", insertError);
    return { success: false, error: "Failed to save document" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: doc.id } };
}

export async function getDocumentSignedUrl(
  documentId: string
): Promise<ActionResult<{ url: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{ url: string }>("crm:getDocumentUrl", { recordId: documentId });
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Document not found" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: doc } = await legacyDb
    .from("client_documents")
    .select("file_path, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  if (!doc.file_path) {
    return { success: false, error: "No file associated with this document" };
  }

  const { data: signedUrl, error } = await legacyDb.storage
    .from(STORAGE_BUCKETS.documents)
    .createSignedUrl(doc.file_path, 300); // 5 minute expiry for clinical documents

  if (error || !signedUrl) {
    console.error("[CLIENTS] Failed to create signed URL:", error);
    return { success: false, error: "Failed to generate preview URL" };
  }

  return { success: true, data: { url: signedUrl.signedUrl } };
}

export async function downloadClientDocument(
  documentId: string
): Promise<ActionResult<{ url: string; fileName: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{ url: string; fileName?: string | null }>("crm:getDocumentUrl", {
        recordId: documentId,
      });
      return {
        success: true,
        data: {
          url: result.url,
          fileName: result.fileName || "document",
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Document not found" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: doc } = await legacyDb
    .from("client_documents")
    .select("file_path, file_name, label, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  if (!doc.file_path) {
    return { success: false, error: "No file associated with this document" };
  }

  const fileName = doc.file_name || doc.label || "document";

  const { data: signedUrl, error } = await legacyDb.storage
    .from(STORAGE_BUCKETS.documents)
    .createSignedUrl(doc.file_path, 60, { download: fileName });

  if (error || !signedUrl) {
    console.error("[CLIENTS] Failed to create download URL:", error);
    return { success: false, error: "Failed to generate download URL" };
  }

  return { success: true, data: { url: signedUrl.signedUrl, fileName } };
}

export async function updateClientDocument(
  documentId: string,
  data: Pick<Partial<ClientDocument>, "label" | "document_type" | "file_description" | "notes">
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const parsed = clientDocumentUploadSchema.partial().safeParse(data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
      }

      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientDocument", {
        recordId: documentId,
        label: parsed.data.label ?? undefined,
        category: parsed.data.document_type ?? undefined,
        fileDescription: parsed.data.file_description ?? undefined,
        notes: parsed.data.notes ?? undefined,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate documentId format
  if (!z.string().uuid().safeParse(documentId).success) {
    return { success: false, error: "Invalid document ID" };
  }

  // Validate only the safe metadata fields
  const parsed = clientDocumentUploadSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: doc } = await legacyDb
    .from("client_documents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  // Only allow updating safe metadata fields — never file_path, url, or storage fields
  const { error } = await legacyDb
    .from("client_documents")
    .update({
      document_type: parsed.data.document_type,
      label: parsed.data.label || null,
      file_description: parsed.data.file_description || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[CLIENTS] Failed to update document:", error);
    return { success: false, error: "Failed to update document" };
  }

  revalidatePath(`/dashboard/clients/${doc.client_id}`);
  return { success: true };
}

export async function deleteClientDocument(documentId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientDocument", { recordId: documentId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: doc } = await legacyDb
    .from("client_documents")
    .select("client_id, file_path, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  // Soft delete the DB record
  const { error } = await legacyDb
    .from("client_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("[CLIENTS] Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
  }

  // Remove file from storage if it exists
  if (doc.file_path) {
    const { error: storageError } = await legacyDb.storage
      .from(STORAGE_BUCKETS.documents)
      .remove([doc.file_path]);

    if (storageError) {
      console.error("[CLIENTS] ORPHANED FILE — manual cleanup needed:", doc.file_path, storageError);
      // Don't fail the operation — DB record is already soft-deleted
    }
  }

  revalidatePath(`/dashboard/clients/${doc.client_id}`);
  return { success: true };
}

export async function createClientDocumentUploadToken(
  clientId: string
): Promise<ActionResult<{ token: string; url: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex, queryConvex } = await import("@/lib/platform/convex/server");
      const listingSlug = await queryConvex<string | null>("listings:getCurrentListingSlug", {});
      if (!listingSlug) {
        return { success: false, error: "No published listing found" };
      }

      const token = generatePublicUploadToken();
      await mutateConvex("intake:createClientDocumentUploadToken", {
        clientId,
        token,
      });

      const siteUrl = await getCurrentSiteOrigin();
      return {
        success: true,
        data: {
          token,
          url: `${siteUrl}${buildDocumentAccessPath(listingSlug)}?token=${token}`,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create document upload link",
      };
    }
  }

  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  return createClientDocumentUploadLinkForProfile({ profileId, clientId });
}

export async function getClientDocumentUploadTokenData(
  token: string
): Promise<ActionResult<ClientDocumentUploadAccessData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const data = await queryConvexUnauthenticated<ClientDocumentUploadAccessData>(
        "intake:getClientDocumentUploadTokenData",
        { token },
      );
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error
          ? err.message
          : "Invalid or expired document upload link",
      };
    }
  }

  const validated = await validateClientDocumentUploadToken(token);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  if (!validated.data) {
    return { success: false, error: "Invalid or expired document upload link" };
  }

  const legacyDb = await createAdminClient();

  const [{ data: client }, { data: documents }] = await Promise.all([
    legacyDb
      .from("clients")
      .select("id, child_first_name, child_last_name")
      .eq("id", validated.data.clientId)
      .is("deleted_at", null)
      .single(),
    legacyDb
      .from("client_documents")
      .select("id, label, document_type, file_name, file_size, created_at")
      .eq("client_id", validated.data.clientId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  return {
    success: true,
    data: {
      clientId: validated.data.clientId,
      profileId: validated.data.profileId,
      clientName: getClientDisplayName(client),
      uploadedDocuments: (documents || []).map((doc) => ({
        id: doc.id,
        label: doc.label,
        documentType: doc.document_type as ClientDocument["document_type"] | null,
        fileName: doc.file_name,
        fileSize: typeof doc.file_size === "number" ? doc.file_size : null,
        createdAt: doc.created_at,
      })),
    },
  };
}

export async function submitPublicClientDocumentUpload(
  formData: FormData,
  slug?: string,
  token?: string,
): Promise<ActionResult<{ id: string }>> {
  const resolvedToken = token ?? (slug ? await getDocumentAccessToken(slug) : null);
  if (!resolvedToken) {
    return { success: false, error: "Invalid or expired document upload link" };
  }

  if (isConvexDataEnabled()) {
    try {
      const file = formData.get("file") as File | null;
      if (!file) {
        return { success: false, error: "No file provided" };
      }

      if (!isValidDocumentType(file.type)) {
        return {
          success: false,
          error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, WebP.",
        };
      }

      if (!isValidDocumentSize(file.size)) {
        return {
          success: false,
          error: `File too large. Maximum size is ${Math.round(DOCUMENT_MAX_SIZE / 1024 / 1024)}MB.`,
        };
      }

      const arrayBuffer = await file.arrayBuffer();
      if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
        return {
          success: false,
          error: "File content does not match its type. Please upload a valid file.",
        };
      }

      const metadata = clientDocumentUploadSchema.safeParse({
        label: formData.get("label") || file.name,
        document_type: formData.get("document_type") || undefined,
        file_description: formData.get("file_description") || undefined,
        notes: formData.get("notes") || undefined,
      });

      if (!metadata.success) {
        return {
          success: false,
          error: metadata.error.issues[0]?.message || "Invalid input",
        };
      }

      const {
        mutateConvexUnauthenticated,
        queryConvexUnauthenticated,
      } = await import("@/lib/platform/convex/server");

      const tokenData = await queryConvexUnauthenticated<{
        clientId: string;
        profileId: string;
      }>("intake:getClientDocumentUploadTokenData", { token: resolvedToken });

      const uploadUrl = await mutateConvexUnauthenticated<string>(
        "intake:generateClientDocumentUploadUrl",
        { token: resolvedToken },
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: new Blob([arrayBuffer], { type: file.type }),
      });

      if (!uploadResponse.ok) {
        return { success: false, error: "Failed to upload file" };
      }

      const uploadPayload = (await uploadResponse.json()) as { storageId?: string };
      if (!uploadPayload.storageId) {
        return { success: false, error: "Failed to upload file" };
      }

      const result = await mutateConvexUnauthenticated<{ id: string }>(
        "intake:submitPublicClientDocumentUpload",
        {
          token: resolvedToken,
          storageId: uploadPayload.storageId,
          filename: file.name,
          mimeType: file.type,
          byteSize: file.size,
          label: metadata.data.label,
          category: metadata.data.document_type || null,
          fileDescription: metadata.data.file_description || null,
          notes: metadata.data.notes || null,
        },
      );

      revalidatePath(`/dashboard/clients/${tokenData.clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save document",
      };
    }
  }

  const validated = await validateClientDocumentUploadToken(resolvedToken);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }

  if (!validated.data) {
    return { success: false, error: "Invalid or expired document upload link" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!isValidDocumentType(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, WebP.",
    };
  }

  if (!isValidDocumentSize(file.size)) {
    return {
      success: false,
      error: `File too large. Maximum size is ${Math.round(DOCUMENT_MAX_SIZE / 1024 / 1024)}MB.`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
    return {
      success: false,
      error: "File content does not match its type. Please upload a valid file.",
    };
  }

  const metadata = clientDocumentUploadSchema.safeParse({
    label: formData.get("label") || file.name,
    document_type: formData.get("document_type") || undefined,
    file_description: formData.get("file_description") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!metadata.success) {
    return {
      success: false,
      error: metadata.error.issues[0]?.message || "Invalid input",
    };
  }

  const legacyDb = await createAdminClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", validated.data.clientId)
    .eq("profile_id", validated.data.profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { count } = await legacyDb
    .from("client_documents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", validated.data.clientId)
    .is("deleted_at", null);

  if (count != null && count >= DOCUMENT_LIMITS.maxPerClient) {
    return {
      success: false,
      error: `Document limit reached (${DOCUMENT_LIMITS.maxPerClient} per client). Please contact the provider for help.`,
    };
  }

  const storagePath = generateDocumentPath(
    validated.data.profileId,
    validated.data.clientId,
    file.name
  );

  const { error: uploadError } = await legacyDb.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[CLIENTS] Public document upload error:", uploadError);
    return { success: false, error: "Failed to upload file" };
  }

  const { data: doc, error: insertError } = await legacyDb
    .from("client_documents")
    .insert({
      client_id: validated.data.clientId,
      document_type: metadata.data.document_type || null,
      label: metadata.data.label,
      file_path: storagePath,
      file_name: file.name,
      file_description: metadata.data.file_description || null,
      file_size: file.size,
      file_type: file.type,
      upload_source: "intake_form",
      notes: metadata.data.notes || null,
    })
    .select("id")
    .single();

  if (insertError || !doc) {
    const { error: cleanupError } = await legacyDb.storage
      .from(STORAGE_BUCKETS.documents)
      .remove([storagePath]);
    if (cleanupError) {
      console.error("[CLIENTS] ORPHANED FILE — manual cleanup needed:", storagePath, cleanupError);
    }
    console.error("[CLIENTS] Failed to save public document:", insertError);
    return { success: false, error: "Failed to save document" };
  }

  const listingSlug = await getPublishedListingSlugForProfile(validated.data.profileId);
  revalidatePath(`/dashboard/clients/${validated.data.clientId}`);
  if (listingSlug) {
    revalidatePath(`/provider/${listingSlug}/documents`);
    revalidatePath(`/site/${listingSlug}/documents`);
    revalidatePath(`/intake/${listingSlug}/documents`);
  }

  return { success: true, data: { id: doc.id } };
}

// =============================================================================
// CLIENT TASKS
// =============================================================================

export async function addClientTask(
  clientId: string | null,
  data: Partial<ClientTask>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientTask", {
        clientId: clientId || "",
        title: data.title || "",
        description: data.content || null,
        dueDate: data.due_date || null,
        priority: "medium",
      });
      if (clientId) {
        revalidatePath(`/dashboard/clients/${clientId}`);
      }
      revalidatePath("/dashboard/tasks");
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add task" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientTaskSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  // If clientId provided, verify ownership
  if (clientId) {
    const { data: client } = await legacyDb
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }
  }

  const { data: task, error } = await legacyDb
    .from("client_tasks")
    .insert({
      client_id: clientId || null,
      profile_id: profileId,
      title: parsed.data.title,
      content: parsed.data.content || null,
      status: parsed.data.status || "pending",
      due_date: parsed.data.due_date || null,
      reminder_at: parsed.data.reminder_at || null,
    })
    .select("id")
    .single();

  if (error || !task) {
    console.error("[CLIENTS] Failed to add task:", error);
    return { success: false, error: "Failed to add task" };
  }

  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
  revalidatePath("/dashboard/tasks");
  return { success: true, data: { id: task.id } };
}

export async function updateClientTask(
  taskId: string,
  data: Partial<ClientTask>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientTask", {
        recordId: taskId,
        title: data.title ?? undefined,
        description: data.content ?? undefined,
        dueDate: data.due_date ?? undefined,
        status: data.status ?? undefined,
      });
      revalidatePath("/dashboard/tasks");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update task" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientTaskSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: task } = await legacyDb
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await legacyDb
    .from("client_tasks")
    .update({
      title: parsed.data.title,
      content: parsed.data.content || null,
      status: parsed.data.status,
      due_date: parsed.data.due_date || null,
      reminder_at: parsed.data.reminder_at || null,
    })
    .eq("id", taskId);

  if (error) {
    console.error("[CLIENTS] Failed to update task:", error);
    return { success: false, error: "Failed to update task" };
  }

  if (task.client_id) {
    revalidatePath(`/dashboard/clients/${task.client_id}`);
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

export async function completeClientTask(taskId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:completeClientTask", { recordId: taskId });
      revalidatePath("/dashboard/tasks");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to complete task" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: task } = await legacyDb
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await legacyDb
    .from("client_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    console.error("[CLIENTS] Failed to complete task:", error);
    return { success: false, error: "Failed to complete task" };
  }

  if (task.client_id) {
    revalidatePath(`/dashboard/clients/${task.client_id}`);
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

export async function deleteClientTask(taskId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientTask", { recordId: taskId });
      revalidatePath("/dashboard/tasks");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete task" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: task } = await legacyDb
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await legacyDb
    .from("client_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    console.error("[CLIENTS] Failed to delete task:", error);
    return { success: false, error: "Failed to delete task" };
  }

  if (task.client_id) {
    revalidatePath(`/dashboard/clients/${task.client_id}`);
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

/**
 * Get all tasks for the current user (global tasks page)
 */
export async function getTasks(
  filter?: { status?: "pending" | "completed"; clientId?: string }
): Promise<ActionResult<{ tasks: (ClientTask & { id: string; client_id: string | null; created_at: string; completed_at: string | null; client_name?: string })[] }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{ tasks: unknown[]; total: number }>("crm:getTasks", {
        status: filter?.status,
        clientId: filter?.clientId,
      });
      return { success: true, data: { tasks: result.tasks as (ClientTask & { id: string; client_id: string | null; created_at: string; completed_at: string | null; client_name?: string })[] } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to fetch tasks" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  let query = legacyDb
    .from("client_tasks")
    .select(`
      *,
      clients (
        child_first_name,
        child_last_name
      )
    `)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  if (filter?.clientId) {
    query = query.eq("client_id", filter.clientId);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error("[CLIENTS] Failed to fetch tasks:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }

  return {
    success: true,
    data: {
      tasks: (tasks || []).map((t) => {
        const client = t.clients as { child_first_name: string | null; child_last_name: string | null } | null;
        return {
          ...t,
          client_name: client
            ? [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || undefined
            : undefined,
        };
      }),
    },
  };
}

/**
 * Get count of actionable tasks (pending/in_progress, overdue or due today)
 * Used for sidebar badge display.
 */
export async function getActionableTaskCount(): Promise<ActionResult<number>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const result = await queryConvex<{ pending: number; overdue: number; total: number }>("crm:getActionableTaskCount", {});
      return { success: true, data: result.total };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to count tasks" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await legacyDb
    .from("client_tasks")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .in("status", ["pending", "in_progress"])
    .is("deleted_at", null)
    .or(`due_date.is.null,due_date.lte.${today}`);

  if (error) {
    console.error("[CLIENTS] Failed to count actionable tasks:", error);
    return { success: false, error: "Failed to count tasks" };
  }

  return { success: true, data: count ?? 0 };
}

// =============================================================================
// CLIENT CONTACTS
// =============================================================================

export async function addClientContact(
  clientId: string,
  data: Partial<ClientContact>
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("crm:addClientContact", {
        clientId,
        contactType: data.contact_type || "other",
        firstName: data.label || null,
        lastName: null,
        email: data.value && data.contact_type === "email" ? data.value : null,
        phone: data.value && data.contact_type === "phone" ? data.value : null,
        notes: data.notes || null,
      });
      revalidatePath(`/dashboard/clients/${clientId}`);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to add contact" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientContactSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: client } = await legacyDb
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: contact, error } = await legacyDb
    .from("client_contacts")
    .insert({
      client_id: clientId,
      parent_id: parsed.data.parent_id || null,
      contact_type: parsed.data.contact_type || null,
      relationship_type: parsed.data.relationship_type || null,
      label: parsed.data.label || null,
      value: parsed.data.value || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary || false,
      sort_order: parsed.data.sort_order || 0,
    })
    .select("id")
    .single();

  if (error || !contact) {
    console.error("[CLIENTS] Failed to add contact:", error);
    return { success: false, error: "Failed to add contact" };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: true, data: { id: contact.id } };
}

export async function updateClientContact(
  contactId: string,
  data: Partial<ClientContact>
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:updateClientContact", {
        recordId: contactId,
        contactType: data.contact_type ?? undefined,
        firstName: data.label ?? undefined,
        email: data.value && data.contact_type === "email" ? data.value : undefined,
        phone: data.value && data.contact_type === "phone" ? data.value : undefined,
        notes: data.notes ?? undefined,
      });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to update contact" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientContactSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: contact } = await legacyDb
    .from("client_contacts")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", contactId)
    .is("deleted_at", null)
    .single();

  if (!contact || (contact.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Contact not found" };
  }

  const { error } = await legacyDb
    .from("client_contacts")
    .update({
      parent_id: parsed.data.parent_id || null,
      contact_type: parsed.data.contact_type,
      relationship_type: parsed.data.relationship_type,
      label: parsed.data.label || null,
      value: parsed.data.value || null,
      notes: parsed.data.notes || null,
      is_primary: parsed.data.is_primary,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", contactId);

  if (error) {
    console.error("[CLIENTS] Failed to update contact:", error);
    return { success: false, error: "Failed to update contact" };
  }

  revalidatePath(`/dashboard/clients/${contact.client_id}`);
  return { success: true };
}

export async function deleteClientContact(contactId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("crm:deleteClientContact", { recordId: contactId });
      revalidatePath("/dashboard/clients");
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete contact" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  const { data: contact } = await legacyDb
    .from("client_contacts")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", contactId)
    .is("deleted_at", null)
    .single();

  if (!contact || (contact.clients as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Contact not found" };
  }

  const { error } = await legacyDb
    .from("client_contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", contactId);

  if (error) {
    console.error("[CLIENTS] Failed to delete contact:", error);
    return { success: false, error: "Failed to delete contact" };
  }

  revalidatePath(`/dashboard/clients/${contact.client_id}`);
  return { success: true };
}

// =============================================================================
// INQUIRY CONVERSION
// =============================================================================

/**
 * Convert an inquiry to a client
 */
export async function convertInquiryToClient(
  inquiryId: string
): Promise<ActionResult<{ clientId: string; prefillData: Partial<ClientWithRelated> }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const inquiry = await queryConvex<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        message: string;
        source: string | null;
      } | null>("inquiries:getInquiry", { inquiryId });

      if (!inquiry) {
        return { success: false, error: "Inquiry not found" };
      }

      const nameParts = inquiry.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      return {
        success: true,
        data: {
          clientId: "",
          prefillData: {
            inquiry_id: inquiryId,
            status: "intake_pending",
            referral_source: inquiry.source || "findabatherapy",
            referral_source_other: "",
            notes: inquiry.message || "",
            parents: [
              {
                first_name: firstName,
                last_name: lastName,
                phone: inquiry.phone || "",
                email: inquiry.email || "",
                is_primary: true,
                sort_order: 0,
              },
            ],
            locations: [],
            insurances: [],
            authorizations: [],
            documents: [],
            tasks: [],
            contacts: [],
          },
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Inquiry not found",
      };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Get the inquiry
  const { data: inquiry, error: inquiryError } = await legacyDb
    .from("inquiries")
    .select(`
      *,
      listings!inner(profile_id)
    `)
    .eq("id", inquiryId)
    .single();

  if (inquiryError || !inquiry) {
    return { success: false, error: "Inquiry not found" };
  }

  // Verify ownership
  if ((inquiry.listings as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Inquiry not found" };
  }

  // Parse family name into first/last
  const nameParts = (inquiry.family_name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Create prefill data for the client form
  // Carry referral source from inquiry to client
  const prefillData: Partial<ClientWithRelated> = {
    inquiry_id: inquiryId,
    status: "intake_pending",
    referral_source: inquiry.referral_source || "findabatherapy",
    referral_source_other: inquiry.referral_source_other || "",
    notes: inquiry.message || "",
    parents: [
      {
        first_name: firstName,
        last_name: lastName,
        phone: inquiry.family_phone || "",
        email: inquiry.family_email || "",
        is_primary: true,
        sort_order: 0,
      },
    ],
    locations: [],
    insurances: [],
    authorizations: [],
    documents: [],
    tasks: [],
    contacts: [],
  };

  // If child age provided, we could estimate DOB but it's just text so we'll skip

  return {
    success: true,
    data: {
      clientId: "", // Will be created when form is submitted
      prefillData,
    },
  };
}

/**
 * Mark inquiry as converted (called after client is created)
 */
export async function markInquiryAsConverted(inquiryId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("inquiries:markInquiryAsConverted", { inquiryId });
      revalidatePath("/dashboard/notifications");
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update inquiry",
      };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const legacyDb = await createLegacyDataClient();

  // Verify ownership
  const { data: inquiry } = await legacyDb
    .from("inquiries")
    .select("id, listings!inner(profile_id)")
    .eq("id", inquiryId)
    .single();

  if (!inquiry || (inquiry.listings as unknown as { profile_id: string }).profile_id !== profileId) {
    return { success: false, error: "Inquiry not found" };
  }

  const { error } = await legacyDb
    .from("inquiries")
    .update({ status: "converted" })
    .eq("id", inquiryId);

  if (error) {
    console.error("[CLIENTS] Failed to mark inquiry as converted:", error);
    return { success: false, error: "Failed to update inquiry" };
  }

  revalidatePath("/dashboard/notifications");
  return { success: true };
}

// =============================================================================
// PUBLIC CLIENT INTAKE
// =============================================================================

/**
 * Submit public client intake form
 * Creates a new client with status "intake_pending"
 */
export async function submitPublicClientIntake(data: {
  profileId: string;
  listingId: string;
  turnstileToken: string;
  /** Dynamic field values from the configurable intake form */
  fields: Record<string, unknown>;
}): Promise<ActionResult<{ clientId: string; documentUploadUrl?: string }>> {
  if (isConvexDataEnabled()) {
    if (data.turnstileToken) {
      const { env } = await import("@/env");
      const verifyResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: data.turnstileToken,
          }),
        },
      );
      const verifyResult = await verifyResponse.json();
      if (!verifyResult.success) {
        return { success: false, error: "Verification failed. Please try again." };
      }
    }

    try {
      const { routeFieldsToTables } = await import("@/lib/intake/build-intake-schema");
      const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const tables = routeFieldsToTables(data.fields);
      const uploadToken = generatePublicUploadToken();
      const result = await mutateConvexUnauthenticated<{
        clientId: string;
        documentUploadToken: string | null;
        listingSlug: string | null;
      }>("crm:createPublicIntakeClient", {
        profileId: data.profileId,
        listingId: data.listingId,
        clientData: tables.clients,
        parentData: tables.client_parents,
        insuranceData: tables.client_insurances,
        homeLocationData: tables.client_locations,
        serviceLocationData: tables.service_locations,
        documentUploadToken: uploadToken,
      });

      const childName =
        [
          (tables.clients as Record<string, unknown>).child_first_name as
            | string
            | undefined,
          (tables.clients as Record<string, unknown>).child_last_name as
            | string
            | undefined,
        ]
          .filter(Boolean)
          .join(" ") || "Unknown";
      const parentData = tables.client_parents as Record<string, unknown>;
      const parentFirst = parentData.first_name as string | undefined;
      const parentLast = parentData.last_name as string | undefined;

      const { createNotification } = await import("@/lib/actions/notifications");
      createNotification({
        profileId: data.profileId,
        type: "intake_submission",
        title: `Intake form submitted for ${childName}`,
        body: parentFirst
          ? `Parent: ${parentFirst} ${parentLast || ""}`.trim()
          : undefined,
        link: `/dashboard/clients/${result.clientId}`,
        entityId: result.clientId,
        entityType: "client",
      }).catch((err) => {
        console.error("[CLIENTS] Failed to create intake notification:", err);
      });

      const siteUrl = await getCurrentSiteOrigin();
      const documentUploadUrl =
        result.listingSlug && result.documentUploadToken
          ? `${siteUrl}${buildDocumentAccessPath(result.listingSlug)}?token=${result.documentUploadToken}`
          : undefined;

      return {
        success: true,
        data: {
          clientId: result.clientId,
          documentUploadUrl,
        },
      };
    } catch (err) {
      console.error("[CLIENTS] Failed to create Convex intake client:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to submit intake form",
      };
    }
  }

  // Verify Turnstile token
  if (data.turnstileToken) {
    const { env } = await import("@/env");
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: data.turnstileToken,
        }),
      }
    );
    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) {
      return { success: false, error: "Verification failed. Please try again." };
    }
  }

  // Use service role to insert (public form)
  const adminSupabase = await createAdminClient();

  // Verify the provider has an active paid plan (free-tier intake forms are preview-only)
  const { data: providerProfile } = await adminSupabase
    .from("profiles")
    .select("plan_tier, subscription_status")
    .eq("id", data.profileId)
    .single();

  if (!providerProfile) {
    return { success: false, error: "Provider not found" };
  }

  const isActivePaid =
    providerProfile.plan_tier !== "free" &&
    (providerProfile.subscription_status === "active" ||
      providerProfile.subscription_status === "trialing");

  if (!isActivePaid) {
    return { success: false, error: "This provider is not currently accepting intake submissions" };
  }

  // Route flat field values to per-table buckets using the field registry
  const { routeFieldsToTables } = await import("@/lib/intake/build-intake-schema");
  const tables = routeFieldsToTables(data.fields);

  // ---- Create the client record ----
  const clientData = tables.clients as Record<string, unknown>;
  const { data: client, error: clientError } = await adminSupabase
    .from("clients")
    .insert({
      profile_id: data.profileId,
      listing_id: data.listingId,
      status: "intake_pending",
      referral_date: new Date().toISOString().split("T")[0],
      // Default referral_source when not submitted
      referral_source: (clientData.referral_source as string) || "public_intake",
      ...clientData,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("[CLIENTS] Failed to create client from intake:", clientError);
    return { success: false, error: "Failed to submit intake form" };
  }

  // ---- Insert parent if any parent fields were submitted ----
  const parentData = tables.client_parents as Record<string, unknown>;
  if (Object.keys(parentData).length > 0) {
    await adminSupabase.from("client_parents").insert({
      client_id: client.id,
      is_primary: true,
      sort_order: 0,
      ...parentData,
    });
  }

  // ---- Insert insurance if any insurance fields were submitted ----
  const insuranceData = tables.client_insurances as Record<string, unknown>;
  if (Object.keys(insuranceData).length > 0) {
    await adminSupabase.from("client_insurances").insert({
      client_id: client.id,
      is_primary: true,
      sort_order: 0,
      ...insuranceData,
    });
  }

  // ---- Insert home address location if any home address fields were submitted ----
  const locationData = tables.client_locations as Record<string, unknown>;
  if (Object.keys(locationData).length > 0) {
    await adminSupabase.from("client_locations").insert({
      client_id: client.id,
      label: "Home",
      is_primary: true,
      sort_order: 0,
      ...locationData,
    });
  }

  // ---- Insert service location if any service location fields were submitted ----
  const serviceLocationData = tables.service_locations as Record<string, unknown>;
  if (Object.keys(serviceLocationData).length > 0) {
    // Map location_type → label column and strip non-DB keys
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { location_type, same_as_home, agency_location_id, formatted_address: _fa, ...svcAddress } = serviceLocationData;

    // If "same as home", copy home address data
    if (same_as_home === true && Object.keys(locationData).length > 0) {
      Object.assign(svcAddress, {
        street_address: locationData.street_address,
        city: locationData.city,
        state: locationData.state,
        postal_code: locationData.postal_code,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        place_id: locationData.place_id,
      });
    }

    // If agency_location_id is set, fetch that location's address
    if (agency_location_id && typeof agency_location_id === "string") {
      const { data: agencyLoc } = await adminSupabase
        .from("locations")
        .select("street, city, state, postal_code, latitude, longitude")
        .eq("id", agency_location_id)
        .single();
      if (agencyLoc) {
        Object.assign(svcAddress, {
          street_address: agencyLoc.street || svcAddress.street_address,
          city: agencyLoc.city || svcAddress.city,
          state: agencyLoc.state || svcAddress.state,
          postal_code: agencyLoc.postal_code || svcAddress.postal_code,
          latitude: agencyLoc.latitude ?? svcAddress.latitude,
          longitude: agencyLoc.longitude ?? svcAddress.longitude,
        });
      }
    }

    await adminSupabase.from("client_locations").insert({
      client_id: client.id,
      label: (location_type as string) || undefined,
      is_primary: false,
      sort_order: 1,
      ...svcAddress,
    });
  }

  // ---- Create in-app notification for the provider ----
  const childName = [
    clientData.child_first_name as string | undefined,
    clientData.child_last_name as string | undefined,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const parentFirst = parentData.first_name as string | undefined;
  const parentLast = parentData.last_name as string | undefined;

  const { createNotification } = await import("@/lib/actions/notifications");
  createNotification({
    profileId: data.profileId,
    type: "intake_submission",
    title: `Intake form submitted for ${childName}`,
    body: parentFirst
      ? `Parent: ${parentFirst} ${parentLast || ""}`.trim()
      : undefined,
    link: `/dashboard/clients/${client.id}`,
    entityId: client.id,
    entityType: "client",
  }).catch((err) => {
    console.error("[CLIENTS] Failed to create intake notification:", err);
  });

  let documentUploadUrl: string | undefined;
  const documentUploadLink = await createClientDocumentUploadLinkForProfile({
    profileId: data.profileId,
    clientId: client.id,
  });

  if (documentUploadLink.success && documentUploadLink.data) {
    documentUploadUrl = documentUploadLink.data.url;
  } else if (!documentUploadLink.success) {
    console.error(
      "[CLIENTS] Failed to create document upload link after intake submission:",
      documentUploadLink.error
    );
  }

  return { success: true, data: { clientId: client.id, documentUploadUrl } };
}
