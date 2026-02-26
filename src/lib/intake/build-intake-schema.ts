// =============================================================================
// Dynamic Zod Schema Builder for Intake Forms
// =============================================================================
//
// Generates a Zod schema at runtime based on the provider's field config.
// Only enabled fields are included; required/optional is driven by config.

import { z } from "zod";

import {
  INTAKE_FIELD_MAP,
  INTAKE_FIELD_SECTIONS,
  type IntakeFieldDef,
  type IntakeFieldsConfig,
} from "./field-registry";

/**
 * Builds a Zod schema from the provider's field configuration.
 * Always includes `turnstileToken` as required.
 */
export function buildIntakeSchema(
  config: IntakeFieldsConfig,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of INTAKE_FIELD_SECTIONS) {
    for (const field of section.fields) {
      const fieldConfig = config[field.key];
      if (!fieldConfig?.enabled) continue;

      shape[field.key] = buildFieldSchema(field, fieldConfig.required);
    }
  }

  // Always require turnstile verification on public forms
  shape.turnstileToken = z.string().min(1, "Please complete the verification");

  return z.object(shape);
}

/**
 * Builds the Zod type for a single field based on its definition and
 * whether the provider marked it as required.
 */
function buildFieldSchema(field: IntakeFieldDef, required: boolean): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "multi-select":
      schema = z.array(z.string());
      if (required) {
        schema = (schema as z.ZodArray<z.ZodString>).min(
          1,
          `${field.label} is required`,
        );
      } else {
        schema = (schema as z.ZodArray<z.ZodString>).default([]);
      }
      return schema;

    case "number":
      if (required) {
        return z.number({ message: `${field.label} is required` }).min(0);
      }
      return z.number().min(0).optional();

    case "date":
      if (required) {
        return z.string().min(1, `${field.label} is required`);
      }
      return z.string().optional().or(z.literal(""));

    case "email":
      if (required) {
        return z
          .string()
          .min(1, `${field.label} is required`)
          .email("Please enter a valid email");
      }
      return z.string().email("Please enter a valid email").optional().or(z.literal(""));

    case "phone":
      if (required) {
        return z
          .string()
          .min(1, `${field.label} is required`)
          .regex(/^[\d\s\-\(\)\+]+$/, "Please enter a valid phone number");
      }
      return z
        .string()
        .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
        .optional()
        .or(z.literal(""));

    case "textarea":
      if (required) {
        return z
          .string()
          .min(1, `${field.label} is required`)
          .max(5000);
      }
      return z.string().max(5000).optional().or(z.literal(""));

    case "select":
      if (required) {
        return z.string().min(1, `${field.label} is required`);
      }
      return z.string().optional().or(z.literal(""));

    case "address": {
      const addressObj = z.object({
        street_address: z.string().max(255).optional().or(z.literal("")),
        city: z.string().max(100).optional().or(z.literal("")),
        state: z.string().max(2).optional().or(z.literal("")),
        postal_code: z.string().optional().or(z.literal("")),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        place_id: z.string().optional().or(z.literal("")),
        formatted_address: z.string().optional().or(z.literal("")),
      });
      if (required) {
        return addressObj.refine(
          (v) => !!v.street_address || !!v.city,
          { message: `${field.label} is required` },
        );
      }
      return addressObj.optional();
    }

    case "service-location": {
      const svcObj = z.object({
        location_type: z.string().optional().or(z.literal("")),
        same_as_home: z.boolean().optional(),
        agency_location_id: z.string().optional().or(z.literal("")),
        street_address: z.string().max(255).optional().or(z.literal("")),
        city: z.string().max(100).optional().or(z.literal("")),
        state: z.string().max(2).optional().or(z.literal("")),
        postal_code: z.string().optional().or(z.literal("")),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        place_id: z.string().optional().or(z.literal("")),
        formatted_address: z.string().optional().or(z.literal("")),
        notes: z.string().max(2000).optional().or(z.literal("")),
      });
      if (required) {
        return svcObj.refine(
          (v) => !!v.location_type,
          { message: `${field.label} is required` },
        );
      }
      return svcObj.optional();
    }

    // "text" and fallback
    default:
      if (required) {
        return z
          .string()
          .min(1, `${field.label} is required`)
          .max(500);
      }
      return z.string().max(500).optional().or(z.literal(""));
  }
}

/**
 * Helper to infer the TypeScript type from a dynamically built schema.
 * Usage:  type FormValues = IntakeFormValues<typeof schema>;
 */
export type IntakeFormValues = z.infer<ReturnType<typeof buildIntakeSchema>>;

/**
 * Extracts flat form values into per-table buckets for the submit action.
 * Returns an object keyed by DB table with only the submitted field values.
 */
export function routeFieldsToTables(
  values: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const tables: Record<string, Record<string, unknown>> = {
    clients: {},
    client_parents: {},
    client_insurances: {},
    client_locations: {},
    service_locations: {},
  };

  for (const [key, value] of Object.entries(values)) {
    // Handle composite address field — spread into client_locations
    if (key === "home_address" && value && typeof value === "object") {
      const addr = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(addr)) {
        if (v !== undefined && v !== null && v !== "") {
          tables.client_locations[k] = v;
        }
      }
      continue;
    }

    // Handle composite service location field — spread into service_locations
    if (key === "service_location" && value && typeof value === "object") {
      const svc = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(svc)) {
        if (v !== undefined && v !== null && v !== "") {
          tables.service_locations[k] = v;
        }
      }
      continue;
    }

    // Skip non-field keys (e.g. turnstileToken)
    const fieldDef = INTAKE_FIELD_MAP[key];
    if (!fieldDef) continue;

    // Skip empty/undefined values
    if (value === undefined || value === null || value === "") continue;

    tables[fieldDef.dbTable][fieldDef.dbColumn] = value;
  }

  return tables;
}
