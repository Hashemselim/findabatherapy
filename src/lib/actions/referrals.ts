"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient, getCurrentMembership, getCurrentProfileId, getProfile, getUser } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/geo/distance";
import { agencyEmailWrapper, type AgencyBrandingData } from "@/lib/email/email-helpers";
import { guardReferralTracking } from "@/lib/plans/guards";
import { getFromEmail, getRequestOrigin } from "@/lib/utils/domains";
import { getProviderBrochurePath } from "@/lib/utils/public-paths";
import {
  referralBulkSendSchema,
  referralContactSchema,
  referralImportRequestSchema,
  referralNoteSchema,
  referralSourceSchema,
  referralTaskSchema,
  referralTemplateSchema,
  referralTouchpointSchema,
  type ReferralBulkSendInput,
  type ReferralContactInput,
  type ReferralNoteInput,
  type ReferralSourceCategory,
  type ReferralSourceInput,
  type ReferralSourceStage,
  type ReferralTaskInput,
  type ReferralTemplateInput,
  type ReferralTouchpointInput,
} from "@/lib/validations/referrals";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

type PaidAuthedContext =
  NonNullable<Awaited<ReturnType<typeof getAuthedContext>>>;

type PaidAuthedContextResult =
  | { success: true; data: PaidAuthedContext }
  | { success: false; error: string };

export interface ReferralSourceListItem {
  id: string;
  location_id: string | null;
  name: string;
  category: ReferralSourceCategory;
  stage: ReferralSourceStage;
  contactability: string;
  relationship_health: string;
  phone: string | null;
  website: string | null;
  public_email: string | null;
  contact_form_url: string | null;
  city: string | null;
  state: string | null;
  distance_miles: number | null;
  priority_score: number;
  fit_score: number;
  contactability_score: number;
  confidence_score: number;
  do_not_contact: boolean;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes_summary: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  updated_at: string;
}

export interface ReferralContact {
  id: string;
  source_id: string;
  name: string;
  role: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact_method: string | null;
  verification_status: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralNote {
  id: string;
  source_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralTask {
  id: string;
  source_id: string;
  title: string;
  content: string | null;
  status: string;
  due_date: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralTouchpoint {
  id: string;
  source_id: string;
  contact_id: string | null;
  touchpoint_type: string;
  outcome: string;
  subject: string | null;
  body: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  touched_at: string;
  created_at: string;
}

export interface ReferralTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  body: string;
  is_default: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface ReferralCampaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  launched_at: string | null;
  created_at: string;
}

export interface ReferralImportJob {
  id: string;
  location_id: string | null;
  radius_miles: number;
  categories: string[];
  status: string;
  external_provider: string;
  discovered_count: number;
  inserted_count: number;
  updated_count: number;
  enriched_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralSourceDetail extends ReferralSourceListItem {
  street: string | null;
  postal_code: string | null;
  fax: string | null;
  referral_instructions: string | null;
  accepted_insurances: string[];
  metadata: Record<string, unknown>;
  contacts: ReferralContact[];
  notes: ReferralNote[];
  tasks: ReferralTask[];
  touchpoints: ReferralTouchpoint[];
}

export interface ReferralOverview {
  totalSources: number;
  readyToContact: number;
  activeReferrers: number;
  dueTasks: number;
  verifiedEmails: number;
  recentTouchpoints: ReferralTouchpoint[];
  topSources: ReferralSourceListItem[];
  importJobs: ReferralImportJob[];
}

interface AgencyReferralContext {
  branding: AgencyBrandingData;
  brochureLink: string;
}

interface GoogleTextSearchPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

interface GooglePlaceDetails {
  id?: string;
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{
    types?: string[];
    longText?: string;
    shortText?: string;
  }>;
}

const GOOGLE_TEXT_SEARCH_API_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACE_DETAILS_API_BASE = "https://places.googleapis.com/v1/places";

const DEFAULT_IMPORT_CATEGORIES: ReferralSourceCategory[] = [
  "pediatrician",
  "child_psychologist",
  "pediatric_neurologist",
  "developmental_pediatrician",
  "speech_therapy",
  "occupational_therapy",
];

const CATEGORY_QUERY_MAP: Record<ReferralSourceCategory, string> = {
  pediatrician: "pediatrician",
  child_psychologist: "child psychologist",
  psychologist: "psychologist",
  pediatric_neurologist: "pediatric neurologist",
  neurologist: "neurologist",
  developmental_pediatrician: "developmental pediatrician",
  speech_therapy: "speech therapy clinic",
  occupational_therapy: "occupational therapy clinic",
  school: "school",
  other: "doctor office",
};

const DEFAULT_REFERRAL_TEMPLATES: ReferralTemplateInput[] = [
  {
    name: "Referral Intro",
    templateType: "intro",
    isDefault: true,
    subject: "Referral partnership with {{agency_name}}",
    body: [
      "Hi {{contact_name}},",
      "",
      "I wanted to introduce {{agency_name}}. We provide ABA services for children and families in {{agency_city_state}}.",
      "",
      "We would love to be a referral resource for your office when families need ABA support. You can view our brochure here: {{brochure_link}}",
      "",
      "If helpful, I can also send over more details on services, insurances, and availability.",
      "",
      "Best,",
      "{{agency_name}}",
      "{{agency_phone}}",
      "{{agency_email}}",
    ].join("\n"),
  },
  {
    name: "Referral Follow Up",
    templateType: "follow_up",
    isDefault: false,
    subject: "Following up from {{agency_name}}",
    body: [
      "Hi {{contact_name}},",
      "",
      "Following up in case it is helpful to keep {{agency_name}} on hand as an ABA referral option for families.",
      "",
      "Brochure: {{brochure_link}}",
      "",
      "If there is a preferred referral process for your office, I would be glad to follow it.",
      "",
      "Thank you,",
      "{{agency_name}}",
      "{{agency_phone}}",
      "{{agency_email}}",
    ].join("\n"),
  },
];

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUrl(value?: string | null) {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

function plainTextToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br />");
}

function getContactability(params: {
  publicEmail?: string | null;
  contactFormUrl?: string | null;
  phone?: string | null;
  verified?: boolean;
}) {
  if (params.publicEmail && params.verified) return "email_verified";
  if (params.publicEmail) return "email_unverified";
  if (params.contactFormUrl) return "contact_form_only";
  if (params.phone) return "phone_only";
  return "no_channel_found";
}

function scoreSource(params: {
  distanceMiles?: number | null;
  hasEmail: boolean;
  hasContactForm: boolean;
  hasPhone: boolean;
  rating?: number | null;
}) {
  const fit = Math.max(0, 100 - Math.round((params.distanceMiles || 25) * 3));
  const contactability =
    (params.hasEmail ? 60 : 0) +
    (params.hasContactForm ? 20 : 0) +
    (params.hasPhone ? 20 : 0);
  const confidence = Math.min(
    100,
    (params.rating ? Math.round(params.rating * 15) : 20) +
      (params.hasEmail ? 30 : 0) +
      (params.hasContactForm ? 15 : 0) +
      (params.hasPhone ? 15 : 0)
  );
  const priority = Math.min(100, Math.round(fit * 0.45 + contactability * 0.35 + confidence * 0.2));

  return { fit, contactability, confidence, priority };
}

function extractAddressFields(details: GooglePlaceDetails) {
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let postalCode = "";

  for (const component of details.addressComponents || []) {
    const types = component.types || [];
    if (types.includes("street_number")) streetNumber = component.longText || "";
    if (types.includes("route")) route = component.longText || "";
    if (types.includes("locality")) city = component.longText || "";
    if (types.includes("administrative_area_level_1")) state = component.shortText || component.longText || "";
    if (types.includes("postal_code")) postalCode = component.longText || "";
  }

  return {
    street: normalizeOptionalString([streetNumber, route].filter(Boolean).join(" ")),
    city: normalizeOptionalString(city),
    state: normalizeOptionalString(state),
    postalCode: normalizeOptionalString(postalCode),
  };
}

function extractEmailsFromHtml(html: string) {
  const emails = new Set<string>();

  for (const match of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    const email = match[0].toLowerCase();
    if (!email.includes("example.com")) {
      emails.add(email);
    }
  }

  for (const match of html.matchAll(/mailto:([^"'?#\s>]+)/gi)) {
    emails.add(decodeURIComponent(match[1]).toLowerCase());
  }

  return Array.from(emails);
}

function extractContactFormUrls(html: string, baseUrl: string) {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const label = `${match[2] || ""} ${href}`.toLowerCase();
    if (!/contact|referral|refer|appointment|new-patient/.test(label)) continue;
    try {
      urls.add(new URL(href, baseUrl).toString());
    } catch {
      // ignore malformed URLs
    }
  }
  return Array.from(urls);
}

function extractReferralInstructions(html: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = text.match(/((?:referral|refer|new patient)[^.]{0,220}\.)/i);
  return match?.[1] || null;
}

async function getSiteOrigin() {
  try {
    const headerList = await headers();
    return getRequestOrigin(headerList, "therapy");
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }
}

async function getAgencyReferralContext(profileId: string): Promise<AgencyReferralContext> {
  const supabase = await createClient();
  const profile = await getProfile();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: primaryLocation } = await supabase
    .from("locations")
    .select("city, state, contact_phone")
    .eq("listing_id", listing?.id || "")
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const origin = await getSiteOrigin();
  return {
    branding: {
      agencyName: profile?.agency_name || "Our Agency",
      contactEmail: profile?.contact_email || "",
      phone: primaryLocation?.contact_phone || profile?.contact_phone || null,
      website: profile?.website || null,
      logoUrl: null,
      brandColor: "#0866FF",
    },
    brochureLink: listing?.slug ? `${origin}${getProviderBrochurePath(listing.slug)}` : origin,
  };
}

async function getAuthedContext() {
  const [user, profileId, membership] = await Promise.all([
    getUser(),
    getCurrentProfileId(),
    getCurrentMembership(),
  ]);

  if (!user || !profileId) {
    return null;
  }

  return {
    user,
    profileId,
    membership,
    supabase: await createClient(),
  };
}

async function getPaidAuthedContext(): Promise<PaidAuthedContextResult> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return { success: false, error: "Not authenticated" };
  }

  const access = await guardReferralTracking();
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }

  return { success: true, data: ctx };
}

async function ensureDefaultReferralTemplates(profileId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("referral_templates")
    .select("id")
    .eq("profile_id", profileId)
    .is("archived_at", null)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("referral_templates").insert(
    DEFAULT_REFERRAL_TEMPLATES.map((template) => ({
      profile_id: profileId,
      name: template.name,
      template_type: template.templateType,
      subject: template.subject,
      body: template.body,
      is_default: template.isDefault || false,
    }))
  );
}

async function fetchGoogleTextSearch(query: string, latitude: number, longitude: number, radiusMiles: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const response = await fetch(GOOGLE_TEXT_SEARCH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      languageCode: "en",
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: Math.min(Math.round(radiusMiles * 1609.34), 50000),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed with status ${response.status}`);
  }

  const data = (await response.json()) as { places?: GoogleTextSearchPlace[] };
  return data.places || [];
}

async function resolveGoogleSearchCenter(searchText: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const response = await fetch(GOOGLE_TEXT_SEARCH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: searchText,
      maxResultCount: 1,
      languageCode: "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search center lookup failed with status ${response.status}`);
  }

  const data = (await response.json()) as { places?: GoogleTextSearchPlace[] };
  const place = data.places?.[0];
  if (place?.location?.latitude == null || place.location.longitude == null) {
    return null;
  }

  return {
    id: null,
    label: place.formattedAddress || place.displayName?.text || searchText,
    city: null,
    state: null,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function fetchGooglePlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const response = await fetch(`${GOOGLE_PLACE_DETAILS_API_BASE}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,formattedAddress,websiteUri,nationalPhoneNumber,rating,userRatingCount,location,addressComponents",
    },
  });

  if (!response.ok) {
    throw new Error(`Google place details failed with status ${response.status}`);
  }

  return (await response.json()) as GooglePlaceDetails;
}

async function fetchWebsiteHtml(url: string) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return null;

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    const endpoints = [
      "https://api.firecrawl.dev/v2/scrape",
      "https://api.firecrawl.dev/v1/scrape",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey}`,
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ["html"],
            onlyMainContent: false,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const html =
          data?.data?.html ||
          data?.data?.content ||
          data?.html ||
          data?.content ||
          null;
        if (html) return html as string;
      } catch {
        // fall through to raw fetch
      }
    }
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 ReferralCRM/1.0",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function enrichSourceFromWebsite(source: ReferralSourceListItem) {
  const website = normalizeUrl(source.website);
  if (!website) {
    return {
      publicEmail: source.public_email,
      contactFormUrl: source.contact_form_url,
      referralInstructions: null,
      metadata: {},
      contactability: source.contactability,
      confidenceScore: source.confidence_score,
      contactabilityScore: source.contactability_score,
      priorityScore: source.priority_score,
    };
  }

  const visited = new Set<string>();
  const pages = [website];
  const collectedEmails = new Set<string>();
  const collectedContactForms = new Set<string>();
  const snippets: string[] = [];

  while (pages.length > 0 && visited.size < 4) {
    const pageUrl = pages.shift();
    if (!pageUrl || visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    const html = await fetchWebsiteHtml(pageUrl);
    if (!html) continue;

    for (const email of extractEmailsFromHtml(html)) {
      collectedEmails.add(email);
    }
    for (const formUrl of extractContactFormUrls(html, pageUrl)) {
      collectedContactForms.add(formUrl);
      if (!visited.has(formUrl) && pages.length < 4) {
        pages.push(formUrl);
      }
    }

    const snippet = extractReferralInstructions(html);
    if (snippet) {
      snippets.push(snippet);
    }
  }

  const publicEmail = source.public_email || Array.from(collectedEmails)[0] || null;
  const contactFormUrl = source.contact_form_url || Array.from(collectedContactForms)[0] || null;
  const contactability = getContactability({
    publicEmail,
    contactFormUrl,
    phone: source.phone,
    verified: Boolean(publicEmail),
  });
  const scores = scoreSource({
    distanceMiles: source.distance_miles,
    hasEmail: Boolean(publicEmail),
    hasContactForm: Boolean(contactFormUrl),
    hasPhone: Boolean(source.phone),
    rating: source.google_rating,
  });

  return {
    publicEmail,
    contactFormUrl,
    referralInstructions: snippets[0] || null,
    metadata: {
      enrichmentVisited: Array.from(visited),
      discoveredEmails: Array.from(collectedEmails),
      discoveredContactForms: Array.from(collectedContactForms),
    },
    contactability,
    confidenceScore: scores.confidence,
    contactabilityScore: scores.contactability,
    priorityScore: scores.priority,
  };
}

function getSourceMergeValues(source: ReferralSourceDetail, agency: AgencyReferralContext) {
  const cityState = [source.city, source.state].filter(Boolean).join(", ");
  const contact = source.contacts.find((item) => item.is_primary) || source.contacts[0];

  return {
    agency_name: agency.branding.agencyName || "",
    agency_email: agency.branding.contactEmail || "",
    agency_phone: agency.branding.phone || "",
    agency_website: agency.branding.website || "",
    agency_city_state: cityState || "",
    brochure_link: agency.brochureLink,
    source_name: source.name,
    source_category: source.category.replace(/_/g, " "),
    contact_name: contact?.name || source.name,
    source_city_state: cityState,
  };
}

async function getReferralRecipient(sourceId: string, contactId?: string | null) {
  const detailResult = await getReferralSourceDetail(sourceId);
  if (!detailResult.success || !detailResult.data) {
    throw new Error(detailResult.success ? "Source not found" : detailResult.error);
  }

  const detail = detailResult.data;
  const selectedContact =
    detail.contacts.find((contact) => contact.id === contactId) ||
    detail.contacts.find((contact) => contact.is_primary && contact.email) ||
    detail.contacts.find((contact) => contact.email);

  const recipientEmail = selectedContact?.email || detail.public_email;
  const recipientName = selectedContact?.name || detail.name;

  if (!recipientEmail) {
    throw new Error("No public email found for this referral source");
  }

  return {
    detail,
    recipientEmail,
    recipientName,
    contactId: selectedContact?.id || null,
  };
}

async function sendReferralEmailInternal(params: {
  sourceId: string;
  campaignId?: string | null;
  templateId?: string | null;
  contactId?: string | null;
  subject: string;
  body: string;
}) {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) {
    return { success: false, error: ctxResult.error } as ActionResult<{ touchpointId: string }>;
  }
  const ctx = ctxResult.data;

  if (!params.subject.trim() || !params.body.trim()) {
    return { success: false, error: "Subject and body are required" } as ActionResult<{ touchpointId: string }>;
  }

  try {
    const recipient = await getReferralRecipient(params.sourceId, params.contactId);

    if (recipient.detail.do_not_contact) {
      return { success: false, error: "This referral source is marked do not contact" };
    }

    const agency = await getAgencyReferralContext(ctx.profileId);
    const mergedValues = getSourceMergeValues(recipient.detail, agency);
    const resolvedSubject = renderTemplate(params.subject, mergedValues).trim();
    const resolvedBody = renderTemplate(params.body, mergedValues).trim();
    const html = agencyEmailWrapper(plainTextToHtml(resolvedBody), agency.branding);

    let sendSuccess = false;
    let sendError: string | undefined;

    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        sendSuccess = true;
      } else {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
          from: `${agency.branding.agencyName} <${getFromEmail("goodaba")}>`,
          to: [recipient.recipientEmail],
          replyTo: agency.branding.contactEmail || undefined,
          subject: resolvedSubject,
          html,
        });
        if (error) {
          sendError = error.message;
        } else {
          sendSuccess = true;
        }
      }
    } catch (error) {
      sendError = error instanceof Error ? error.message : "Failed to send email";
    }

    const { data: touchpoint, error: touchpointError } = await ctx.supabase
      .from("referral_touchpoints")
      .insert({
        source_id: params.sourceId,
        contact_id: recipient.contactId,
        profile_id: ctx.profileId,
        campaign_id: params.campaignId || null,
        template_id: params.templateId || null,
        created_by_user_id: ctx.user.id,
        touchpoint_type: "email",
        outcome: sendSuccess ? "sent" : "failed",
        subject: resolvedSubject,
        body: resolvedBody,
        recipient_email: recipient.recipientEmail,
        recipient_name: recipient.recipientName,
        touched_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (touchpointError || !touchpoint) {
      return { success: false, error: "Failed to log outreach" };
    }

    await ctx.supabase
      .from("referral_sources")
      .update({
        stage: sendSuccess ? "contacted" : recipient.detail.stage,
        last_contacted_at: new Date().toISOString(),
        next_follow_up_at: recipient.detail.next_follow_up_at || new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .eq("id", params.sourceId)
      .eq("profile_id", ctx.profileId);

    revalidatePath("/dashboard/referrals");
    revalidatePath("/dashboard/referrals/sources");
    revalidatePath(`/dashboard/referrals/sources/${params.sourceId}`);
    revalidatePath("/dashboard/referrals/campaigns");

    if (!sendSuccess) {
      return { success: false, error: sendError || "Failed to send email" };
    }

    return { success: true, data: { touchpointId: touchpoint.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send referral email",
    };
  }
}

export async function getReferralOverview(): Promise<ActionResult<ReferralOverview>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const [
    sourceCountsResult,
    taskCountResult,
    recentTouchpointsResult,
    topSourcesResult,
    importJobsResult,
  ] = await Promise.all([
    ctx.supabase
      .from("referral_sources")
      .select("stage, contactability", { count: "exact" })
      .eq("profile_id", ctx.profileId)
      .is("archived_at", null),
    ctx.supabase
      .from("referral_tasks")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", ctx.profileId)
      .in("status", ["pending", "in_progress"])
      .is("archived_at", null),
    ctx.supabase
      .from("referral_touchpoints")
      .select("*")
      .eq("profile_id", ctx.profileId)
      .order("touched_at", { ascending: false })
      .limit(8),
    ctx.supabase
      .from("referral_sources")
      .select("*")
      .eq("profile_id", ctx.profileId)
      .is("archived_at", null)
      .order("priority_score", { ascending: false })
      .limit(8),
    ctx.supabase
      .from("referral_import_jobs")
      .select("*")
      .eq("profile_id", ctx.profileId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rows = (sourceCountsResult.data || []) as Array<{ stage: string; contactability: string }>;
  const readyToContact = rows.filter((row) => row.stage === "ready_to_contact").length;
  const activeReferrers = rows.filter((row) => row.stage === "active_referrer").length;
  const verifiedEmails = rows.filter((row) => row.contactability === "email_verified").length;

  return {
    success: true,
    data: {
      totalSources: sourceCountsResult.count || 0,
      readyToContact,
      activeReferrers,
      dueTasks: taskCountResult.count || 0,
      verifiedEmails,
      recentTouchpoints: (recentTouchpointsResult.data || []) as ReferralTouchpoint[],
      topSources: (topSourcesResult.data || []) as ReferralSourceListItem[],
      importJobs: (importJobsResult.data || []) as ReferralImportJob[],
    },
  };
}

export async function listReferralSources(filters?: {
  search?: string;
  stage?: string;
  category?: string;
  locationId?: string;
  onlyReachable?: boolean;
  onlyReady?: boolean;
}, page: number = 1, pageSize: number = 50): Promise<ActionResult<{ sources: ReferralSourceListItem[]; total: number }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  let query = ctx.supabase
    .from("referral_sources")
    .select("*", { count: "exact" })
    .eq("profile_id", ctx.profileId)
    .is("archived_at", null)
    .order("priority_score", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`name.ilike.${term},city.ilike.${term},state.ilike.${term}`);
  }
  if (filters?.stage) query = query.eq("stage", filters.stage);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.locationId) query = query.eq("location_id", filters.locationId);
  if (filters?.onlyReady) query = query.in("stage", ["ready_to_contact", "qualified", "contacted"]);
  if (filters?.onlyReachable) {
    query = query.or("public_email.not.is.null,contact_form_url.not.is.null,phone.not.is.null");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { success: false, error: "Failed to load referral sources" };
  }

  return {
    success: true,
    data: {
      sources: ((data || []) as ReferralSourceListItem[]),
      total: count || 0,
    },
  };
}

export async function getReferralSourceDetail(sourceId: string): Promise<ActionResult<ReferralSourceDetail>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const { data: source, error } = await ctx.supabase
    .from("referral_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("profile_id", ctx.profileId)
    .single();

  if (error || !source) {
    return { success: false, error: "Referral source not found" };
  }

  const [contacts, notes, tasks, touchpoints] = await Promise.all([
    ctx.supabase
      .from("referral_contacts")
      .select("*")
      .eq("source_id", sourceId)
      .is("archived_at", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    ctx.supabase
      .from("referral_notes")
      .select("*")
      .eq("source_id", sourceId)
      .eq("profile_id", ctx.profileId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("referral_tasks")
      .select("*")
      .eq("source_id", sourceId)
      .eq("profile_id", ctx.profileId)
      .is("archived_at", null)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true }),
    ctx.supabase
      .from("referral_touchpoints")
      .select("*")
      .eq("source_id", sourceId)
      .eq("profile_id", ctx.profileId)
      .order("touched_at", { ascending: false }),
  ]);

  return {
    success: true,
    data: {
      ...(source as ReferralSourceListItem),
      street: source.street,
      postal_code: source.postal_code,
      fax: source.fax,
      referral_instructions: source.referral_instructions,
      accepted_insurances: (source.accepted_insurances as string[]) || [],
      metadata: (source.metadata as Record<string, unknown>) || {},
      contacts: (contacts.data || []) as ReferralContact[],
      notes: (notes.data || []) as ReferralNote[],
      tasks: (tasks.data || []) as ReferralTask[],
      touchpoints: (touchpoints.data || []) as ReferralTouchpoint[],
    },
  };
}

export async function saveReferralSource(input: ReferralSourceInput, sourceId?: string): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid referral source data" };
  }

  const data = parsed.data;
  const scores = scoreSource({
    distanceMiles: data.distanceMiles,
    hasEmail: Boolean(normalizeOptionalString(data.publicEmail)),
    hasContactForm: Boolean(normalizeUrl(data.contactFormUrl)),
    hasPhone: Boolean(normalizeOptionalString(data.phone)),
    rating: data.googleRating,
  });

  const payload = {
    profile_id: ctx.profileId,
    location_id: data.locationId || null,
    google_place_id: data.googlePlaceId || null,
    name: data.name.trim(),
    category: data.category,
    stage: data.stage,
    contactability: getContactability({
      publicEmail: data.publicEmail,
      contactFormUrl: data.contactFormUrl,
      phone: data.phone,
      verified: data.contactability === "email_verified",
    }),
    relationship_health: data.relationshipHealth,
    phone: normalizeOptionalString(data.phone),
    website: normalizeUrl(data.website),
    public_email: normalizeOptionalString(data.publicEmail),
    contact_form_url: normalizeUrl(data.contactFormUrl),
    fax: normalizeOptionalString(data.fax),
    street: normalizeOptionalString(data.street),
    city: normalizeOptionalString(data.city),
    state: normalizeOptionalString(data.state),
    postal_code: normalizeOptionalString(data.postalCode),
    distance_miles: data.distanceMiles ?? null,
    google_rating: data.googleRating ?? null,
    google_rating_count: data.googleRatingCount ?? null,
    notes_summary: normalizeOptionalString(data.notesSummary),
    referral_instructions: normalizeOptionalString(data.referralInstructions),
    accepted_insurances: data.acceptedInsurances || [],
    do_not_contact: data.doNotContact || false,
    next_follow_up_at: data.nextFollowUpAt || null,
    fit_score: scores.fit,
    contactability_score: scores.contactability,
    confidence_score: scores.confidence,
    priority_score: scores.priority,
  };

  const result = sourceId
    ? await ctx.supabase
        .from("referral_sources")
        .update(payload)
        .eq("id", sourceId)
        .eq("profile_id", ctx.profileId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("referral_sources")
        .insert(payload)
        .select("id")
        .single();

  if (result.error || !result.data) {
    return { success: false, error: sourceId ? "Failed to update referral source" : "Failed to create referral source" };
  }

  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/sources");
  revalidatePath(`/dashboard/referrals/sources/${result.data.id}`);
  return { success: true, data: { id: result.data.id } };
}

export async function updateReferralSourceStage(sourceId: string, stage: ReferralSourceStage): Promise<ActionResult> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const { error } = await ctx.supabase
    .from("referral_sources")
    .update({
      stage,
      do_not_contact: stage === "do_not_contact",
    })
    .eq("id", sourceId)
    .eq("profile_id", ctx.profileId);

  if (error) return { success: false, error: "Failed to update stage" };

  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/sources");
  revalidatePath(`/dashboard/referrals/sources/${sourceId}`);
  return { success: true };
}

export async function saveReferralContact(input: ReferralContactInput, contactId?: string): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralContactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid contact data" };
  const data = parsed.data;

  if (data.isPrimary) {
    await ctx.supabase
      .from("referral_contacts")
      .update({ is_primary: false })
      .eq("source_id", data.sourceId);
  }

  const payload = {
    source_id: data.sourceId,
    name: data.name.trim(),
    role: data.role,
    title: normalizeOptionalString(data.title),
    email: normalizeOptionalString(data.email),
    phone: normalizeOptionalString(data.phone),
    preferred_contact_method: data.preferredContactMethod || null,
    notes: normalizeOptionalString(data.notes),
    is_primary: data.isPrimary,
    verification_status: data.email ? "verified_public" : "unverified",
  };

  const result = contactId
    ? await ctx.supabase
        .from("referral_contacts")
        .update(payload)
        .eq("id", contactId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("referral_contacts")
        .insert(payload)
        .select("id")
        .single();

  if (result.error || !result.data) return { success: false, error: "Failed to save contact" };

  revalidatePath(`/dashboard/referrals/sources/${data.sourceId}`);
  return { success: true, data: { id: result.data.id } };
}

export async function addReferralNote(input: ReferralNoteInput): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid note" };

  const { data, error } = await ctx.supabase
    .from("referral_notes")
    .insert({
      source_id: parsed.data.sourceId,
      profile_id: ctx.profileId,
      author_user_id: ctx.user.id,
      note: parsed.data.note.trim(),
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Failed to save note" };

  await ctx.supabase.from("referral_touchpoints").insert({
    source_id: parsed.data.sourceId,
    profile_id: ctx.profileId,
    created_by_user_id: ctx.user.id,
    touchpoint_type: "note",
    outcome: "completed",
    body: parsed.data.note.trim(),
  });

  revalidatePath(`/dashboard/referrals/sources/${parsed.data.sourceId}`);
  return { success: true, data: { id: data.id } };
}

export async function saveReferralTask(input: ReferralTaskInput, taskId?: string): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid task data" };

  const payload = {
    source_id: parsed.data.sourceId,
    profile_id: ctx.profileId,
    assigned_to_membership_id: ctx.membership?.id.startsWith("synthetic-owner-") ? null : ctx.membership?.id || null,
    title: parsed.data.title.trim(),
    content: normalizeOptionalString(parsed.data.content),
    status: parsed.data.status,
    due_date: parsed.data.dueDate || null,
    reminder_at: parsed.data.reminderAt || null,
    completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    created_by_user_id: ctx.user.id,
  };

  const result = taskId
    ? await ctx.supabase
        .from("referral_tasks")
        .update(payload)
        .eq("id", taskId)
        .eq("profile_id", ctx.profileId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("referral_tasks")
        .insert(payload)
        .select("id")
        .single();

  if (result.error || !result.data) return { success: false, error: "Failed to save task" };

  if (!taskId) {
    await ctx.supabase.from("referral_touchpoints").insert({
      source_id: parsed.data.sourceId,
      profile_id: ctx.profileId,
      created_by_user_id: ctx.user.id,
      touchpoint_type: "task",
      outcome: "queued",
      body: parsed.data.title.trim(),
    });
  }

  revalidatePath("/dashboard/referrals");
  revalidatePath(`/dashboard/referrals/sources/${parsed.data.sourceId}`);
  return { success: true, data: { id: result.data.id } };
}

export async function updateReferralTaskStatus(taskId: string, status: "pending" | "in_progress" | "completed"): Promise<ActionResult> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const { data: task } = await ctx.supabase
    .from("referral_tasks")
    .select("source_id")
    .eq("id", taskId)
    .eq("profile_id", ctx.profileId)
    .single();

  const { error } = await ctx.supabase
    .from("referral_tasks")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("profile_id", ctx.profileId);

  if (error) return { success: false, error: "Failed to update task" };

  revalidatePath("/dashboard/referrals");
  if (task?.source_id) {
    revalidatePath(`/dashboard/referrals/sources/${task.source_id}`);
  }
  return { success: true };
}

export async function logReferralTouchpoint(input: ReferralTouchpointInput): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralTouchpointSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid touchpoint data" };

  const { data, error } = await ctx.supabase
    .from("referral_touchpoints")
    .insert({
      source_id: parsed.data.sourceId,
      contact_id: parsed.data.contactId || null,
      profile_id: ctx.profileId,
      created_by_user_id: ctx.user.id,
      touchpoint_type: parsed.data.touchpointType,
      outcome: parsed.data.outcome,
      subject: normalizeOptionalString(parsed.data.subject),
      body: normalizeOptionalString(parsed.data.body),
      recipient_email: normalizeOptionalString(parsed.data.recipientEmail),
      recipient_name: normalizeOptionalString(parsed.data.recipientName),
      touched_at: parsed.data.touchedAt || new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Failed to save touchpoint" };

  const sourceUpdate: { last_contacted_at: string; stage?: string } = {
    last_contacted_at: new Date().toISOString(),
  };
  if (["email", "call", "voicemail", "contact_form", "fax", "in_person"].includes(parsed.data.touchpointType)) {
    sourceUpdate.stage = "contacted";
  }

  await ctx.supabase
    .from("referral_sources")
    .update(sourceUpdate)
    .eq("id", parsed.data.sourceId)
    .eq("profile_id", ctx.profileId);

  revalidatePath(`/dashboard/referrals/sources/${parsed.data.sourceId}`);
  return { success: true, data: { id: data.id } };
}

export async function getReferralTemplates(): Promise<ActionResult<ReferralTemplate[]>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  await ensureDefaultReferralTemplates(ctx.profileId);

  const { data, error } = await ctx.supabase
    .from("referral_templates")
    .select("*")
    .eq("profile_id", ctx.profileId)
    .is("archived_at", null)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return { success: false, error: "Failed to load templates" };
  return { success: true, data: (data || []) as ReferralTemplate[] };
}

export async function saveReferralTemplate(input: ReferralTemplateInput, templateId?: string): Promise<ActionResult<{ id: string }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralTemplateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid template data" };

  if (parsed.data.isDefault) {
    await ctx.supabase
      .from("referral_templates")
      .update({ is_default: false })
      .eq("profile_id", ctx.profileId);
  }

  const payload = {
    profile_id: ctx.profileId,
    name: parsed.data.name.trim(),
    template_type: parsed.data.templateType,
    subject: parsed.data.subject.trim(),
    body: parsed.data.body.trim(),
    is_default: parsed.data.isDefault,
  };

  const result = templateId
    ? await ctx.supabase
        .from("referral_templates")
        .update(payload)
        .eq("id", templateId)
        .eq("profile_id", ctx.profileId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("referral_templates")
        .insert(payload)
        .select("id")
        .single();

  if (result.error || !result.data) return { success: false, error: "Failed to save template" };

  revalidatePath("/dashboard/referrals/campaigns");
  revalidatePath("/dashboard/referrals/settings");
  revalidatePath("/dashboard/referrals/sources");
  return { success: true, data: { id: result.data.id } };
}

export async function getReferralCampaigns(): Promise<ActionResult<ReferralCampaign[]>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const { data, error } = await ctx.supabase
    .from("referral_campaigns")
    .select("*")
    .eq("profile_id", ctx.profileId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: "Failed to load campaigns" };
  return { success: true, data: (data || []) as ReferralCampaign[] };
}

export async function getReferralImportJobs(): Promise<ActionResult<ReferralImportJob[]>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const { data, error } = await ctx.supabase
    .from("referral_import_jobs")
    .select("*")
    .eq("profile_id", ctx.profileId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: "Failed to load import jobs" };
  return { success: true, data: (data || []) as ReferralImportJob[] };
}

async function upsertImportedSource(params: {
  profileId: string;
  locationId: string | null;
  importJobId: string;
  category: ReferralSourceCategory;
  name: string;
  googlePlaceId: string;
  addressFields: ReturnType<typeof extractAddressFields>;
  formattedAddress: string | null;
  phone: string | null;
  website: string | null;
  distanceMiles: number;
  rating: number | null;
  ratingCount: number | null;
}) {
  const supabase = await createClient();
  const scores = scoreSource({
    distanceMiles: params.distanceMiles,
    hasEmail: false,
    hasContactForm: false,
    hasPhone: Boolean(params.phone),
    rating: params.rating,
  });

  const payload = {
    profile_id: params.profileId,
    location_id: params.locationId,
    import_job_id: params.importJobId,
    google_place_id: params.googlePlaceId,
    external_source: "google_places",
    name: params.name,
    category: params.category,
    stage: params.phone || params.website ? "ready_to_contact" : "discovered",
    contactability: getContactability({ phone: params.phone }),
    relationship_health: "cold",
    phone: params.phone,
    website: params.website,
    street: params.addressFields.street,
    city: params.addressFields.city,
    state: params.addressFields.state,
    postal_code: params.addressFields.postalCode,
    latitude: null,
    longitude: null,
    distance_miles: Number(params.distanceMiles.toFixed(1)),
    google_rating: params.rating,
    google_rating_count: params.ratingCount,
    fit_score: scores.fit,
    contactability_score: scores.contactability,
    confidence_score: scores.confidence,
    priority_score: scores.priority,
    metadata: {
      formattedAddress: params.formattedAddress,
      importedFrom: "google_places",
    },
    last_imported_at: new Date().toISOString(),
  };

  const existing = await supabase
    .from("referral_sources")
    .select("id")
    .eq("profile_id", params.profileId)
    .eq("google_place_id", params.googlePlaceId)
    .is("archived_at", null)
    .maybeSingle();

  if (existing.data?.id) {
    const result = await supabase
      .from("referral_sources")
      .update(payload)
      .eq("id", existing.data.id)
      .select("id")
      .single();
    return { mode: "updated" as const, id: result.data?.id || existing.data.id };
  }

  const result = await supabase
    .from("referral_sources")
    .insert(payload)
    .select("id")
    .single();

  return { mode: "inserted" as const, id: result.data?.id || "" };
}

export interface EnrichResult {
  found: string[];
  stageChanged: boolean;
  newStage?: string;
}

export async function enrichReferralSource(sourceId: string): Promise<ActionResult<EnrichResult>> {
  const detailResult = await getReferralSourceDetail(sourceId);
  if (!detailResult.success || !detailResult.data) {
    return { success: false, error: detailResult.success ? "Source not found" : detailResult.error };
  }

  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const source = detailResult.data;
  const enrichment = await enrichSourceFromWebsite(source);

  const newStage = source.stage === "discovered" && (enrichment.publicEmail || enrichment.contactFormUrl || source.phone)
    ? "ready_to_contact"
    : source.stage;

  const { error } = await ctx.supabase
    .from("referral_sources")
    .update({
      public_email: enrichment.publicEmail,
      contact_form_url: enrichment.contactFormUrl,
      referral_instructions: enrichment.referralInstructions,
      metadata: {
        ...(source.metadata || {}),
        ...(enrichment.metadata || {}),
      },
      contactability: enrichment.contactability,
      confidence_score: enrichment.confidenceScore,
      contactability_score: enrichment.contactabilityScore,
      priority_score: enrichment.priorityScore,
      stage: newStage,
    })
    .eq("id", sourceId)
    .eq("profile_id", ctx.profileId);

  if (error) return { success: false, error: "Failed to enrich referral source" };

  // Build a list of what was found
  const found: string[] = [];
  if (enrichment.publicEmail && enrichment.publicEmail !== source.public_email) found.push("email");
  if (enrichment.contactFormUrl && enrichment.contactFormUrl !== source.contact_form_url) found.push("contact form");
  if (enrichment.referralInstructions && enrichment.referralInstructions !== source.referral_instructions) found.push("referral instructions");

  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/sources");
  revalidatePath(`/dashboard/referrals/sources/${sourceId}`);
  return {
    success: true,
    data: {
      found,
      stageChanged: newStage !== source.stage,
      newStage: newStage !== source.stage ? newStage : undefined,
    },
  };
}

export async function runReferralImport(input: Parameters<typeof referralImportRequestSchema["parse"]>[0]): Promise<ActionResult<{ jobIds: string[]; discovered: number }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid import request" };

  const request = parsed.data;

  const { data: listing } = await ctx.supabase
    .from("listings")
    .select("id")
    .eq("profile_id", ctx.profileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!listing?.id) return { success: false, error: "No listing found for this workspace" };

  const importCenters: Array<{
    id: string | null;
    label: string | null;
    city: string | null;
    state: string | null;
    latitude: number;
    longitude: number;
  }> = [];

  if (request.searchCenter) {
    importCenters.push({
      id: null,
      label: request.searchCenter.label,
      city: request.searchCenter.city || null,
      state: request.searchCenter.state || null,
      latitude: request.searchCenter.latitude,
      longitude: request.searchCenter.longitude,
    });
  } else if (request.searchText?.trim()) {
    const resolvedSearchCenter = await resolveGoogleSearchCenter(request.searchText.trim());
    if (!resolvedSearchCenter) {
      return { success: false, error: "Could not resolve that search area. Try a more specific city or address." };
    }

    importCenters.push(resolvedSearchCenter);
  } else {
    let locationsQuery = ctx.supabase
      .from("locations")
      .select("id, label, city, state, latitude, longitude")
      .eq("listing_id", listing.id);
    if (request.locationIds && request.locationIds.length > 0) {
      locationsQuery = locationsQuery.in("id", request.locationIds);
    }

    const { data: locations, error: locationsError } = await locationsQuery;
    if (locationsError || !locations || locations.length === 0) {
      return { success: false, error: "No locations available for referral import" };
    }

    for (const location of locations as Array<{
      id: string;
      label: string | null;
      city: string;
      state: string;
      latitude: number | null;
      longitude: number | null;
    }>) {
      if (location.latitude == null || location.longitude == null) {
        continue;
      }

      importCenters.push({
        id: location.id,
        label: location.label,
        city: location.city,
        state: location.state,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  }

  if (importCenters.length === 0) {
    return { success: false, error: "Choose a valid place or a location with saved coordinates." };
  }

  const jobIds: string[] = [];
  let discovered = 0;

  for (const location of importCenters) {
    const { data: job, error: jobError } = await ctx.supabase
      .from("referral_import_jobs")
      .insert({
        profile_id: ctx.profileId,
        location_id: location.id,
        radius_miles: request.radiusMiles,
        categories: request.categories,
        status: "running",
        started_at: new Date().toISOString(),
        created_by_user_id: ctx.user.id,
        metadata: request.searchCenter
          ? {
              searchCenterLabel: request.searchCenter.label,
              searchCenterCity: request.searchCenter.city || null,
              searchCenterState: request.searchCenter.state || null,
              latitude: request.searchCenter.latitude,
              longitude: request.searchCenter.longitude,
            }
          : {},
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return { success: false, error: "Failed to create import job" };
    }

    jobIds.push(job.id);

    let discoveredCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let enrichedCount = 0;

    try {
      const seenPlaceIds = new Set<string>();
      for (const category of request.categories.length > 0 ? request.categories : DEFAULT_IMPORT_CATEGORIES) {
        const searchTarget =
          [location.city, location.state].filter(Boolean).join(", ") ||
          location.label ||
          "United States";
        const searchQuery = `${CATEGORY_QUERY_MAP[category]} near ${searchTarget}`;
        const matches = await fetchGoogleTextSearch(
          searchQuery,
          location.latitude,
          location.longitude,
          request.radiusMiles
        );

        const importableMatches: Array<{
          match: GoogleTextSearchPlace;
          distanceMiles: number;
        }> = [];

        for (const match of matches) {
          if (!match.id || seenPlaceIds.has(match.id)) continue;
          seenPlaceIds.add(match.id);

          let distanceMiles = 999;
          if (match.location?.latitude != null && match.location?.longitude != null) {
            distanceMiles = calculateDistance(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: match.location.latitude, longitude: match.location.longitude }
            );
          }
          if (distanceMiles > request.radiusMiles) continue;

          importableMatches.push({ match, distanceMiles });
        }

        const categoryResults = await mapWithConcurrency(importableMatches, 6, async ({ match, distanceMiles }) => {
          try {
            const details = await fetchGooglePlaceDetails(match.id);
            const addressFields = extractAddressFields(details);
            const upserted = await upsertImportedSource({
              profileId: ctx.profileId,
              locationId: location.id,
              importJobId: job.id,
              category,
              name: match.displayName?.text || "Unknown Office",
              googlePlaceId: match.id,
              addressFields,
              formattedAddress: details.formattedAddress || match.formattedAddress || null,
              phone: normalizeOptionalString(details.nationalPhoneNumber),
              website: normalizeUrl(details.websiteUri),
              distanceMiles,
              rating: details.rating ?? null,
              ratingCount: details.userRatingCount ?? null,
            });

            let enriched = false;
            if (request.enrichWebsites && upserted.id) {
              const enrichResult = await enrichReferralSource(upserted.id);
              enriched = enrichResult.success;
            }

            return {
              mode: upserted.mode,
              enriched,
            };
          } catch {
            return null;
          }
        });

        for (const categoryResult of categoryResults) {
          if (!categoryResult) continue;
          discoveredCount += 1;
          discovered += 1;
          if (categoryResult.mode === "inserted") insertedCount += 1;
          if (categoryResult.mode === "updated") updatedCount += 1;
          if (categoryResult.enriched) enrichedCount += 1;
        }
      }

      await ctx.supabase
        .from("referral_import_jobs")
        .update({
          status: "completed",
          discovered_count: discoveredCount,
          inserted_count: insertedCount,
          updated_count: updatedCount,
          enriched_count: enrichedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    } catch (error) {
      await ctx.supabase
        .from("referral_import_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Import failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }

  revalidatePath("/dashboard/referrals");
  revalidatePath("/dashboard/referrals/sources");
  return { success: true, data: { jobIds, discovered } };
}

export async function sendReferralEmail(params: {
  sourceId: string;
  contactId?: string | null;
  templateId?: string | null;
  subject: string;
  body: string;
}): Promise<ActionResult<{ touchpointId: string }>> {
  const result = await sendReferralEmailInternal(params);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to send referral email" };
  }
  return { success: true, data: result.data };
}

export async function bulkSendReferralEmails(input: ReferralBulkSendInput): Promise<ActionResult<{ campaignId: string; sent: number; failed: number }>> {
  const ctxResult = await getPaidAuthedContext();
  if (!ctxResult.success) return { success: false, error: ctxResult.error };
  const ctx = ctxResult.data;

  const parsed = referralBulkSendSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid bulk send request" };

  const { data: campaign, error: campaignError } = await ctx.supabase
    .from("referral_campaigns")
    .insert({
      profile_id: ctx.profileId,
      template_id: parsed.data.templateId || null,
      name: parsed.data.campaignName.trim(),
      status: "queued",
      subject: parsed.data.subject.trim(),
      body: parsed.data.body.trim(),
      total_recipients: parsed.data.sourceIds.length,
      created_by_user_id: ctx.user.id,
      launched_at: new Date().toISOString(),
      filters: {
        sourceIds: parsed.data.sourceIds,
      },
    })
    .select("id")
    .single();

  if (campaignError || !campaign) return { success: false, error: "Failed to create campaign" };

  let sent = 0;
  let failed = 0;

  for (const sourceId of parsed.data.sourceIds) {
    const detailResult = await getReferralSourceDetail(sourceId);
    if (!detailResult.success || !detailResult.data) {
      failed += 1;
      continue;
    }

    const source = detailResult.data;
    if (source.do_not_contact || source.contactability === "no_channel_found") {
      failed += 1;
      continue;
    }

    const sendResult = await sendReferralEmailInternal({
      sourceId,
      campaignId: campaign.id,
      templateId: parsed.data.templateId || null,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });

    if (sendResult.success) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  await ctx.supabase
    .from("referral_campaigns")
    .update({
      status: failed > 0 && sent === 0 ? "failed" : "completed",
      sent_count: sent,
      failed_count: failed,
    })
    .eq("id", campaign.id)
    .eq("profile_id", ctx.profileId);

  revalidatePath("/dashboard/referrals/campaigns");
  revalidatePath("/dashboard/referrals/sources");
  return { success: true, data: { campaignId: campaign.id, sent, failed } };
}
