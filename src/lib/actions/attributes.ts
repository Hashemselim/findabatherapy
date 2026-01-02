"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

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

/**
 * Get all attributes for the current user's listing
 */
export async function getAttributes(): Promise<ActionResult<ListingAttributes>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  const { data: attrs, error } = await supabase
    .from("listing_attribute_values")
    .select("attribute_key, value_json, value_text, value_number, value_boolean")
    .eq("listing_id", listing.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Build attributes object with defaults
  const attributes: ListingAttributes = {
    insurances: [],
    languages: [],
    diagnoses: [],
    clinicalSpecialties: [],
    agesServed: { min: 0, max: 99 },
  };

  if (attrs) {
    attrs.forEach((attr) => {
      const value = attr.value_json ?? attr.value_text ?? attr.value_number ?? attr.value_boolean;

      switch (attr.attribute_key) {
        case "insurances":
          attributes.insurances = Array.isArray(value) ? value : [];
          break;
        case "languages":
          attributes.languages = Array.isArray(value) ? value : [];
          break;
        case "diagnoses":
          attributes.diagnoses = Array.isArray(value) ? value : [];
          break;
        case "clinical_specialties":
          attributes.clinicalSpecialties = Array.isArray(value) ? value : [];
          break;
        case "ages_served":
          if (value && typeof value === "object" && "min" in value && "max" in value) {
            attributes.agesServed = value as { min: number; max: number };
          }
          break;
        default:
          attributes[attr.attribute_key] = value;
      }
    });
  }

  return { success: true, data: attributes };
}

/**
 * Set multiple attributes at once
 */
export async function setAttributes(
  attributes: Partial<ListingAttributes>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  // Build attribute records
  const records: Array<{
    listing_id: string;
    attribute_key: string;
    value_json?: unknown;
    value_text?: string;
    value_number?: number;
    value_boolean?: boolean;
  }> = [];

  if (attributes.insurances !== undefined) {
    records.push({
      listing_id: listing.id,
      attribute_key: "insurances",
      value_json: attributes.insurances,
    });
  }

  if (attributes.languages !== undefined) {
    records.push({
      listing_id: listing.id,
      attribute_key: "languages",
      value_json: attributes.languages,
    });
  }

  if (attributes.diagnoses !== undefined) {
    records.push({
      listing_id: listing.id,
      attribute_key: "diagnoses",
      value_json: attributes.diagnoses,
    });
  }

  if (attributes.clinicalSpecialties !== undefined) {
    records.push({
      listing_id: listing.id,
      attribute_key: "clinical_specialties",
      value_json: attributes.clinicalSpecialties,
    });
  }

  if (attributes.agesServed !== undefined) {
    records.push({
      listing_id: listing.id,
      attribute_key: "ages_served",
      value_json: attributes.agesServed,
    });
  }

  // Handle any additional attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (
      !["insurances", "languages", "diagnoses", "clinicalSpecialties", "agesServed"].includes(key) &&
      value !== undefined
    ) {
      const record: {
        listing_id: string;
        attribute_key: string;
        value_json?: unknown;
        value_text?: string;
        value_number?: number;
        value_boolean?: boolean;
      } = {
        listing_id: listing.id,
        attribute_key: key,
      };

      if (typeof value === "boolean") {
        record.value_boolean = value;
      } else if (typeof value === "number") {
        record.value_number = value;
      } else if (typeof value === "string") {
        record.value_text = value;
      } else {
        record.value_json = value;
      }

      records.push(record);
    }
  });

  if (records.length === 0) {
    return { success: true };
  }

  // Delete existing attributes that we're updating
  const keysToUpdate = records.map((r) => r.attribute_key);
  await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id)
    .in("attribute_key", keysToUpdate);

  // Insert new values
  const { error } = await supabase
    .from("listing_attribute_values")
    .insert(records);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true };
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
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  const { error } = await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id)
    .in("attribute_key", keys);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true };
}

/**
 * Clear all attributes for the listing
 */
export async function clearAllAttributes(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "No listing found" };
  }

  const { error } = await supabase
    .from("listing_attribute_values")
    .delete()
    .eq("listing_id", listing.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true };
}
