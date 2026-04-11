export const TASK_TYPE_OPTIONS = [
  { value: "form_completion", label: "Form Completion" },
  { value: "file_upload", label: "File Upload" },
  { value: "review_and_sign", label: "Review & Sign" },
  { value: "custom_task", label: "Custom Task" },
] as const;

export const FORM_OPTIONS = [{ value: "intake", label: "Intake Form" }] as const;

export const FILE_TYPE_OPTIONS = [
  { value: "insurance_card", label: "Insurance Card" },
  { value: "diagnosis_report", label: "Diagnosis Report" },
  { value: "referral", label: "Physician Referral" },
  { value: "iep", label: "IEP" },
  { value: "medical_records", label: "Medical Records" },
  { value: "administrative", label: "Administrative File" },
  { value: "other", label: "Other" },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "visible", label: "Visible" },
  { value: "action_required", label: "Action required" },
] as const;

export const MESSAGE_TYPE_OPTIONS = [
  { value: "general_update", label: "General update" },
  { value: "reminder", label: "Reminder" },
  { value: "policy_update", label: "Policy update" },
  { value: "important_notice", label: "Important notice" },
  { value: "celebration", label: "Celebration / check-in" },
] as const;

export const ACCESS_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
] as const;
