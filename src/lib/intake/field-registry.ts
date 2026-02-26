// =============================================================================
// Intake Field Registry — Single source of truth for all intake form fields
// =============================================================================
//
// Each field maps 1:1 to a column in the database. The registry groups fields
// into sections that mirror the client detail page. Providers toggle fields
// on/off and set required/optional via their intake_form_settings JSONB.

import {
  DIAGNOSIS_OPTIONS,
  INSURANCE_OPTIONS,
} from "@/lib/validations/onboarding";
import {
  CLIENT_FUNDING_SOURCE_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  INSURANCE_TYPE_OPTIONS,

  PARENT_RELATIONSHIP_OPTIONS,
  PUBLIC_REFERRAL_SOURCE_OPTIONS,
  SUBSCRIBER_RELATIONSHIP_OPTIONS,
} from "@/lib/validations/clients";

// =============================================================================
// TYPES
// =============================================================================

export type IntakeFieldType =
  | "text"
  | "textarea"
  | "date"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "multi-select"
  | "address"
  | "service-location";

/** Which database table a field writes to */
export type IntakeDbTable =
  | "clients"
  | "client_parents"
  | "client_insurances"
  | "client_locations"
  | "service_locations";

/** A single intake field definition */
export interface IntakeFieldDef {
  key: string;
  label: string;
  type: IntakeFieldType;
  /** For select / multi-select fields */
  options?: readonly { readonly value: string; readonly label: string }[];
  /** Simple string options for multi-select (e.g. DIAGNOSIS_OPTIONS) */
  stringOptions?: readonly string[];
  /** Shown as enabled to new providers */
  defaultEnabled: boolean;
  /** Shown as required to new providers (only meaningful when enabled) */
  defaultRequired: boolean;
  /** Database routing */
  dbTable: IntakeDbTable;
  dbColumn: string;
  /** Placeholder text hint */
  placeholder?: string;
}

/** A named section of intake fields */
export interface IntakeFieldSection {
  id: string;
  title: string;
  description: string;
  fields: IntakeFieldDef[];
}

/** Per-field provider configuration stored in JSONB */
export interface IntakeFieldConfig {
  enabled: boolean;
  required: boolean;
}

/** Map of field key → config */
export type IntakeFieldsConfig = Record<string, IntakeFieldConfig>;

// =============================================================================
// FIELD DEFINITIONS BY SECTION
// =============================================================================

const clientInfoFields: IntakeFieldDef[] = [
  {
    key: "child_first_name",
    label: "Child's First Name",
    type: "text",
    defaultEnabled: true,
    defaultRequired: true,
    dbTable: "clients",
    dbColumn: "child_first_name",
    placeholder: "First name",
  },
  {
    key: "child_last_name",
    label: "Child's Last Name",
    type: "text",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_last_name",
    placeholder: "Last name",
  },
  {
    key: "child_date_of_birth",
    label: "Child's Date of Birth",
    type: "date",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_date_of_birth",
  },
  {
    key: "child_diagnosis",
    label: "Diagnosis",
    type: "multi-select",
    stringOptions: DIAGNOSIS_OPTIONS,
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_diagnosis",
  },
  {
    key: "child_diagnosis_date",
    label: "Diagnosis Date",
    type: "date",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_diagnosis_date",
  },
  {
    key: "child_primary_concerns",
    label: "Primary Concerns",
    type: "textarea",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_primary_concerns",
    placeholder: "Describe any concerns or goals...",
  },
  {
    key: "child_aba_history",
    label: "ABA History",
    type: "textarea",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_aba_history",
    placeholder: "Previous ABA therapy experience...",
  },
  {
    key: "child_school_name",
    label: "School Name",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_school_name",
    placeholder: "School name",
  },
  {
    key: "child_school_district",
    label: "School District",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_school_district",
    placeholder: "School district",
  },
  {
    key: "child_grade_level",
    label: "Grade Level",
    type: "select",
    options: GRADE_LEVEL_OPTIONS,
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_grade_level",
  },
  {
    key: "child_other_therapies",
    label: "Other Therapies",
    type: "textarea",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_other_therapies",
    placeholder: "Other therapies or services currently receiving...",
  },
  {
    key: "child_pediatrician_name",
    label: "Pediatrician Name",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_pediatrician_name",
    placeholder: "Pediatrician name",
  },
  {
    key: "child_pediatrician_phone",
    label: "Pediatrician Phone",
    type: "phone",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "child_pediatrician_phone",
    placeholder: "(555) 555-5555",
  },
  {
    key: "preferred_language",
    label: "Preferred Language",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "preferred_language",
    placeholder: "e.g. English, Spanish",
  },
  {
    key: "funding_source",
    label: "Funding Source",
    type: "select",
    options: CLIENT_FUNDING_SOURCE_OPTIONS,
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "funding_source",
  },
  {
    key: "notes",
    label: "Additional Notes",
    type: "textarea",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "notes",
    placeholder: "Any additional information...",
  },
];

const parentGuardianFields: IntakeFieldDef[] = [
  {
    key: "parent_first_name",
    label: "First Name",
    type: "text",
    defaultEnabled: true,
    defaultRequired: true,
    dbTable: "client_parents",
    dbColumn: "first_name",
    placeholder: "First name",
  },
  {
    key: "parent_last_name",
    label: "Last Name",
    type: "text",
    defaultEnabled: true,
    defaultRequired: true,
    dbTable: "client_parents",
    dbColumn: "last_name",
    placeholder: "Last name",
  },
  {
    key: "parent_date_of_birth",
    label: "Date of Birth",
    type: "date",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_parents",
    dbColumn: "date_of_birth",
  },
  {
    key: "parent_relationship",
    label: "Relationship to Child",
    type: "select",
    options: PARENT_RELATIONSHIP_OPTIONS,
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "client_parents",
    dbColumn: "relationship",
  },
  {
    key: "parent_phone",
    label: "Phone",
    type: "phone",
    defaultEnabled: true,
    defaultRequired: true,
    dbTable: "client_parents",
    dbColumn: "phone",
    placeholder: "(555) 555-5555",
  },
  {
    key: "parent_email",
    label: "Email",
    type: "email",
    defaultEnabled: true,
    defaultRequired: true,
    dbTable: "client_parents",
    dbColumn: "email",
    placeholder: "parent@example.com",
  },
  {
    key: "parent_notes",
    label: "Notes",
    type: "textarea",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_parents",
    dbColumn: "notes",
    placeholder: "Additional parent/guardian notes...",
  },
];

const insuranceFields: IntakeFieldDef[] = [
  {
    key: "insurance_name",
    label: "Insurance Provider",
    type: "select",
    options: [...INSURANCE_OPTIONS].map((name) => ({
      value: name,
      label: name,
    })),
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "insurance_name",
  },
  {
    key: "insurance_type",
    label: "Insurance Type",
    type: "select",
    options: INSURANCE_TYPE_OPTIONS,
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "insurance_type",
  },
  {
    key: "insurance_member_id",
    label: "Member ID",
    type: "text",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "member_id",
    placeholder: "Member ID",
  },
  {
    key: "insurance_group_number",
    label: "Group Number",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "group_number",
    placeholder: "Group number",
  },
  {
    key: "insurance_plan_name",
    label: "Plan Name",
    type: "text",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "plan_name",
    placeholder: "Plan name",
  },
  {
    key: "insurance_subscriber_relationship",
    label: "Subscriber Relationship",
    type: "select",
    options: SUBSCRIBER_RELATIONSHIP_OPTIONS,
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "subscriber_relationship",
  },
  {
    key: "insurance_effective_date",
    label: "Effective Date",
    type: "date",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "effective_date",
  },
  {
    key: "insurance_expiration_date",
    label: "Expiration Date",
    type: "date",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "expiration_date",
  },
  {
    key: "insurance_copay_amount",
    label: "Copay Amount ($)",
    type: "number",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "copay_amount",
  },
  {
    key: "insurance_coinsurance_percentage",
    label: "Coinsurance (%)",
    type: "number",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "coinsurance_percentage",
  },
  {
    key: "insurance_deductible_total",
    label: "Deductible Total ($)",
    type: "number",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "deductible_total",
  },
  {
    key: "insurance_oop_max_total",
    label: "Out-of-Pocket Max ($)",
    type: "number",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "oop_max_total",
  },
  {
    key: "insurance_notes",
    label: "Insurance Notes",
    type: "textarea",
    defaultEnabled: false,
    defaultRequired: false,
    dbTable: "client_insurances",
    dbColumn: "notes",
    placeholder: "Insurance notes...",
  },
];

const homeAddressFields: IntakeFieldDef[] = [
  {
    key: "home_address",
    label: "Home Address",
    type: "address",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "client_locations",
    dbColumn: "street_address",
    placeholder: "Start typing an address...",
  },
];

const serviceLocationFields: IntakeFieldDef[] = [
  {
    key: "service_location",
    label: "Service Location",
    type: "service-location",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "service_locations",
    dbColumn: "label",
  },
];

const referralFields: IntakeFieldDef[] = [
  {
    key: "referral_source",
    label: "How did you hear about us?",
    type: "select",
    options: PUBLIC_REFERRAL_SOURCE_OPTIONS,
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "referral_source",
  },
  {
    key: "referral_source_other",
    label: "Other (please specify)",
    type: "text",
    defaultEnabled: true,
    defaultRequired: false,
    dbTable: "clients",
    dbColumn: "referral_source_other",
    placeholder: "Please specify...",
  },
];

// =============================================================================
// SECTION DEFINITIONS
// =============================================================================

export const INTAKE_FIELD_SECTIONS: IntakeFieldSection[] = [
  {
    id: "client_info",
    title: "Client Information",
    description: "Child/client details",
    fields: clientInfoFields,
  },
  {
    id: "parent_guardian",
    title: "Parent / Guardian",
    description: "Primary caregiver contact information",
    fields: parentGuardianFields,
  },
  {
    id: "insurance",
    title: "Insurance",
    description: "Health insurance information",
    fields: insuranceFields,
  },
  {
    id: "home_address",
    title: "Home Address",
    description: "Client's home address",
    fields: homeAddressFields,
  },
  {
    id: "service_location",
    title: "Service Location",
    description: "Where services will be provided",
    fields: serviceLocationFields,
  },
  {
    id: "referral",
    title: "Referral",
    description: "How the family found the provider",
    fields: referralFields,
  },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/** Flat map of field key → field definition for O(1) lookups */
export const INTAKE_FIELD_MAP: Record<string, IntakeFieldDef> =
  INTAKE_FIELD_SECTIONS.reduce(
    (map, section) => {
      for (const field of section.fields) {
        map[field.key] = field;
      }
      return map;
    },
    {} as Record<string, IntakeFieldDef>,
  );

/** All field keys */
export const ALL_INTAKE_FIELD_KEYS = Object.keys(INTAKE_FIELD_MAP);

/**
 * Generates the default IntakeFieldsConfig for providers with no saved config.
 * Matches the current hardcoded intake form so existing providers see the same
 * form they had before this feature was built.
 */
export function getDefaultFieldConfig(): IntakeFieldsConfig {
  const config: IntakeFieldsConfig = {};
  for (const section of INTAKE_FIELD_SECTIONS) {
    for (const field of section.fields) {
      config[field.key] = {
        enabled: field.defaultEnabled,
        required: field.defaultRequired,
      };
    }
  }
  return config;
}

// Legacy field keys that map to new composite keys.
// If ANY old key in a group was enabled, the composite key is enabled.
const LEGACY_HOME_ADDRESS_KEYS = [
  "home_street_address",
  "home_city",
  "home_state",
  "home_postal_code",
];
const LEGACY_SERVICE_LOCATION_KEYS = [
  "service_location_type",
  "service_street_address",
  "service_city",
  "service_state",
  "service_postal_code",
  "service_notes",
];

/**
 * Merges a partial saved config with defaults so every field has a value.
 * Handles the case where new fields are added to the registry after a
 * provider already saved their config — new fields get their defaults.
 * Also migrates legacy per-field keys to new composite keys.
 */
export function mergeWithDefaults(
  saved: Record<string, IntakeFieldConfig | undefined> | undefined | null,
): IntakeFieldsConfig {
  const defaults = getDefaultFieldConfig();
  if (!saved) return defaults;

  // Migrate legacy home address keys → composite home_address
  if (!saved.home_address && LEGACY_HOME_ADDRESS_KEYS.some((k) => saved[k])) {
    const anyEnabled = LEGACY_HOME_ADDRESS_KEYS.some((k) => saved[k]?.enabled);
    const anyRequired = LEGACY_HOME_ADDRESS_KEYS.some((k) => saved[k]?.required);
    saved.home_address = { enabled: anyEnabled, required: anyRequired };
  }

  // Migrate legacy service location keys → composite service_location
  if (!saved.service_location && LEGACY_SERVICE_LOCATION_KEYS.some((k) => saved[k])) {
    const anyEnabled = LEGACY_SERVICE_LOCATION_KEYS.some((k) => saved[k]?.enabled);
    const anyRequired = LEGACY_SERVICE_LOCATION_KEYS.some((k) => saved[k]?.required);
    saved.service_location = { enabled: anyEnabled, required: anyRequired };
  }

  const merged = { ...defaults };
  for (const [key, val] of Object.entries(saved)) {
    // Skip legacy keys — they've been migrated above
    if (LEGACY_HOME_ADDRESS_KEYS.includes(key)) continue;
    if (LEGACY_SERVICE_LOCATION_KEYS.includes(key)) continue;
    if (val && key in merged) merged[key] = val;
  }
  return merged;
}

/**
 * Returns only the sections that have at least one enabled field.
 */
export function getEnabledSections(
  config: IntakeFieldsConfig,
): IntakeFieldSection[] {
  return INTAKE_FIELD_SECTIONS.filter((section) =>
    section.fields.some((f) => config[f.key]?.enabled),
  );
}

/**
 * Returns the enabled fields within a section.
 */
export function getEnabledFields(
  section: IntakeFieldSection,
  config: IntakeFieldsConfig,
): IntakeFieldDef[] {
  return section.fields.filter((f) => config[f.key]?.enabled);
}
