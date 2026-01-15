import { z } from "zod";

// =============================================================================
// POSITION AND EMPLOYMENT TYPE OPTIONS
// =============================================================================

export const POSITION_TYPES = [
  { value: "bcba", label: "BCBA", description: "Board Certified Behavior Analyst" },
  { value: "bcaba", label: "BCaBA", description: "Board Certified Assistant Behavior Analyst" },
  { value: "rbt", label: "RBT", description: "Registered Behavior Technician" },
  { value: "bt", label: "BT", description: "Behavior Technician (non-certified)" },
  { value: "clinical_director", label: "Clinical Director", description: "Oversees clinical operations" },
  { value: "regional_director", label: "Regional Director", description: "Multi-location oversight" },
  { value: "executive_director", label: "Executive Director", description: "Executive leadership" },
  { value: "admin", label: "Administrative", description: "Office, billing, scheduling" },
  { value: "other", label: "Other", description: "Other positions" },
] as const;

// Simplified position options for search (combines RBT/BT)
export const SEARCH_POSITION_OPTIONS = [
  { value: "bcba", label: "BCBA" },
  { value: "bcaba", label: "BCaBA" },
  { value: "rbt_bt", label: "RBT / Behavior Technician" },
  { value: "clinical_director", label: "Clinical Director" },
  { value: "regional_director", label: "Regional Director" },
  { value: "executive_director", label: "Executive Director" },
  { value: "admin", label: "Administrative" },
  { value: "other", label: "Other" },
] as const;

export type SearchPositionType = (typeof SEARCH_POSITION_OPTIONS)[number]["value"];

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "per_diem", label: "Per Diem" },
  { value: "internship", label: "Internship/Fieldwork" },
] as const;

export const SALARY_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "annual", label: "Annual" },
] as const;

export const BENEFITS_OPTIONS = [
  { value: "health_insurance", label: "Health Insurance" },
  { value: "dental_vision", label: "Dental & Vision" },
  { value: "pto", label: "Paid Time Off" },
  { value: "401k", label: "401(k)" },
  { value: "supervision", label: "BCBA Supervision (for RBTs)" },
  { value: "ceu_stipend", label: "CEU Stipend" },
  { value: "tuition_reimbursement", label: "Tuition Reimbursement" },
  { value: "signing_bonus", label: "Signing Bonus" },
  { value: "flexible_schedule", label: "Flexible Schedule" },
  { value: "mileage_reimbursement", label: "Mileage Reimbursement" },
] as const;

export const APPLICATION_SOURCES = [
  { value: "direct", label: "Direct Application" },
  { value: "careers_page", label: "Careers Page" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "referral", label: "Referral" },
  { value: "google", label: "Google Search" },
  { value: "other", label: "Other" },
] as const;

export const APPLICATION_STATUSES = [
  { value: "new", label: "New", color: "blue" },
  { value: "reviewed", label: "Reviewed", color: "gray" },
  { value: "phone_screen", label: "Phone Screen", color: "purple" },
  { value: "interview", label: "Interview", color: "orange" },
  { value: "offered", label: "Offered", color: "emerald" },
  { value: "hired", label: "Hired", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
] as const;

export const JOB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "filled", label: "Filled" },
  { value: "closed", label: "Closed" },
] as const;

// =============================================================================
// JOB FILTER OPTIONS (for search)
// =============================================================================

export const JOB_THERAPY_SETTINGS = [
  { value: "in_home", label: "In-Home" },
  { value: "in_center", label: "Center-Based" },
  { value: "school_based", label: "School-Based" },
  { value: "telehealth", label: "Telehealth" },
] as const;

export const JOB_SCHEDULE_TYPES = [
  { value: "daytime", label: "Daytime" },
  { value: "after_school", label: "After School" },
  { value: "evening", label: "Evening" },
] as const;

export const JOB_AGE_GROUPS = [
  { value: "early_intervention", label: "Early Intervention (0-3)" },
  { value: "preschool", label: "Preschool (3-5)" },
  { value: "school_age", label: "School-Age (6-12)" },
  { value: "teens", label: "Teens (13-17)" },
  { value: "adults", label: "Adults (18+)" },
] as const;

// Work location types for job posting form
export const WORK_LOCATION_TYPES = [
  { value: "existing", label: "Use existing location" },
  { value: "custom", label: "Custom location" },
  { value: "remote_only", label: "Fully remote (no physical location)" },
] as const;

// Service area types for remote/telehealth jobs
export const SERVICE_AREA_TYPES = [
  { value: "nationwide", label: "Nationwide - candidates from any state" },
  { value: "specific", label: "Specific states only" },
] as const;

// US States for multi-select
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington D.C." },
] as const;

export type WorkLocationType = (typeof WORK_LOCATION_TYPES)[number]["value"];
export type ServiceAreaType = (typeof SERVICE_AREA_TYPES)[number]["value"];
export type USStateCode = (typeof US_STATES)[number]["value"];

// Type exports
export type PositionType = (typeof POSITION_TYPES)[number]["value"];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]["value"];
export type SalaryType = (typeof SALARY_TYPES)[number]["value"];
export type BenefitType = (typeof BENEFITS_OPTIONS)[number]["value"];
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number]["value"];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["value"];
export type JobStatus = (typeof JOB_STATUSES)[number]["value"];
export type JobTherapySetting = (typeof JOB_THERAPY_SETTINGS)[number]["value"];
export type JobScheduleType = (typeof JOB_SCHEDULE_TYPES)[number]["value"];
export type JobAgeGroup = (typeof JOB_AGE_GROUPS)[number]["value"];

// =============================================================================
// JOB POSTING SCHEMAS
// =============================================================================

/**
 * Schema for creating a new job posting
 */
export const createJobPostingSchema = z.object({
  title: z
    .string()
    .min(5, "Job title must be at least 5 characters")
    .max(100, "Job title must be less than 100 characters"),

  positionType: z.enum(
    POSITION_TYPES.map((p) => p.value) as [string, ...string[]],
    { message: "Please select a position type" }
  ),

  employmentTypes: z
    .array(z.enum(EMPLOYMENT_TYPES.map((e) => e.value) as [string, ...string[]]))
    .min(1, "Please select at least one employment type"),

  locationId: z.string().uuid().optional().nullable(),

  // Custom location fields (alternative to locationId)
  customCity: z.string().max(100, "City must be less than 100 characters").optional().nullable(),
  customState: z.string().length(2, "State must be a 2-letter code").optional().nullable(),

  // Service states for remote/telehealth jobs
  // ['*'] = nationwide, ['NY', 'NJ'] = specific states, null = use location-based filtering
  serviceStates: z.array(z.string()).optional().nullable(),

  remoteOption: z.boolean().default(false),

  showSalary: z.boolean().default(false),

  salaryType: z.enum(SALARY_TYPES.map((s) => s.value) as [string, ...string[]]).optional().nullable(),

  salaryMin: z.number().int().min(0).optional().nullable(),

  salaryMax: z.number().int().min(0).optional().nullable(),

  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(10000, "Description must be less than 10,000 characters"),

  requirements: z.string().max(5000, "Requirements must be less than 5,000 characters").optional().nullable(),

  benefits: z
    .array(z.enum(BENEFITS_OPTIONS.map((b) => b.value) as [string, ...string[]]))
    .optional()
    .default([]),

  therapySettings: z
    .array(z.enum(JOB_THERAPY_SETTINGS.map((s) => s.value) as [string, ...string[]]))
    .optional()
    .default([]),

  scheduleTypes: z
    .array(z.enum(JOB_SCHEDULE_TYPES.map((s) => s.value) as [string, ...string[]]))
    .optional()
    .default([]),

  ageGroups: z
    .array(z.enum(JOB_AGE_GROUPS.map((a) => a.value) as [string, ...string[]]))
    .optional()
    .default([]),

  status: z.enum(["draft", "published"]).default("draft"),

  expiresAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    // If showing salary, salary type and min are required
    if (data.showSalary) {
      return data.salaryType && data.salaryMin !== null && data.salaryMin !== undefined;
    }
    return true;
  },
  {
    message: "Please provide salary type and minimum salary",
    path: ["salaryMin"],
  }
).refine(
  (data) => {
    // If max salary is provided, it should be >= min salary
    if (data.salaryMax !== null && data.salaryMax !== undefined && data.salaryMin !== null && data.salaryMin !== undefined) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  },
  {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salaryMax"],
  }
).refine(
  (data) => {
    // In-person jobs require a location (existing or custom)
    const inPersonSettings = ["in_home", "in_center", "school_based"];
    const hasInPersonSetting = data.therapySettings?.some(s => inPersonSettings.includes(s));

    if (hasInPersonSetting) {
      // Must have either locationId OR custom location
      const hasExistingLocation = data.locationId !== null && data.locationId !== undefined;
      const hasCustomLocation = data.customCity && data.customState;
      return hasExistingLocation || hasCustomLocation;
    }
    return true;
  },
  {
    message: "In-person jobs require a location. Please select an existing location or enter a custom one.",
    path: ["locationId"],
  }
).refine(
  (data) => {
    // If custom state is provided, custom city should also be provided
    if (data.customState && !data.customCity) {
      return false;
    }
    return true;
  },
  {
    message: "Please enter a city for the custom location",
    path: ["customCity"],
  }
);

/**
 * Base job posting schema without refinements (for .partial() compatibility)
 */
const baseJobPostingSchema = z.object({
  title: z
    .string()
    .min(5, "Job title must be at least 5 characters")
    .max(100, "Job title must be less than 100 characters"),

  positionType: z.enum(
    POSITION_TYPES.map((p) => p.value) as [string, ...string[]],
    { message: "Please select a position type" }
  ),

  employmentTypes: z
    .array(z.enum(EMPLOYMENT_TYPES.map((e) => e.value) as [string, ...string[]]))
    .min(1, "Please select at least one employment type"),

  locationId: z.string().uuid().optional().nullable(),

  customCity: z.string().max(100, "City must be less than 100 characters").optional().nullable(),
  customState: z.string().length(2, "State must be a 2-letter code").optional().nullable(),

  serviceStates: z.array(z.string()).optional().nullable(),

  remoteOption: z.boolean().default(false),

  showSalary: z.boolean().default(false),

  salaryType: z.enum(SALARY_TYPES.map((s) => s.value) as [string, ...string[]]).optional().nullable(),

  salaryMin: z.number().int().min(0).optional().nullable(),

  salaryMax: z.number().int().min(0).optional().nullable(),

  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(10000, "Description must be less than 10,000 characters"),

  requirements: z.string().max(5000, "Requirements must be less than 5,000 characters").optional().nullable(),

  benefits: z
    .array(z.enum(BENEFITS_OPTIONS.map((b) => b.value) as [string, ...string[]]))
    .optional()
    .default([]),

  therapySettings: z
    .array(z.enum(JOB_THERAPY_SETTINGS.map((s) => s.value) as [string, ...string[]]))
    .optional()
    .default([]),

  scheduleTypes: z
    .array(z.enum(JOB_SCHEDULE_TYPES.map((s) => s.value) as [string, ...string[]]))
    .optional()
    .default([]),

  ageGroups: z
    .array(z.enum(JOB_AGE_GROUPS.map((a) => a.value) as [string, ...string[]]))
    .optional()
    .default([]),

  status: z.enum(["draft", "published"]).default("draft"),

  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Schema for updating a job posting (partial, no refinements)
 */
export const updateJobPostingSchema = baseJobPostingSchema.partial();

/**
 * Schema for updating job status
 */
export const updateJobStatusSchema = z.object({
  status: z.enum(["draft", "published", "filled", "closed"]),
});

// =============================================================================
// APPLICATION SCHEMAS
// =============================================================================

/**
 * Schema for job application form (public submission)
 */
export const applicationFormSchema = z.object({
  applicantName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),

  applicantEmail: z
    .string()
    .email("Please enter a valid email address"),

  applicantPhone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]+$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),

  coverLetter: z
    .string()
    .max(5000, "Cover letter must be less than 5,000 characters")
    .optional()
    .or(z.literal("")),

  linkedinUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),

  source: z
    .enum(APPLICATION_SOURCES.map((s) => s.value) as [string, ...string[]])
    .optional()
    .default("direct"),

  // Honeypot field for spam protection
  website: z.string().optional(),
});

/**
 * Schema for updating application status (by provider)
 */
export const updateApplicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES.map((s) => s.value) as [string, ...string[]]),
});

/**
 * Schema for updating application notes/rating
 */
export const updateApplicationDetailsSchema = z.object({
  notes: z.string().max(5000, "Notes must be less than 5,000 characters").optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

// Type exports for form data
export type CreateJobPostingData = z.infer<typeof createJobPostingSchema>;
export type CreateJobPostingInput = z.input<typeof createJobPostingSchema>;
export type UpdateJobPostingData = z.infer<typeof updateJobPostingSchema>;
export type UpdateJobStatusData = z.infer<typeof updateJobStatusSchema>;
export type ApplicationFormData = z.infer<typeof applicationFormSchema>;
export type ApplicationFormInput = z.input<typeof applicationFormSchema>;
export type UpdateApplicationStatusData = z.infer<typeof updateApplicationStatusSchema>;
export type UpdateApplicationDetailsData = z.infer<typeof updateApplicationDetailsSchema>;

// =============================================================================
// RESUME VALIDATION
// =============================================================================

export const RESUME_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export type AllowedResumeType = (typeof ALLOWED_RESUME_TYPES)[number];

/**
 * Validate resume file type
 */
export function isValidResumeType(mimeType: string): mimeType is AllowedResumeType {
  return ALLOWED_RESUME_TYPES.includes(mimeType as AllowedResumeType);
}

/**
 * Validate resume file size
 */
export function isValidResumeSize(size: number): boolean {
  return size <= RESUME_MAX_SIZE;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : "";
}

/**
 * Generate storage path for resume
 * Format: {job_id}/{applicant_email_hash}/{timestamp}_{filename}
 */
export function generateResumePath(
  jobId: string,
  applicantEmail: string,
  filename: string
): string {
  // Simple hash of email for privacy
  const emailHash = applicantEmail
    .toLowerCase()
    .split("")
    .reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)
    .toString(16);

  const timestamp = Date.now();
  const ext = getFileExtension(filename);
  const safeFilename = `resume_${timestamp}${ext}`;

  return `${jobId}/${emailHash}/${safeFilename}`;
}

// =============================================================================
// JOB PLAN LIMITS
// =============================================================================

export const JOB_LIMITS = {
  free: 1,
  pro: 5,
  enterprise: 999, // Essentially unlimited
} as const;

export type PlanTier = keyof typeof JOB_LIMITS;

/**
 * Get job posting limit for a plan tier
 */
export function getJobLimit(tier: PlanTier): number {
  return JOB_LIMITS[tier];
}

/**
 * Check if provider can create more jobs
 */
export function canCreateJob(tier: PlanTier, currentJobCount: number): boolean {
  return currentJobCount < JOB_LIMITS[tier];
}

// =============================================================================
// LOCATION HELPERS
// =============================================================================

/**
 * Therapy settings that require a physical location
 */
export const IN_PERSON_THERAPY_SETTINGS: JobTherapySetting[] = ["in_home", "in_center", "school_based"];

/**
 * Check if therapy settings include in-person work
 */
export function hasInPersonSettings(settings: JobTherapySetting[] | undefined): boolean {
  if (!settings || settings.length === 0) return false;
  return settings.some(s => IN_PERSON_THERAPY_SETTINGS.includes(s));
}

/**
 * Check if a job has remote/telehealth settings
 */
export function hasRemoteSettings(settings: JobTherapySetting[] | undefined, remoteOption?: boolean): boolean {
  const hasTelehealth = settings?.includes("telehealth") ?? false;
  return hasTelehealth || (remoteOption ?? false);
}

/**
 * Get display-friendly state list from service_states array
 * @param serviceStates - Array of state codes or ['*'] for nationwide
 * @param maxDisplay - Maximum number of states to show before truncating
 */
export function formatServiceStates(serviceStates: string[] | null | undefined, maxDisplay = 3): string {
  if (!serviceStates || serviceStates.length === 0) return "";
  if (serviceStates.includes("*")) return "Nationwide";

  if (serviceStates.length <= maxDisplay) {
    return serviceStates.join(", ");
  }

  const displayed = serviceStates.slice(0, maxDisplay).join(", ");
  const remaining = serviceStates.length - maxDisplay;
  return `${displayed} +${remaining} more`;
}
