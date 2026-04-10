import { describe, expect, it } from "vitest";

import type { ClientDetail } from "@/lib/actions/clients";

import { buildClientPortalSummary } from "./client-portal";

function createClientDetail(overrides: Partial<ClientDetail> = {}): ClientDetail {
  return {
    id: "client-1",
    profile_id: "profile-1",
    listing_id: "",
    inquiry_id: "",
    status: "intake_pending",
    referral_source: "",
    referral_source_other: "",
    referral_date: "",
    service_start_date: "",
    service_end_date: "",
    discharge_reason: "",
    funding_source: "insurance",
    preferred_language: "English",
    child_first_name: "Avery",
    child_last_name: "Lee",
    child_date_of_birth: "2019-04-10",
    child_diagnosis: [],
    child_diagnosis_codes: [],
    child_diagnosis_date: "",
    child_primary_concerns: "",
    child_aba_history: "",
    child_school_name: "",
    child_school_district: "",
    child_grade_level: "",
    child_other_therapies: "",
    child_pediatrician_name: "",
    child_pediatrician_phone: "",
    notes: "",
    created_at: "2026-04-01T09:00:00.000Z",
    updated_at: "2026-04-02T09:00:00.000Z",
    parents: [],
    locations: [],
    insurances: [],
    authorizations: [],
    documents: [],
    tasks: [],
    contacts: [],
    ...overrides,
  };
}

describe("buildClientPortalSummary", () => {
  it("picks the earliest actionable task and calculates counts", () => {
    const client = createClientDetail({
      parents: [
        {
          id: "parent-1",
          created_at: "2026-04-01T09:00:00.000Z",
          first_name: "Jamie",
          last_name: "Lee",
          relationship: "mother",
          phone: "(555) 111-1111",
          email: "jamie@example.com",
          notes: "",
          is_primary: true,
          sort_order: 0,
        },
      ],
      tasks: [
        {
          id: "task-1",
          client_id: "client-1",
          created_at: "2026-04-02T09:00:00.000Z",
          completed_at: null,
          title: "Upload insurance card",
          content: "Take a clear photo of both sides.",
          status: "pending",
          due_date: "2026-04-10",
          reminder_at: "",
        },
        {
          id: "task-2",
          client_id: "client-1",
          created_at: "2026-04-03T09:00:00.000Z",
          completed_at: null,
          title: "Review consent packet",
          content: "",
          status: "in_progress",
          due_date: "2026-04-09",
          reminder_at: "",
        },
        {
          id: "task-3",
          client_id: "client-1",
          created_at: "2026-04-01T09:00:00.000Z",
          completed_at: "2026-04-04T09:00:00.000Z",
          title: "Confirm family contact info",
          content: "",
          status: "completed",
          due_date: "2026-04-08",
          reminder_at: "",
        },
      ],
      documents: [
        {
          id: "doc-1",
          created_at: "2026-04-05T09:00:00.000Z",
          document_type: "insurance_card",
          label: "Insurance card",
          url: "",
          file_path: "docs/card.pdf",
          file_name: "card.pdf",
          file_description: "Shared by provider",
          file_size: 1000,
          file_type: "application/pdf",
          upload_source: "dashboard",
          uploaded_by: undefined,
          notes: "",
          sort_order: 0,
        },
      ],
    });

    const summary = buildClientPortalSummary(client, new Date("2026-04-08T12:00:00.000Z"));

    expect(summary.portalStatus).toBe("ready");
    expect(summary.remainingTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.completionPercentage).toBe(33);
    expect(summary.dueSoonTasks).toBe(2);
    expect(summary.overdueTasks).toBe(0);
    expect(summary.nextTask?.id).toBe("task-2");
    expect(summary.nextTask?.dueLabel).toBe("Due tomorrow");
    expect(summary.updates[0]?.id).toBe("document-doc-1");
  });

  it("flags setup work when no guardian email is available", () => {
    const client = createClientDetail({
      parents: [
        {
          id: "parent-1",
          created_at: "2026-04-01T09:00:00.000Z",
          first_name: "Alex",
          last_name: "Rivera",
          relationship: "guardian",
          phone: "(555) 111-2222",
          email: "",
          notes: "",
          is_primary: true,
          sort_order: 0,
        },
      ],
    });

    const summary = buildClientPortalSummary(client, new Date("2026-04-08T12:00:00.000Z"));

    expect(summary.portalStatus).toBe("setup_required");
    expect(summary.portalStatusLabel).toBe("Needs guardian email");
    expect(summary.nextStepLabel).toBe("Add a guardian email to enable family access.");
    expect(summary.completionPercentage).toBe(100);
  });
});
