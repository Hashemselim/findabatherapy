import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePath,
  noStore,
  headersMock,
  isConvexDataEnabled,
  queryConvex,
  mutateConvex,
  queryConvexUnauthenticated,
  mutateConvexUnauthenticated,
  getStoredFormAccessToken,
  sendClientFormAssignmentEmail,
  sendProviderFormSubmissionEmail,
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  noStore: vi.fn(),
  headersMock: vi.fn(),
  isConvexDataEnabled: vi.fn(() => true),
  queryConvex: vi.fn(),
  mutateConvex: vi.fn(),
  queryConvexUnauthenticated: vi.fn(),
  mutateConvexUnauthenticated: vi.fn(),
  getStoredFormAccessToken: vi.fn(),
  sendClientFormAssignmentEmail: vi.fn(),
  sendProviderFormSubmissionEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
  unstable_noStore: noStore,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/platform/config", () => ({
  isConvexDataEnabled,
}));

vi.mock("@/lib/platform/convex/server", () => ({
  queryConvex,
  mutateConvex,
  queryConvexUnauthenticated,
  mutateConvexUnauthenticated,
}));

vi.mock("@/lib/public-access", () => ({
  getFormAccessToken: getStoredFormAccessToken,
}));

vi.mock("@/lib/email/forms", () => ({
  sendClientFormAssignmentEmail,
  sendProviderFormSubmissionEmail,
}));

import {
  archiveFormTemplate,
  assignFormsToClient,
  attachFormSubmissionToClient,
  restoreFormTemplate,
  submitPublicForm,
} from "@/lib/actions/forms";

function createHeaderBag(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

describe("forms server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isConvexDataEnabled.mockReturnValue(true);
    headersMock.mockResolvedValue(
      createHeaderBag({
        host: "localhost:3000",
        "x-forwarded-host": "localhost:3000",
        "x-forwarded-proto": "http",
      }),
    );
    sendClientFormAssignmentEmail.mockResolvedValue({ success: true });
    sendProviderFormSubmissionEmail.mockResolvedValue({ success: true });
  });

  it("assigns forms, rebases links to the current origin, and emails unique client recipients", async () => {
    mutateConvex.mockResolvedValue({
      clientId: "client_123",
      clientName: "Nora Rivera",
      providerSlug: "foundations-autism",
      agencyName: "Foundations Autism",
      assignments: [
        {
          assignmentId: "assignment_123",
          linkUrl:
            "https://www.goodaba.com/forms/foundations-autism/aba-history/access?token=abc123",
          title: "ABA History",
          taskId: "task_123",
        },
      ],
    });
    queryConvex.mockResolvedValue({
      parents: [
        { firstName: "Rivera", email: "Family@Example.com" },
        { first_name: "Rivera", email: "family@example.com" },
        { firstName: "NoEmail", email: "" },
      ],
    });

    const result = await assignFormsToClient({
      clientId: "client_123",
      templateIds: ["template_123"],
      dueDate: "2026-05-10",
    });

    expect(result.success).toBe(true);
    expect(mutateConvex).toHaveBeenCalledWith("forms:assignFormsToClient", {
      clientId: "client_123",
      templateIds: ["template_123"],
      dueDate: "2026-05-10",
    });
    expect(queryConvex).toHaveBeenCalledWith("crm:getClientById", {
      clientId: "client_123",
    });
    expect(sendClientFormAssignmentEmail).toHaveBeenCalledTimes(1);
    expect(sendClientFormAssignmentEmail).toHaveBeenCalledWith({
      to: "family@example.com",
      familyName: "Rivera",
      childName: "Nora Rivera",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      dueDate: "2026-05-10",
      accessUrl:
        "http://localhost:3000/forms/foundations-autism/aba-history/access?token=abc123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/forms/custom");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal/preview");
  });

  it("submits a public form and sends the provider review email with a rebased dashboard link", async () => {
    getStoredFormAccessToken.mockResolvedValue("token_123");
    mutateConvexUnauthenticated.mockResolvedValue({
      submissionId: "submission_123",
      clientId: "client_123",
      providerEmail: "provider@example.com",
      providerAgencyName: "Foundations Autism",
      formTitle: "ABA History",
      clientName: "Nora Rivera",
      providerSlug: "foundations-autism",
    });

    const result = await submitPublicForm({
      providerSlug: "foundations-autism",
      formSlug: "aba-history",
      answers: {
        question_short_text: "Nora",
      },
      responderName: "Rivera Family",
      responderEmail: "family@example.com",
    });

    expect(result).toEqual({
      success: true,
      data: {
        submissionId: "submission_123",
      },
    });
    expect(getStoredFormAccessToken).toHaveBeenCalledWith(
      "foundations-autism",
      "aba-history",
    );
    expect(mutateConvexUnauthenticated).toHaveBeenCalledWith(
      "forms:submitPublicForm",
      expect.objectContaining({
        token: "token_123",
        responderName: "Rivera Family",
        responderEmail: "family@example.com",
      }),
    );
    expect(sendProviderFormSubmissionEmail).toHaveBeenCalledWith({
      to: "provider@example.com",
      agencyName: "Foundations Autism",
      formTitle: "ABA History",
      clientName: "Nora Rivera",
      responderName: "Rivera Family",
      submissionUrl:
        "http://localhost:3000/dashboard/forms/custom?tab=submissions&submissionId=submission_123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/forms/custom");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal/preview");
  });

  it("attaches an unassigned submission to a client and revalidates the client pages", async () => {
    mutateConvex.mockResolvedValue(undefined);

    const result = await attachFormSubmissionToClient({
      submissionId: "submission_123",
      clientId: "client_123",
    });

    expect(result).toEqual({ success: true });
    expect(mutateConvex).toHaveBeenCalledWith("forms:attachFormSubmissionToClient", {
      submissionId: "submission_123",
      clientId: "client_123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/forms/custom");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/clients/client_123/portal/preview");
  });

  it("archives and restores a form template through the convex mutations", async () => {
    mutateConvex.mockResolvedValue(undefined);

    const archiveResult = await archiveFormTemplate("template_123");
    const restoreResult = await restoreFormTemplate("template_123");

    expect(archiveResult).toEqual({ success: true });
    expect(restoreResult).toEqual({ success: true });
    expect(mutateConvex).toHaveBeenNthCalledWith(1, "forms:archiveFormTemplate", {
      templateId: "template_123",
    });
    expect(mutateConvex).toHaveBeenNthCalledWith(2, "forms:restoreFormTemplate", {
      templateId: "template_123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/forms/custom");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/forms/custom/template_123");
  });
});
