import { z } from "zod";

export const AGREEMENT_LINK_TYPE_OPTIONS = [
  { value: "generic", label: "Generic" },
  { value: "assigned", label: "Assigned" },
] as const;

export const AGREEMENT_SUBMISSION_STATUS_OPTIONS = [
  { value: "unlinked", label: "Needs Client" },
  { value: "linked", label: "Linked" },
] as const;

export const agreementLinkTypeSchema = z.enum(["generic", "assigned"]);

export const agreementPacketSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(4000).optional().default(""),
});

export const agreementPacketDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  packet_id: z.string().uuid().optional(),
  label: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(4000).optional().default(""),
  file_name: z.string().trim().min(1).max(255),
  file_path: z.string().trim().min(1),
  file_size: z.number().int().positive(),
  file_type: z.literal("application/pdf"),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "Invalid document hash"),
  sort_order: z.number().int().default(0),
});

export const agreementPacketDocumentMetadataSchema = z.object({
  label: z.string().trim().min(1, "Document title is required").max(200),
  description: z.string().trim().max(4000).optional().default(""),
});

export const createAgreementLinkSchema = z.object({
  packet_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  link_type: agreementLinkTypeSchema,
});

export const agreementSubmissionDocumentInputSchema = z.object({
  packet_version_document_id: z.string().uuid(),
  acknowledged: z.literal(true, "Every document must be acknowledged before signing."),
});

export const agreementSubmissionSchema = z.object({
  packet_id: z.string().uuid(),
  packet_version_id: z.string().uuid(),
  link_token: z.string().trim().max(255).optional().default(""),
  client_name: z.string().trim().min(1, "Client name is required").max(200),
  signer_first_name: z.string().trim().min(1, "First name is required").max(100),
  signer_last_name: z.string().trim().min(1, "Last name is required").max(100),
  signature_data_url: z
    .string()
    .trim()
    .regex(/^data:image\/png;base64,/, "Signature is required"),
  consent_to_electronic_records: z.literal(true, "Electronic records consent is required."),
  consent_to_sign_electronically: z.literal(true, "Electronic signature consent is required."),
  signer_authority_confirmed: z.literal(true, "Signer authority confirmation is required."),
  documents: z
    .array(agreementSubmissionDocumentInputSchema)
    .min(1, "At least one document must be acknowledged."),
});

export const linkAgreementSubmissionSchema = z.object({
  submission_id: z.string().uuid(),
  client_id: z.string().uuid(),
});

export type AgreementPacketInput = z.infer<typeof agreementPacketSchema>;
export type AgreementPacketDocumentInput = z.infer<typeof agreementPacketDocumentSchema>;
export type AgreementPacketDocumentMetadataInput = z.infer<typeof agreementPacketDocumentMetadataSchema>;
export type CreateAgreementLinkInput = z.infer<typeof createAgreementLinkSchema>;
export type AgreementSubmissionInput = z.infer<typeof agreementSubmissionSchema>;
export type LinkAgreementSubmissionInput = z.infer<typeof linkAgreementSubmissionSchema>;
