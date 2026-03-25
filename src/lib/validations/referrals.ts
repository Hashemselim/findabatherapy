import { z } from "zod";

export const REFERRAL_SOURCE_CATEGORY_OPTIONS = [
  { value: "pediatrician", label: "Pediatrician" },
  { value: "child_psychologist", label: "Child Psychologist" },
  { value: "psychologist", label: "Psychologist" },
  { value: "pediatric_neurologist", label: "Pediatric Neurologist" },
  { value: "neurologist", label: "Neurologist" },
  { value: "developmental_pediatrician", label: "Developmental Pediatrician" },
  { value: "speech_therapy", label: "Speech Therapy" },
  { value: "occupational_therapy", label: "Occupational Therapy" },
  { value: "school", label: "School" },
  { value: "other", label: "Other" },
] as const;

export const REFERRAL_SOURCE_STAGE_OPTIONS = [
  { value: "discovered", label: "Discovered", color: "gray" },
  { value: "qualified", label: "Qualified", color: "blue" },
  { value: "ready_to_contact", label: "Ready to Contact", color: "cyan" },
  { value: "contacted", label: "Contacted", color: "amber" },
  { value: "engaged", label: "Engaged", color: "orange" },
  { value: "active_referrer", label: "Active Referrer", color: "green" },
  { value: "nurture", label: "Nurture", color: "purple" },
  { value: "do_not_contact", label: "Do Not Contact", color: "red" },
  { value: "archived", label: "Archived", color: "gray" },
] as const;

export const REFERRAL_CONTACTABILITY_OPTIONS = [
  { value: "email_verified", label: "Verified Email" },
  { value: "email_unverified", label: "Unverified Email" },
  { value: "phone_only", label: "Phone Only" },
  { value: "contact_form_only", label: "Contact Form Only" },
  { value: "no_channel_found", label: "No Channel Found" },
] as const;

export const REFERRAL_RELATIONSHIP_HEALTH_OPTIONS = [
  { value: "cold", label: "Cold" },
  { value: "warming", label: "Warming" },
  { value: "warm", label: "Warm" },
  { value: "strong", label: "Strong" },
] as const;

export const REFERRAL_CONTACT_ROLE_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "office_manager", label: "Office Manager" },
  { value: "referral_coordinator", label: "Referral Coordinator" },
  { value: "front_desk", label: "Front Desk" },
  { value: "administrator", label: "Administrator" },
  { value: "other", label: "Other" },
] as const;

export const REFERRAL_TOUCHPOINT_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "voicemail", label: "Voicemail" },
  { value: "contact_form", label: "Contact Form" },
  { value: "fax", label: "Fax" },
  { value: "in_person", label: "In Person" },
  { value: "note", label: "Note" },
  { value: "task", label: "Task" },
] as const;

export const REFERRAL_TOUCHPOINT_OUTCOME_OPTIONS = [
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "opened", label: "Opened" },
  { value: "replied", label: "Replied" },
  { value: "left_message", label: "Left Message" },
  { value: "connected", label: "Connected" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "bounced", label: "Bounced" },
  { value: "failed", label: "Failed" },
  { value: "no_answer", label: "No Answer" },
  { value: "other", label: "Other" },
] as const;

export const REFERRAL_TASK_STATUS_OPTIONS = [
  { value: "pending", label: "To Do", color: "gray" },
  { value: "in_progress", label: "In Progress", color: "blue" },
  { value: "completed", label: "Done", color: "green" },
] as const;

export const REFERRAL_TEMPLATE_TYPE_OPTIONS = [
  { value: "intro", label: "Intro" },
  { value: "follow_up", label: "Follow Up" },
  { value: "custom", label: "Custom" },
] as const;

export const referralSourceCategorySchema = z.enum([
  "pediatrician",
  "child_psychologist",
  "psychologist",
  "pediatric_neurologist",
  "neurologist",
  "developmental_pediatrician",
  "speech_therapy",
  "occupational_therapy",
  "school",
  "other",
]);

export const referralSourceStageSchema = z.enum([
  "discovered",
  "qualified",
  "ready_to_contact",
  "contacted",
  "engaged",
  "active_referrer",
  "nurture",
  "do_not_contact",
  "archived",
]);

export const referralContactabilitySchema = z.enum([
  "email_verified",
  "email_unverified",
  "phone_only",
  "contact_form_only",
  "no_channel_found",
]);

export const referralRelationshipHealthSchema = z.enum([
  "cold",
  "warming",
  "warm",
  "strong",
]);

export const referralContactRoleSchema = z.enum([
  "doctor",
  "office_manager",
  "referral_coordinator",
  "front_desk",
  "administrator",
  "other",
]);

export const referralTouchpointTypeSchema = z.enum([
  "email",
  "call",
  "voicemail",
  "contact_form",
  "fax",
  "in_person",
  "note",
  "task",
]);

export const referralTouchpointOutcomeSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "opened",
  "replied",
  "left_message",
  "connected",
  "submitted",
  "completed",
  "bounced",
  "failed",
  "no_answer",
  "other",
]);

export const referralTaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
]);

export const referralTemplateTypeSchema = z.enum([
  "intro",
  "follow_up",
  "custom",
]);

export const referralSourceSchema = z.object({
  locationId: z.string().uuid().optional().nullable(),
  googlePlaceId: z.string().optional().nullable(),
  name: z.string().min(2).max(200),
  category: referralSourceCategorySchema.default("other"),
  stage: referralSourceStageSchema.default("discovered"),
  contactability: referralContactabilitySchema.default("no_channel_found"),
  relationshipHealth: referralRelationshipHealthSchema.default("cold"),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  publicEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactFormUrl: z.string().max(500).optional().nullable(),
  fax: z.string().max(50).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(20).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  distanceMiles: z.number().min(0).max(250).optional().nullable(),
  googleRating: z.number().min(0).max(5).optional().nullable(),
  googleRatingCount: z.number().int().min(0).optional().nullable(),
  notesSummary: z.string().max(5000).optional().nullable(),
  referralInstructions: z.string().max(5000).optional().nullable(),
  acceptedInsurances: z.array(z.string().max(120)).optional().default([]),
  doNotContact: z.boolean().optional().default(false),
  nextFollowUpAt: z.string().optional().nullable(),
});

export const referralContactSchema = z.object({
  sourceId: z.string().uuid(),
  name: z.string().min(2).max(200),
  role: referralContactRoleSchema.default("other"),
  title: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  preferredContactMethod: referralTouchpointTypeSchema.optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export const referralNoteSchema = z.object({
  sourceId: z.string().uuid(),
  note: z.string().min(1).max(5000),
});

export const referralTaskSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string().min(2).max(200),
  content: z.string().max(5000).optional().nullable(),
  status: referralTaskStatusSchema.default("pending"),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
});

export const referralTouchpointSchema = z.object({
  sourceId: z.string().uuid(),
  contactId: z.string().uuid().optional().nullable(),
  touchpointType: referralTouchpointTypeSchema,
  outcome: referralTouchpointOutcomeSchema.default("other"),
  subject: z.string().max(250).optional().nullable(),
  body: z.string().max(50000).optional().nullable(),
  recipientEmail: z.string().email().optional().nullable().or(z.literal("")),
  recipientName: z.string().max(200).optional().nullable(),
  touchedAt: z.string().optional().nullable(),
});

export const referralTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  templateType: referralTemplateTypeSchema.default("custom"),
  subject: z.string().min(2).max(250),
  body: z.string().min(2).max(50000),
  isDefault: z.boolean().optional().default(false),
});

export const referralImportRequestSchema = z.object({
  radiusMiles: z.number().int().min(1).max(50).default(25),
  categories: z.array(referralSourceCategorySchema).min(1),
  locationIds: z.array(z.string().uuid()).optional(),
  searchText: z.string().trim().min(2).max(250).optional(),
  searchCenter: z
    .object({
      label: z.string().min(1).max(200),
      city: z.string().max(120).optional().nullable(),
      state: z.string().max(20).optional().nullable(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  enrichWebsites: z.boolean().optional().default(true),
});

export const referralInboxDraftSchema = z.object({
  sourceIds: z.array(z.string().uuid()).min(1).max(50),
  subject: z.string().min(2).max(250),
  body: z.string().min(2).max(50000),
  testRecipientEmails: z.array(z.string().email()).max(5).optional().default([]),
});

export type ReferralSourceCategory = z.infer<typeof referralSourceCategorySchema>;
export type ReferralSourceStage = z.infer<typeof referralSourceStageSchema>;
export type ReferralContactability = z.infer<typeof referralContactabilitySchema>;
export type ReferralRelationshipHealth = z.infer<typeof referralRelationshipHealthSchema>;
export type ReferralContactRole = z.infer<typeof referralContactRoleSchema>;
export type ReferralTouchpointType = z.infer<typeof referralTouchpointTypeSchema>;
export type ReferralTouchpointOutcome = z.infer<typeof referralTouchpointOutcomeSchema>;
export type ReferralTaskStatus = z.infer<typeof referralTaskStatusSchema>;
export type ReferralTemplateType = z.infer<typeof referralTemplateTypeSchema>;
export type ReferralSourceInput = z.infer<typeof referralSourceSchema>;
export type ReferralContactInput = z.infer<typeof referralContactSchema>;
export type ReferralNoteInput = z.infer<typeof referralNoteSchema>;
export type ReferralTaskInput = z.infer<typeof referralTaskSchema>;
export type ReferralTouchpointInput = z.infer<typeof referralTouchpointSchema>;
export type ReferralTemplateInput = z.infer<typeof referralTemplateSchema>;
export type ReferralImportRequestInput = z.infer<typeof referralImportRequestSchema>;
export type ReferralInboxDraftInput = z.infer<typeof referralInboxDraftSchema>;
