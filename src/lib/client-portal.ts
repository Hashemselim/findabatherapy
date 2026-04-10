import { differenceInCalendarDays, format } from "date-fns";

import type { ClientDetail } from "@/lib/actions/clients";
import {
  DOCUMENT_TYPE_OPTIONS,
  PARENT_RELATIONSHIP_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/validations/clients";

type PortalStatus = "ready" | "setup_required";
type PortalUpdateKind = "task" | "document";

const ACTIVE_TASK_STATUSES = new Set(["pending", "in_progress"]);

export interface ClientPortalGuardian {
  id: string;
  name: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  status: PortalStatus;
  statusLabel: string;
}

export interface ClientPortalUpdate {
  id: string;
  kind: PortalUpdateKind;
  title: string;
  description: string;
  timestamp: string;
}

export interface ClientPortalSummary {
  portalStatus: PortalStatus;
  portalStatusLabel: string;
  nextStepLabel: string;
  guardians: ClientPortalGuardian[];
  guardiansReadyCount: number;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  completionPercentage: number;
  overdueTasks: number;
  dueSoonTasks: number;
  documentCount: number;
  nextTask:
    | (ClientDetail["tasks"][number] & {
        dueLabel: string;
        statusLabel: string;
      })
    | null;
  updates: ClientPortalUpdate[];
  lastActivityAt: string | null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsedDateOnly = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateValue(value: string | null | undefined): number {
  return toDate(value)?.getTime() ?? Number.POSITIVE_INFINITY;
}

function getGuardianName(parent: ClientDetail["parents"][number]) {
  const fullName = [parent.first_name, parent.last_name].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  const relationshipLabel = PARENT_RELATIONSHIP_OPTIONS.find(
    (option) => option.value === parent.relationship
  )?.label;

  return relationshipLabel ?? "Guardian";
}

function getRelationshipLabel(parent: ClientDetail["parents"][number]) {
  return (
    PARENT_RELATIONSHIP_OPTIONS.find((option) => option.value === parent.relationship)?.label ??
    "Guardian"
  );
}

function getTaskStatusLabel(status: ClientDetail["tasks"][number]["status"]) {
  return TASK_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "To Do";
}

function getDocumentTypeLabel(documentType: ClientDetail["documents"][number]["document_type"]) {
  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === documentType)?.label ?? "Document";
}

export function getPortalDueLabel(
  dueDate: string | null | undefined,
  now: Date = new Date()
) {
  const parsedDueDate = toDate(dueDate);
  if (!parsedDueDate) {
    return "No due date";
  }

  const daysUntilDue = differenceInCalendarDays(parsedDueDate, now);

  if (daysUntilDue < 0) {
    return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`;
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue === 1) {
    return "Due tomorrow";
  }

  if (daysUntilDue <= 7) {
    return `Due in ${daysUntilDue} days`;
  }

  return `Due ${format(parsedDueDate, "MMM d")}`;
}

export function buildClientPortalSummary(
  client: ClientDetail,
  now: Date = new Date()
): ClientPortalSummary {
  const guardians = client.parents.map((parent) => {
    const hasEmail = Boolean(parent.email?.trim());

    return {
      id: parent.id,
      name: getGuardianName(parent),
      relationship: getRelationshipLabel(parent),
      email: parent.email?.trim() || null,
      phone: parent.phone?.trim() || null,
      status: hasEmail ? "ready" : "setup_required",
      statusLabel: hasEmail ? "Ready for access" : "Needs email",
    } satisfies ClientPortalGuardian;
  });

  const guardiansReadyCount = guardians.filter((guardian) => guardian.status === "ready").length;
  const portalStatus = guardiansReadyCount > 0 ? "ready" : "setup_required";
  const portalStatusLabel =
    portalStatus === "ready" ? "Ready for family access" : "Needs guardian email";

  const totalTasks = client.tasks.length;
  const completedTasks = client.tasks.filter((task) => task.status === "completed").length;
  const activeTasks = client.tasks
    .filter((task) => ACTIVE_TASK_STATUSES.has(task.status))
    .sort((left, right) => {
      const dueComparison = getDateValue(left.due_date) - getDateValue(right.due_date);
      if (dueComparison !== 0) {
        return dueComparison;
      }

      return getDateValue(left.created_at) - getDateValue(right.created_at);
    });
  const remainingTasks = activeTasks.length;

  const overdueTasks = activeTasks.filter((task) => {
    const dueDate = toDate(task.due_date);
    return dueDate ? differenceInCalendarDays(dueDate, now) < 0 : false;
  }).length;

  const dueSoonTasks = activeTasks.filter((task) => {
    const dueDate = toDate(task.due_date);
    if (!dueDate) {
      return false;
    }

    const daysUntilDue = differenceInCalendarDays(dueDate, now);
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  }).length;

  const completionPercentage =
    totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

  const nextTask = activeTasks[0]
    ? {
        ...activeTasks[0],
        dueLabel: getPortalDueLabel(activeTasks[0].due_date, now),
        statusLabel: getTaskStatusLabel(activeTasks[0].status),
      }
    : null;

  const updates = [
    ...client.tasks.map((task) => {
      const completed = task.status === "completed" && task.completed_at;
      const timestamp = completed ? task.completed_at! : task.created_at;

      return {
        id: `task-${task.id}`,
        kind: "task",
        title: completed ? `${task.title} completed` : `${task.title} assigned`,
        description: completed
          ? "This task was submitted and is ready for provider review."
          : task.content?.trim() || getPortalDueLabel(task.due_date, now),
        timestamp,
      } satisfies ClientPortalUpdate;
    }),
    ...client.documents.map((document) => ({
      id: `document-${document.id}`,
      kind: "document",
      title: `${document.label?.trim() || document.file_name?.trim() || getDocumentTypeLabel(document.document_type)} shared`,
      description:
        document.file_description?.trim() ||
        document.notes?.trim() ||
        "A document is available in your portal documents center.",
      timestamp: document.created_at,
    } satisfies ClientPortalUpdate)),
  ]
    .sort((left, right) => getDateValue(right.timestamp) - getDateValue(left.timestamp))
    .slice(0, 6);

  const lastActivityAt =
    updates[0]?.timestamp ??
    client.updated_at ??
    client.created_at ??
    null;

  let nextStepLabel = "All caught up.";
  if (portalStatus === "setup_required") {
    nextStepLabel = "Add a guardian email to enable family access.";
  } else if (nextTask) {
    nextStepLabel = `Families will land on "${nextTask.title}" first.`;
  }

  return {
    portalStatus,
    portalStatusLabel,
    nextStepLabel,
    guardians,
    guardiansReadyCount,
    totalTasks,
    completedTasks,
    remainingTasks,
    completionPercentage,
    overdueTasks,
    dueSoonTasks,
    documentCount: client.documents.length,
    nextTask,
    updates,
    lastActivityAt,
  };
}
