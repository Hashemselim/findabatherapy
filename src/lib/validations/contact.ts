import { z } from "zod";

/**
 * Contact form schema for family inquiries
 */
export const contactFormSchema = z.object({
  familyName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  familyEmail: z
    .string()
    .email("Please enter a valid email address"),
  familyPhone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  childAge: z
    .string()
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters"),
  // Referral source
  referralSource: z.string().optional().or(z.literal("")),
  referralSourceOther: z.string().max(500).optional().or(z.literal("")),
  // Honeypot field for spam protection
  website: z.string().max(0, "").optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

/**
 * Inquiry status values
 */
export const INQUIRY_STATUS = {
  unread: "unread",
  read: "read",
  replied: "replied",
  archived: "archived",
  converted: "converted",
} as const;

export type InquiryStatus = (typeof INQUIRY_STATUS)[keyof typeof INQUIRY_STATUS];
