"use server";

import { revalidatePath } from "next/cache";

import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type AttributeValue = string | string[] | number | boolean | Record<string, unknown> | null;

export interface ListingAttributes {
  insurances: string[];
  languages: string[];
  diagnoses: string[];
  clinicalSpecialties: string[];
  agesServed: { min: number; max: number };
  [key: string]: AttributeValue;
}

function normalizeAttributeValue(value: unknown): AttributeValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return null;
}

function revalidateAttributeViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
}

/**
 * Get all attributes for the current user's listing
 */
export async function getAttributes(): Promise<ActionResult<ListingAttributes>> {
  try {
    const raw = await queryConvex<Record<string, unknown>>("listings:getListingAttributes");
    const attributes: ListingAttributes = {
      insurances: [],
      languages: [],
      diagnoses: [],
      clinicalSpecialties: [],
      agesServed: { min: 0, max: 99 },
    };

    for (const [key, value] of Object.entries(raw ?? {})) {
      switch (key) {
        case "insurances":
          attributes.insurances = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
          break;
        case "languages":
          attributes.languages = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
          break;
        case "diagnoses":
          attributes.diagnoses = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
          break;
        case "clinical_specialties":
        case "clinicalSpecialties":
          attributes.clinicalSpecialties = Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : [];
          break;
        case "ages_served":
        case "agesServed":
          if (
            value &&
            typeof value === "object" &&
            "min" in value &&
            "max" in value &&
            typeof value.min === "number" &&
            typeof value.max === "number"
          ) {
            attributes.agesServed = { min: value.min, max: value.max };
          }
          break;
        default:
          attributes[key] = normalizeAttributeValue(value);
      }
    }

    return { success: true, data: attributes };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load attributes" };
  }
}

/**
 * Set multiple attributes at once
 */
export async function setAttributes(
  attributes: Partial<ListingAttributes>
): Promise<ActionResult> {
  try {
    const args: Record<string, unknown> = {};

    if (attributes.insurances !== undefined) args.insurances = attributes.insurances;
    if (attributes.languages !== undefined) args.languages = attributes.languages;
    if (attributes.diagnoses !== undefined) args.diagnoses = attributes.diagnoses;
    if (attributes.clinicalSpecialties !== undefined) args.clinicalSpecialties = attributes.clinicalSpecialties;
    if ((attributes as Record<string, unknown>).servicesOffered !== undefined) {
      args.servicesOffered = (attributes as Record<string, unknown>).servicesOffered;
    }
    if ((attributes as Record<string, unknown>).services_offered !== undefined) {
      args.servicesOffered = (attributes as Record<string, unknown>).services_offered;
    }
    if ((attributes as Record<string, unknown>).isAcceptingClients !== undefined) {
      args.isAcceptingClients = Boolean((attributes as Record<string, unknown>).isAcceptingClients);
    }
    if (attributes.agesServed !== undefined) {
      args.agesServedMin = attributes.agesServed.min;
      args.agesServedMax = attributes.agesServed.max;
    }

    await mutateConvex("listings:updateListingAttributes", args);
    revalidateAttributeViews();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save attributes" };
  }
}

/**
 * Set a single attribute
 */
export async function setAttribute(
  key: string,
  value: AttributeValue
): Promise<ActionResult> {
  return setAttributes({ [key]: value });
}

/**
 * Clear specific attributes
 */
export async function clearAttributes(keys: string[]): Promise<ActionResult> {
  try {
    const args: Record<string, unknown> = {};

    for (const key of keys) {
      switch (key) {
        case "insurances":
          args.insurances = [];
          break;
        case "languages":
          args.languages = [];
          break;
        case "diagnoses":
          args.diagnoses = [];
          break;
        case "clinical_specialties":
        case "clinicalSpecialties":
          args.clinicalSpecialties = [];
          break;
        case "services_offered":
        case "servicesOffered":
          args.servicesOffered = [];
          break;
        case "ages_served":
        case "agesServed":
          args.agesServedMin = null;
          args.agesServedMax = null;
          break;
        case "isAcceptingClients":
          args.isAcceptingClients = false;
          break;
        default:
          break;
      }
    }

    await mutateConvex("listings:updateListingAttributes", args);
    revalidateAttributeViews();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to clear attributes" };
  }
}

/**
 * Clear all attributes for the listing
 */
export async function clearAllAttributes(): Promise<ActionResult> {
  try {
    await mutateConvex("listings:updateListingAttributes", {
      insurances: [],
      servicesOffered: [],
      languages: [],
      diagnoses: [],
      clinicalSpecialties: [],
      agesServedMin: null,
      agesServedMax: null,
    });
    revalidateAttributeViews();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to clear attributes" };
  }
}
