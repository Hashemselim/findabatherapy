"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
import {
  clientSchema,
  clientParentSchema,
  clientLocationSchema,
  clientInsuranceSchema,
  clientAuthorizationSchema,
  clientDocumentSchema,
  clientTaskSchema,
  clientContactSchema,
  type Client,
  type ClientWithRelated,
  type ClientParent,
  type ClientLocation,
  type ClientInsurance,
  type ClientAuthorization,
  type ClientDocument,
  type ClientTask,
  type ClientContact,
  type ClientFilters,
  type ClientStatus,
} from "@/lib/validations/clients";

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
  authorizations: (ClientAuthorization & { id: string; created_at: string })[];
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

  return {
    success: true,
    data: {
      ...client,
      parents: sortByOrder(parents),
      locations: sortByOrder(locations),
      insurances: sortByOrder(insurances),
      authorizations: filterDeleted(client.client_authorizations),
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

    revalidatePath("/dashboard/inbox");
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

  const { data: auth, error } = await supabase
    .from("client_authorizations")
    .insert({
      client_id: clientId,
      insurance_id: parsed.data.insurance_id || null,
      payor_type: parsed.data.payor_type || null,
      service_type: parsed.data.service_type || null,
      billing_code: parsed.data.billing_code || null,
      treatment_requested: parsed.data.treatment_requested || null,
      units_requested: parsed.data.units_requested || null,
      units_used: parsed.data.units_used || 0,
      units_per_week_authorized: parsed.data.units_per_week_authorized || null,
      rate_per_unit: parsed.data.rate_per_unit || null,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      status: parsed.data.status || "pending",
      auth_reference_number: parsed.data.auth_reference_number || null,
      requires_prior_auth: parsed.data.requires_prior_auth || false,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !auth) {
    console.error("[CLIENTS] Failed to add authorization:", error);
    return { success: false, error: "Failed to add authorization" };
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
      service_type: parsed.data.service_type || null,
      billing_code: parsed.data.billing_code || null,
      treatment_requested: parsed.data.treatment_requested || null,
      units_requested: parsed.data.units_requested,
      units_used: parsed.data.units_used,
      units_per_week_authorized: parsed.data.units_per_week_authorized,
      rate_per_unit: parsed.data.rate_per_unit,
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

export async function updateClientDocument(
  documentId: string,
  data: Partial<ClientDocument>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = clientDocumentSchema.partial().safeParse(data);
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

  const { error } = await supabase
    .from("client_documents")
    .update({
      document_type: parsed.data.document_type,
      label: parsed.data.label || null,
      url: parsed.data.url || null,
      file_path: parsed.data.file_path || null,
      notes: parsed.data.notes || null,
      sort_order: parsed.data.sort_order,
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
    .select("client_id, clients!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc || (doc.clients as unknown as { profile_id: string }).profile_id !== user.id) {
    return { success: false, error: "Document not found" };
  }

  const { error } = await supabase
    .from("client_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("[CLIENTS] Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
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
  const prefillData: Partial<ClientWithRelated> = {
    inquiry_id: inquiryId,
    status: "intake_pending",
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

  revalidatePath("/dashboard/inbox");
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
  // Parent info
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_relationship?: string;
  // Child info
  child_first_name?: string;
  child_last_name?: string;
  child_date_of_birth?: string;
  child_diagnosis?: string[];
  child_primary_concerns?: string;
  // Insurance
  insurance_name?: string;
  insurance_member_id?: string;
  // Location
  preferred_city?: string;
  preferred_state?: string;
  // Notes
  notes?: string;
  // Turnstile token for verification
  turnstileToken?: string;
}): Promise<ActionResult<{ clientId: string }>> {
  // Verify Turnstile token if provided
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

  // Create the client
  const { data: client, error: clientError } = await adminSupabase
    .from("clients")
    .insert({
      profile_id: data.profileId,
      listing_id: data.listingId,
      status: "intake_pending",
      child_first_name: data.child_first_name || null,
      child_last_name: data.child_last_name || null,
      child_date_of_birth: data.child_date_of_birth || null,
      child_diagnosis: data.child_diagnosis || [],
      child_primary_concerns: data.child_primary_concerns || null,
      notes: data.notes || null,
      referral_source: "public_intake",
      referral_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("[CLIENTS] Failed to create client from intake:", clientError);
    return { success: false, error: "Failed to submit intake form" };
  }

  // Add parent if info provided
  if (data.parent_first_name || data.parent_last_name || data.parent_phone || data.parent_email) {
    await adminSupabase.from("client_parents").insert({
      client_id: client.id,
      first_name: data.parent_first_name || null,
      last_name: data.parent_last_name || null,
      phone: data.parent_phone || null,
      email: data.parent_email || null,
      relationship: data.parent_relationship || null,
      is_primary: true,
      sort_order: 0,
    });
  }

  // Add insurance if info provided
  if (data.insurance_name || data.insurance_member_id) {
    await adminSupabase.from("client_insurances").insert({
      client_id: client.id,
      insurance_name: data.insurance_name || null,
      member_id: data.insurance_member_id || null,
      is_primary: true,
      sort_order: 0,
    });
  }

  // Add location if info provided
  if (data.preferred_city || data.preferred_state) {
    await adminSupabase.from("client_locations").insert({
      client_id: client.id,
      label: "Preferred Location",
      city: data.preferred_city || null,
      state: data.preferred_state || null,
      is_primary: true,
      sort_order: 0,
    });
  }

  // TODO: Send notification email to provider

  return { success: true, data: { clientId: client.id } };
}
