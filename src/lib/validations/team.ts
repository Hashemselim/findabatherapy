import { z } from "zod";

// =============================================================================
// TEAM MEMBER VALIDATION
// =============================================================================

export const teamMemberSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().max(100).optional().nullable(),
  email: z.string().email("Invalid email").max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  hired_date: z.string().optional().nullable(),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

// =============================================================================
// CREDENTIAL VALIDATION
// =============================================================================

export const teamCredentialSchema = z.object({
  credential_name: z.string().min(1, "Credential name is required").max(200),
  expiration_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type TeamCredentialInput = z.infer<typeof teamCredentialSchema>;

// =============================================================================
// DOCUMENT VALIDATION
// =============================================================================

export const teamDocumentSchema = z.object({
  label: z.string().min(1, "Label is required").max(200),
  url: z.string().url("Invalid URL").max(2000).optional().nullable().or(z.literal("")),
  file_path: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type TeamDocumentInput = z.infer<typeof teamDocumentSchema>;

// =============================================================================
// TEAM TASK VALIDATION (reuses client task pattern)
// =============================================================================

export const teamTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(5000).optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  due_date: z.string().optional().nullable(),
});

export type TeamTaskInput = z.infer<typeof teamTaskSchema>;

// =============================================================================
// ROLE OPTIONS
// =============================================================================

export const TEAM_ROLE_OPTIONS = [
  { value: "bcba", label: "BCBA" },
  { value: "bcaba", label: "BCaBA" },
  { value: "rbt", label: "RBT" },
  { value: "bt", label: "Behavior Technician" },
  { value: "clinical_director", label: "Clinical Director" },
  { value: "office_manager", label: "Office Manager" },
  { value: "admin", label: "Administrative" },
  { value: "other", label: "Other" },
] as const;
