import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/client-portal", () => ({
  acceptPublicPortalInvite: vi.fn(),
  acknowledgePublicPortalDocument: vi.fn(),
  completePublicPortalTask: vi.fn(),
  deletePortalMessage: vi.fn(),
  deletePortalResource: vi.fn(),
  deletePortalTask: vi.fn(),
  deletePortalTool: vi.fn(),
  getPortalGuardianSignInPageLink: vi.fn(),
  getPublicPortalDocumentDownload: vi.fn(),
  markPublicPortalMessageRead: vi.fn(),
  savePortalDocumentShare: vi.fn(),
  savePortalGuardian: vi.fn(),
  savePortalMessage: vi.fn(),
  savePortalResource: vi.fn(),
  savePortalTask: vi.fn(),
  savePortalTool: vi.fn(),
  sendPortalGuardianMagicLink: vi.fn(),
  setClientPortalEnabled: vi.fn(),
  startPublicPortalTask: vi.fn(),
  submitPublicPortalUpload: vi.fn(),
  updatePublicPortalProfile: vi.fn(),
  uploadProviderPortalDocument: vi.fn(),
}));

import { ClientPortalManager } from "@/components/client-portal/client-portal-manager";
import { PublicClientPortal } from "@/components/client-portal/public-client-portal";
import type { ClientPortalData, PublicClientPortalData } from "@/lib/actions/client-portal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

const basePortalData: ClientPortalData = {
  client: {
    id: "client_123",
    name: "Milo Carter",
    status: "active",
  },
  branding: {
    agencyName: "North River ABA",
    planTier: "pro",
    website: "https://example.com",
    backgroundColor: "#0f766e",
    showPoweredBy: true,
    logoUrl: null,
    slug: "north-river-aba",
  },
  portal: {
    enabled: true,
    completionPercentage: 40,
    openTasks: 2,
    completedTasks: 1,
    overdueTasks: 0,
    dueSoonTasks: 1,
    guardiansReady: 1,
    guardiansTotal: 2,
    lastActivityAt: "2026-04-08T12:00:00.000Z",
    nextTaskId: "task_1",
    nextTaskTitle: "Upload your insurance card",
    unreadMessages: 2,
  },
  guardians: [
    {
      id: "guardian_1",
      name: "Jordan Carter",
      firstName: "Jordan",
      lastName: "Carter",
      relationship: "parent",
      email: "jordan@example.com",
      phone: "555-111-2222",
      isPrimary: true,
      accessStatus: "active",
      notificationsEnabled: true,
      invitedAt: "2026-04-06T12:00:00.000Z",
      acceptedAt: "2026-04-07T12:00:00.000Z",
      revokedAt: null,
      lastViewedAt: "2026-04-08T12:00:00.000Z",
    },
    {
      id: "guardian_2",
      name: "Sam Carter",
      firstName: "Sam",
      lastName: "Carter",
      relationship: "guardian",
      email: "sam@example.com",
      phone: null,
      isPrimary: false,
      accessStatus: "invited",
      notificationsEnabled: true,
      invitedAt: "2026-04-07T12:00:00.000Z",
      acceptedAt: null,
      revokedAt: null,
      lastViewedAt: null,
    },
  ],
  tasks: [
    {
      id: "task_1",
      title: "Upload your insurance card",
      instructions: "Please upload the front and back of the current card.",
      dueDate: "2026-04-10",
      category: "insurance",
      taskType: "template",
      completionMethod: "document_upload",
      status: "pending",
      visibility: "action_required",
      reminderRule: null,
      templateSource: "insurance upload",
      externalUrl: null,
      linkedDocumentId: null,
      linkedToolId: null,
      requiredDocumentType: "insurance",
      completionNote: null,
      completedAt: null,
      completedByGuardianId: null,
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
    {
      id: "task_2",
      title: "Review the consent packet",
      instructions: "Open the packet and confirm you reviewed it.",
      dueDate: "2026-04-12",
      category: "policy",
      taskType: "template",
      completionMethod: "acknowledge_document",
      status: "in_progress",
      visibility: "action_required",
      reminderRule: null,
      templateSource: "policy acknowledgement",
      externalUrl: null,
      linkedDocumentId: "doc_1",
      linkedToolId: null,
      requiredDocumentType: null,
      completionNote: null,
      completedAt: null,
      completedByGuardianId: null,
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  documents: [
    {
      id: "doc_1",
      label: "Family consent packet",
      category: "agreement",
      note: "Please review and acknowledge this packet.",
      visibility: "action_required",
      acknowledgementRequired: true,
      acknowledgedByGuardianIds: [],
      fileId: "file_1",
      filename: "consent.pdf",
      mimeType: "application/pdf",
      byteSize: 1024,
      uploadSource: "dashboard",
      linkedTaskId: "task_2",
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  messages: [
    {
      id: "msg_1",
      subject: "Welcome to the portal",
      body: "You can complete tasks and review updates here.",
      preview: "You can complete tasks and review updates here.",
      messageType: "general_update",
      audience: "client",
      emailNotify: true,
      readByGuardianIds: [],
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  resources: [
    {
      id: "resource_1",
      title: "Getting started with ABA",
      description: "A plain-language walkthrough for families.",
      href: "https://example.com/resource",
      category: "education",
      recommendedStage: "intake",
      pinned: true,
      visibility: "visible",
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  connectedTools: [
    {
      id: "tool_1",
      name: "Hi Rasmus",
      description: "Use this for billing questions.",
      url: "https://billing.example.com",
      category: "billing",
      whenToUse: "Open this when you need invoices or payment links.",
      logoLabel: null,
      visibility: "visible",
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  activity: [
    {
      id: "activity_1",
      title: "Guardian invited",
      description: "Jordan Carter received access.",
      actorType: "provider",
      actorName: "North River ABA",
      entityType: "guardian",
      entityId: "guardian_1",
      createdAt: "2026-04-08T12:00:00.000Z",
    },
  ],
  profile: {
    phone: "555-111-2222",
    email: "jordan@example.com",
    streetAddress: "123 Main St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    insuranceName: "Aetna",
    insuranceMemberId: "ABC123",
    insuranceGroupNumber: "GROUP9",
    emergencyContactName: "Taylor Carter",
    emergencyContactPhone: "555-111-3333",
    emergencyContactRelationship: "Grandparent",
    childName: "Milo Carter",
    childDateOfBirth: "2020-01-01",
  },
};

const publicPortalData: PublicClientPortalData = {
  ...basePortalData,
  guardian: basePortalData.guardians[0],
  portal: {
    ...basePortalData.portal,
    inviteAccepted: true,
  },
};

const publicPortalDataWithCompletedForm: PublicClientPortalData = {
  ...publicPortalData,
  portal: {
    ...publicPortalData.portal,
    completedTasks: 2,
  },
  tasks: [
    ...publicPortalData.tasks,
    {
      id: "task_3",
      title: "Complete medical history form",
      instructions: "Fill out the medical history form so the care team can review it.",
      dueDate: "2026-04-11",
      category: "forms",
      taskType: "form_completion",
      completionMethod: "external_link",
      status: "completed",
      visibility: "action_required",
      reminderRule: null,
      templateSource: "custom form",
      formKey: null,
      externalUrl: "https://example.com/forms/medical-history",
      linkedDocumentId: null,
      linkedToolId: null,
      submittedDocumentId: null,
      requiredDocumentType: null,
      completionNote: null,
      completedAt: "2026-04-10T12:00:00.000Z",
      completedByGuardianId: "guardian_1",
      createdAt: "2026-04-08T12:00:00.000Z",
      updatedAt: "2026-04-10T12:00:00.000Z",
    },
  ],
};

describe("client portal UI", () => {
  it("renders the provider portal manager overview", () => {
    render(<ClientPortalManager data={basePortalData} />);

    expect(screen.getByRole("heading", { name: /milo carter/i })).toBeInTheDocument();
    expect(screen.getByText(/^client portal$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy sign-in page link/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /preview family view/i })).toBeInTheDocument();
  });

  it("renders the public family portal task-first experience", () => {
    render(<PublicClientPortal slug="north-river-aba" data={publicPortalData} />);

    expect(
      screen.getByRole("heading", { name: /client portal/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/upload your insurance card/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /continue/i }).length).toBeGreaterThan(0);
  });

  it("shows completed form submissions inside completed tasks", () => {
    render(
      <PublicClientPortal
        slug="north-river-aba"
        data={publicPortalDataWithCompletedForm}
      />,
    );

    const completedTasksTrigger = screen.getByRole("button", { name: /completed tasks/i });
    fireEvent.click(completedTasksTrigger);

    expect(screen.getByText(/completed tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/complete medical history form/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view submission/i })).toBeInTheDocument();
    expect(screen.getAllByText(/assigned apr 8, 2026/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/completed apr 10, 2026/i).length).toBeGreaterThan(0);
  });
});
