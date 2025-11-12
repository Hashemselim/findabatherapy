export const SERVICE_TYPES = [
  { value: "in_home", label: "In-home" },
  { value: "in_center", label: "In-center" },
  { value: "both", label: "In-home & In-center" },
] as const;

export const PLAN_TIERS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "featured", label: "Featured" },
] as const;

export const FILTERABLE_ATTRIBUTES = [
  {
    key: "services",
    label: "Service Type",
    variant: "multi-select",
    description: "In-home, in-center, telehealth, and hybrid options.",
  },
  {
    key: "insurances",
    label: "Insurances Accepted",
    variant: "multi-select",
    description: "Commercial, Medicaid, TRICARE, self-pay, and more.",
  },
  {
    key: "ages_served",
    label: "Ages Served",
    variant: "range",
    description: "Filter by early intervention, school-age, or adult services.",
  },
  {
    key: "languages",
    label: "Languages",
    variant: "multi-select",
    description: "Identify multilingual teams and culturally aligned care.",
  },
  {
    key: "diagnoses",
    label: "Diagnoses Supported",
    variant: "multi-select",
    description: "Autism, ADHD, anxiety, and other behavioral needs.",
  },
  {
    key: "clinical_specialties",
    label: "Clinical Specialties",
    variant: "multi-select",
    description: "School consultation, parent training, feeding clinics, occupational therapy, and more.",
  },
  {
    key: "availability",
    label: "Availability",
    variant: "boolean",
    description: "Show agencies accepting new clients now.",
  },
] as const;

export type FilterableAttributeKey = (typeof FILTERABLE_ATTRIBUTES)[number]["key"];
