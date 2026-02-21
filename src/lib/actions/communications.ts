"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient, getUser } from "@/lib/supabase/server";
import { guardCommunications } from "@/lib/plans/guards";
import type { AgencyBrandingData } from "@/lib/email/email-helpers";

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
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .or(`profile_id.is.null,profile_id.eq.${user.id}`)
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
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .or(`profile_id.is.null,profile_id.eq.${user.id}`)
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
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("client_communications")
    .select("*")
    .eq("profile_id", user.id)
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
  if (!user) {
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
    .eq("profile_id", user.id)
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
 * Populate merge fields in template content
 */
export async function populateMergeFields(
  content: string,
  clientId: string
): Promise<ActionResult<string>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();

  // Fetch client with related data
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select(`
      child_first_name,
      child_last_name,
      client_parents(first_name, last_name, email, is_primary),
      client_insurances(insurance_name, is_primary)
    `)
    .eq("id", clientId)
    .eq("profile_id", user.id)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Client not found" };
  }

  // Fetch agency profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email")
    .eq("id", user.id)
    .single();

  // Fetch primary location for phone
  const { data: listing } = await supabase
    .from("listings")
    .select("slug, locations(phone)")
    .eq("profile_id", user.id)
    .single();

  // Resolve field values
  const parents = (client.client_parents as { first_name: string | null; last_name: string | null; email: string | null; is_primary: boolean }[]) || [];
  const primaryParent = parents.find((p) => p.is_primary) || parents[0];
  const insurances = (client.client_insurances as { insurance_name: string | null; is_primary: boolean }[]) || [];
  const primaryInsurance = insurances.find((i) => i.is_primary) || insurances[0];
  const locations = (listing?.locations as { phone: string | null }[]) || [];
  const primaryLocation = locations[0];
  const slug = listing?.slug || "";

  const fields: Record<string, string> = {
    client_name: [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "your child",
    parent_name: [primaryParent?.first_name, primaryParent?.last_name].filter(Boolean).join(" ") || "there",
    parent_email: primaryParent?.email || "",
    agency_name: profile?.agency_name || "Our Agency",
    agency_phone: primaryLocation?.phone || "",
    agency_email: profile?.contact_email || "",
    insurance_name: primaryInsurance?.insurance_name || "your insurance provider",
    resources_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/resources/${slug}` : "",
    intake_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/intake/${slug}/client` : "",
    contact_link: slug ? `${process.env.NEXT_PUBLIC_SITE_URL || ""}/contact/${slug}` : "",
    // Manual fields that the user fills in the modal:
    assessment_date: "{assessment_date}",
    assessment_time: "{assessment_time}",
    assessment_location: "{assessment_location}",
  };

  // Replace all merge fields
  let populated = content;
  for (const [key, value] of Object.entries(fields)) {
    populated = populated.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return { success: true, data: populated };
}

// =============================================================================
// AGENCY BRANDING
// =============================================================================

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
    brandColor: settings?.background_color || "#5788FF",
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
}): Promise<ActionResult<{ communicationId: string }>> {
  const user = await getUser();
  if (!user) {
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

  // Sanitize body — strip script tags to prevent XSS in emails
  const sanitizedBody = params.body
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");

  const supabase = await createSupabaseClient();

  // Verify client belongs to user
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", params.clientId)
    .eq("profile_id", user.id)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Client not found" };
  }

  // Fetch agency branding for the email template
  const agencyData = await getAgencyBrandingData(user.id);

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

      const { error: resendError } = await resend.emails.send({
        from: `${agencyData.agencyName} <noreply@behaviorwork.com>`,
        to: params.recipientEmail,
        replyTo: agencyData.contactEmail || undefined,
        subject: params.subject,
        html: agencyEmailWrapper(sanitizedBody, agencyData),
      });

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
      profile_id: user.id,
      template_slug: params.templateSlug,
      subject: params.subject,
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
