"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  createAdminClient,
  createClient as createSupabaseClient,
  getCurrentProfileId,
  getUser,
} from "@/lib/supabase/server";
import { guardCommunications } from "@/lib/plans/guards";
import type { AgencyBrandingData } from "@/lib/email/email-helpers";
import { getFromEmail, getRequestOrigin } from "@/lib/utils/domains";
import {
  getProviderBrochurePath,
  getProviderCareersPath,
  getProviderContactPath,
  getProviderIntakePath,
  getProviderResourcesPath,
} from "@/lib/utils/public-paths";
import { createIntakeToken } from "@/lib/actions/intake";
import {
  extractMergeFieldsFromTemplate,
  formatBrandedLinkLabel,
  getUnresolvedMergeFields,
  linkifyRenderedHtmlText,
  renderCanonicalEmailBlocks,
  renderHtmlTemplateWithValues,
  renderTemplateWithValues,
  sanitizeEmailHtml,
} from "@/lib/communications/template-utils";
import {
  LINK_MERGE_FIELD_KEYS,
  MANUAL_MERGE_FIELD_KEYS,
  MERGE_FIELD_MAP,
} from "@/lib/communications/merge-fields";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

type TemplateSource = "system" | "system_override" | "custom";

interface CommunicationTemplateRow {
  id: string;
  profile_id: string | null;
  base_template_id: string | null;
  name: string;
  slug: string;
  lifecycle_stage: string;
  subject: string;
  body: string;
  cc: string[];
  merge_fields: string[];
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationTemplate {
  id: string;
  profile_id: string | null;
  base_template_id: string | null;
  name: string;
  slug: string;
  lifecycle_stage: string;
  subject: string;
  body: string;
  cc: string[];
  merge_fields: string[];
  sort_order: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  source: TemplateSource;
  is_archived: boolean;
  can_delete: boolean;
  can_archive: boolean;
}

export interface SaveCommunicationTemplateInput {
  templateId?: string;
  name: string;
  lifecycleStage: string;
  subject: string;
  body: string;
  cc?: string[];
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
  status: "pending" | "sent" | "failed" | "bounced";
  sent_at: string;
  sent_by: string | null;
  created_at: string;
  client_name?: string;
}

export interface CommunicationFilters {
  clientId?: string;
  templateSlug?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TemplateListFilters {
  archived?: boolean | "all";
}

type ManualFieldValues = Record<string, string>;

interface AgreementPacketSelection {
  packetId: string;
  packetSlug: string;
  packetTitle: string;
  versionId: string;
}

interface ProfileListingContext {
  id: string;
  slug: string;
  logoUrl: string | null;
  phone: string | null;
}

const BRANDED_CTA_STYLE =
  "display:inline-block;padding:12px 18px;border:1px solid #0866FF;border-radius:999px;background-color:#0866FF;color:#ffffff;font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;";

async function getSiteOrigin() {
  try {
    const headersList = await headers();
    return getRequestOrigin(headersList, "therapy");
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";
  }
}

async function normalizeEmailBodyCtas(html: string): Promise<string> {
  if (!html.trim()) {
    return html;
  }

  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, paragraphAttrs, innerHtml) => {
    const anchorMatch = innerHtml.match(
      /<a\b([^>]*)href=(["'])\{([a-z0-9_]+)\}\2([^>]*)>([\s\S]*?)<\/a>/i
    );
    if (!anchorMatch) {
      return match;
    }

    const fieldKey = anchorMatch[3] || "";
    if (!LINK_MERGE_FIELD_KEYS.includes(fieldKey)) {
      return match;
    }

    const anchorText = anchorMatch[5].replace(/<[^>]+>/g, "").trim();
    const looksLikeCta =
      /data-email-block=(["'])branded-card\1/i.test(match) ||
      /^open\s+/i.test(anchorText) ||
      /background-color:\s*#0866FF/i.test(anchorMatch[0]);
    if (!looksLikeCta) {
      return match;
    }

    const labelMatch = match.match(/data-label=(["'])(.*?)\1/i);
    const label =
      labelMatch?.[2] ||
      MERGE_FIELD_MAP[fieldKey]?.label ||
      anchorText.replace(/^Open\s+/i, "") ||
      fieldKey;
    const baseLabel = formatBrandedLinkLabel(label);
    const supportingHtml = innerHtml.replace(anchorMatch[0], "").trim();
    const escapedLabel = label.replace(/"/g, "&quot;");

    return `<p data-email-block="branded-card" data-field-key="${fieldKey}" data-label="${escapedLabel}" style="margin:16px 0;"><a href="{${fieldKey}}" target="_blank" style="${BRANDED_CTA_STYLE}">Open ${baseLabel}</a>${supportingHtml ? supportingHtml : ""}</p>`;
  });
}

async function getProfileListingContext(
  supabase:
    | Awaited<ReturnType<typeof createSupabaseClient>>
    | Awaited<ReturnType<typeof createAdminClient>>,
  profileId: string
): Promise<ProfileListingContext | null> {
  const selectClause = "id, slug, logo_url, status, updated_at";

  const { data: publishedListings } = await supabase
    .from("listings")
    .select(selectClause)
    .eq("profile_id", profileId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1);

  const listingRow =
    publishedListings?.[0] ||
    (
      await supabase
        .from("listings")
        .select(selectClause)
        .eq("profile_id", profileId)
        .order("updated_at", { ascending: false })
        .limit(1)
    ).data?.[0];

  if (!listingRow?.id || !listingRow.slug) {
    return null;
  }

  const { data: primaryLocation } = await supabase
    .from("locations")
    .select("phone, is_primary")
    .eq("listing_id", listingRow.id)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    id: listingRow.id,
    slug: listingRow.slug,
    logoUrl: listingRow.logo_url ?? null,
    phone: primaryLocation?.phone ?? null,
  };
}

function normalizeCc(cc?: string[]) {
  const normalized = new Set<string>();
  for (const email of cc || []) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    normalized.add(trimmed);
  }
  return Array.from(normalized);
}

function slugifyTemplateName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureTemplateSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  profileId: string,
  name: string,
  excludeId?: string
) {
  const base = slugifyTemplateName(name) || "custom-template";
  let candidate = base;
  let suffix = 2;

  while (true) {
    let query = supabase
      .from("communication_templates")
      .select("id")
      .eq("slug", candidate)
      .or(`profile_id.is.null,profile_id.eq.${profileId}`)
      .limit(1);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    if (!data?.length) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function sortTemplates(a: CommunicationTemplate, b: CommunicationTemplate) {
  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }

  return a.name.localeCompare(b.name);
}

function mapResolvedTemplate(
  row: CommunicationTemplateRow,
  source: TemplateSource
): CommunicationTemplate {
  return {
    ...row,
    cc: row.cc || [],
    base_template_id: row.base_template_id || null,
    source,
    is_archived: !!row.archived_at,
    can_delete: source === "custom",
    can_archive: true,
  };
}

function resolveTemplateRows(
  rows: CommunicationTemplateRow[],
  profileId: string,
  filters?: TemplateListFilters
): CommunicationTemplate[] {
  const systemRows = rows.filter((row) => row.profile_id === null);
  const workspaceRows = rows.filter((row) => row.profile_id === profileId);
  const systemSlugLookup = new Set(systemRows.map((row) => row.slug));

  const explicitOverrides = new Map<string, CommunicationTemplateRow>();
  const legacySlugOverrides = new Map<string, CommunicationTemplateRow>();
  const customRows: CommunicationTemplateRow[] = [];

  for (const row of workspaceRows) {
    if (row.base_template_id) {
      explicitOverrides.set(row.base_template_id, row);
      continue;
    }

    if (systemSlugLookup.has(row.slug)) {
      legacySlugOverrides.set(row.slug, row);
      continue;
    }

    customRows.push(row);
  }

  const resolved: CommunicationTemplate[] = [];

  for (const systemRow of systemRows) {
    const override =
      explicitOverrides.get(systemRow.id) ||
      legacySlugOverrides.get(systemRow.slug);

    const resolvedRow = override || systemRow;
    const template = mapResolvedTemplate(
      {
        ...resolvedRow,
        base_template_id: override?.base_template_id || systemRow.id,
      },
      override ? "system_override" : "system"
    );

    if (!template.is_active) continue;
    if (filters?.archived === true && !template.is_archived) continue;
    if (filters?.archived === false && template.is_archived) continue;
    resolved.push(template);
  }

  for (const customRow of customRows) {
    const template = mapResolvedTemplate(customRow, "custom");
    if (!template.is_active) continue;
    if (filters?.archived === true && !template.is_archived) continue;
    if (filters?.archived === false && template.is_archived) continue;
    resolved.push(template);
  }

  return resolved.sort(sortTemplates);
}

async function listResolvedTemplates(
  profileId: string,
  filters?: TemplateListFilters
): Promise<ActionResult<CommunicationTemplate[]>> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .or(`profile_id.is.null,profile_id.eq.${profileId}`)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[COMMUNICATIONS] Failed to fetch templates:", error.message, error.code, error.details);
    return { success: false, error: "Failed to load templates" };
  }

  const resolved = resolveTemplateRows(
    (data || []) as CommunicationTemplateRow[],
    profileId,
    filters
  );

  return { success: true, data: resolved };
}

async function getResolvedTemplateById(
  profileId: string,
  templateId: string
): Promise<ActionResult<CommunicationTemplate>> {
  const templatesResult = await listResolvedTemplates(profileId, { archived: "all" });
  if (!templatesResult.success) {
    return { success: false, error: templatesResult.error };
  }
  if (!templatesResult.data) {
    return { success: false, error: "Failed to load templates" };
  }

  const template = templatesResult.data.find((item) => item.id === templateId);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  return { success: true, data: template };
}

async function getBaseOrWorkspaceRowByResolvedTemplate(
  profileId: string,
  template: CommunicationTemplate
): Promise<ActionResult<CommunicationTemplateRow>> {
  const supabase = await createSupabaseClient();

  if (template.profile_id === profileId) {
    const { data, error } = await supabase
      .from("communication_templates")
      .select("*")
      .eq("id", template.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: data as CommunicationTemplateRow };
  }

  const baseId = template.base_template_id || template.id;
  const { data, error } = await supabase
    .from("communication_templates")
    .select("*")
    .eq("id", baseId)
    .single();

  if (error || !data) {
    return { success: false, error: "Template not found" };
  }

  return { success: true, data: data as CommunicationTemplateRow };
}

function buildTemplatePayload(input: SaveCommunicationTemplateInput) {
  const cc = normalizeCc(input.cc);
  return {
    name: input.name.trim(),
    lifecycle_stage: input.lifecycleStage.trim() || "any",
    subject: input.subject.trim(),
    body: input.body.trim(),
    cc,
    merge_fields: extractMergeFieldsFromTemplate({
      subject: input.subject,
      body: input.body,
      cc,
    }),
  };
}

async function getLatestAgreementPacketVersion(
  supabase:
    | Awaited<ReturnType<typeof createSupabaseClient>>
    | Awaited<ReturnType<typeof createAdminClient>>,
  packetId: string
) {
  const { data: version } = await supabase
    .from("agreement_packet_versions")
    .select("id, version_number")
    .eq("packet_id", packetId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return version;
}

async function getDefaultAgreementPacketSelection(
  supabase:
    | Awaited<ReturnType<typeof createSupabaseClient>>
    | Awaited<ReturnType<typeof createAdminClient>>,
  profileId: string
): Promise<AgreementPacketSelection | null> {
  const { data: packets } = await supabase
    .from("agreement_packets")
    .select("id, slug, title")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("title", { ascending: true });

  for (const packet of packets || []) {
    const version = await getLatestAgreementPacketVersion(supabase, packet.id);
    if (!version?.id) {
      continue;
    }

    return {
      packetId: packet.id,
      packetSlug: packet.slug,
      packetTitle: packet.title || "Agreement Packet",
      versionId: version.id,
    };
  }

  return null;
}

async function getAgreementLinkContext(
  supabase:
    | Awaited<ReturnType<typeof createSupabaseClient>>
    | Awaited<ReturnType<typeof createAdminClient>>,
  profileId: string
): Promise<{ listingSlug: string; packet: AgreementPacketSelection } | null> {
  const listing = await getProfileListingContext(supabase, profileId);
  if (!listing?.slug) {
    return null;
  }

  const packet = await getDefaultAgreementPacketSelection(supabase, profileId);
  if (!packet) {
    return null;
  }

  return {
    listingSlug: listing.slug,
    packet,
  };
}

async function resolveAgreementRoute(profileId: string): Promise<string> {
  try {
    const supabase = await createSupabaseClient();
    const context = await getAgreementLinkContext(supabase, profileId);
    if (!context) {
      return "";
    }

    const origin = await getSiteOrigin();
    return `${origin}/agreements/${context.listingSlug}/${context.packet.packetSlug}`;
  } catch (error) {
    console.warn("[COMMUNICATIONS] Agreement route unavailable:", error);
    return "";
  }
}

async function createAssignedAgreementLink(params: {
  clientId: string;
  profileId: string;
  userId: string;
}): Promise<ActionResult<string>> {
  try {
    const adminSupabase = await createAdminClient();
    const context = await getAgreementLinkContext(adminSupabase, params.profileId);
    if (!context) {
      return { success: false, error: "No agreement packet is available" };
    }

    const { data: client } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("id", params.clientId)
      .eq("profile_id", params.profileId)
      .is("deleted_at", null)
      .single();

    if (!client?.id) {
      return { success: false, error: "Client not found" };
    }

    const token = randomBytes(16).toString("base64url");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

    const { error } = await adminSupabase.from("agreement_links").insert({
      profile_id: params.profileId,
      packet_id: context.packet.packetId,
      packet_version_id: context.packet.versionId,
      client_id: params.clientId,
      token,
      link_type: "assigned",
      reusable: false,
      expires_at: expiresAt,
      created_by: params.userId,
    });

    if (error) {
      console.error("[COMMUNICATIONS] Failed to create agreement link:", error);
      return { success: false, error: "Failed to create agreement link" };
    }

    return {
      success: true,
      data: `${await getSiteOrigin()}/agreements/${context.listingSlug}/${context.packet.packetSlug}?token=${token}`,
    };
  } catch (error) {
    console.warn("[COMMUNICATIONS] Agreement link generation unavailable:", error);
    return { success: false, error: "Agreement links are not available yet" };
  }
}

async function resolveFieldValues(
  clientId: string,
  profileId: string
): Promise<ActionResult<Record<string, string>>> {
  const supabase = await createSupabaseClient();

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email, contact_phone")
    .eq("id", profileId)
    .single();

  const listing = await getProfileListingContext(supabase, profileId);

  type ParentRow = {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    relationship: string | null;
    is_primary: boolean;
  };
  type InsuranceRow = {
    insurance_name: string | null;
    plan_name: string | null;
    member_id: string | null;
    group_number: string | null;
    insurance_type: string | null;
    is_primary: boolean;
  };
  type AuthRow = {
    auth_reference_number: string | null;
    start_date: string | null;
    end_date: string | null;
    units_requested: number | null;
    units_used: number | null;
    status: string | null;
  };

  const parents = (client.client_parents as unknown as ParentRow[]) || [];
  const primaryParent = parents.find((parent) => parent.is_primary) || parents[0];
  const insurances = (client.client_insurances as unknown as InsuranceRow[]) || [];
  const primaryInsurance = insurances.find((insurance) => insurance.is_primary) || insurances[0];
  const auths = (client.client_authorizations as unknown as AuthRow[]) || [];
  const latestAuth = auths[0];
  const slug = listing?.slug || "";

  const fmtDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return "";
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateValue;
    }
  };

  const agreementLink = await resolveAgreementRoute(profileId);
  const origin = await getSiteOrigin();

  const fields: Record<string, string> = {
    client_name: [client.child_first_name, client.child_last_name].filter(Boolean).join(" "),
    child_first_name: client.child_first_name || "",
    child_last_name: client.child_last_name || "",
    child_date_of_birth: fmtDate(client.child_date_of_birth),
    child_diagnosis: Array.isArray(client.child_diagnosis)
      ? (client.child_diagnosis as string[]).join(", ")
      : "",
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

    parent_name: [primaryParent?.first_name, primaryParent?.last_name].filter(Boolean).join(" "),
    parent_first_name: primaryParent?.first_name || "",
    parent_last_name: primaryParent?.last_name || "",
    parent_email: primaryParent?.email || "",
    parent_phone: primaryParent?.phone || "",
    parent_relationship: primaryParent?.relationship || "",

    insurance_name: primaryInsurance?.insurance_name || "",
    insurance_plan_name: primaryInsurance?.plan_name || "",
    insurance_member_id: primaryInsurance?.member_id || "",
    insurance_group_number: primaryInsurance?.group_number || "",
    insurance_type: primaryInsurance?.insurance_type || "",

    auth_reference_number: latestAuth?.auth_reference_number || "",
    auth_start_date: fmtDate(latestAuth?.start_date),
    auth_end_date: fmtDate(latestAuth?.end_date),
    auth_units_requested: latestAuth?.units_requested?.toString() || "",
    auth_units_used: latestAuth?.units_used?.toString() || "",
    auth_units_remaining:
      latestAuth?.units_requested != null && latestAuth?.units_used != null
        ? (latestAuth.units_requested - latestAuth.units_used).toString()
        : "",
    auth_status: latestAuth?.status || "",

    agency_name: profile?.agency_name || "",
    agency_phone: listing?.phone || profile?.contact_phone || "",
    agency_email: profile?.contact_email || "",

    contact_link: slug ? `${origin}${getProviderContactPath(slug)}` : "",
    intake_link: slug ? `${origin}${getProviderIntakePath(slug)}` : "",
    brochure_link: slug ? `${origin}${getProviderBrochurePath(slug)}` : "",
    resources_link: slug ? `${origin}${getProviderResourcesPath(slug)}` : "",
    careers_link: slug ? `${origin}${getProviderCareersPath(slug)}` : "",
    agreement_link: agreementLink,

    assessment_date: "",
    assessment_time: "",
    assessment_location: "",
  };

  return { success: true, data: fields };
}

async function resolveAgencyPreviewFieldValues(
  profileId: string
): Promise<ActionResult<Record<string, string>>> {
  const supabase = await createSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_name, contact_email, contact_phone")
    .eq("id", profileId)
    .single();

  const listing = await getProfileListingContext(supabase, profileId);
  const origin = await getSiteOrigin();
  const slug = listing?.slug || "";
  const agreementLink = await resolveAgreementRoute(profileId);

  return {
    success: true,
    data: {
      agency_name: profile?.agency_name || "",
      agency_phone: listing?.phone || profile?.contact_phone || "",
      agency_email: profile?.contact_email || "",
      contact_link: slug ? `${origin}${getProviderContactPath(slug)}` : "",
      intake_link: slug ? `${origin}${getProviderIntakePath(slug)}` : "",
      brochure_link: slug ? `${origin}${getProviderBrochurePath(slug)}` : "",
      resources_link: slug ? `${origin}${getProviderResourcesPath(slug)}` : "",
      careers_link: slug ? `${origin}${getProviderCareersPath(slug)}` : "",
      agreement_link: agreementLink,
    },
  };
}

async function resolveSendFieldValues(params: {
  clientId: string;
  profileId: string;
  userId: string;
  subject: string;
  body: string;
  cc?: string[];
}): Promise<ActionResult<Record<string, string>>> {
  const baseResult = await resolveFieldValues(params.clientId, params.profileId);
  if (!baseResult.success || !baseResult.data) {
    return baseResult;
  }

  const values = { ...baseResult.data };
  const fields = extractMergeFieldsFromTemplate({
    subject: params.subject,
    body: params.body,
    cc: params.cc,
  });

  if (fields.includes("intake_link")) {
    const intakeResult = await createIntakeToken(params.clientId);
    if (intakeResult.success && intakeResult.data?.url) {
      values.intake_link = intakeResult.data.url;
    }
  }

  if (fields.includes("agreement_link")) {
    const agreementResult = await createAssignedAgreementLink({
      clientId: params.clientId,
      profileId: params.profileId,
      userId: params.userId,
    });

    if (agreementResult.success && agreementResult.data) {
      values.agreement_link = agreementResult.data;
    } else {
      values.agreement_link = "";
    }
  }

  return { success: true, data: values };
}

export async function getCommunicationTemplates(
  filters?: TemplateListFilters
): Promise<ActionResult<CommunicationTemplate[]>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  return listResolvedTemplates(profileId, filters);
}

export async function getTemplates(): Promise<ActionResult<CommunicationTemplate[]>> {
  return getCommunicationTemplates({ archived: false });
}

export async function getTemplate(
  slug: string
): Promise<ActionResult<CommunicationTemplate>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const templatesResult = await listResolvedTemplates(profileId, { archived: false });
  if (!templatesResult.success) {
    return { success: false, error: templatesResult.error };
  }
  if (!templatesResult.data) {
    return { success: false, error: "Failed to load templates" };
  }

  const template = templatesResult.data.find((item) => item.slug === slug);
  if (!template) {
    return { success: false, error: "Template not found" };
  }

  return { success: true, data: template };
}

export async function saveCommunicationTemplate(
  input: SaveCommunicationTemplateInput
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  if (!input.name.trim() || !input.subject.trim() || !input.body.trim()) {
    return { success: false, error: "Name, subject, and body are required" };
  }

  const payload = buildTemplatePayload(input);
  const supabase = await createSupabaseClient();

  if (!input.templateId) {
    const slug = await ensureTemplateSlug(supabase, profileId, input.name);
    const { data, error } = await supabase
      .from("communication_templates")
      .insert({
        profile_id: profileId,
        base_template_id: null,
        slug,
        sort_order: 1000,
        archived_at: null,
        is_active: true,
        ...payload,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[COMMUNICATIONS] Failed to create template:", error);
      return { success: false, error: "Failed to save template" };
    }

    revalidatePath("/dashboard/clients/communications");
    return { success: true, data: { id: data.id } };
  }

  const templateResult = await getResolvedTemplateById(profileId, input.templateId);
  if (!templateResult.success) {
    return { success: false, error: templateResult.error };
  }
  if (!templateResult.data) {
    return { success: false, error: "Template not found" };
  }

  const template = templateResult.data;
  if (template.source === "custom" || template.source === "system_override") {
    const rowResult = await getBaseOrWorkspaceRowByResolvedTemplate(profileId, template);
    if (!rowResult.success) {
      return { success: false, error: rowResult.error };
    }
    if (!rowResult.data) {
      return { success: false, error: "Template not found" };
    }

    const { error } = await supabase
      .from("communication_templates")
      .update({
        ...payload,
        archived_at: template.archived_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowResult.data.id)
      .eq("profile_id", profileId);

    if (error) {
      console.error("[COMMUNICATIONS] Failed to update template:", error);
      return { success: false, error: "Failed to save template" };
    }

    revalidatePath("/dashboard/clients/communications");
    return { success: true, data: { id: rowResult.data.id } };
  }

  const baseRowResult = await getBaseOrWorkspaceRowByResolvedTemplate(profileId, template);
  if (!baseRowResult.success) {
    return { success: false, error: baseRowResult.error };
  }
  if (!baseRowResult.data) {
    return { success: false, error: "Template not found" };
  }

  const { data, error } = await supabase
    .from("communication_templates")
    .insert({
      profile_id: profileId,
      base_template_id: baseRowResult.data.id,
      slug: baseRowResult.data.slug,
      sort_order: baseRowResult.data.sort_order,
      archived_at: null,
      is_active: true,
      ...payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[COMMUNICATIONS] Failed to create template override:", error);
    return { success: false, error: "Failed to save template" };
  }

  revalidatePath("/dashboard/clients/communications");
  return { success: true, data: { id: data.id } };
}

export async function archiveCommunicationTemplate(
  templateId: string
): Promise<ActionResult> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const templateResult = await getResolvedTemplateById(profileId, templateId);
  if (!templateResult.success) {
    return { success: false, error: templateResult.error };
  }
  if (!templateResult.data) {
    return { success: false, error: "Template not found" };
  }

  const template = templateResult.data;
  const supabase = await createSupabaseClient();

  if (template.source === "custom" || template.source === "system_override") {
    const rowResult = await getBaseOrWorkspaceRowByResolvedTemplate(profileId, template);
    if (!rowResult.success) {
      return { success: false, error: rowResult.error };
    }
    if (!rowResult.data) {
      return { success: false, error: "Template not found" };
    }

    const { error } = await supabase
      .from("communication_templates")
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowResult.data.id)
      .eq("profile_id", profileId);

    if (error) {
      console.error("[COMMUNICATIONS] Failed to archive template:", error);
      return { success: false, error: "Failed to archive template" };
    }

    revalidatePath("/dashboard/clients/communications");
    return { success: true };
  }

  const baseRowResult = await getBaseOrWorkspaceRowByResolvedTemplate(profileId, template);
  if (!baseRowResult.success) {
    return { success: false, error: baseRowResult.error };
  }
  if (!baseRowResult.data) {
    return { success: false, error: "Template not found" };
  }

  const payload = {
    profile_id: profileId,
    base_template_id: baseRowResult.data.id,
    name: baseRowResult.data.name,
    slug: baseRowResult.data.slug,
    lifecycle_stage: baseRowResult.data.lifecycle_stage,
    subject: baseRowResult.data.subject,
    body: baseRowResult.data.body,
    cc: baseRowResult.data.cc || [],
    merge_fields: baseRowResult.data.merge_fields || [],
    sort_order: baseRowResult.data.sort_order,
    is_active: true,
    archived_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("communication_templates").insert(payload);
  if (error) {
    console.error("[COMMUNICATIONS] Failed to archive system template:", error);
    return { success: false, error: "Failed to archive template" };
  }

  revalidatePath("/dashboard/clients/communications");
  return { success: true };
}

export async function unarchiveCommunicationTemplate(
  templateId: string
): Promise<ActionResult> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const templateResult = await getResolvedTemplateById(profileId, templateId);
  if (!templateResult.success) {
    return { success: false, error: templateResult.error };
  }
  if (!templateResult.data) {
    return { success: false, error: "Template not found" };
  }

  const template = templateResult.data;
  if (template.source === "system") {
    return { success: false, error: "Template is not archived" };
  }

  const rowResult = await getBaseOrWorkspaceRowByResolvedTemplate(profileId, template);
  if (!rowResult.success) {
    return { success: false, error: rowResult.error };
  }
  if (!rowResult.data) {
    return { success: false, error: "Template not found" };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("communication_templates")
    .update({
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowResult.data.id)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[COMMUNICATIONS] Failed to unarchive template:", error);
    return { success: false, error: "Failed to restore template" };
  }

  revalidatePath("/dashboard/clients/communications");
  return { success: true };
}

export async function deleteCommunicationTemplate(
  templateId: string
): Promise<ActionResult> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const templateResult = await getResolvedTemplateById(profileId, templateId);
  if (!templateResult.success) {
    return { success: false, error: templateResult.error };
  }
  if (!templateResult.data) {
    return { success: false, error: "Template not found" };
  }

  if (templateResult.data.source !== "custom") {
    return { success: false, error: "Only custom templates can be deleted" };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("communication_templates")
    .delete()
    .eq("id", templateResult.data.id)
    .eq("profile_id", profileId);

  if (error) {
    console.error("[COMMUNICATIONS] Failed to delete template:", error);
    return { success: false, error: "Failed to delete template" };
  }

  revalidatePath("/dashboard/clients/communications");
  return { success: true };
}

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

  return {
    success: true,
    data: ((data || []) as ClientCommunication[]).map((communication) => ({
      ...communication,
      body: sanitizeEmailHtml(communication.body || ""),
    })),
  };
}

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
    .select(
      `
      *,
      clients!inner(child_first_name, child_last_name)
    `,
      { count: "exact" }
    )
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

  const communications = (data || []).map((row: Record<string, unknown>) => {
    const clients = row.clients as { child_first_name: string | null; child_last_name: string | null } | null;
    const rest = Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== "clients")
    );
    return {
      ...rest,
      body: sanitizeEmailHtml((rest.body as string) || ""),
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

export async function populateMergeFields(
  content: string,
  clientId: string,
  manualFieldValues?: ManualFieldValues
): Promise<ActionResult<string>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await resolveFieldValues(clientId, profileId);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  if (!result.data) {
    return { success: false, error: "Failed to resolve merge fields" };
  }

  const values = {
    ...result.data,
    ...(manualFieldValues || {}),
  };

  return {
    success: true,
    data: renderTemplateWithValues(content, values, { preserveMissing: true }),
  };
}

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

export async function getClientSendFieldValues(params: {
  clientId: string;
  subject: string;
  body: string;
  cc?: string[];
}): Promise<ActionResult<Record<string, string>>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  return resolveFieldValues(params.clientId, profileId);
}

export async function getTemplateEditorFieldValues(): Promise<
  ActionResult<Record<string, string>>
> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  return resolveAgencyPreviewFieldValues(profileId);
}

export async function getClientPreviewLink(params: {
  clientId: string;
  fieldKey: string;
}): Promise<ActionResult<string>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const fieldValuesResult = await resolveFieldValues(params.clientId, profileId);
  if (!fieldValuesResult.success || !fieldValuesResult.data) {
    return {
      success: false,
      error:
        !fieldValuesResult.success && fieldValuesResult.error
          ? fieldValuesResult.error
          : "Failed to resolve preview link",
    };
  }

  return {
    success: true,
    data: fieldValuesResult.data[params.fieldKey] || "",
  };
}

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

  const listing = await getProfileListingContext(supabase, profileId);

  const settings = profile?.intake_form_settings as {
    background_color?: string;
  } | null;

  return {
    agencyName: profile?.agency_name || "Our Agency",
    contactEmail: profile?.contact_email || "",
    logoUrl: listing?.logoUrl || null,
    brandColor: settings?.background_color || "#0866FF",
    website: profile?.website || null,
    phone: profile?.contact_phone || null,
  };
}

export async function sendCommunication(params: {
  clientId: string;
  templateSlug: string | null;
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName?: string;
  cc?: string[];
  manualFieldValues?: ManualFieldValues;
}): Promise<ActionResult<{ communicationId: string }>> {
  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const guard = await guardCommunications();
  if (!guard.allowed) {
    return { success: false, error: guard.reason };
  }

  if (!params.clientId || !params.subject || !params.body || !params.recipientEmail) {
    return { success: false, error: "Missing required fields" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.recipientEmail)) {
    return { success: false, error: "Invalid email address" };
  }

  const fieldValuesResult = await resolveSendFieldValues({
    clientId: params.clientId,
    profileId,
    userId: user.id,
    subject: params.subject,
    body: params.body,
    cc: params.cc,
  });
  if (!fieldValuesResult.success) {
    return { success: false, error: fieldValuesResult.error };
  }
  if (!fieldValuesResult.data) {
    return { success: false, error: "Failed to resolve merge fields" };
  }

  const unresolvedFields = getUnresolvedMergeFields({
    subject: params.subject,
    body: params.body,
    cc: params.cc,
    values: fieldValuesResult.data,
    manualValues: params.manualFieldValues,
  });

  if (unresolvedFields.length > 0) {
    return {
      success: false,
      error: `Missing values for: ${unresolvedFields.join(", ")}`,
    };
  }

  const unresolvedManualFields = MANUAL_MERGE_FIELD_KEYS.filter((field) =>
    params.subject.includes(`{${field}}`) || params.body.includes(`{${field}}`)
  ).filter((field) => !params.manualFieldValues?.[field]?.trim());
  if (unresolvedManualFields.length > 0) {
    return { success: false, error: "Fill in all required assessment details before sending." };
  }

  const mergedValues = {
    ...fieldValuesResult.data,
    ...(params.manualFieldValues || {}),
  };
  const normalizedBodyTemplate = await normalizeEmailBodyCtas(
    renderCanonicalEmailBlocks(params.body)
  );
  const resolvedBody = linkifyRenderedHtmlText(
    renderHtmlTemplateWithValues(normalizedBodyTemplate, mergedValues)
  );
  const resolvedSubject = renderTemplateWithValues(params.subject, mergedValues);
  const sanitizedBody = sanitizeEmailHtml(resolvedBody);

  const supabase = await createSupabaseClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", params.clientId)
    .eq("profile_id", profileId)
    .single();

  if (clientError || !client) {
    return { success: false, error: "Client not found" };
  }

  const agencyData = await getAgencyBrandingData(profileId);
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
      status: "pending",
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !comm?.id) {
    console.error("[COMMUNICATIONS] Failed to create pending communication:", insertError);
    return { success: false, error: "Failed to queue communication" };
  }

  let sendSuccess = false;
  let sendError: string | undefined;

  try {
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("[COMMUNICATIONS] Resend API key not configured");
      sendError = "Email sending is not configured";
    } else {
      const resend = new Resend(apiKey);
      const { agencyEmailWrapper } = await import("@/lib/email/email-helpers");

      const ccEmails = normalizeCc(params.cc).filter((email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );

      const { error: resendError } = await resend.emails.send({
        from: `${agencyData.agencyName} <${getFromEmail("goodaba")}>`,
        to: [params.recipientEmail],
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        replyTo: agencyData.contactEmail || undefined,
        subject: resolvedSubject,
        html: agencyEmailWrapper(sanitizedBody, agencyData),
      });

      if (resendError) {
        console.error("[COMMUNICATIONS] Resend send error:", resendError);
        sendError = resendError.message;
      } else {
        sendSuccess = true;
      }
    }
  } catch (error) {
    console.error("[COMMUNICATIONS] Email send error:", error);
    sendError = error instanceof Error ? error.message : "Failed to send email";
  }

  const { error: updateError } = await supabase
    .from("client_communications")
    .update({
      status: sendSuccess ? "sent" : "failed",
      sent_at: new Date().toISOString(),
    })
    .eq("id", comm.id)
    .eq("profile_id", profileId);

  if (updateError) {
    console.error("[COMMUNICATIONS] Failed to finalize communication status:", updateError);
    if (!sendSuccess) {
      return { success: false, error: sendError || "Failed to send email" };
    }

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/clients/communications");
    return { success: true, data: { communicationId: comm.id } };
  }

  if (!sendSuccess) {
    return { success: false, error: sendError || "Failed to send email" };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/clients/communications");
  return { success: true, data: { communicationId: comm.id } };
}
