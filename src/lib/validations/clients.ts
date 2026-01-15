import { z } from "zod";

// =============================================================================
// ENUM OPTIONS & CONSTANTS
// =============================================================================

export const CLIENT_STATUS_OPTIONS = [
  { value: "inquiry", label: "Inquiry", color: "blue" },
  { value: "intake_pending", label: "Intake Pending", color: "purple" },
  { value: "waitlist", label: "Waitlist", color: "amber" },
  { value: "assessment", label: "Assessment", color: "orange" },
  { value: "active", label: "Active", color: "green" },
  { value: "on_hold", label: "On Hold", color: "yellow" },
  { value: "discharged", label: "Discharged", color: "gray" },
] as const;

export const CLIENT_FUNDING_SOURCE_OPTIONS = [
  { value: "insurance", label: "Insurance" },
  { value: "regional_center", label: "Regional Center" },
  { value: "school_district", label: "School District" },
  { value: "private_pay", label: "Private Pay" },
  { value: "medicaid_waiver", label: "Medicaid Waiver" },
] as const;

export const PARENT_RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "stepmother", label: "Stepmother" },
  { value: "stepfather", label: "Stepfather" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Other" },
] as const;

export const INSURANCE_TYPE_OPTIONS = [
  { value: "commercial", label: "Commercial" },
  { value: "medicaid", label: "Medicaid" },
  { value: "managed_medicaid", label: "Managed Medicaid" },
  { value: "tricare", label: "TRICARE" },
] as const;

export const INSURANCE_STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "green" },
  { value: "inactive", label: "Inactive", color: "gray" },
  { value: "pending_verification", label: "Pending Verification", color: "yellow" },
] as const;

export const SUBSCRIBER_RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
] as const;

export const AUTH_PAYOR_TYPE_OPTIONS = [
  { value: "insurance", label: "Insurance" },
  { value: "regional_center", label: "Regional Center" },
  { value: "school_district", label: "School District" },
  { value: "private_pay", label: "Private Pay" },
] as const;

export const AUTH_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "gray" },
  { value: "submitted", label: "Submitted", color: "blue" },
  { value: "approved", label: "Approved", color: "green" },
  { value: "denied", label: "Denied", color: "red" },
  { value: "expired", label: "Expired", color: "orange" },
  { value: "exhausted", label: "Exhausted", color: "amber" },
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "insurance_card", label: "Insurance Card" },
  { value: "assessment", label: "Assessment" },
  { value: "iep", label: "IEP" },
  { value: "medical_records", label: "Medical Records" },
  { value: "consent", label: "Consent Form" },
  { value: "other", label: "Other" },
] as const;

export const TASK_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
] as const;

export const CONTACT_TYPE_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "fax", label: "Fax" },
  { value: "address", label: "Address" },
] as const;

export const CONTACT_RELATIONSHIP_TYPE_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "emergency", label: "Emergency Contact" },
  { value: "physician", label: "Physician" },
  { value: "school", label: "School Contact" },
  { value: "therapist", label: "Other Therapist" },
  { value: "other", label: "Other" },
] as const;

// Common ABA billing codes
export const BILLING_CODE_OPTIONS = [
  { value: "97151", label: "97151 - Assessment" },
  { value: "97152", label: "97152 - Assessment (Supporting)" },
  { value: "97153", label: "97153 - Adaptive Behavior Treatment" },
  { value: "97154", label: "97154 - Group Adaptive Behavior Treatment" },
  { value: "97155", label: "97155 - Adaptive Behavior Treatment w/ Modification" },
  { value: "97156", label: "97156 - Family Adaptive Behavior Guidance" },
  { value: "97157", label: "97157 - Multiple-Family Group Guidance" },
  { value: "97158", label: "97158 - Group Adaptive Behavior Treatment (Supervision)" },
  { value: "0362T", label: "0362T - Behavior ID Assessment" },
  { value: "0373T", label: "0373T - Adaptive Behavior Treatment w/ Protocol Modification" },
] as const;

// Referral source options
export const REFERRAL_SOURCE_OPTIONS = [
  { value: "pediatrician", label: "Pediatrician" },
  { value: "school", label: "School" },
  { value: "regional_center", label: "Regional Center" },
  { value: "web_search", label: "Web Search" },
  { value: "social_media", label: "Social Media" },
  { value: "word_of_mouth", label: "Word of Mouth" },
  { value: "insurance_referral", label: "Insurance Referral" },
  { value: "existing_client", label: "Existing Client Referral" },
  { value: "other", label: "Other" },
] as const;

// Grade level options
export const GRADE_LEVEL_OPTIONS = [
  { value: "not_in_school", label: "Not in School" },
  { value: "early_intervention", label: "Early Intervention (0-3)" },
  { value: "preschool", label: "Preschool" },
  { value: "transitional_k", label: "Transitional Kindergarten" },
  { value: "kindergarten", label: "Kindergarten" },
  { value: "1st", label: "1st Grade" },
  { value: "2nd", label: "2nd Grade" },
  { value: "3rd", label: "3rd Grade" },
  { value: "4th", label: "4th Grade" },
  { value: "5th", label: "5th Grade" },
  { value: "6th", label: "6th Grade" },
  { value: "7th", label: "7th Grade" },
  { value: "8th", label: "8th Grade" },
  { value: "9th", label: "9th Grade" },
  { value: "10th", label: "10th Grade" },
  { value: "11th", label: "11th Grade" },
  { value: "12th", label: "12th Grade" },
  { value: "post_secondary", label: "Post-Secondary" },
] as const;

// Location label presets
export const LOCATION_LABEL_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "school", label: "School" },
  { value: "clinic", label: "Clinic" },
  { value: "daycare", label: "Daycare" },
  { value: "grandparents", label: "Grandparents' Home" },
  { value: "other", label: "Other" },
] as const;

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

// Client status type
export const clientStatusSchema = z.enum([
  "inquiry",
  "intake_pending",
  "waitlist",
  "assessment",
  "active",
  "on_hold",
  "discharged",
]);

export const fundingSourceSchema = z.enum([
  "insurance",
  "regional_center",
  "school_district",
  "private_pay",
  "medicaid_waiver",
]);

export const parentRelationshipSchema = z.enum([
  "mother",
  "father",
  "stepmother",
  "stepfather",
  "guardian",
  "grandparent",
  "other",
]);

export const insuranceTypeSchema = z.enum([
  "commercial",
  "medicaid",
  "managed_medicaid",
  "tricare",
]);

export const insuranceStatusSchema = z.enum([
  "active",
  "inactive",
  "pending_verification",
]);

export const subscriberRelationshipSchema = z.enum([
  "self",
  "spouse",
  "child",
  "other",
]);

export const authPayorTypeSchema = z.enum([
  "insurance",
  "regional_center",
  "school_district",
  "private_pay",
]);

export const authStatusSchema = z.enum([
  "pending",
  "submitted",
  "approved",
  "denied",
  "expired",
  "exhausted",
]);

export const documentTypeSchema = z.enum([
  "insurance_card",
  "assessment",
  "iep",
  "medical_records",
  "consent",
  "other",
]);

export const taskStatusSchema = z.enum(["pending", "completed"]);

export const contactTypeSchema = z.enum(["phone", "email", "fax", "address"]);

export const contactRelationshipTypeSchema = z.enum([
  "parent",
  "guardian",
  "emergency",
  "physician",
  "school",
  "therapist",
  "other",
]);

// =============================================================================
// ENTITY SCHEMAS
// =============================================================================

// Parent schema
export const clientParentSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().max(100).optional().or(z.literal("")),
  last_name: z.string().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  relationship: parentRelationshipSchema.optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

// Location schema
export const clientLocationSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(100).optional().or(z.literal("")),
  street_address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postal_code: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code")
    .optional()
    .or(z.literal("")),
  country: z.string().max(2).default("US"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  place_id: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

// Insurance schema
export const clientInsuranceSchema = z.object({
  id: z.string().uuid().optional(),
  insurance_name: z.string().max(200).optional().or(z.literal("")),
  insurance_type: insuranceTypeSchema.optional(),
  is_primary: z.boolean().default(false),
  effective_date: z.string().optional().or(z.literal("")),
  expiration_date: z.string().optional().or(z.literal("")),
  member_id: z.string().max(100).optional().or(z.literal("")),
  group_number: z.string().max(100).optional().or(z.literal("")),
  plan_name: z.string().max(200).optional().or(z.literal("")),
  subscriber_relationship: subscriberRelationshipSchema.optional(),
  status: insuranceStatusSchema.default("pending_verification"),
  copay_amount: z.number().min(0).optional(),
  coinsurance_percentage: z.number().min(0).max(100).optional(),
  deductible_total: z.number().min(0).optional(),
  deductible_remaining: z.number().min(0).optional(),
  oop_max_total: z.number().min(0).optional(),
  oop_max_remaining: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  sort_order: z.number().int().default(0),
});

// Authorization schema
export const clientAuthorizationSchema = z.object({
  id: z.string().uuid().optional(),
  insurance_id: z.string().uuid().optional().or(z.literal("")),
  payor_type: authPayorTypeSchema.optional(),
  service_type: z.string().max(100).optional().or(z.literal("")),
  billing_code: z.string().max(20).optional().or(z.literal("")),
  treatment_requested: z.string().max(500).optional().or(z.literal("")),
  units_requested: z.number().int().min(0).optional(),
  units_used: z.number().int().min(0).default(0),
  units_per_week_authorized: z.number().int().min(0).optional(),
  rate_per_unit: z.number().min(0).optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  status: authStatusSchema.default("pending"),
  auth_reference_number: z.string().max(100).optional().or(z.literal("")),
  requires_prior_auth: z.boolean().default(false),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

// Document schema
export const clientDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  document_type: documentTypeSchema.optional(),
  label: z.string().max(200).optional().or(z.literal("")),
  url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  file_path: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  sort_order: z.number().int().default(0),
});

// Task schema
export const clientTaskSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(10000).optional().or(z.literal("")),
  status: taskStatusSchema.default("pending"),
  due_date: z.string().optional().or(z.literal("")),
  reminder_at: z.string().optional().or(z.literal("")),
});

// Contact schema
export const clientContactSchema = z.object({
  id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().or(z.literal("")),
  contact_type: contactTypeSchema.optional(),
  relationship_type: contactRelationshipTypeSchema.optional(),
  label: z.string().max(100).optional().or(z.literal("")),
  value: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

// =============================================================================
// MAIN CLIENT SCHEMA
// =============================================================================

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional().or(z.literal("")),
  inquiry_id: z.string().uuid().optional().or(z.literal("")),

  // Status and workflow
  status: clientStatusSchema.default("inquiry"),
  referral_source: z.string().max(100).optional().or(z.literal("")),
  referral_date: z.string().optional().or(z.literal("")),
  service_start_date: z.string().optional().or(z.literal("")),
  service_end_date: z.string().optional().or(z.literal("")),
  discharge_reason: z.string().max(500).optional().or(z.literal("")),
  funding_source: fundingSourceSchema.optional(),
  preferred_language: z.string().max(50).optional().or(z.literal("")),

  // Child information
  child_first_name: z.string().max(100).optional().or(z.literal("")),
  child_last_name: z.string().max(100).optional().or(z.literal("")),
  child_date_of_birth: z.string().optional().or(z.literal("")),
  child_diagnosis: z.array(z.string()).default([]),
  child_diagnosis_codes: z.array(z.string()).default([]),
  child_diagnosis_date: z.string().optional().or(z.literal("")),
  child_primary_concerns: z.string().max(5000).optional().or(z.literal("")),
  child_aba_history: z.string().max(5000).optional().or(z.literal("")),
  child_school_name: z.string().max(200).optional().or(z.literal("")),
  child_school_district: z.string().max(200).optional().or(z.literal("")),
  child_grade_level: z.string().max(50).optional().or(z.literal("")),
  child_other_therapies: z.string().max(2000).optional().or(z.literal("")),
  child_pediatrician_name: z.string().max(200).optional().or(z.literal("")),
  child_pediatrician_phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),

  // General notes
  notes: z.string().max(10000).optional().or(z.literal("")),
});

// Full client with related entities (for forms)
export const clientWithRelatedSchema = clientSchema.extend({
  parents: z.array(clientParentSchema).default([]),
  locations: z.array(clientLocationSchema).default([]),
  insurances: z.array(clientInsuranceSchema).default([]),
  authorizations: z.array(clientAuthorizationSchema).default([]),
  documents: z.array(clientDocumentSchema).default([]),
  tasks: z.array(clientTaskSchema).default([]),
  contacts: z.array(clientContactSchema).default([]),
});

// =============================================================================
// PUBLIC INTAKE FORM SCHEMA (Simplified subset for parents to fill)
// =============================================================================

export const publicClientIntakeSchema = z.object({
  // Parent info (required)
  parent_first_name: z.string().min(1, "First name is required").max(100),
  parent_last_name: z.string().min(1, "Last name is required").max(100),
  parent_phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-\(\)\+]+$/, "Please enter a valid phone number"),
  parent_email: z.string().email("Please enter a valid email"),
  parent_relationship: parentRelationshipSchema.optional(),

  // Child info
  child_first_name: z.string().min(1, "Child's first name is required").max(100),
  child_last_name: z.string().max(100).optional().or(z.literal("")),
  child_date_of_birth: z.string().optional().or(z.literal("")),
  child_diagnosis: z.array(z.string()).default([]),
  child_primary_concerns: z.string().max(5000).optional().or(z.literal("")),

  // Insurance info (optional)
  insurance_name: z.string().max(200).optional().or(z.literal("")),
  member_id: z.string().max(100).optional().or(z.literal("")),

  // Location (optional)
  street_address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postal_code: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code")
    .optional()
    .or(z.literal("")),
  place_id: z.string().optional().or(z.literal("")),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Additional notes
  notes: z.string().max(5000).optional().or(z.literal("")),

  // Turnstile token
  turnstileToken: z.string().min(1, "Please complete the verification"),
});

// =============================================================================
// FILTER/SEARCH SCHEMAS
// =============================================================================

export const clientFiltersSchema = z.object({
  status: z.array(clientStatusSchema).optional(),
  search: z.string().optional(),
  insuranceName: z.string().optional(),
  fundingSource: fundingSourceSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const clientSortSchema = z.object({
  field: z.enum([
    "child_first_name",
    "child_last_name",
    "status",
    "created_at",
    "updated_at",
    "service_start_date",
  ]),
  direction: z.enum(["asc", "desc"]),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ClientStatus = z.infer<typeof clientStatusSchema>;
export type FundingSource = z.infer<typeof fundingSourceSchema>;
export type ParentRelationship = z.infer<typeof parentRelationshipSchema>;
export type InsuranceType = z.infer<typeof insuranceTypeSchema>;
export type InsuranceStatus = z.infer<typeof insuranceStatusSchema>;
export type SubscriberRelationship = z.infer<typeof subscriberRelationshipSchema>;
export type AuthPayorType = z.infer<typeof authPayorTypeSchema>;
export type AuthStatus = z.infer<typeof authStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ContactType = z.infer<typeof contactTypeSchema>;
export type ContactRelationshipType = z.infer<typeof contactRelationshipTypeSchema>;

export type ClientParent = z.infer<typeof clientParentSchema>;
export type ClientLocation = z.infer<typeof clientLocationSchema>;
export type ClientInsurance = z.infer<typeof clientInsuranceSchema>;
export type ClientAuthorization = z.infer<typeof clientAuthorizationSchema>;
export type ClientDocument = z.infer<typeof clientDocumentSchema>;
export type ClientTask = z.infer<typeof clientTaskSchema>;
export type ClientContact = z.infer<typeof clientContactSchema>;

export type Client = z.infer<typeof clientSchema>;
export type ClientWithRelated = z.infer<typeof clientWithRelatedSchema>;
export type PublicClientIntake = z.infer<typeof publicClientIntakeSchema>;
export type ClientFilters = z.infer<typeof clientFiltersSchema>;
export type ClientSort = z.infer<typeof clientSortSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get display name for a client (child's name or "Unnamed Client")
 */
export function getClientDisplayName(client: Partial<Client>): string {
  const firstName = client.child_first_name?.trim();
  const lastName = client.child_last_name?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return "Unnamed Client";
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ClientStatus): string {
  const option = CLIENT_STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.color || "gray";
}

/**
 * Get insurance status badge color
 */
export function getInsuranceStatusColor(status: InsuranceStatus): string {
  const option = INSURANCE_STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.color || "gray";
}

/**
 * Get authorization status badge color
 */
export function getAuthStatusColor(status: AuthStatus): string {
  const option = AUTH_STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.color || "gray";
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Calculate days until authorization expires
 */
export function getDaysUntilAuthExpires(endDate: string): number | null {
  if (!endDate) return null;

  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get authorization days color based on days remaining
 */
export function getAuthDaysColor(daysRemaining: number | null): string {
  if (daysRemaining === null) return "gray";
  if (daysRemaining <= 0) return "red";
  if (daysRemaining <= 7) return "orange";
  if (daysRemaining <= 30) return "amber";
  return "green";
}
