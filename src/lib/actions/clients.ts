"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
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

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

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
  active: number;
  on_hold: number;
  discharged: number;
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Build base query for clients
  let query = supabase
    .from("clients")
    .select(`
      id,
      status,
      child_first_name,
      child_last_name,
      child_date_of_birth,
      created_at,
      updated_at,
      client_parents!inner (
        first_name,
        last_name,
        phone,
        email,
        is_primary
      ),
      client_insurances (
        insurance_name,
        member_id,
        is_primary
      )
    `, { count: "exact" })
    .eq("profile_id", user.id)
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
  const { data: statusCounts } = await supabase
    .from("clients")
    .select("status")
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  const counts: ClientCounts = {
    total: statusCounts?.length || 0,
    inquiry: 0,
    intake_pending: 0,
    waitlist: 0,
    assessment: 0,
    active: 0,
    on_hold: 0,
    discharged: 0,
  };

  statusCounts?.forEach((c) => {
    const status = c.status as keyof Omit<ClientCounts, "total">;
    if (status in counts) {
      counts[status]++;
    }
  });

  // Transform data
  const clientList: ClientListItem[] = (clients || []).map((c) => {
    const parents = c.client_parents as { first_name: string | null; last_name: string | null; phone: string | null; email: string | null; is_primary: boolean }[] | null;
    const insurances = c.client_insurances as { insurance_name: string | null; member_id: string | null; is_primary: boolean }[] | null;

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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, child_first_name, child_last_name")
    .eq("profile_id", user.id)
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Get client with all related data
  const { data: client, error } = await supabase
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
    .eq("profile_id", user.id)
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
    const { data: services } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Get user's listing (for linking)
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      profile_id: user.id,
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
    await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership and fetch current status for change logging
  const { data: existing } = await supabase
    .from("clients")
    .select("id, status, child_first_name, child_last_name")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  const { error } = await supabase
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
    await supabase
      .from("client_status_changes")
      .insert({
        client_id: clientId,
        profile_id: user.id,
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
      profileId: user.id,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return { success: false, error: "Client not found" };
  }

  // Soft delete
  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Fetch current status and name for change logging
  const { data: current } = await supabase
    .from("clients")
    .select("status, child_first_name, child_last_name")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  const previousStatus = current?.status;

  const { error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[CLIENTS] Failed to update status:", error);
    return { success: false, error: "Failed to update status" };
  }

  // Log status change for pipeline activity feed + create notification
  if (previousStatus && previousStatus !== status) {
    await supabase
      .from("client_status_changes")
      .insert({
        client_id: clientId,
        profile_id: user.id,
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
      profileId: user.id,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientParentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify client ownership
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: parent, error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientParentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership through client
  const { data: parent } = await supabase
    .from("client_parents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", parentId)
    .is("deleted_at", null)
    .single();

  if (!parent || (parent.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Parent not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership
  const { data: parent } = await supabase
    .from("client_parents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", parentId)
    .is("deleted_at", null)
    .single();

  if (!parent || (parent.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Parent not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientLocationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify client ownership
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: location, error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientLocationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership
  const { data: location } = await supabase
    .from("client_locations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", locationId)
    .is("deleted_at", null)
    .single();

  if (!location || (location.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Location not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: location } = await supabase
    .from("client_locations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", locationId)
    .is("deleted_at", null)
    .single();

  if (!location || (location.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Location not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientInsuranceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: insurance, error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientInsuranceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: insurance } = await supabase
    .from("client_insurances")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", insuranceId)
    .is("deleted_at", null)
    .single();

  if (!insurance || (insurance.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Insurance not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: insurance } = await supabase
    .from("client_insurances")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", insuranceId)
    .is("deleted_at", null)
    .single();

  if (!insurance || (insurance.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Insurance not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Create the authorization
  const { data: auth, error } = await supabase
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

    const { error: svcError } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: auth } = await supabase
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Authorization not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: auth } = await supabase
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Authorization not found" };
  }

  // Soft delete the authorization (cascade will handle services via FK)
  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationServiceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership through authorization -> client
  const { data: auth } = await supabase
    .from("client_authorizations")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", authId)
    .is("deleted_at", null)
    .single();

  if (!auth || (auth.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Authorization not found" };
  }

  const { data: service, error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientAuthorizationServiceSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership through authorization -> client
  const { data: service } = await supabase
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

  if (clientAuth.clients.profile_id !== user.id) {
    return { success: false, error: "Service not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership through authorization -> client
  const { data: service } = await supabase
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

  if (clientAuth.clients.profile_id !== user.id) {
    return { success: false, error: "Service not found" };
  }

  // Soft delete
  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientDocumentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: doc, error } = await supabase
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
  const user = await getUser();
  if (!user) {
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

  const supabase = await createSupabaseClient();

  // Verify client ownership
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  // Check document count limit
  const { count } = await supabase
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
  const storagePath = generateDocumentPath(user.id, clientId, file.name);

  const { error: uploadError } = await supabase.storage
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
  const { data: doc, error: insertError } = await supabase
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
    const { error: cleanupError } = await supabase.storage
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: doc } = await supabase
    .from("client_documents")
    .select("file_path, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Document not found" };
  }

  if (!doc.file_path) {
    return { success: false, error: "No file associated with this document" };
  }

  const { data: signedUrl, error } = await supabase.storage
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: doc } = await supabase
    .from("client_documents")
    .select("file_path, file_name, label, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Document not found" };
  }

  if (!doc.file_path) {
    return { success: false, error: "No file associated with this document" };
  }

  const fileName = doc.file_name || doc.label || "document";

  const { data: signedUrl, error } = await supabase.storage
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
  const user = await getUser();
  if (!user) {
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

  const supabase = await createSupabaseClient();

  const { data: doc } = await supabase
    .from("client_documents")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Document not found" };
  }

  // Only allow updating safe metadata fields — never file_path, url, or storage fields
  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: doc } = await supabase
    .from("client_documents")
    .select("client_id, file_path, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Document not found" };
  }

  // Soft delete the DB record
  const { error } = await supabase
    .from("client_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("[CLIENTS] Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
  }

  // Remove file from storage if it exists
  if (doc.file_path) {
    const { error: storageError } = await supabase.storage
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

// =============================================================================
// CLIENT TASKS
// =============================================================================

export async function addClientTask(
  clientId: string | null,
  data: Partial<ClientTask>
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientTaskSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  // If clientId provided, verify ownership
  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }
  }

  const { data: task, error } = await supabase
    .from("client_tasks")
    .insert({
      client_id: clientId || null,
      profile_id: user.id,
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientTaskSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: task } = await supabase
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: task } = await supabase
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: task } = await supabase
    .from("client_tasks")
    .select("id, client_id")
    .eq("id", taskId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  let query = supabase
    .from("client_tasks")
    .select(`
      *,
      clients (
        child_first_name,
        child_last_name
      )
    `)
    .eq("profile_id", user.id)
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("client_tasks")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientContactSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const { data: contact, error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientContactSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const supabase = await createSupabaseClient();

  const { data: contact } = await supabase
    .from("client_contacts")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", contactId)
    .is("deleted_at", null)
    .single();

  if (!contact || (contact.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Contact not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data: contact } = await supabase
    .from("client_contacts")
    .select("client_id, clients!inner(profile_id)")
    .eq("id", contactId)
    .is("deleted_at", null)
    .single();

  if (!contact || (contact.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Contact not found" };
  }

  const { error } = await supabase
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Get the inquiry
  const { data: inquiry, error: inquiryError } = await supabase
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
  if ((inquiry.listings as unknown as { profile_id: string }).profile_id !== user.id) {
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Verify ownership
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("id, listings!inner(profile_id)")
    .eq("id", inquiryId)
    .single();

  if (!inquiry || (inquiry.listings as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Inquiry not found" };
  }

  const { error } = await supabase
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
}): Promise<ActionResult<{ clientId: string }>> {
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
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminSupabase = await createAdminClient();

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

  return { success: true, data: { clientId: client.id } };
}
