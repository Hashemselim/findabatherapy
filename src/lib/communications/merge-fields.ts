export interface MergeFieldDef {
  key: string;
  label: string;
  manual?: boolean;
  kind?: "text" | "link";
}

export interface MergeFieldCategory {
  id: string;
  label: string;
  fields: MergeFieldDef[];
}

export const MERGE_FIELD_CATEGORIES: MergeFieldCategory[] = [
  {
    id: "client",
    label: "Client",
    fields: [
      { key: "client_name", label: "Client Name" },
      { key: "child_first_name", label: "Child First Name" },
      { key: "child_last_name", label: "Child Last Name" },
      { key: "child_date_of_birth", label: "Date of Birth" },
      { key: "child_diagnosis", label: "Diagnosis" },
      { key: "child_school_name", label: "School Name" },
      { key: "child_school_district", label: "School District" },
      { key: "child_grade_level", label: "Grade Level" },
      { key: "child_pediatrician_name", label: "Pediatrician Name" },
      { key: "child_pediatrician_phone", label: "Pediatrician Phone" },
      { key: "preferred_language", label: "Preferred Language" },
      { key: "service_start_date", label: "Service Start Date" },
      { key: "referral_source", label: "Referral Source" },
      { key: "referral_date", label: "Referral Date" },
      { key: "status", label: "Client Status" },
      { key: "funding_source", label: "Funding Source" },
    ],
  },
  {
    id: "parent",
    label: "Parent / Guardian",
    fields: [
      { key: "parent_name", label: "Parent Name" },
      { key: "parent_first_name", label: "Parent First Name" },
      { key: "parent_last_name", label: "Parent Last Name" },
      { key: "parent_email", label: "Parent Email" },
      { key: "parent_phone", label: "Parent Phone" },
      { key: "parent_relationship", label: "Relationship" },
    ],
  },
  {
    id: "insurance",
    label: "Insurance",
    fields: [
      { key: "insurance_name", label: "Insurance Name" },
      { key: "insurance_plan_name", label: "Plan Name" },
      { key: "insurance_member_id", label: "Member ID" },
      { key: "insurance_group_number", label: "Group Number" },
      { key: "insurance_type", label: "Insurance Type" },
    ],
  },
  {
    id: "authorization",
    label: "Authorization",
    fields: [
      { key: "auth_reference_number", label: "Auth Reference #" },
      { key: "auth_start_date", label: "Auth Start Date" },
      { key: "auth_end_date", label: "Auth End Date" },
      { key: "auth_units_requested", label: "Units Requested" },
      { key: "auth_units_used", label: "Units Used" },
      { key: "auth_units_remaining", label: "Units Remaining" },
      { key: "auth_status", label: "Auth Status" },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    fields: [
      { key: "agency_name", label: "Agency Name" },
      { key: "agency_phone", label: "Agency Phone" },
      { key: "agency_email", label: "Agency Email" },
    ],
  },
  {
    id: "links",
    label: "Branded Links",
    fields: [
      { key: "contact_link", label: "Contact Form Link", kind: "link" },
      { key: "intake_link", label: "Intake Form Link", kind: "link" },
      { key: "brochure_link", label: "Agency Brochure Link", kind: "link" },
      { key: "resources_link", label: "Parent Resources Link", kind: "link" },
      { key: "careers_link", label: "Careers Page Link", kind: "link" },
      { key: "agreement_link", label: "Agreement Form Link", kind: "link" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    fields: [
      { key: "assessment_date", label: "Assessment Date", manual: true },
      { key: "assessment_time", label: "Assessment Time", manual: true },
      { key: "assessment_location", label: "Assessment Location", manual: true },
    ],
  },
];

export const MERGE_FIELD_MAP: Record<string, MergeFieldDef> = {};
for (const category of MERGE_FIELD_CATEGORIES) {
  for (const field of category.fields) {
    MERGE_FIELD_MAP[field.key] = field;
  }
}

export const MANUAL_MERGE_FIELDS = MERGE_FIELD_CATEGORIES.flatMap((category) =>
  category.fields.filter((field) => field.manual)
);

export const MANUAL_MERGE_FIELD_KEYS = MANUAL_MERGE_FIELDS.map((field) => field.key);

export const LINK_MERGE_FIELDS = MERGE_FIELD_CATEGORIES.flatMap((category) =>
  category.fields.filter((field) => field.kind === "link")
);

export const LINK_MERGE_FIELD_KEYS = LINK_MERGE_FIELDS.map((field) => field.key);
