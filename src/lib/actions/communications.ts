"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient, getCurrentProfileId, getUser } from "@/lib/supabase/server";
import { guardCommunications } from "@/lib/plans/guards";
import type { AgencyBrandingData } from "@/lib/email/email-helpers";
import { getFromEmail } from "@/lib/utils/domains";

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface CommunicationTemplate {
  id: string;
  profile_id: string | null;
  name: string;
  slug: string;
  lifecycle_stage: string;
  subject: string;
  body: string;
  merge_fields: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCommunication {
  id: string;
  client_id: string;
  profile_id: string;
  template_slug: string | null;
  subject: string;
  body: string;
  recipient_email: string;
  recipient_name: string | null;
  status: "sent" | "failed" | "bounced";
  sent_at: string;
  sent_by: string | null;
  created_at: string;
  // Joined fields for dashboard display
  client_name?: string;
}

export interface CommunicationFilters {
  clientId?: string;
  templateSlug?: string;
  dateFrom?: string;
  dateTo?: string;
}

// =============================================================================
// TEMPLATE QUERIES
// =============================================================================

/**
 * Get all active templates (system defaults + user's custom templates)
 */
export async function getTemplates(): Promise<ActionResult<CommunicationTemplate[]>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .or(`profile_id.is.null,profile_id.eq.${profileId}`)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[COMMUNICATIONS] Failed to fetch templates:", error.message, error.code, error.details);
    return { success: false, error: "Failed to load templates" };
  }

  return { success: true, data: data as CommunicationTemplate[] };
}

/**
 * Get a single template by slug
 */
export async function getTemplate(slug: string): Promise<ActionResult<CommunicationTemplate>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .or(`profile_id.is.null,profile_id.eq.${profileId}`)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("[COMMUNICATIONS] Failed to fetch template:", error.message, error.code, error.details);
    return { success: false, error: "Template not found" };
  }

  return { success: true, data: data as CommunicationTemplate };
}

// =============================================================================
// COMMUNICATION HISTORY
// =============================================================================

/**
 * Get communication history for a specific client
 */
export async function getClientCommunications(
  clientId: string
): Promise<ActionResult<ClientCommunication[]>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("client_communications")
    .select("*")
    .eq("profile_id", profileId)
    .eq("client_id", clientId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[COMMUNICATIONS] Failed to fetch client communications:", error.message, error.code, error.details);
    return { success: false, error: "Failed to load communications" };
  }

  return { success: true, data: data as ClientCommunication[] };
}

/**
 * Get all communications for the agency (dashboard view)
 */
export async function getAllCommunications(
  filters?: CommunicationFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResult<{ communications: ClientCommunication[]; total: number }>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("client_communications")
    .select(`
      *,
      clients!inner(child_first_name, child_last_name)
    `, { count: "exact" })
    .eq("profile_id", profileId)
    .order("sent_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters?.templateSlug) {
    query = query.eq("template_slug", filters.templateSlug);
  }
  if (filters?.dateFrom) {
    query = query.gte("sent_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("sent_at", filters.dateTo);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[COMMUNICATIONS] Failed to fetch all communications:", error.message, error.code, error.details);
    return { success: false, error: "Failed to load communications" };
  }

  // Map joined client data
  const communications = (data || []).map((row: Record<string, unknown>) => {
    const clients = row.clients as { child_first_name: string | null; child_last_name: string | null } | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clients: _joinedClients, ...rest } = row;
    return {
      ...rest,
      client_name: clients
        ? [clients.child_first_name, clients.child_last_name].filter(Boolean).join(" ")
        : "Unknown",
    } as unknown as ClientCommunication;
  });

  return {
    success: true,
    data: { communications, total: count || 0 },
  };
}

// =============================================================================
// MERGE FIELD POPULATION
// =============================================================================

/**
 * Internal helper: resolve all merge field values for a client.
 * Returns a Record<string, string> where empty string means the field has no value.
 */
async function resolveFieldValues(
  clientId: string,
  profileId: string
): Promise<ActionResult<Record<string, string>>> {
  const supabase = await createSupabaseClient();

  // Fetch client with all related data for merge fields
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(`
      child_first_name,
      child_last_name,
      child_date_of_birth,
      child_diagnosis,
      child_school_name,
      child_school_district,
      child_grade_level,
      child_pediatrician_name,
      child_pediatrician_phone,
      preferred_language,
      service_start_date,
      referral_source,
      referral_date,
      status,
      funding_source,
      client_parents(first_name, last_name, email, phone, relationship, is_primary),
      client_insurances(insurance_name, plan_name, member_id, group_number, insurance_type, is_primary),
      client_authorizations(auth_reference_number, start_date, end_date, units_requested, units_used, status)
    `)
    .eq("id", clientId)
    .eq("profile_id", profileId)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Client not found" };
  }

  // Fetch agency profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email")
    .eq("id", profileId)
    .single();

  // Fetch primary location for phone
  const { data: listing } = await supabase
    .from("listings")
    .select("slug, locations(phone)")
    .eq("profile_id", profileId)
    .single();

  // Resolve related records
  type ParentRow = { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; relationship: string | null; is_primary: boolean };
  type InsuranceRow = { insurance_name: string | null; plan_name: string | null; member_id: string | null; group_number: string | null; insurance_type: string | null; is_primary: boolean };
  type AuthRow = { auth_reference_number: string | null; start_date: string | null; end_date: string | null; units_requested: number | null; units_used: number | null; status: string | null };

  const parents = (client.client_parents as unknown as ParentRow[]) || [];
  const primaryParent = parents.find((p) => p.is_primary) || parents[0];
  const insurances = (client.client_insurances as unknown as InsuranceRow[]) || [];
  const primaryInsurance = insurances.find((i) => i.is_primary) || insurances[0];
  const auths = (client.client_authorizations as unknown as AuthRow[]) || [];
  const latestAuth = auths[0]; // most recent authorization
  const locations = (listing?.locations as { phone: string | null }[]) || [];
  const primaryLocation = locations[0];
  const slug = listing?.slug || "";

  // Helper to format dates
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); } catch { return d; }
  };

  const fields: Record<string, string> = {
    // Client fields
    client_name: [client.child_first_name, client.child_last_name].filter(Boolean).join(" "),
    child_first_name: client.child_first_name || "",
    child_last_name: client.child_last_name || "",
    child_date_of_birth: fmtDate(client.child_date_of_birth),
    child_diagnosis: Array.isArray(client.child_diagnosis) ? (client.child_diagnosis as string[]).join(", ") : "",
    child_school_name: client.child_school_name || "",
    child_school_district: client.child_school_district || "",
    child_grade_level: client.child_grade_level || "",
    child_pediatrician_name: client.child_pediatrician_name || "",
    child_pediatrician_phone: client.child_pediatrician_phone || "",
    preferred_language: client.preferred_language || "",
    service_start_date: fmtDate(client.service_start_date),
    referral_source: client.referral_source || "",
    referral_date: fmtDate(client.referral_date),
    status: client.status || "",
    funding_source: client.funding_source || "",

    // Parent fields
    parent_name: [primaryParent?.first_name, primaryParent?.last_name].filter(Boolean).join(" "),
    parent_first_name: primaryParent?.first_name || "",
    parent_last_name: primaryParent?.last_name || "",
    parent_email: primaryParent?.email || "",
    parent_phone: primaryParent?.phone || "",
    parent_relationship: primaryParent?.relationship || "",

    // Insurance fields
    insurance_name: primaryInsurance?.insurance_name || "",
    insurance_plan_name: primaryInsurance?.plan_name || "",
    insurance_member_id: primaryInsurance?.member_id || "",
    insurance_group_number: primaryInsurance?.group_number || "",
    insurance_type: primaryInsurance?.insurance_type || "",

    // Authorization fields
    auth_reference_number: latestAuth?.auth_reference_number || "",
    auth_start_date: fmtDate(latestAuth?.start_date),
    auth_end_date: fmtDate(latestAuth?.end_date),
    auth_units_requested: latestAuth?.units_requested?.toString() || "",
    auth_units_used: latestAuth?.units_used?.toString() || "",
    auth_units_remaining: latestAuth?.units_requested != null && latestAuth?.units_used != null
      ? (latestAuth.units_requested - latestAuth.units_used).toString()
      : "",
    auth_status: latestAuth?.status || "",

    // Agency fields
    agency_name: profile?.agency_name || "",
    agency_phone: primaryLocation?.phone || "",
    agency_email: profile?.contact_email || "",

    // Link fields
    resources_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/resources/${slug}` : "",
    intake_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/intake/${slug}/client` : "",
    contact_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/contact/${slug}` : "",

    // Manual fields — left empty (resolved client-side)
    assessment_date: "",
    assessment_time: "",
    assessment_location: "",
  };

  return { success: true, data: fields };
}

/**
 * Populate merge fields in template content
 */
export async function populateMergeFields(
  content: string,
  clientId: string
): Promise<ActionResult<string>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await resolveFieldValues(clientId, profileId);
  if (!result.success) {
    return result;
  }

  const fields = result.data!;

  // Apply fallback display values for fields that are empty
  const displayFields: Record<string, string> = {
    ...fields,
    client_name: fields.client_name || "your child",
    parent_name: fields.parent_name || "there",
    insurance_name: fields.insurance_name || "your insurance provider",
    agency_name: fields.agency_name || "Our Agency",
    // Manual fields keep their placeholders
    assessment_date: "{assessment_date}",
    assessment_time: "{assessment_time}",
    assessment_location: "{assessment_location}",
  };

  // Replace all merge fields
  let populated = content;
  for (const [key, value] of Object.entries(displayFields)) {
    populated = populated.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return { success: true, data: populated };
}

/**
 * Get resolved merge field values for a client (used by UI to show empty field indicators)
 */
export async function getClientMergeFieldValues(
  clientId: string
): Promise<ActionResult<Record<string, string>>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  return resolveFieldValues(clientId, profileId);
}

// =============================================================================
// AGENCY BRANDING
// =============================================================================

/**
 * Get agency branding data for the current user (public export for the email composer UI)
 */
export async function getAgencyBranding(): Promise<ActionResult<AgencyBrandingData>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const data = await getAgencyBrandingData(profileId);
  return { success: true, data };
}

async function getAgencyBrandingData(
  profileId: string
): Promise<AgencyBrandingData> {
  const supabase = await createSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email, contact_phone, website, intake_form_settings")
    .eq("id", profileId)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("logo_url")
    .eq("profile_id", profileId)
    .single();

  const settings = profile?.intake_form_settings as {
    background_color?: string;
  } | null;

  return {
    agencyName: profile?.agency_name || "Our Agency",
    contactEmail: profile?.contact_email || "",
    logoUrl: listing?.logo_url || null,
    brandColor: settings?.background_color || "#0866FF",
    website: profile?.website || null,
    phone: profile?.contact_phone || null,
  };
}

// =============================================================================
// SEND COMMUNICATION
// =============================================================================

/**
 * Send a communication to a client via email
 */
export async function sendCommunication(params: {
  clientId: string;
  templateSlug: string | null;
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName?: string;
  cc?: string[];
}): Promise<ActionResult<{ communicationId: string }>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  // Check feature gate
  const guard = await guardCommunications();
  if (!guard.allowed) {
    return { success: false, error: guard.reason };
  }

  // Validate inputs
  if (!params.clientId || !params.subject || !params.body || !params.recipientEmail) {
    return { success: false, error: "Missing required fields" };
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.recipientEmail)) {
    return { success: false, error: "Invalid email address" };
  }

  // Resolve merge fields once — reuse for both subject and body
  const fieldsResult = await resolveFieldValues(params.clientId, profileId);
  if (!fieldsResult.success) {
    return { success: false, error: fieldsResult.error };
  }
  const fields = fieldsResult.data!;
  const displayFields: Record<string, string> = {
    ...fields,
    client_name: fields.client_name || "your child",
    parent_name: fields.parent_name || "there",
    insurance_name: fields.insurance_name || "your insurance provider",
    agency_name: fields.agency_name || "Our Agency",
    assessment_date: "{assessment_date}",
    assessment_time: "{assessment_time}",
    assessment_location: "{assessment_location}",
  };

  const applyMergeFields = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(displayFields)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  };

  const resolvedBody = applyMergeFields(params.body);
  const resolvedSubject = applyMergeFields(params.subject);

  // Sanitize body — strip script tags to prevent XSS in emails
  const sanitizedBody = resolvedBody
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");

  const supabase = await createSupabaseClient();

  // Verify client belongs to user
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", params.clientId)
    .eq("profile_id", profileId)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Client not found" };
  }

  // Fetch agency branding for the email template
  const agencyData = await getAgencyBrandingData(profileId);

  // Send email via Resend using dynamic import to avoid circular deps
  let sendSuccess = false;
  let sendError: string | undefined;

  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("[COMMUNICATIONS] Resend API key not configured, skipping email send");
      sendSuccess = true; // Allow in dev without email
    } else {
      const resend = new Resend(apiKey);

      // Use agency branding: from name is the agency, reply-to is agency email
      const { agencyEmailWrapper } = await import("@/lib/email/email-helpers");

      const ccEmails = params.cc?.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

      console.log("[COMMUNICATIONS] Sending email:", {
        to: params.recipientEmail,
        cc: ccEmails,
        ccFromParams: params.cc,
        subject: resolvedSubject.substring(0, 50),
      });

      const { data: resendData, error: resendError } = await resend.emails.send({
        from: `${agencyData.agencyName} <${getFromEmail("goodaba")}>`,
        to: [params.recipientEmail],
        cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
        replyTo: agencyData.contactEmail || undefined,
        subject: resolvedSubject,
        html: agencyEmailWrapper(sanitizedBody, agencyData),
      });

      console.log("[COMMUNICATIONS] Resend response:", { data: resendData, error: resendError });

      if (resendError) {
        console.error("[COMMUNICATIONS] Resend send error:", resendError);
        sendError = resendError.message;
      } else {
        sendSuccess = true;
      }
    }
  } catch (err) {
    console.error("[COMMUNICATIONS] Email send error:", err);
    sendError = err instanceof Error ? err.message : "Failed to send email";
  }

  // Log the communication regardless of send status
  const { data: comm, error: insertError } = await supabase
    .from("client_communications")
    .insert({
      client_id: params.clientId,
      profile_id: profileId,
      template_slug: params.templateSlug,
      subject: resolvedSubject,
      body: sanitizedBody,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      status: sendSuccess ? "sent" : "failed",
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[COMMUNICATIONS] Failed to log communication:", insertError.message, insertError.code, insertError.details);
    return { success: false, error: "Failed to log communication" };
  }

  if (!sendSuccess) {
    return { success: false, error: sendError || "Failed to send email" };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/clients/communications");

  return { success: true, data: { communicationId: comm.id } };
}
