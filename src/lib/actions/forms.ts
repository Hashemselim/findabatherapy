"use server";

import { headers } from "next/headers";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";

import {
  getRequestOrigin,
} from "@/lib/utils/domains";
import {
  getFormAccessToken as getStoredFormAccessToken,
} from "@/lib/public-access";
import {
  parseFormAnswersJson,
  parseFormDefinitionJson,
  stringifyFormAnswers,
  stringifyFormDefinition,
  type FormAnswers,
  type FormDefinition,
} from "@/lib/validations/forms";
import { isConvexDataEnabled } from "@/lib/platform/config";
import {
  sendClientFormAssignmentEmail,
  sendProviderFormSubmissionEmail,
} from "@/lib/email/forms";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const EMAIL_DELIVERY_TIMEOUT_MS = 8_000;

export interface FormTemplateListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  questionCount: number;
  latestPublishedVersionId: string | null;
  latestVersionNumber: number | null;
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  submissionCount: number;
  unassignedSubmissionCount: number;
  pendingAssignments: number;
  completedAssignments: number;
}

export interface FormSubmissionListItem {
  id: string;
  templateId: string;
  templateTitle: string;
  versionId: string;
  versionNumber: number;
  assignmentId: string | null;
  clientId: string | null;
  clientName: string | null;
  reviewState: string;
  status: string;
  responderName: string | null;
  responderEmail: string | null;
  submittedAt: string;
}

export interface FormBuilderData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  questions: FormDefinition;
  latestPublishedVersionId: string | null;
  latestVersionNumber: number | null;
  publishedAt: string | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    publishedAt: string;
  }>;
  recentLinks: Array<{
    id: string;
    token: string;
    linkType: string;
    clientId: string | null;
    status: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
}

export interface FormsDashboardData {
  listing: {
    slug: string | null;
    logoUrl: string | null;
  };
  workspace: {
    id: string;
    agencyName: string;
    contactEmail: string | null;
    planTier: string;
  };
  forms: FormTemplateListItem[];
  submissions: FormSubmissionListItem[];
  clients: Array<{ id: string; name: string }>;
}

export interface ClientFormsData {
  client: { id: string; name: string };
  assignments: Array<{
    id: string;
    templateId: string;
    templateTitle: string;
    versionNumber: number;
    dueDate: string | null;
    status: string;
    createdAt: string;
    completedAt: string | null;
    taskId: string | null;
    linkUrl: string | null;
  }>;
  submissions: Array<{
    id: string;
    templateId: string;
    templateTitle: string;
    versionNumber: number;
    reviewState: string;
    submittedAt: string;
    assignmentId: string | null;
  }>;
  unassignedSubmissions: Array<{
    id: string;
    templateId: string;
    templateTitle: string;
    versionNumber: number;
    responderName: string | null;
    responderEmail: string | null;
    submittedAt: string;
  }>;
}

export interface FormSubmissionDetail {
  id: string;
  templateId: string;
  templateTitle: string;
  versionId: string;
  versionNumber: number;
  description: string | null;
  questions: FormDefinition;
  answers: FormAnswers;
  reviewState: string;
  status: string;
  submittedAt: string;
  responderName: string | null;
  responderEmail: string | null;
  clientId: string | null;
  clientName: string | null;
  assignmentId: string | null;
  taskId: string | null;
}

export interface PublicFormPageData {
  providerSlug: string;
  listing: {
    slug: string;
    logoUrl: string | null;
  };
  workspace: {
    agencyName: string;
    contactEmail: string | null;
    planTier: string;
    website: string | null;
    branding: Record<string, unknown>;
  };
  template: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: string;
  };
  version: {
    id: string;
    versionNumber: number;
    questions: FormDefinition;
  };
  link: {
    id: string;
    type: string;
    clientId: string | null;
    clientName: string | null;
  };
  portal: {
    enabled: boolean;
    guardianAccessConfigured: boolean;
  };
  draftAnswers: FormAnswers;
  existingSubmission: {
    id: string;
    answers: FormAnswers;
    submittedAt: string;
    reviewState: string;
  } | null;
}

function requireConvexRuntime() {
  if (!isConvexDataEnabled()) {
    throw new Error("Forms require the Convex runtime.");
  }
}

async function getCurrentOrigin() {
  let origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const requestHeaders = await headers();
    origin = getRequestOrigin(requestHeaders, "goodaba");
  } catch {
    // Use env fallback outside an active request context.
  }
  return origin;
}

function rebaseUrlToOrigin(url: string, origin: string): string {
  const parsedUrl = new URL(url);
  const parsedOrigin = new URL(origin);
  parsedUrl.protocol = parsedOrigin.protocol;
  parsedUrl.host = parsedOrigin.host;
  return parsedUrl.toString();
}

function revalidateFormsPaths(options?: {
  templateId?: string | null;
  clientId?: string | null;
}) {
  revalidatePath("/dashboard/forms/custom");
  if (options?.templateId) {
    revalidatePath(`/dashboard/forms/custom/${options.templateId}`);
  }
  if (options?.clientId) {
    revalidatePath(`/dashboard/clients/${options.clientId}`);
    revalidatePath(`/dashboard/clients/${options.clientId}/portal`);
    revalidatePath(`/dashboard/clients/${options.clientId}/portal/preview`);
  }
}

async function waitForEmailAttempt(
  label: string,
  attempt: Promise<{ success: true } | { success: false; error: string }>,
) {
  const timeout = new Promise<{ success: false; error: string }>((resolve) => {
    setTimeout(() => {
      resolve({ success: false, error: "Timed out" });
    }, EMAIL_DELIVERY_TIMEOUT_MS);
  });

  const result = await Promise.race([attempt, timeout]);
  if (!result.success) {
    console.warn(`[forms] ${label} email was not delivered: ${result.error}`);
  }
}

export async function getFormsDashboardData(): Promise<ActionResult<FormsDashboardData>> {
  requireConvexRuntime();
  noStore();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<FormsDashboardData>("forms:getFormsDashboardData", {});
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load forms",
    };
  }
}

export async function getFormBuilderData(
  templateId: string,
): Promise<ActionResult<FormBuilderData>> {
  requireConvexRuntime();
  noStore();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      status: string;
      draftSchemaJson: string;
      latestPublishedVersionId: string | null;
      latestVersionNumber: number | null;
      publishedAt: string | null;
      versions: Array<{ id: string; versionNumber: number; publishedAt: string }>;
      recentLinks: FormBuilderData["recentLinks"];
    }>("forms:getFormBuilderData", { templateId });

    return {
      success: true,
      data: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        status: data.status,
        questions: parseFormDefinitionJson(data.draftSchemaJson),
        latestPublishedVersionId: data.latestPublishedVersionId,
        latestVersionNumber: data.latestVersionNumber,
        publishedAt: data.publishedAt,
        versions: data.versions,
        recentLinks: data.recentLinks,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load the form builder",
    };
  }
}

export async function getPublishedFormTemplateOptions(): Promise<
  ActionResult<Array<{ id: string; title: string; description: string | null; slug: string; latestVersionId: string; latestVersionNumber: number }>>
> {
  requireConvexRuntime();
  noStore();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<
      Array<{
        id: string;
        title: string;
        description: string | null;
        slug: string;
        latestVersionId: string;
        latestVersionNumber: number;
      }>
    >("forms:getPublishedFormTemplateOptions", {});
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load form options",
    };
  }
}

export async function getClientFormsData(
  clientId: string,
): Promise<ActionResult<ClientFormsData>> {
  requireConvexRuntime();
  noStore();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<ClientFormsData>("forms:getClientFormsData", {
      clientId,
    });
    const origin = await getCurrentOrigin();
    return {
      success: true,
      data: {
        ...data,
        assignments: data.assignments.map((assignment) => ({
          ...assignment,
          linkUrl: assignment.linkUrl ? rebaseUrlToOrigin(assignment.linkUrl, origin) : null,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load client forms",
    };
  }
}

export async function getFormSubmissionDetail(
  submissionId: string,
): Promise<ActionResult<FormSubmissionDetail>> {
  requireConvexRuntime();
  noStore();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<{
      id: string;
      templateId: string;
      templateTitle: string;
      versionId: string;
      versionNumber: number;
      description: string | null;
      questionsJson: string;
      answersJson: string;
      reviewState: string;
      status: string;
      submittedAt: string;
      responderName: string | null;
      responderEmail: string | null;
      clientId: string | null;
      clientName: string | null;
      assignmentId: string | null;
      taskId: string | null;
    }>("forms:getFormSubmissionDetail", { submissionId });

    return {
      success: true,
      data: {
        ...data,
        questions: parseFormDefinitionJson(data.questionsJson),
        answers: parseFormAnswersJson(data.answersJson),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load submission details",
    };
  }
}

export async function createFormTemplate(input?: {
  title?: string | null;
  description?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string }>("forms:createFormTemplate", {
      title: input?.title ?? null,
      description: input?.description ?? null,
    });
    revalidateFormsPaths({ templateId: data.id });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create form",
    };
  }
}

export async function updateFormTemplateDraft(input: {
  templateId: string;
  title: string;
  description?: string | null;
  questions: FormDefinition;
}): Promise<ActionResult> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("forms:updateFormTemplateDraft", {
      templateId: input.templateId,
      title: input.title,
      description: input.description ?? null,
      draftSchemaJson: stringifyFormDefinition(input.questions),
    });
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Form draft has incomplete fields. Finish editing and try again.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save form changes",
    };
  }
}

export async function publishFormTemplate(
  templateId: string,
): Promise<ActionResult<{ id: string; versionId: string; versionNumber: number }>> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{
      id: string;
      versionId: string;
      versionNumber: number;
    }>("forms:publishFormTemplate", { templateId });
    revalidateFormsPaths({ templateId });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish form",
    };
  }
}

export async function archiveFormTemplate(templateId: string): Promise<ActionResult> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("forms:archiveFormTemplate", { templateId });
    revalidateFormsPaths({ templateId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive form",
    };
  }
}

export async function restoreFormTemplate(templateId: string): Promise<ActionResult> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("forms:restoreFormTemplate", { templateId });
    revalidateFormsPaths({ templateId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore form",
    };
  }
}

export async function createGenericFormLink(
  templateId: string,
): Promise<ActionResult<{ id: string; token: string; url: string }>> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{ id: string; token: string; url: string }>(
      "forms:createGenericFormLink",
      { templateId },
    );
    const origin = await getCurrentOrigin();
    revalidateFormsPaths({ templateId });
    return {
      success: true,
      data: {
        ...data,
        url: rebaseUrlToOrigin(data.url, origin),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create share link",
    };
  }
}

export async function assignFormsToClient(input: {
  clientId: string;
  templateIds: string[];
  dueDate?: string | null;
}): Promise<
  ActionResult<{
    clientId: string;
    clientName: string;
    providerSlug: string;
    agencyName: string;
    assignments: Array<{
      assignmentId: string;
      linkUrl: string;
      title: string;
      taskId: string;
    }>;
  }>
> {
  requireConvexRuntime();

  try {
    const { mutateConvex, queryConvex } = await import("@/lib/platform/convex/server");
    const data = await mutateConvex<{
      clientId: string;
      clientName: string;
      providerSlug: string;
      agencyName: string;
      assignments: Array<{
        assignmentId: string;
        linkUrl: string;
        title: string;
        taskId: string;
      }>;
    }>("forms:assignFormsToClient", input);
    const origin = await getCurrentOrigin();
    const assignments = data.assignments.map((assignment) => ({
      ...assignment,
      linkUrl: rebaseUrlToOrigin(assignment.linkUrl, origin),
    }));

    const client = await queryConvex<{
      parents: Array<{
        firstName?: string | null;
        first_name?: string | null;
        lastName?: string | null;
        last_name?: string | null;
        email?: string | null;
      }>;
    } | null>("crm:getClientById", { clientId: input.clientId });

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const recipients = Array.from(
      new Map(
        client.parents
          .map((parent) => {
            const email = parent.email?.trim() ?? "";
            const familyName =
              parent.firstName ??
              parent.first_name ??
              parent.lastName ??
              parent.last_name ??
              null;
            return email ? [email.toLowerCase(), familyName] : null;
          })
          .filter((entry): entry is [string, string | null] => entry !== null),
      ),
    );

    for (const assignment of assignments) {
      for (const [email, familyName] of recipients) {
        await waitForEmailAttempt(
          "Client assignment",
          sendClientFormAssignmentEmail({
            to: email,
            familyName,
            childName: data.clientName,
            agencyName: data.agencyName,
            formTitle: assignment.title,
            dueDate: input.dueDate ?? null,
            accessUrl: assignment.linkUrl,
          }),
        );
      }
    }

    revalidateFormsPaths({ clientId: input.clientId });
    return {
      success: true,
      data: {
        ...data,
        assignments,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign forms",
    };
  }
}

export async function attachFormSubmissionToClient(input: {
  submissionId: string;
  clientId: string;
}): Promise<ActionResult> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("forms:attachFormSubmissionToClient", input);
    revalidateFormsPaths({ clientId: input.clientId });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to attach submission",
    };
  }
}

export async function updateFormSubmissionReviewState(input: {
  submissionId: string;
  reviewState: "submitted" | "reviewed" | "flagged" | "archived";
}): Promise<ActionResult> {
  requireConvexRuntime();

  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("forms:updateFormSubmissionReviewState", input);
    revalidateFormsPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update review state",
    };
  }
}

export async function getPublicFormPageData(
  providerSlug: string,
  formSlug: string,
  explicitToken?: string | null,
): Promise<ActionResult<PublicFormPageData>> {
  requireConvexRuntime();

  try {
    const token = explicitToken ?? (await getStoredFormAccessToken(providerSlug, formSlug));
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await queryConvexUnauthenticated<{
      providerSlug: string;
      listing: { slug: string; logoUrl: string | null };
      workspace: {
        agencyName: string;
        contactEmail: string | null;
        planTier: string;
        website: string | null;
        branding: Record<string, unknown>;
      };
      template: {
        id: string;
        slug: string;
        title: string;
        description: string | null;
        status: string;
      };
      version: {
        id: string;
        versionNumber: number;
        schemaJson: string;
      };
      link: {
        id: string;
        type: string;
        clientId: string | null;
        clientName: string | null;
      };
      portal: {
        enabled: boolean;
        guardianAccessConfigured: boolean;
      };
      draftAnswersJson: string;
      existingSubmission: {
        id: string;
        answersJson: string;
        submittedAt: string;
        reviewState: string;
      } | null;
    }>("forms:getPublicFormPageData", {
      providerSlug,
      formSlug,
      token,
    });

    return {
      success: true,
      data: {
        providerSlug: data.providerSlug,
        listing: data.listing,
        workspace: data.workspace,
        template: data.template,
        version: {
          id: data.version.id,
          versionNumber: data.version.versionNumber,
          questions: parseFormDefinitionJson(data.version.schemaJson),
        },
        link: data.link,
        portal: data.portal,
        draftAnswers: parseFormAnswersJson(data.draftAnswersJson),
        existingSubmission: data.existingSubmission
          ? {
              id: data.existingSubmission.id,
              answers: parseFormAnswersJson(data.existingSubmission.answersJson),
              submittedAt: data.existingSubmission.submittedAt,
              reviewState: data.existingSubmission.reviewState,
            }
          : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load form",
    };
  }
}

export async function autosavePublicFormDraft(input: {
  providerSlug: string;
  formSlug: string;
  answers: FormAnswers;
}): Promise<ActionResult<{ id: string }>> {
  requireConvexRuntime();

  try {
    const token = await getStoredFormAccessToken(input.providerSlug, input.formSlug);
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await mutateConvexUnauthenticated<{ id: string }>(
      "forms:upsertPublicFormDraft",
      {
        token,
        answersJson: stringifyFormAnswers(input.answers),
      },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save your progress",
    };
  }
}

export async function generatePublicFormUploadUrl(input: {
  providerSlug: string;
  formSlug: string;
}): Promise<ActionResult<{ url: string }>> {
  requireConvexRuntime();

  try {
    const token = await getStoredFormAccessToken(input.providerSlug, input.formSlug);
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await mutateConvexUnauthenticated<{ url: string }>(
      "forms:generatePublicFormUploadUrl",
      { token },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to prepare file upload",
    };
  }
}

export async function registerPublicFormUpload(input: {
  providerSlug: string;
  formSlug: string;
  storageId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
}): Promise<
  ActionResult<{
    fileId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
  }>
> {
  requireConvexRuntime();

  try {
    const token = await getStoredFormAccessToken(input.providerSlug, input.formSlug);
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await mutateConvexUnauthenticated<{
      fileId: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
    }>("forms:registerPublicFormUpload", {
      token,
      storageId: input.storageId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save uploaded file",
    };
  }
}

export async function submitPublicForm(input: {
  providerSlug: string;
  formSlug: string;
  answers: FormAnswers;
  responderName?: string | null;
  responderEmail?: string | null;
}): Promise<ActionResult<{ submissionId: string }>> {
  requireConvexRuntime();

  try {
    const token = await getStoredFormAccessToken(input.providerSlug, input.formSlug);
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await mutateConvexUnauthenticated<{
      submissionId: string;
      clientId: string | null;
      providerEmail: string | null;
      providerAgencyName: string;
      formTitle: string;
      clientName: string | null;
      providerSlug: string;
    }>("forms:submitPublicForm", {
      token,
      answersJson: stringifyFormAnswers(input.answers),
      responderName: input.responderName ?? null,
      responderEmail: input.responderEmail ?? null,
    });

    if (data.providerEmail) {
      const origin = await getCurrentOrigin();
      await waitForEmailAttempt(
        "Provider submission",
        sendProviderFormSubmissionEmail({
          to: data.providerEmail,
          agencyName: data.providerAgencyName,
          formTitle: data.formTitle,
          clientName: data.clientName,
          responderName: input.responderName ?? null,
          submissionUrl: `${origin}/dashboard/forms/custom?tab=submissions&submissionId=${data.submissionId}`,
        }),
      );
    }

    revalidateFormsPaths({ clientId: data.clientId });
    return { success: true, data: { submissionId: data.submissionId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit form",
    };
  }
}

export async function getFormFileUrl(
  fileId: string,
): Promise<ActionResult<{ url: string; fileName: string }>> {
  requireConvexRuntime();

  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const data = await queryConvex<{ url: string; fileName: string }>(
      "forms:getFormFileUrl",
      { fileId },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open file",
    };
  }
}

export async function getPublicFormFileUrl(input: {
  providerSlug: string;
  formSlug: string;
  fileId: string;
}): Promise<ActionResult<{ url: string; fileName: string }>> {
  requireConvexRuntime();

  try {
    const token = await getStoredFormAccessToken(input.providerSlug, input.formSlug);
    if (!token) {
      return { success: false, error: "This form link is invalid or expired." };
    }

    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const data = await queryConvexUnauthenticated<{ url: string; fileName: string }>(
      "forms:getPublicFormFileUrl",
      {
        token,
        fileId: input.fileId,
      },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open file",
    };
  }
}
