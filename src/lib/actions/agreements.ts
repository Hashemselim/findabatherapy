"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { env } from "@/env";
import { isConvexDataEnabled } from "@/lib/platform/config";
import { isPublicProfileVisible } from "@/lib/public-visibility";

// Dynamic Supabase imports for the else (Supabase) path
const createSupabaseClient = (...args: Parameters<typeof import("@/lib/supabase/server").createClient>) =>
  import("@/lib/supabase/server").then((m) => m.createClient(...args));
const createAdminClient = () =>
  import("@/lib/supabase/server").then((m) => m.createAdminClient());
const getUser = () =>
  import("@/lib/supabase/server").then((m) => m.getUser());
const getCurrentProfileId = () =>
  import("@/lib/supabase/server").then((m) => m.getCurrentProfileId());
import {
  AGREEMENT_PDF_MAX_SIZE,
  ALLOWED_AGREEMENT_DOCUMENT_TYPES,
  STORAGE_BUCKETS,
  generateAgreementArtifactPath,
  generateAgreementDocumentPath,
  generateDocumentPath,
  isValidAgreementDocumentSize,
  isValidAgreementDocumentType,
  verifyDocumentMagicBytes,
} from "@/lib/storage/config";
import {
  agreementPacketSchema,
  agreementPacketDocumentMetadataSchema,
  agreementSubmissionSchema,
  createAgreementLinkSchema,
  linkAgreementSubmissionSchema,
  type AgreementPacketInput,
  type AgreementPacketDocumentMetadataInput,
} from "@/lib/validations/agreements";
import { createAgreementBundlePdf } from "@/lib/pdf/agreement-bundle";
import { getRequestOrigin } from "@/lib/utils/domains";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

interface BrandingSettings {
  background_color: string;
  show_powered_by: boolean;
}

interface AgreementPacketDocumentRecord {
  id: string;
  packet_id?: string;
  packet_version_id?: string;
  label: string | null;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  sha256: string;
  sort_order: number;
  created_at?: string;
  deleted_at?: string | null;
}

export interface AgreementPacketListItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  latest_version_id: string | null;
  latest_version_number: number | null;
  latest_published_at: string | null;
  documents: AgreementPacketDocumentRecord[];
  versions: Array<{
    id: string;
    version_number: number;
    published_at: string;
  }>;
}

export interface AgreementSubmissionListItem {
  id: string;
  packet_id: string;
  packet_title: string;
  packet_version_number: number;
  client_id: string | null;
  client_name: string;
  signer_name: string;
  submitted_at: string;
  link_type: "generic" | "assigned";
  status: "linked" | "unlinked";
  signed_pdf_path: string;
  linked_client_label: string | null;
}

interface AgreementLinkRow {
  id: string;
  client_id: string | null;
  link_type: "generic" | "assigned";
  packet_version_id: string;
  reusable: boolean;
  used_at?: string | null;
  expires_at?: string | null;
}

export interface AgreementDashboardData {
  listing: {
    slug: string | null;
    logoUrl: string | null;
    profileId: string;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: BrandingSettings;
  };
  packets: AgreementPacketListItem[];
  submissions: AgreementSubmissionListItem[];
  clients: { id: string; name: string }[];
}

export interface AgreementPacketOption {
  id: string;
  title: string;
  slug: string;
  latestVersionId: string;
  latestVersionNumber: number;
}

export interface AgreementPublicPageData {
  listing: {
    slug: string;
    logoUrl: string | null;
    profileId: string;
  };
  profile: {
    agencyName: string;
    website: string | null;
    intakeFormSettings: BrandingSettings;
    planTier: string;
    subscriptionStatus: string | null;
  };
  packet: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    versionId: string;
    versionNumber: number;
    documents: Array<{
      id: string;
      label: string | null;
      description: string | null;
      fileName: string;
      previewUrl: string;
      sha256: string;
    }>;
  };
  link: {
    token: string | null;
    type: "generic" | "assigned";
    clientNamePrefill: string;
  };
}

function buildPublicAgreementPath(providerSlug: string, packetSlug: string) {
  return `/agreements/${providerSlug}/${packetSlug}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureAgreementPacketSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  profileId: string,
  title: string,
  packetId?: string
) {
  const base = slugify(title) || "agreement-packet";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const query = supabase
      .from("agreement_packets")
      .select("id")
      .eq("profile_id", profileId)
      .eq("slug", candidate)
      .is("deleted_at", null)
      .maybeSingle();

    const { data } = await query;
    if (!data || data.id === packetId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function createAgreementToken() {
  return randomBytes(24).toString("base64url");
}

function sha256Hex(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return createHash("sha256").update(bytes).digest("hex");
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64] = dataUrl.split(",", 2);
  return Uint8Array.from(Buffer.from(base64 || "", "base64"));
}

function getClientDisplayName(client: {
  child_first_name?: string | null;
  child_last_name?: string | null;
}) {
  return [client.child_first_name, client.child_last_name].filter(Boolean).join(" ").trim();
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

async function verifyTurnstileToken(token: string) {
  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  const verifyResult = await verifyResponse.json();
  return Boolean(verifyResult.success);
}

async function attachSignedAgreementToClient(params: {
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>;
  submissionId: string;
  profileId: string;
  clientId: string;
  packetTitle: string;
  signerName: string;
  pdfBytes: Uint8Array;
}) {
  const { adminSupabase, submissionId, profileId, clientId, packetTitle, signerName, pdfBytes } = params;
  const fileName = `${packetTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "agreement"}-signed.pdf`;
  const storagePath = generateDocumentPath(profileId, clientId, fileName);

  const { error: uploadError } = await adminSupabase.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[AGREEMENTS] Failed to attach signed agreement to client documents:", uploadError);
    return null;
  }

  const { data: clientDocument, error: docError } = await adminSupabase
    .from("client_documents")
    .insert({
      client_id: clientId,
      document_type: "legal",
      label: `${packetTitle} - Signed Agreement`,
      file_path: storagePath,
      file_name: fileName,
      file_description: `Executed agreement packet signed by ${signerName}.`,
      file_size: pdfBytes.byteLength,
      file_type: "application/pdf",
      upload_source: "dashboard",
      notes: `Generated from agreement submission ${submissionId}.`,
    })
    .select("id")
    .single();

  if (docError || !clientDocument) {
    console.error("[AGREEMENTS] Failed to create client document for signed agreement:", docError);
    return null;
  }

  return clientDocument.id as string;
}

async function getPublishedPacketVersion(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>> | Awaited<ReturnType<typeof createAdminClient>>,
  packetId: string
) {
  const { data: version } = await supabase
    .from("agreement_packet_versions")
    .select("id, version_number, title, description, profile_id, packet_id")
    .eq("packet_id", packetId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return version;
}

async function snapshotAgreementPacket(params: {
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>;
  profileId: string;
  packetId: string;
  userId?: string | null;
  allowEmptyDocuments?: boolean;
}) {
  const { adminSupabase, profileId, packetId, userId, allowEmptyDocuments = false } = params;
  const { data: packet } = await adminSupabase
    .from("agreement_packets")
    .select("id, profile_id, title, description")
    .eq("id", packetId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!packet) {
    return { success: false as const, error: "Agreement form not found." };
  }

  const { data: documents } = await adminSupabase
    .from("agreement_packet_documents")
    .select("id, label, description, file_name, file_path, file_size, file_type, sha256, sort_order")
    .eq("packet_id", packetId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if ((!documents || documents.length === 0) && !allowEmptyDocuments) {
    return { success: false as const, error: "Add at least one document before sharing this agreement form." };
  }

  const { data: latestVersion } = await adminSupabase
    .from("agreement_packet_versions")
    .select("version_number")
    .eq("packet_id", packetId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = (latestVersion?.version_number || 0) + 1;
  const { data: version, error: versionError } = await adminSupabase
    .from("agreement_packet_versions")
    .insert({
      packet_id: packetId,
      profile_id: profileId,
      version_number: nextVersionNumber,
      title: packet.title,
      description: packet.description,
      created_by: userId || null,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    console.error("[AGREEMENTS] Failed to create agreement form version:", versionError);
    return { success: false as const, error: "Failed to update the shared agreement form." };
  }

  if (documents && documents.length > 0) {
    const { error: docsError } = await adminSupabase
      .from("agreement_packet_version_documents")
      .insert(
        documents.map((document) => ({
          packet_version_id: version.id,
          label: document.label,
          description: document.description,
          file_name: document.file_name,
          file_path: document.file_path,
          file_size: document.file_size,
          file_type: document.file_type,
          sha256: document.sha256,
          sort_order: document.sort_order,
        }))
      );

    if (docsError) {
      console.error("[AGREEMENTS] Failed to snapshot agreement documents:", docsError);
      return { success: false as const, error: "Failed to update the shared agreement form." };
    }
  }

  return { success: true as const, data: { versionId: version.id } };
}

async function cleanupAgreementSubmission(params: {
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>;
  submissionId?: string | null;
  signaturePath?: string | null;
  signedPdfPath?: string | null;
}) {
  const { adminSupabase, submissionId, signaturePath, signedPdfPath } = params;

  if (submissionId) {
    await adminSupabase
      .from("agreement_submissions")
      .delete()
      .eq("id", submissionId);
  }

  const filePaths = [signaturePath, signedPdfPath].filter(Boolean) as string[];
  if (filePaths.length > 0) {
    await adminSupabase.storage
      .from(STORAGE_BUCKETS.agreements)
      .remove(filePaths);
  }
}

export async function getAgreementDashboardData(): Promise<ActionResult<AgreementDashboardData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const data = await queryConvex<AgreementDashboardData>("agreements:getAgreementPackets", {});
      return { success: true, data };
    } catch (err) {
      console.error("[AGREEMENTS] Convex getAgreementDashboardData failed:", err);
      return { success: false, error: "Failed to load agreement dashboard data" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const [{ data: listing }, { data: packets }, { data: versions }, { data: submissions }, { data: clients }] =
    await Promise.all([
      supabase
        .from("listings")
        .select(`
          slug,
          logo_url,
          profile_id,
          profiles!inner (
            agency_name,
            website,
            plan_tier,
            subscription_status,
            intake_form_settings
          )
        `)
        .eq("profile_id", profileId)
        .eq("status", "published")
        .maybeSingle(),
      supabase
        .from("agreement_packets")
        .select("id, title, description, slug, created_at, updated_at")
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("agreement_packet_versions")
        .select("id, packet_id, version_number, published_at")
        .eq("profile_id", profileId)
        .order("version_number", { ascending: false }),
      supabase
        .from("agreement_submissions")
        .select(`
          id,
          packet_id,
          client_id,
          client_name,
          signer_first_name,
          signer_last_name,
          submitted_at,
          link_type,
          signed_pdf_path,
          agreement_packets!inner ( title ),
          agreement_packet_versions!inner ( version_number ),
          clients ( child_first_name, child_last_name )
        `)
        .eq("profile_id", profileId)
        .order("submitted_at", { ascending: false })
        .limit(100),
      supabase
        .from("clients")
        .select("id, child_first_name, child_last_name")
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .order("child_first_name", { ascending: true }),
    ]);

  const packetIds = ((packets as Array<{ id: string }> | null) || []).map((packet) => packet.id);
  const { data: packetDocuments } = packetIds.length
    ? await supabase
        .from("agreement_packet_documents")
        .select("id, packet_id, label, description, file_name, file_path, file_size, file_type, sha256, sort_order, created_at, deleted_at")
        .in("packet_id", packetIds)
        .order("sort_order", { ascending: true })
    : { data: [] as AgreementPacketDocumentRecord[] };

  const defaultSettings: BrandingSettings = {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  const profile = unwrapOne(listing?.profiles as unknown as {
    agency_name: string;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: BrandingSettings | null;
  } | {
    agency_name: string;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: BrandingSettings | null;
  }[] | undefined);

  const docsByPacket = new Map<string, AgreementPacketDocumentRecord[]>();
  for (const document of (packetDocuments as AgreementPacketDocumentRecord[] | null) || []) {
    if (document.deleted_at) continue;
    const existing = docsByPacket.get(document.packet_id || "") || [];
    existing.push(document);
    docsByPacket.set(document.packet_id || "", existing);
  }

  const latestVersionByPacket = new Map<string, { id: string; version_number: number; published_at: string }>();
  const versionsByPacket = new Map<string, Array<{ id: string; version_number: number; published_at: string }>>();
  for (const version of (versions as Array<{ id: string; packet_id: string; version_number: number; published_at: string }> | null) || []) {
    if (!latestVersionByPacket.has(version.packet_id)) {
      latestVersionByPacket.set(version.packet_id, version);
    }
    const existing = versionsByPacket.get(version.packet_id) || [];
    existing.push({
      id: version.id,
      version_number: version.version_number,
      published_at: version.published_at,
    });
    versionsByPacket.set(version.packet_id, existing);
  }

  const mappedPackets: AgreementPacketListItem[] = ((packets as Array<{
    id: string;
    title: string;
    description: string | null;
    slug: string;
    created_at: string;
    updated_at: string;
  }> | null) || []).map((packet) => {
    const latestVersion = latestVersionByPacket.get(packet.id);
    return {
      ...packet,
      latest_version_id: latestVersion?.id || null,
      latest_version_number: latestVersion?.version_number || null,
      latest_published_at: latestVersion?.published_at || null,
      documents: docsByPacket.get(packet.id) || [],
      versions: versionsByPacket.get(packet.id) || [],
    };
  });

  const mappedSubmissions: AgreementSubmissionListItem[] = ((submissions as Array<{
    id: string;
    packet_id: string;
    client_id: string | null;
    client_name: string;
    signer_first_name: string;
    signer_last_name: string;
    submitted_at: string;
    link_type: "generic" | "assigned";
    signed_pdf_path: string;
    agreement_packets: { title: string };
    agreement_packet_versions: { version_number: number };
    clients: { child_first_name: string | null; child_last_name: string | null } | null;
  }> | null) || []).map((submission) => ({
    id: submission.id,
    packet_id: submission.packet_id,
    packet_title: submission.agreement_packets.title,
    packet_version_number: submission.agreement_packet_versions.version_number,
    client_id: submission.client_id,
    client_name: submission.client_name,
    signer_name: `${submission.signer_first_name} ${submission.signer_last_name}`.trim(),
    submitted_at: submission.submitted_at,
    link_type: submission.link_type,
    status: submission.client_id ? "linked" : "unlinked",
    signed_pdf_path: submission.signed_pdf_path,
    linked_client_label: submission.clients ? getClientDisplayName(submission.clients) || submission.client_name : null,
  }));

  return {
    success: true,
    data: {
      listing: {
        slug: listing?.slug ?? null,
        logoUrl: listing?.logo_url ?? null,
        profileId,
      },
      profile: {
        agencyName: profile?.agency_name || "Your Agency",
        website: profile?.website || null,
        planTier: profile?.plan_tier || "free",
        subscriptionStatus: profile?.subscription_status || null,
        intakeFormSettings: profile?.intake_form_settings
          ? { ...defaultSettings, ...profile.intake_form_settings }
          : defaultSettings,
      },
      packets: mappedPackets,
      submissions: mappedSubmissions,
      clients: ((clients as Array<{ id: string; child_first_name: string | null; child_last_name: string | null }> | null) || []).map((client) => ({
        id: client.id,
        name: getClientDisplayName(client) || "Unnamed Client",
      })),
    },
  };
}

export async function getAgreementPacketOptions(): Promise<ActionResult<AgreementPacketOption[]>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      const packets = await queryConvex<Array<{
        id: string;
        title: string;
        slug: string | null;
        status: string;
      }>>("agreements:getAgreementPackets", { status: "published" });
      const options: AgreementPacketOption[] = packets.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug || "",
        latestVersionId: p.id,
        latestVersionNumber: 1,
      }));
      return { success: true, data: options };
    } catch (err) {
      console.error("[AGREEMENTS] Convex getAgreementPacketOptions failed:", err);
      return { success: false, error: "Failed to load agreement packet options" };
    }
  }

  const profileId = await getCurrentProfileId();
  const user = await getUser();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const { data: packets } = await supabase
    .from("agreement_packets")
    .select("id, title, slug")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("title", { ascending: true });

  const options: AgreementPacketOption[] = [];
  for (const packet of (packets || []).slice(0, 1)) {
    const version = await getPublishedPacketVersion(supabase, packet.id);
    if (!version) continue;
    options.push({
      id: packet.id,
      title: packet.title,
      slug: packet.slug,
      latestVersionId: version.id,
      latestVersionNumber: version.version_number,
    });
  }

  return { success: true, data: options };
}

export async function createAgreementPacket(
  data: AgreementPacketInput
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const parsed = agreementPacketSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Invalid packet" };
      }
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const result = await mutateConvex<{ id: string }>("agreements:createAgreementPacket", {
        title: parsed.data.title,
        description: parsed.data.description || null,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true, data: { id: result.id } };
    } catch (err) {
      console.error("[AGREEMENTS] Convex createAgreementPacket failed:", err);
      return { success: false, error: "Failed to create agreement form" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = agreementPacketSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid packet" };
  }

  const supabase = await createSupabaseClient();
  const { data: existingPacket } = await supabase
    .from("agreement_packets")
    .select("id")
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPacket) {
    const updateResult = await updateAgreementPacket(existingPacket.id, parsed.data);
    if (!updateResult.success) {
      return updateResult;
    }
    return { success: true, data: { id: existingPacket.id } };
  }

  const slug = await ensureAgreementPacketSlug(supabase, profileId, parsed.data.title);
  const { data: packet, error } = await supabase
    .from("agreement_packets")
    .insert({
      profile_id: profileId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      slug,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !packet) {
    console.error("[AGREEMENTS] Failed to create packet:", error);
    return { success: false, error: "Failed to create agreement form" };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true, data: { id: packet.id } };
}

export async function updateAgreementPacket(
  packetId: string,
  data: AgreementPacketInput
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const parsed = agreementPacketSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Invalid packet" };
      }
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("agreements:updateAgreementPacket", {
        packetId,
        title: parsed.data.title,
        description: parsed.data.description || null,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true };
    } catch (err) {
      console.error("[AGREEMENTS] Convex updateAgreementPacket failed:", err);
      return { success: false, error: "Failed to update agreement form" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = agreementPacketSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid packet" };
  }

  const supabase = await createSupabaseClient();
  const slug = await ensureAgreementPacketSlug(supabase, profileId, parsed.data.title, packetId);

  const { error } = await supabase
    .from("agreement_packets")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      slug,
    })
    .eq("id", packetId)
    .eq("profile_id", profileId)
    .is("deleted_at", null);

  if (error) {
    console.error("[AGREEMENTS] Failed to update packet:", error);
    return { success: false, error: "Failed to update agreement form" };
  }

  const adminSupabase = await createAdminClient();
  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId,
    userId: user.id,
  });

  if (!syncResult.success && syncResult.error !== "Add at least one document before sharing this agreement form.") {
    return { success: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true };
}

export async function uploadAgreementPacketDocument(
  packetId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const file = formData.get("file") as File | null;
      if (!file) {
        return { success: false, error: "Please choose a PDF file" };
      }
      if (!isValidAgreementDocumentType(file.type)) {
        return { success: false, error: `Only PDF files are supported (${ALLOWED_AGREEMENT_DOCUMENT_TYPES.join(", ")})` };
      }
      if (!isValidAgreementDocumentSize(file.size)) {
        return { success: false, error: `PDF files must be smaller than ${Math.round(AGREEMENT_PDF_MAX_SIZE / 1024 / 1024)}MB.` };
      }
      const arrayBuffer = await file.arrayBuffer();
      if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
        return { success: false, error: "The uploaded PDF appears to be invalid." };
      }
      const metadata = agreementPacketDocumentMetadataSchema.safeParse({
        label: (formData.get("label") as string | null) || "",
        description: (formData.get("description") as string | null) || "",
      });
      if (!metadata.success) {
        return { success: false, error: metadata.error.issues[0]?.message || "Invalid document details" };
      }

      const { uploadFileToConvexStorage, mutateConvex } = await import("@/lib/platform/convex/server");
      const storageId = await uploadFileToConvexStorage(new Blob([arrayBuffer], { type: file.type }));
      // Register the file in the files table
      const fileRecord = await mutateConvex<{ fileId: string }>("files:createFileRecord", {
        storageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });
      const result = await mutateConvex<{ id: string }>("agreements:addAgreementDocument", {
        packetId,
        title: metadata.data.label || file.name,
        fileId: fileRecord.fileId,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true, data: { id: result.id } };
    } catch (err) {
      console.error("[AGREEMENTS] Convex uploadAgreementPacketDocument failed:", err);
      return { success: false, error: "Failed to upload document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  if (!z.string().uuid().safeParse(packetId).success) {
    return { success: false, error: "Invalid packet id" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "Please choose a PDF file" };
  }

  if (!isValidAgreementDocumentType(file.type)) {
    return { success: false, error: `Only PDF files are supported (${ALLOWED_AGREEMENT_DOCUMENT_TYPES.join(", ")})` };
  }

  if (!isValidAgreementDocumentSize(file.size)) {
    return { success: false, error: `PDF files must be smaller than ${Math.round(AGREEMENT_PDF_MAX_SIZE / 1024 / 1024)}MB.` };
  }

  const arrayBuffer = await file.arrayBuffer();
  if (!verifyDocumentMagicBytes(arrayBuffer, file.type)) {
    return { success: false, error: "The uploaded PDF appears to be invalid." };
  }

  const metadata = agreementPacketDocumentMetadataSchema.safeParse({
    label: (formData.get("label") as string | null) || "",
    description: (formData.get("description") as string | null) || "",
  });
  if (!metadata.success) {
    return { success: false, error: metadata.error.issues[0]?.message || "Invalid document details" };
  }

  const supabase = await createSupabaseClient();
  const { data: packet } = await supabase
    .from("agreement_packets")
    .select("id")
    .eq("id", packetId)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!packet) {
    return { success: false, error: "Agreement form not found" };
  }

  const { count } = await supabase
    .from("agreement_packet_documents")
    .select("id", { count: "exact", head: true })
    .eq("packet_id", packetId)
    .is("deleted_at", null);

  const storagePath = generateAgreementDocumentPath(profileId, packetId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[AGREEMENTS] Failed to upload source PDF:", uploadError);
    return { success: false, error: "Failed to upload PDF" };
  }

  const { data: document, error: insertError } = await supabase
    .from("agreement_packet_documents")
    .insert({
      packet_id: packetId,
      label: metadata.data.label,
      description: metadata.data.description || null,
      file_name: file.name,
      file_path: storagePath,
      file_size: file.size,
      file_type: file.type,
      sha256: sha256Hex(arrayBuffer),
      sort_order: count || 0,
    })
    .select("id")
    .single();

  if (insertError || !document) {
    console.error("[AGREEMENTS] Failed to save packet document:", insertError);
    await supabase.storage.from(STORAGE_BUCKETS.agreements).remove([storagePath]);
    return { success: false, error: "Failed to save PDF" };
  }

  const adminSupabase = await createAdminClient();
  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId,
    userId: user.id,
  });

  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true, data: { id: document.id } };
}

export async function updateAgreementPacketDocument(
  documentId: string,
  data: AgreementPacketDocumentMetadataInput
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const parsed = agreementPacketDocumentMetadataSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Invalid document" };
      }
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("agreements:updateAgreementDocument", {
        artifactId: documentId,
        title: parsed.data.label,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true };
    } catch (err) {
      console.error("[AGREEMENTS] Convex updateAgreementPacketDocument failed:", err);
      return { success: false, error: "Failed to update document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = agreementPacketDocumentMetadataSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid document" };
  }

  const supabase = await createSupabaseClient();
  const { data: document } = await supabase
    .from("agreement_packet_documents")
    .select("id, packet_id, agreement_packets!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  const documentPacket = unwrapOne(document?.agreement_packets as unknown as { profile_id: string } | { profile_id: string }[] | undefined);
  if (!document || documentPacket?.profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  const { error } = await supabase
    .from("agreement_packet_documents")
    .update({
      label: parsed.data.label,
      description: parsed.data.description || null,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[AGREEMENTS] Failed to update agreement document:", error);
    return { success: false, error: "Failed to update document" };
  }

  const adminSupabase = await createAdminClient();
  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId: document.packet_id,
    userId: user.id,
  });

  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true };
}

export async function deleteAgreementPacketDocument(documentId: string): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("agreements:deleteAgreementDocument", {
        artifactId: documentId,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true };
    } catch (err) {
      console.error("[AGREEMENTS] Convex deleteAgreementPacketDocument failed:", err);
      return { success: false, error: "Failed to remove document" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const { data: document } = await supabase
    .from("agreement_packet_documents")
    .select("id, packet_id, file_path, agreement_packets!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  const documentPacket = unwrapOne(document?.agreement_packets as unknown as { profile_id: string } | { profile_id: string }[] | undefined);
  if (!document || documentPacket?.profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  const { error } = await supabase
    .from("agreement_packet_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    console.error("[AGREEMENTS] Failed to delete packet document:", error);
    return { success: false, error: "Failed to remove document" };
  }

  const { data: versionReference } = await supabase
    .from("agreement_packet_version_documents")
    .select("id")
    .eq("file_path", document.file_path)
    .limit(1)
    .maybeSingle();

  if (!versionReference) {
    await supabase.storage.from(STORAGE_BUCKETS.agreements).remove([document.file_path]);
  }

  const { count } = await supabase
    .from("agreement_packet_documents")
    .select("id", { count: "exact", head: true })
    .eq("packet_id", document.packet_id)
    .is("deleted_at", null);

  if ((count || 0) > 0) {
    const adminSupabase = await createAdminClient();
    const syncResult = await snapshotAgreementPacket({
      adminSupabase,
      profileId,
      packetId: document.packet_id,
      userId: user.id,
    });

    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
  } else {
    const adminSupabase = await createAdminClient();
    const syncResult = await snapshotAgreementPacket({
      adminSupabase,
      profileId,
      packetId: document.packet_id,
      userId: user.id,
      allowEmptyDocuments: true,
    });

    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true };
}

export async function moveAgreementPacketDocument(
  documentId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("agreements:moveAgreementPacketDocument", {
        documentId,
        direction,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true };
    } catch (err) {
      console.error("[AGREEMENTS] Convex moveAgreementPacketDocument failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to reorder document",
      };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const { data: document } = await supabase
    .from("agreement_packet_documents")
    .select("id, packet_id, sort_order, agreement_packets!inner(profile_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  const sortablePacket = unwrapOne(document?.agreement_packets as unknown as { profile_id: string } | { profile_id: string }[] | undefined);
  if (!document || sortablePacket?.profile_id !== profileId) {
    return { success: false, error: "Document not found" };
  }

  const { data: siblings } = await supabase
    .from("agreement_packet_documents")
    .select("id, sort_order")
    .eq("packet_id", document.packet_id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const ordered = siblings || [];
  const currentIndex = ordered.findIndex((item) => item.id === documentId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
    return { success: true };
  }

  const target = ordered[targetIndex];
  await supabase
    .from("agreement_packet_documents")
    .update({ sort_order: target.sort_order })
    .eq("id", documentId);
  await supabase
    .from("agreement_packet_documents")
    .update({ sort_order: document.sort_order })
    .eq("id", target.id);

  const adminSupabase = await createAdminClient();
  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId: document.packet_id,
    userId: user.id,
  });

  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true };
}

export async function publishAgreementPacket(packetId: string): Promise<ActionResult<{ versionId: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex<{ success: boolean; slug?: string }>("agreements:publishAgreementPacket", {
        packetId,
      });
      revalidatePath("/dashboard/forms/agreements");
      return { success: true, data: { versionId: packetId } };
    } catch (err) {
      console.error("[AGREEMENTS] Convex publishAgreementPacket failed:", err);
      return { success: false, error: "Failed to publish agreement form" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const adminSupabase = await createAdminClient();
  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId,
    userId: user.id,
  });

  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  revalidatePath("/dashboard/forms/agreements");
  return { success: true, data: syncResult.data };
}

export async function createAgreementLink(
  data: { packet_id: string; client_id?: string }
): Promise<ActionResult<{ url: string; token: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      const token = createAgreementToken();
      const result = await mutateConvex<{
        token: string;
        packetSlug: string;
        providerSlug: string;
      }>("agreements:createAgreementLink", {
        packetId: data.packet_id,
        clientId: data.client_id ?? null,
        token,
      });
      const requestHeaders = await headers();
      const origin = getRequestOrigin(requestHeaders);
      return {
        success: true,
        data: {
          token: result.token,
          url: `${origin}${buildPublicAgreementPath(result.providerSlug, result.packetSlug)}?token=${result.token}`,
        },
      };
    } catch (err) {
      console.error("[AGREEMENTS] Convex createAgreementLink failed:", err);
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create agreement link",
      };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createAgreementLinkSchema.safeParse({
    ...data,
    link_type: data.client_id ? "assigned" : "generic",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid link request" };
  }

  const adminSupabase = await createAdminClient();
  const { data: packet } = await adminSupabase
    .from("agreement_packets")
    .select("id, slug, title")
    .eq("id", parsed.data.packet_id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!packet) {
    return { success: false, error: "Agreement form not found" };
  }

  const syncResult = await snapshotAgreementPacket({
    adminSupabase,
    profileId,
    packetId: packet.id,
    userId: user.id,
  });
  if (!syncResult.success || !syncResult.data) {
    return { success: false, error: syncResult.error };
  }

  let clientId: string | null = null;
  if (parsed.data.client_id) {
    const { data: client } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("id", parsed.data.client_id)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .single();

    if (!client) {
      return { success: false, error: "Client not found" };
    }
    clientId = client.id;
  }

  const { data: listing } = await adminSupabase
    .from("listings")
    .select("slug")
    .eq("profile_id", profileId)
    .eq("status", "published")
    .maybeSingle();

  if (!listing?.slug) {
    return { success: false, error: "A published listing is required before sharing your agreement form." };
  }

  const token = createAgreementToken();
  const linkType = clientId ? "assigned" : "generic";
  const expiresAt = clientId
    ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    : null;

  const { error } = await adminSupabase.from("agreement_links").insert({
    profile_id: profileId,
    packet_id: packet.id,
    packet_version_id: syncResult.data.versionId,
    client_id: clientId,
    token,
    link_type: linkType,
    reusable: !clientId,
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) {
    console.error("[AGREEMENTS] Failed to create share link:", error);
    return { success: false, error: "Failed to create agreement link" };
  }

  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders);
  const url = `${origin}${buildPublicAgreementPath(listing.slug, packet.slug)}?token=${token}`;
  return { success: true, data: { url, token } };
}

export async function getAgreementPacketPublicPageData(
  providerSlug: string,
  packetSlug: string,
  token?: string
): Promise<ActionResult<AgreementPublicPageData>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const result = await queryConvexUnauthenticated<{
        listing: {
          slug: string;
          logoUrl: string | null;
          profileId: string;
        };
        profile: {
          agencyName: string;
          website: string | null;
          intakeFormSettings: BrandingSettings;
          planTier: string;
          subscriptionStatus: string | null;
        };
        packet: {
          id: string;
          slug: string | null;
          title: string;
          description: string | null;
          documents: Array<unknown>;
          settings: Record<string, unknown>;
        };
        documents: Array<{
          id: string;
          payload: Record<string, unknown>;
          fileId: string | null;
        }>;
        link: {
          token: string | null;
          type: "generic" | "assigned";
          clientNamePrefill: string;
        };
      } | null>("agreements:getAgreementPublicPageData", {
        providerSlug,
        packetSlug,
        token: token ?? null,
      });
      if (!result) {
        return { success: false, error: "Agreement packet not found" };
      }
      return {
        success: true,
        data: {
          listing: result.listing,
          profile: result.profile,
          packet: {
            id: result.packet.id,
            slug: result.packet.slug || packetSlug,
            title: result.packet.title,
            description: result.packet.description,
            versionId: result.packet.id,
            versionNumber: 1,
            documents: result.documents.map((doc) => ({
              id: doc.id,
              label: (doc.payload?.title as string) || null,
              description: null,
              fileName: (doc.payload?.title as string) || "document.pdf",
              previewUrl: `/api/agreements/document-preview?documentId=${doc.id}`,
              sha256: "",
            })),
          },
          link: result.link,
        },
      };
    } catch (err) {
      console.error("[AGREEMENTS] Convex getAgreementPacketPublicPageData failed:", err);
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to load agreement page",
      };
    }
  }

  const adminSupabase = await createAdminClient();

  const { data: listing } = await adminSupabase
    .from("listings")
    .select(`
      id,
      slug,
      logo_url,
      profile_id,
      status,
      profiles!inner (
        agency_name,
        contact_email,
        website,
        plan_tier,
        subscription_status,
        intake_form_settings,
        is_seeded
      )
    `)
    .eq("slug", providerSlug)
    .eq("status", "published")
    .single();

  if (!listing) {
    return { success: false, error: "Provider not found" };
  }

  const profile = unwrapOne(listing.profiles as unknown as {
    agency_name: string;
    contact_email: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: BrandingSettings | null;
    is_seeded: boolean;
  } | {
    agency_name: string;
    contact_email: string | null;
    website: string | null;
    plan_tier: string;
    subscription_status: string | null;
    intake_form_settings: BrandingSettings | null;
    is_seeded: boolean;
  }[]);
  if (!profile) {
    return { success: false, error: "Provider profile not found" };
  }
  if (!isPublicProfileVisible(profile)) {
    return { success: false, error: "Provider not found" };
  }

  const { data: packet } = await adminSupabase
    .from("agreement_packets")
    .select("id, slug, title, description, profile_id")
    .eq("profile_id", listing.profile_id)
    .eq("slug", packetSlug)
    .is("deleted_at", null)
    .single();

  if (!packet) {
    return { success: false, error: "Agreement packet not found" };
  }

  let versionId: string | null = null;
  let linkType: "generic" | "assigned" = "generic";
  let clientNamePrefill = "";
  const linkToken: string | null = token || null;

  if (token) {
    const { data: link } = await adminSupabase
      .from("agreement_links")
      .select("id, packet_id, packet_version_id, client_id, link_type, reusable, used_at, expires_at")
      .eq("token", token)
      .single();

    if (!link || link.packet_id !== packet.id) {
      return { success: false, error: "This agreement link is invalid." };
    }

    if (!link.reusable && link.used_at) {
      return { success: false, error: "This agreement link has already been used." };
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { success: false, error: "This agreement link has expired." };
    }

    versionId = link.packet_version_id;
    linkType = link.link_type as "generic" | "assigned";

    if (link.client_id) {
      const { data: client } = await adminSupabase
        .from("clients")
        .select("child_first_name, child_last_name")
        .eq("id", link.client_id)
        .maybeSingle();
      clientNamePrefill = client ? getClientDisplayName(client) : "";
    }
  } else {
    const latestVersion = await getPublishedPacketVersion(adminSupabase, packet.id);
    if (!latestVersion) {
      return { success: false, error: "This agreement form is not ready yet." };
    }
    versionId = latestVersion.id;
  }

  const { data: version } = await adminSupabase
    .from("agreement_packet_versions")
    .select("id, version_number")
    .eq("id", versionId)
    .single();

  if (!version) {
    return { success: false, error: "Agreement version not found." };
  }
  const { data: documents } = await adminSupabase
    .from("agreement_packet_version_documents")
    .select("id, label, description, file_name, file_path, sha256")
    .eq("packet_version_id", version.id)
    .order("sort_order", { ascending: true });

  if (!documents || documents.length === 0) {
    return { success: false, error: "Agreement documents are missing." };
  }

  const documentsWithUrls = await Promise.all(
    documents.map(async (document) => {
      return {
        id: document.id,
        label: document.label,
        description: document.description,
        fileName: document.file_name,
        previewUrl: `/api/agreements/document-preview?documentId=${document.id}`,
        sha256: document.sha256,
      };
    })
  );

  const defaultSettings: BrandingSettings = {
    background_color: "#0866FF",
    show_powered_by: true,
  };

  return {
    success: true,
    data: {
      listing: {
        slug: listing.slug,
        logoUrl: listing.logo_url,
        profileId: listing.profile_id,
      },
      profile: {
        agencyName: profile.agency_name,
        website: profile.website,
        intakeFormSettings: profile.intake_form_settings
          ? { ...defaultSettings, ...profile.intake_form_settings }
          : defaultSettings,
        planTier: profile.plan_tier,
        subscriptionStatus: profile.subscription_status,
      },
      packet: {
        id: packet.id,
        slug: packet.slug,
        title: packet.title,
        description: packet.description,
        versionId: version.id,
        versionNumber: version.version_number,
        documents: documentsWithUrls,
      },
      link: {
        token: linkToken,
        type: linkType,
        clientNamePrefill,
      },
    },
  };
}

export async function submitAgreementPacket(data: {
  turnstileToken: string;
  payload: unknown;
}): Promise<ActionResult<{ submissionId: string }>> {
  if (!data.turnstileToken || !(await verifyTurnstileToken(data.turnstileToken))) {
    return { success: false, error: "Verification failed. Please try again." };
  }

  const parsed = agreementSubmissionSchema.safeParse(data.payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Please complete every required field." };
  }

  if (isConvexDataEnabled()) {
    try {
      const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
      const headerList = await headers();
      const forwardedFor = headerList.get("x-forwarded-for");
      const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
      const signerName = `${parsed.data.signer_first_name} ${parsed.data.signer_last_name}`.trim();
      const signedAt = new Date().toISOString();

      const result = await mutateConvexUnauthenticated<{ id: string; submissionId: string }>(
        "agreements:submitAgreementPacket",
        {
          packetId: parsed.data.packet_id,
          signerName,
          signerEmail: "", // Not in current schema but required by Convex
          signedAt,
          ipAddress,
          linkToken: parsed.data.link_token || null,
          formData: {
            clientName: parsed.data.client_name,
            signerFirstName: parsed.data.signer_first_name,
            signerLastName: parsed.data.signer_last_name,
            electronicConsent: parsed.data.consent_to_electronic_records,
            authorityConfirmed: parsed.data.signer_authority_confirmed,
            intentToSign: parsed.data.consent_to_sign_electronically,
          },
        },
      );
      revalidatePath("/dashboard/forms/agreements");
      return { success: true, data: { submissionId: result.submissionId } };
    } catch (err) {
      console.error("[AGREEMENTS] Convex submitAgreementPacket failed:", err);
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to save agreement submission.",
      };
    }
  }

  const adminSupabase = await createAdminClient();

  const { data: packet } = await adminSupabase
    .from("agreement_packets")
    .select("id, profile_id, title, description, profiles!inner(agency_name, plan_tier, subscription_status)")
    .eq("id", parsed.data.packet_id)
    .is("deleted_at", null)
    .single();

  if (!packet) {
    return { success: false, error: "Agreement form not found." };
  }

  const packetProfile = unwrapOne(packet.profiles as unknown as {
    agency_name: string;
    plan_tier: string;
    subscription_status: string | null;
  } | {
    agency_name: string;
    plan_tier: string;
    subscription_status: string | null;
  }[]);
  if (!packetProfile) {
    return { success: false, error: "Provider profile is unavailable." };
  }
  const isActivePaid =
    packetProfile.plan_tier !== "free" &&
    (packetProfile.subscription_status === "active" ||
      packetProfile.subscription_status === "trialing");
  if (!isActivePaid) {
    return { success: false, error: "This provider is not currently accepting agreement submissions." };
  }

  let linkRow: AgreementLinkRow | null = null;

  if (parsed.data.link_token) {
    const { data: link } = await adminSupabase
      .from("agreement_links")
      .select("id, client_id, link_type, packet_version_id, reusable, used_at, expires_at")
      .eq("token", parsed.data.link_token)
      .single();

    if (!link || link.packet_version_id !== parsed.data.packet_version_id) {
      return { success: false, error: "This agreement link is no longer valid." };
    }
    if (!link.reusable && link.used_at) {
      return { success: false, error: "This agreement link has already been used." };
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { success: false, error: "This agreement link has expired." };
    }
    linkRow = link as AgreementLinkRow;

    if (!linkRow.reusable) {
      const { data: existingSubmission } = await adminSupabase
        .from("agreement_submissions")
        .select("id")
        .eq("agreement_link_id", linkRow.id)
        .maybeSingle();

      if (existingSubmission) {
        return { success: false, error: "This agreement link has already been used." };
      }
    }
  }

  const { data: version } = await adminSupabase
    .from("agreement_packet_versions")
    .select("id, version_number, title, description")
    .eq("id", parsed.data.packet_version_id)
    .eq("packet_id", parsed.data.packet_id)
    .single();

  if (!version) {
    return { success: false, error: "Agreement version not found." };
  }

  const { data: documents } = await adminSupabase
    .from("agreement_packet_version_documents")
    .select("id, label, description, file_name, file_path, sha256, sort_order")
    .eq("packet_version_id", version.id)
    .order("sort_order", { ascending: true });

  if (!documents || documents.length === 0) {
    return { success: false, error: "Agreement documents are missing." };
  }

  const selectedDocumentIds = new Set(parsed.data.documents.map((document) => document.packet_version_document_id));
  if (documents.some((document) => !selectedDocumentIds.has(document.id))) {
    return { success: false, error: "You must acknowledge every document before signing." };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const userAgent = headerList.get("user-agent");

  const signerName = `${parsed.data.signer_first_name} ${parsed.data.signer_last_name}`.trim();
  const submissionId = crypto.randomUUID();
  const signatureBytes = dataUrlToBytes(parsed.data.signature_data_url);
  const signaturePath = generateAgreementArtifactPath(packet.profile_id, submissionId, "signature", "png");
  const signedPdfPath = generateAgreementArtifactPath(packet.profile_id, submissionId, "bundle", "pdf");
  let persistedSubmissionId: string | null = null;

  const sourceDocuments = await Promise.all(
    documents.map(async (document) => {
      const { data: file } = await adminSupabase.storage
        .from(STORAGE_BUCKETS.agreements)
        .download(document.file_path);

      if (!file) {
        throw new Error(`Missing source PDF for ${document.file_name}`);
      }

      return {
        ...document,
        bytes: new Uint8Array(await file.arrayBuffer()),
      };
    })
  );

  const signedAt = new Date().toISOString();
  const bundleBytes = await createAgreementBundlePdf({
    providerName: packetProfile.agency_name,
    packetTitle: packet.title,
    packetDescription: packet.description,
    clientName: parsed.data.client_name,
    signerName,
    signedAt,
    linkType: (linkRow?.link_type || "generic") as "generic" | "assigned",
    ipAddress,
    userAgent,
    signaturePngBytes: signatureBytes,
    documents: sourceDocuments.map((document) => ({
      name: document.file_name,
      label: document.label,
      description: document.description,
      sha256: document.sha256,
      acknowledgedAt: signedAt,
      bytes: document.bytes,
    })),
  });

  const { error: signatureUploadError } = await adminSupabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .upload(signaturePath, signatureBytes, {
      contentType: "image/png",
      upsert: false,
    });

  if (signatureUploadError) {
    console.error("[AGREEMENTS] Failed to store signature:", signatureUploadError);
    return { success: false, error: "Failed to store signature." };
  }

  const { error: bundleUploadError } = await adminSupabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .upload(signedPdfPath, bundleBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (bundleUploadError) {
    console.error("[AGREEMENTS] Failed to store signed PDF bundle:", bundleUploadError);
    await cleanupAgreementSubmission({
      adminSupabase,
      signaturePath,
      signedPdfPath,
    });
    return { success: false, error: "Failed to store signed agreement." };
  }

  const { data: submission, error: submissionError } = await adminSupabase
    .from("agreement_submissions")
    .insert({
      id: submissionId,
      profile_id: packet.profile_id,
      packet_id: packet.id,
      packet_version_id: version.id,
      agreement_link_id: linkRow?.id || null,
      client_id: linkRow?.client_id || null,
      client_name: parsed.data.client_name,
      signer_first_name: parsed.data.signer_first_name,
      signer_last_name: parsed.data.signer_last_name,
      signature_path: signaturePath,
      signed_pdf_path: signedPdfPath,
      link_type: (linkRow?.link_type || "generic") as "generic" | "assigned",
      final_attested_at: signedAt,
      submitted_at: signedAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      electronic_consent: parsed.data.consent_to_electronic_records,
      authority_confirmed: parsed.data.signer_authority_confirmed,
      intent_to_sign_confirmed: parsed.data.consent_to_sign_electronically,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    console.error("[AGREEMENTS] Failed to create submission:", submissionError);
    await cleanupAgreementSubmission({
      adminSupabase,
      signaturePath,
      signedPdfPath,
    });

    if (submissionError?.code === "23505" && linkRow && !linkRow.reusable) {
      return { success: false, error: "This agreement link has already been used." };
    }

    return { success: false, error: "Failed to save agreement submission." };
  }

  persistedSubmissionId = submission.id;

  const { error: submissionDocsError } = await adminSupabase
    .from("agreement_submission_documents")
    .insert(
      documents.map((document) => ({
        submission_id: submission.id,
        packet_version_document_id: document.id,
        document_label: document.label,
        document_description: document.description,
        file_name: document.file_name,
        file_path: document.file_path,
        sha256: document.sha256,
        sort_order: document.sort_order,
        acknowledged: true,
        acknowledged_at: signedAt,
      }))
    );

  if (submissionDocsError) {
    console.error("[AGREEMENTS] Failed to create submission document records:", submissionDocsError);
    await cleanupAgreementSubmission({
      adminSupabase,
      submissionId: persistedSubmissionId,
      signaturePath,
      signedPdfPath,
    });
    return { success: false, error: "Failed to save agreement acknowledgements." };
  }

  if (linkRow?.client_id) {
    const clientDocumentId = await attachSignedAgreementToClient({
      adminSupabase,
      submissionId: submission.id,
      profileId: packet.profile_id,
      clientId: linkRow.client_id,
      packetTitle: packet.title,
      signerName,
      pdfBytes: bundleBytes,
    });

    if (clientDocumentId) {
      await adminSupabase
        .from("agreement_submissions")
        .update({ client_document_id: clientDocumentId })
        .eq("id", submission.id);
    }
  }

  if (linkRow) {
    const { error: linkUpdateError } = await adminSupabase
      .from("agreement_links")
      .update({
        used_at: linkRow.reusable ? null : signedAt,
        last_used_at: signedAt,
      })
      .eq("id", linkRow.id);

    if (linkUpdateError) {
      console.error("[AGREEMENTS] Failed to update agreement link usage:", linkUpdateError);
    }
  }

  revalidatePath("/dashboard/forms/agreements");
  if (linkRow?.client_id) {
    revalidatePath(`/dashboard/clients/${linkRow.client_id}`);
  }

  return { success: true, data: { submissionId: submission.id } };
}

export async function linkAgreementSubmissionToClient(
  data: { submission_id: string; client_id: string }
): Promise<ActionResult> {
  if (isConvexDataEnabled()) {
    try {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("agreements:linkSubmissionToClient", {
        artifactId: data.submission_id,
        clientId: data.client_id,
      });
      revalidatePath("/dashboard/forms/agreements");
      revalidatePath(`/dashboard/clients/${data.client_id}`);
      return { success: true };
    } catch (err) {
      console.error("[AGREEMENTS] Convex linkAgreementSubmissionToClient failed:", err);
      return { success: false, error: "Failed to link agreement to client" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = linkAgreementSubmissionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid request" };
  }

  const adminSupabase = await createAdminClient();
  const { data: submission } = await adminSupabase
    .from("agreement_submissions")
    .select("id, profile_id, client_id, client_document_id, signed_pdf_path, packet_id, signer_first_name, signer_last_name, agreement_packets!inner(title)")
    .eq("id", parsed.data.submission_id)
    .single();

  if (!submission || submission.profile_id !== profileId) {
    return { success: false, error: "Agreement submission not found" };
  }

  const { data: client } = await adminSupabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.client_id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  let clientDocumentId = submission.client_document_id;
  if (!clientDocumentId) {
    const { data: bundleFile } = await adminSupabase.storage
      .from(STORAGE_BUCKETS.agreements)
      .download(submission.signed_pdf_path);

    if (!bundleFile) {
      return { success: false, error: "Signed agreement file is missing." };
    }

    clientDocumentId = await attachSignedAgreementToClient({
      adminSupabase,
      submissionId: submission.id,
      profileId,
      clientId: client.id,
      packetTitle: unwrapOne(submission.agreement_packets as unknown as { title: string } | { title: string }[])?.title || "Signed Agreement",
      signerName: `${submission.signer_first_name} ${submission.signer_last_name}`.trim(),
      pdfBytes: new Uint8Array(await bundleFile.arrayBuffer()),
    });
  }

  const { error } = await adminSupabase
    .from("agreement_submissions")
    .update({
      client_id: client.id,
      client_document_id: clientDocumentId,
    })
    .eq("id", submission.id);

  if (error) {
    console.error("[AGREEMENTS] Failed to link submission to client:", error);
    return { success: false, error: "Failed to link agreement to client" };
  }

  revalidatePath("/dashboard/forms/agreements");
  revalidatePath(`/dashboard/clients/${client.id}`);
  return { success: true };
}

export async function getAgreementSubmissionSignedUrl(
  submissionId: string
): Promise<ActionResult<{ url: string }>> {
  if (isConvexDataEnabled()) {
    try {
      const { queryConvex } = await import("@/lib/platform/convex/server");
      // In Convex mode, the submission artifact may have a fileId pointing to storage
      const submission = await queryConvex<{
        id: string;
        fileId: string | null;
        payload: Record<string, unknown>;
      } | null>("agreements:getAgreementSubmissionById", { submissionId });
      if (!submission || !submission.fileId) {
        return { success: false, error: "Agreement submission not found" };
      }
      const url = await queryConvex<string | null>("agreements:getArtifactUrl", {
        fileId: submission.fileId,
      });
      if (!url) {
        return { success: false, error: "Failed to generate download URL" };
      }
      return { success: true, data: { url } };
    } catch (err) {
      console.error("[AGREEMENTS] Convex getAgreementSubmissionSignedUrl failed:", err);
      return { success: false, error: "Failed to generate download URL" };
    }
  }

  const user = await getUser();
  const profileId = await getCurrentProfileId();
  if (!user || !profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createSupabaseClient();
  const { data: submission } = await supabase
    .from("agreement_submissions")
    .select("signed_pdf_path, profile_id")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.profile_id !== profileId) {
    return { success: false, error: "Agreement submission not found" };
  }

  const { data: signedUrl, error } = await supabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .createSignedUrl(submission.signed_pdf_path, 300);

  if (error || !signedUrl) {
    console.error("[AGREEMENTS] Failed to create submission signed URL:", error);
    return { success: false, error: "Failed to generate download URL" };
  }

  return { success: true, data: { url: signedUrl.signedUrl } };
}
