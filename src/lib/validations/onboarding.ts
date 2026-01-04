import { z } from "zod";

// Plan selection step
export const planSelectionSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

// Company basics step
export const companyBasicsSchema = z.object({
  agencyName: z
    .string()
    .min(2, "Agency name must be at least 2 characters")
    .max(100, "Agency name must be less than 100 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]+$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

// Company details step
export const companyDetailsSchema = z.object({
  headline: z
    .string()
    .min(10, "Headline must be at least 10 characters")
    .max(150, "Headline must be less than 150 characters"),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000, "Description must be less than 2000 characters"),
  serviceModes: z
    .array(z.enum(["in_home", "in_center", "telehealth", "hybrid"]))
    .min(1, "Please select at least one service mode"),
});

// Location step (legacy - basic location without services)
export const locationSchema = z.object({
  street: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Please select a state"),
  postalCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code")
    .optional()
    .or(z.literal("")),
  serviceRadiusMiles: z.number().min(5).max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Location with services schema (new - includes service types and insurances)
export const locationWithServicesSchema = z
  .object({
    label: z.string().optional().or(z.literal("")),
    serviceTypes: z.array(z.enum(["in_home", "in_center", "telehealth", "school_based"])).min(1, "Please select at least one service type"),
    street: z.string().optional().or(z.literal("")),
    city: z.string().min(2, "City is required"),
    state: z.string().length(2, "Please select a state"),
    postalCode: z
      .string()
      .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code")
      .optional()
      .or(z.literal("")),
    serviceRadiusMiles: z.number().min(5).max(100),
    insurances: z.array(z.string()).min(1, "Please select at least one insurance"),
    isAcceptingClients: z.boolean(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .refine(
    (data) => {
      // If center-based or school-based is selected, street address is required
      if (data.serviceTypes.includes("in_center") || data.serviceTypes.includes("school_based")) {
        return data.street && data.street.trim().length > 0;
      }
      return true;
    },
    {
      message: "Street address is required for center-based and school-based services",
      path: ["street"],
    }
  );

// Services & attributes step (insurances are now per-location)
export const servicesSchema = z.object({
  agesServedMin: z.number().min(0).max(99),
  agesServedMax: z.number().min(0).max(99),
  languages: z.array(z.string()),
  diagnoses: z.array(z.string()),
  clinicalSpecialties: z.array(z.string()),
  isAcceptingClients: z.boolean(),
});

// Complete onboarding schema (all steps combined)
export const completeOnboardingSchema = z.object({
  plan: planSelectionSchema.shape.plan,
  ...companyBasicsSchema.shape,
  ...companyDetailsSchema.shape,
  ...locationSchema.shape,
  ...servicesSchema.shape,
});

// Type exports
export type PlanSelection = z.infer<typeof planSelectionSchema>;
export type CompanyBasics = z.infer<typeof companyBasicsSchema>;
export type CompanyDetails = z.infer<typeof companyDetailsSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type LocationWithServicesData = z.infer<typeof locationWithServicesSchema>;
export type ServicesData = z.infer<typeof servicesSchema>;
export type CompleteOnboarding = z.infer<typeof completeOnboardingSchema>;

// Service type options - defines how services are delivered at a location
export const SERVICE_TYPE_OPTIONS = [
  { value: "in_home", label: "In-Home" },
  { value: "in_center", label: "Center-Based" },
  { value: "telehealth", label: "Telehealth" },
  { value: "school_based", label: "School-Based" },
] as const;

// Alias for backward compatibility
export const SERVICE_MODE_OPTIONS = SERVICE_TYPE_OPTIONS;

// Service type values for locations
export type ServiceType = "in_home" | "in_center" | "telehealth" | "school_based";

// Service radius options
export const SERVICE_RADIUS_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
] as const;

// Common insurance providers
export const INSURANCE_OPTIONS = [
  "Aetna",
  "Anthem",
  "Beacon Health Options",
  "Blue Cross Blue Shield",
  "CareFirst BlueCross BlueShield",
  "Centene / Ambetter",
  "Cigna",
  "Health Care Service Corporation",
  "Horizon Blue Cross Blue Shield",
  "Humana",
  "Kaiser Permanente",
  "Magellan Health",
  "Medicaid",
  "Medicare",
  "Molina Healthcare",
  "Optum Behavioral Health",
  "Oscar Health",
  "TRICARE",
  "UnitedHealthcare",
  "Wellcare",
  "Self-Pay",
  "Other Commercial Insurance",
] as const;

// Common languages
export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Arabic",
  "French",
  "Russian",
  "Portuguese",
  "Hindi",
  "Other",
] as const;

// Common diagnoses
export const DIAGNOSIS_OPTIONS = [
  "Autism Spectrum Disorder (ASD)",
  "ADHD",
  "Developmental Delays",
  "Intellectual Disabilities",
  "Anxiety Disorders",
  "Behavioral Disorders",
  "Down Syndrome",
  "Cerebral Palsy",
  "Other Neurodevelopmental Disorders",
] as const;

// Clinical specialties
export const SPECIALTY_OPTIONS = [
  "Early Intervention (0-3)",
  "School-Age Services",
  "Adolescent/Adult Services",
  "Parent Training",
  "School Consultation",
  "Feeding Therapy",
  "Toilet Training",
  "Social Skills Groups",
  "Crisis Intervention",
  "Occupational Therapy (OT)",
  "Speech Therapy (SLP)",
] as const;

// Services offered options (for location-level service types)
export const SERVICES_OFFERED_OPTIONS = [
  { value: "aba", label: "ABA Therapy" },
  { value: "occupational_therapy", label: "Occupational Therapy (OT)" },
  { value: "speech_therapy", label: "Speech Therapy (SLP)" },
  { value: "physical_therapy", label: "Physical Therapy (PT)" },
  { value: "feeding_therapy", label: "Feeding Therapy" },
  { value: "social_skills", label: "Social Skills Groups" },
] as const;

export type ServiceOffered = (typeof SERVICES_OFFERED_OPTIONS)[number]["value"];
