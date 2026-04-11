import { format } from "date-fns";

import { TASK_TYPE_OPTIONS } from "./portal-constants";

export function formatDate(value: string | null | undefined) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return format(date, "MMM d, yyyy");
}

export function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "submitted") return "info" as const;
  if (status === "cancelled") return "default" as const;
  if (status === "in_progress") return "warning" as const;
  return "warning" as const;
}

export function taskTypeLabel(taskType: string) {
  return TASK_TYPE_OPTIONS.find((o) => o.value === taskType)?.label ?? taskType.replaceAll("_", " ");
}

export function getDocumentSourceMeta(uploadSource: string) {
  switch (uploadSource) {
    case "portal_family":
      return { label: "Family upload", tone: "info" as const };
    case "intake_form":
      return { label: "Intake upload", tone: "default" as const };
    default:
      return { label: "Provider shared", tone: "success" as const };
  }
}

export function normalizeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function messageTypeLabel(messageType: string) {
  return messageType.replaceAll("_", " ");
}
