import { z } from "zod";

/**
 * Feedback categories
 */
export const FEEDBACK_CATEGORIES = {
  feature_request: "Feature Request",
  bug_report: "Something is Broken",
  general_feedback: "General Feedback",
  question: "Question",
  compliment: "Compliment",
} as const;

export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES;

/**
 * Feedback status values
 */
export const FEEDBACK_STATUS = {
  unread: "unread",
  read: "read",
  replied: "replied",
  archived: "archived",
} as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS];

/**
 * Feedback form schema
 */
export const feedbackFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  company: z
    .string()
    .max(200, "Company name must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  category: z.enum(["feature_request", "bug_report", "general_feedback", "question", "compliment"]),
  rating: z
    .number()
    .min(1, "Please select a rating")
    .max(5)
    .optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be less than 5000 characters"),
  // Honeypot field for spam protection
  website: z.string().max(0, "").optional(),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;
