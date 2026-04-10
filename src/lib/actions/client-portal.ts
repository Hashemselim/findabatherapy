"use server";

import { revalidatePath } from "next/cache";

import { isConvexDataEnabled } from "@/lib/platform/config";
import { sendClientPortalInviteEmail } from "@/lib/email/client-portal";
import { sendClientPortalMagicLinkEmail } from "@/lib/email/client-portal";
import { getCurrentUser } from "@/lib/platform/auth/server";
import {
  buildPortalAccessPath,
  getPortalAccessToken,
} from "@/lib/public-access";
import { getIntakeAccessToken } from "@/lib/public-access";
import { buildBrandUrl } from "@/lib/utils/domains";
import { createClerkSignInTokenUrl } from "@/lib/platform/auth/clerk-admin";
import {
  DOCUMENT_MAX_SIZE,
  isValidDocumentSize,
  isValidDocumentType,
  verifyDocumentMagicBytes,
} from "@/lib/storage/config";
import { uploadClientDocument } from "@/lib/actions/clients";
import { markIntakeTokenUsed } from "@/lib/actions/intake";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface PortalBrandingData {
  agencyName: string;
  planTier: string;
  website: string | null;
  backgroundColor: string;
  showPoweredBy: boolean;
  logoUrl: string | null;
  slug: string | null;
}

export interface PortalSignInBrandingData {
  agencyName: string;
  backgroundColor: string;
  showPoweredBy: boolean;
  website: string | null;
  logoUrl: string | null;
  slug: string;
}

export interface PortalSummaryData {
  enabled: boolean;
  completionPercentage: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  guardiansReady: number;
  guardiansTotal: number;
  lastActivityAt: string | null;
  nextTaskId: string | null;
  nextTaskTitle: string | null;
  unreadMessages: number;
  inviteAccepted?: boolean;
}

export interface PortalGuardianData {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  relationship: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  accessStatus: string;
  notificationsEnabled: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
}

export interface PortalTaskData {
  id: string;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  category: string;
  taskType: string;
  completionMethod: string;
  status: string;
  visibility: string;
  reminderRule: string | null;
  templateSource: string | null;
  formKey?: string | null;
  externalUrl: string | null;
  linkedDocumentId: string | null;
  linkedToolId?: string | null;
  submittedDocumentId?: string | null;
  requiredDocumentType: string | null;
  completionNote: string | null;
  completedAt: string | null;
  completedByGuardianId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalDocumentData {
  id: string;
  label: string;
  category: string;
  note: string | null;
  visibility: string;
  acknowledgementRequired: boolean;
  acknowledgedByGuardianIds: string[];
  fileId: string | null;
  filename: string | null;
  mimeType: string | null;
  byteSize: number;
  uploadSource: string;
  linkedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalMessageData {
  id: string;
  subject: string;
  body: string;
  preview: string;
  messageType: string;
  audience: string;
  emailNotify: boolean;
  readByGuardianIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortalResourceData {
  id: string;
  title: string;
  description: string | null;
  href: string | null;
  category: string;
  recommendedStage: string | null;
  pinned: boolean;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalToolData {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  category: string;
  whenToUse: string | null;
  logoLabel: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalActivityData {
  id: string;
  title: string;
  description: string | null;
  actorType: string;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface PortalProfileData {
  phone: string | null;
  email: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  insuranceName: string | null;
  insuranceMemberId: string | null;
  insuranceGroupNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  childName: string;
  childDateOfBirth: string | null;
}

export interface ClientPortalData {
  client: {
    id: string;
    name: string;
    status: string;
  };
  branding: PortalBrandingData;
  portal: PortalSummaryData;
  guardians: PortalGuardianData[];
  tasks: PortalTaskData[];
  documents: PortalDocumentData[];
  messages: PortalMessageData[];
  resources: PortalResourceData[];
  connectedTools: PortalToolData[];
  activity: PortalActivityData[];
  profile: PortalProfileData;
}

export interface PublicClientPortalData extends ClientPortalData {
  guardian: PortalGuardianData;
}

export interface PortalAccessTargetData {
  clientId: string;
  clientName: string;
  guardianId: string;
  guardianName: string;
  accessStatus: string;
}

export interface PortalHomeEntryData {
  slug: string;
  clientId: string;
  clientName: string;
  guardianId: string;
  guardianName: string;
  agencyName: string;
  backgroundColor: string;
  logoUrl: string | null;
}

const VALID_CLIENT_DOCUMENT_TYPES = new Set([
  "insurance_card",
  "assessment",
  "iep",
  "medical_records",
  "consent",
  "diagnosis_report",
  "referral",
  "authorization",
  "treatment_plan",
  "legal",
  "administrative",
  "other",
]);

function normalizePortalExternalUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizePortalDocumentUploadType(value: string | null) {
  if (!value) {
    return "administrative";
  }

  if (VALID_CLIENT_DOCUMENT_TYPES.has(value)) {
    return value;
  }

  switch (value) {
    case "insurance":
      return "insurance_card";
    case "agreement":
      return "consent";
    case "policy":
      return "administrative";
    case "invoice_payment_link":
      return "administrative";
    default:
      return "other";
  }
}

function revalidatePortalPaths(clientId: string, slug?: string | null) {
  revalidatePath("/portal");
  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath(`/dashboard/clients/${clientId}/portal`);
  revalidatePath(`/dashboard/clients/${clientId}/portal/preview`);
  if (slug) {
    revalidatePath(`/portal/${slug}`);
    revalidatePath(`/portal/${slug}/sign-in`);
  }
}

async function resolvePortalAccessMode(slug: string) {
  const token = await getPortalAccessToken(slug);
  if (token) {
    return { mode: "token" as const, token };
  }

  const user = await getCurrentUser();
  if (user) {
    return { mode: "authenticated" as const };
  }

  return { mode: "none" as const };
}

export async function getClientPortalData(
  clientId: string,
): Promise<ActionResult<ClientPortalData>> {
  if (!isConvexDataEnabled()) {
    return { success: false, error: "Client portal requires Convex data mode" };
  }

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<ClientPortalData>("clientPortal:getClientPortalData", {
      clientId,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load client portal",
    };
  }
}

export async function getPortalBrandingBySlug(
  slug: string,
): Promise<ActionResult<PortalSignInBrandingData>> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await queryConvexUnauthenticated<PortalSignInBrandingData>(
      "clientPortal:getPortalBrandingBySlug",
      { slug },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load portal branding",
    };
  }
}

export async function getAuthenticatedPortalTargets(
  slug: string,
): Promise<ActionResult<{ branding: PortalSignInBrandingData; entries: PortalAccessTargetData[] }>> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<{
      branding: PortalSignInBrandingData;
      entries: PortalAccessTargetData[];
    }>("clientPortal:listAuthenticatedPortalTargets", { slug });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load portal targets",
    };
  }
}

export async function getAuthenticatedPortalHomeEntries(): Promise<
  ActionResult<PortalHomeEntryData[]>
> {
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<PortalHomeEntryData[]>(
      "clientPortal:listAuthenticatedPortalHome",
      {},
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load family portals",
    };
  }
}

export async function claimPortalInviteForCurrentUser(
  slug: string,
  token: string,
): Promise<ActionResult<{ clientId: string; slug: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "You must be signed in to claim this portal invite",
      };
    }

    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ clientId: string; slug: string }>(
      "clientPortal:claimGuardianInviteForCurrentUser",
      {
        slug,
        token,
        authenticatedEmail: user.email ?? null,
        authenticatedClerkUserId: user.id,
      },
    );
    revalidatePath("/portal");
    revalidatePath(`/portal/${slug}`);
    revalidatePath(`/portal/${slug}/sign-in`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to claim portal invite",
    };
  }
}

export async function setClientPortalEnabled(
  clientId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("clientPortal:setClientPortalEnabled", { clientId, enabled });
    const portal = await getClientPortalData(clientId);
    revalidatePortalPaths(clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update portal status",
    };
  }
}

export async function savePortalGuardian(input: {
  recordId?: string;
  clientId: string;
  firstName?: string | null;
  lastName?: string | null;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
  notificationsEnabled?: boolean;
  accessStatus?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:saveGuardian", input);
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save guardian",
    };
  }
}

export async function createPortalGuardianInvite(input: {
  clientId: string;
  guardianId: string;
}): Promise<
  ActionResult<{
    token: string;
    slug: string;
    url: string;
    emailSent: boolean;
    emailError?: string;
  }>
> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{
      token: string;
      slug: string;
      url: string;
      expiresAt: string;
      email: string;
      guardianName: string;
      clientName: string;
      agencyName: string;
    }>(
      "clientPortal:createGuardianInvite",
      input,
    );
    const accessUrl = buildBrandUrl(
      "therapy",
      `${buildPortalAccessPath(data.slug)}?token=${data.token}`,
    );
    const emailResult = await sendClientPortalInviteEmail({
      to: data.email,
      guardianName: data.guardianName,
      childName: data.clientName,
      agencyName: data.agencyName,
      accessUrl,
      expiresAt: data.expiresAt,
    });
    revalidatePortalPaths(input.clientId, data.slug);
    return {
      success: true,
      data: {
        token: data.token,
        slug: data.slug,
        url: accessUrl,
        emailSent: emailResult.success,
        ...(emailResult.success ? {} : { emailError: emailResult.error }),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create invite",
    };
  }
}

async function resolvePortalGuardianContext(params: {
  clientId: string;
  guardianId: string;
}) {
  const portal = await getClientPortalData(params.clientId);
  if (!portal.success || !portal.data) {
    return { success: false as const, error: "Failed to load client portal" };
  }

  const guardian = portal.data.guardians.find((entry) => entry.id === params.guardianId) ?? null;
  if (!guardian?.email) {
    return { success: false as const, error: "Guardian needs an email address first" };
  }

  const slug = portal.data.branding.slug;
  if (!slug) {
    return { success: false as const, error: "No published provider route was found" };
  }

  const signInPageUrl = buildBrandUrl(
    "therapy",
    `/portal/${slug}/sign-in?email=${encodeURIComponent(guardian.email)}`,
  );

  return {
    success: true as const,
    data: {
      portal: portal.data,
      guardian,
      slug,
      signInPageUrl,
    },
  };
}

export async function getPortalGuardianSignInPageLink(input: {
  clientId: string;
  guardianId: string;
}): Promise<ActionResult<{ url: string }>> {
  const context = await resolvePortalGuardianContext(input);
  if (!context.success) {
    return context;
  }

  return {
    success: true,
    data: {
      url: context.data.signInPageUrl,
    },
  };
}

export async function sendPortalGuardianMagicLink(input: {
  clientId: string;
  guardianId: string;
}): Promise<ActionResult<{ url: string; emailSent: boolean; emailError?: string }>> {
  const context = await resolvePortalGuardianContext(input);
  if (!context.success) {
    return context;
  }

  try {
    const signInToken = await createClerkSignInTokenUrl({
      email: context.data.guardian.email ?? "",
      targetUrl: context.data.signInPageUrl,
    });

    const emailResult = await sendClientPortalMagicLinkEmail({
      to: context.data.guardian.email ?? "",
      guardianName: context.data.guardian.name,
      childName: context.data.portal.client.name,
      agencyName: context.data.portal.branding.agencyName,
      signInUrl: signInToken.url,
      signInPageUrl: context.data.signInPageUrl,
    });

    if (emailResult.success) {
      const { mutateConvex } = await import("@/lib/platform/convex/server");
      await mutateConvex("clientPortal:markGuardianInviteSent", {
        ...input,
        linkedClerkUserId: signInToken.userId,
        linkedEmail: context.data.guardian.email ?? "",
      });
      revalidatePortalPaths(input.clientId, context.data.slug);
    }

    return {
      success: true,
      data: {
        url: context.data.signInPageUrl,
        emailSent: emailResult.success,
        ...(emailResult.success ? {} : { emailError: emailResult.error }),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send sign-in email",
    };
  }
}

export async function savePortalTask(input: {
  recordId?: string;
  clientId: string;
  title: string;
  instructions?: string | null;
  dueDate?: string | null;
  taskType: string;
  formKey?: string | null;
  status?: string | null;
  externalUrl?: string | null;
  linkedDocumentId?: string | null;
  requiredDocumentType?: string | null;
  completionNote?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:savePortalTask", input);
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save task",
    };
  }
}

export async function getPublicPortalIntakeFormUrl(
  slug: string,
  taskId: string,
  clientId?: string | null,
): Promise<ActionResult<{ url: string }>> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data =
      access.mode === "token"
        ? await mutateConvexUnauthenticated<{ url: string }>(
            "clientPortal:createPortalIntakeFormLink",
            {
              token: access.token,
              taskId,
            },
          )
        : await mutateConvex<{ url: string }>("clientPortal:createPortalIntakeFormLink", {
            slug,
            clientId: clientId ?? null,
            taskId,
          });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open intake form",
    };
  }
}

export async function submitAssignedPortalIntakeForm(input: {
  slug: string;
  taskId: string;
  fields: Record<string, unknown>;
}): Promise<ActionResult> {
  try {
    const intakeToken = await getIntakeAccessToken(input.slug);
    if (!intakeToken) {
      return { success: false, error: "The intake link has expired. Please reopen it from the portal." };
    }

    const { routeFieldsToTables } = await import("@/lib/intake/build-intake-schema");
    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const tables = routeFieldsToTables(input.fields);

    const result = await mutateConvexUnauthenticated<{ success: true; clientId: string }>(
      "intake:submitAssignedPortalIntake",
      {
      token: intakeToken,
      taskId: input.taskId,
      clientData: tables.clients,
      parentData: tables.client_parents,
      insuranceData: tables.client_insurances,
      homeLocationData: tables.client_locations,
      serviceLocationData: tables.service_locations,
      },
    );

    await markIntakeTokenUsed(undefined, input.slug);
    revalidatePortalPaths(result.clientId, input.slug);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit form",
    };
  }
}

export async function deletePortalTask(
  clientId: string,
  recordId: string,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("clientPortal:deletePortalTask", { clientId, recordId });
    const portal = await getClientPortalData(clientId);
    revalidatePortalPaths(clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

export async function savePortalDocumentShare(input: {
  clientId: string;
  recordId?: string;
  existingDocumentId?: string;
  label?: string | null;
  category?: string | null;
  note?: string | null;
  visibility?: string | null;
  acknowledgementRequired?: boolean;
  notifyFamily?: boolean;
  linkedTaskId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:savePortalDocument", input);
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save document settings",
    };
  }
}

export async function uploadProviderPortalDocument(
  clientId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const normalizedFormData = new FormData();
  for (const [key, value] of formData.entries()) {
    normalizedFormData.set(key, value);
  }
  normalizedFormData.set(
    "document_type",
    normalizePortalDocumentUploadType(
      (formData.get("document_type") as string | null) ?? null,
    ),
  );

  const uploadResult = await uploadClientDocument(clientId, normalizedFormData);
  if (!uploadResult.success || !uploadResult.data?.id) {
    return {
      success: false,
      error: uploadResult.success ? "Failed to upload document" : uploadResult.error,
    };
  }

  return savePortalDocumentShare({
    clientId,
    existingDocumentId: uploadResult.data.id,
    label: (normalizedFormData.get("label") as string | null) ?? null,
    category: normalizePortalDocumentUploadType(
      (normalizedFormData.get("document_type") as string | null) ?? null,
    ),
    note: (normalizedFormData.get("portal_note") as string | null) ?? null,
    visibility: (normalizedFormData.get("portal_visibility") as string | null) ?? "visible",
    acknowledgementRequired: normalizedFormData.get("portal_ack_required") === "true",
    linkedTaskId: (normalizedFormData.get("portal_task_id") as string | null) ?? null,
  });
}

export async function savePortalMessage(input: {
  recordId?: string;
  clientId: string;
  subject: string;
  body: string;
  messageType?: string | null;
  audience?: string | null;
  emailNotify?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:savePortalMessage", input);
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save message",
    };
  }
}

export async function deletePortalMessage(
  clientId: string,
  recordId: string,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("clientPortal:deletePortalMessage", { clientId, recordId });
    const portal = await getClientPortalData(clientId);
    revalidatePortalPaths(clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete message",
    };
  }
}

export async function savePortalResource(input: {
  recordId?: string;
  clientId: string;
  title: string;
  description?: string | null;
  href?: string | null;
  category?: string | null;
  recommendedStage?: string | null;
  pinned?: boolean;
  visibility?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:savePortalResource", {
      ...input,
      href: normalizePortalExternalUrl(input.href),
    });
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save resource",
    };
  }
}

export async function deletePortalResource(
  clientId: string,
  recordId: string,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("clientPortal:deletePortalResource", { recordId });
    const portal = await getClientPortalData(clientId);
    revalidatePortalPaths(clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resource",
    };
  }
}

export async function savePortalTool(input: {
  recordId?: string;
  clientId: string;
  name: string;
  description?: string | null;
  url?: string | null;
  category?: string | null;
  whenToUse?: string | null;
  logoLabel?: string | null;
  visibility?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("clientPortal:savePortalTool", {
      ...input,
      url: normalizePortalExternalUrl(input.url),
    });
    const portal = await getClientPortalData(input.clientId);
    revalidatePortalPaths(input.clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save tool",
    };
  }
}

export async function deletePortalTool(
  clientId: string,
  recordId: string,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("clientPortal:deletePortalTool", { recordId });
    const portal = await getClientPortalData(clientId);
    revalidatePortalPaths(clientId, portal.success ? portal.data?.branding.slug : null);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tool",
    };
  }
}

export async function getPublicClientPortalData(
  slug: string,
  clientId?: string | null,
): Promise<ActionResult<PublicClientPortalData>> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { queryConvex, queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data =
      access.mode === "token"
        ? await queryConvexUnauthenticated<PublicClientPortalData>(
            "clientPortal:getPublicPortalData",
            { slug, token: access.token },
          )
        : await queryConvex<PublicClientPortalData>("clientPortal:getPublicPortalData", {
            slug,
            clientId: clientId ?? null,
          });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load portal",
    };
  }
}

export async function acceptPublicPortalInvite(
  slug: string,
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:acceptPortalInvite", {
        token: access.token,
      });
    } else {
      await mutateConvex("clientPortal:acceptPortalInvite", {
        slug,
        clientId: clientId ?? null,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invite",
    };
  }
}

export async function startPublicPortalTask(
  slug: string,
  taskId: string,
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:startPortalTask", {
        token: access.token,
        taskId,
      });
    } else {
      await mutateConvex("clientPortal:startPortalTask", {
        slug,
        clientId: clientId ?? null,
        taskId,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start task",
    };
  }
}

export async function completePublicPortalTask(
  slug: string,
  taskId: string,
  completionNote?: string | null,
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:completePortalTask", {
        token: access.token,
        taskId,
        completionNote: completionNote ?? null,
      });
    } else {
      await mutateConvex("clientPortal:completePortalTask", {
        slug,
        clientId: clientId ?? null,
        taskId,
        completionNote: completionNote ?? null,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete task",
    };
  }
}

export async function acknowledgePublicPortalDocument(
  slug: string,
  documentId: string,
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:acknowledgePortalDocument", {
        token: access.token,
        documentId,
      });
    } else {
      await mutateConvex("clientPortal:acknowledgePortalDocument", {
        slug,
        clientId: clientId ?? null,
        documentId,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to acknowledge document",
    };
  }
}

export async function markPublicPortalMessageRead(
  slug: string,
  messageId: string,
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:markPortalMessageRead", {
        token: access.token,
        messageId,
      });
    } else {
      await mutateConvex("clientPortal:markPortalMessageRead", {
        slug,
        clientId: clientId ?? null,
        messageId,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark message read",
    };
  }
}

export async function updatePublicPortalProfile(
  slug: string,
  updates: {
    phone?: string | null;
    email?: string | null;
    streetAddress?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    insuranceName?: string | null;
    insuranceMemberId?: string | null;
    insuranceGroupNumber?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelationship?: string | null;
  },
  clientId?: string | null,
): Promise<ActionResult> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    if (access.mode === "token") {
      await mutateConvexUnauthenticated("clientPortal:updatePortalProfile", {
        token: access.token,
        updates,
      });
    } else {
      await mutateConvex("clientPortal:updatePortalProfile", {
        slug,
        clientId: clientId ?? null,
        updates,
      });
    }
    revalidatePath(`/portal/${slug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update information",
    };
  }
}

export async function submitPublicPortalUpload(
  slug: string,
  formData: FormData,
  taskId?: string | null,
  clientId?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
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

  try {
    const { mutateConvex, mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const uploadUrl =
      access.mode === "token"
        ? await mutateConvexUnauthenticated<string>(
            "clientPortal:generatePortalUploadUrl",
            { token: access.token },
          )
        : await mutateConvex<string>("clientPortal:generatePortalUploadUrl", {
            slug,
            clientId: clientId ?? null,
          });

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

    const mutationArgs = {
      storageId: uploadPayload.storageId,
      filename: file.name,
      mimeType: file.type,
      byteSize: file.size,
      label: (formData.get("label") as string | null) ?? file.name,
      category: (formData.get("document_type") as string | null) ?? "other",
      note: (formData.get("note") as string | null) ?? null,
      taskId: taskId ?? ((formData.get("taskId") as string | null) ?? null),
    };
    const data =
      access.mode === "token"
        ? await mutateConvexUnauthenticated<{ id: string }>(
            "clientPortal:submitPortalUpload",
            {
              token: access.token,
              ...mutationArgs,
            },
          )
        : await mutateConvex<{ id: string }>("clientPortal:submitPortalUpload", {
            slug,
            clientId: clientId ?? null,
            ...mutationArgs,
          });

    revalidatePath(`/portal/${slug}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

export async function getPublicPortalDocumentDownload(
  slug: string,
  documentId: string,
  clientId?: string | null,
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const access = await resolvePortalAccessMode(slug);
  if (access.mode === "none") {
    return { success: false, error: "Portal access is missing or expired" };
  }

  try {
    const { queryConvex, queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data =
      access.mode === "token"
        ? await queryConvexUnauthenticated<{ url: string; fileName: string }>(
            "clientPortal:getPortalDocumentUrl",
            { token: access.token, documentId },
          )
        : await queryConvex<{ url: string; fileName: string }>(
            "clientPortal:getPortalDocumentUrl",
            { slug, clientId: clientId ?? null, documentId },
          );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open document",
    };
  }
}

export async function getClientPortalInvitePreviewPath(slug: string) {
  return buildPortalAccessPath(slug);
}
