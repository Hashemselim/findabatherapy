/**
 * Update existing seeded providers with complete data
 *
 * Run with: npx tsx scripts/update-existing-providers.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Languages
const LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Arabic",
  "French",
  "Russian",
  "Portuguese",
];

// Diagnoses
const DIAGNOSES = [
  "Autism Spectrum Disorder (ASD)",
  "ADHD",
  "Developmental Delays",
  "Intellectual Disabilities",
  "Anxiety Disorders",
  "Behavioral Disorders",
  "Down Syndrome",
];

// Clinical Specialties
const SPECIALTIES = [
  "Early Intervention (0-3)",
  "School-Age Services",
  "Adolescent/Adult Services",
  "Parent Training",
  "School Consultation",
  "Feeding Therapy",
  "Toilet Training",
  "Social Skills Groups",
];

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

function generateWebsite(agencyName: string): string {
  const domain = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return `https://www.${domain}.com`;
}

async function updateProviders() {
  console.log("🔄 Updating existing seeded providers with complete data...\n");

  // Get all seeded profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, agency_name, contact_phone, website")
    .eq("is_seeded", true);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError.message);
    process.exit(1);
  }

  console.log(`Found ${profiles?.length || 0} seeded profiles\n`);

  let updatedProfiles = 0;
  let updatedListings = 0;

  for (const profile of profiles || []) {
    // Update profile with phone and website if not set
    if (!profile.contact_phone || !profile.website) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          contact_phone: profile.contact_phone || generatePhone(),
          website: profile.website || generateWebsite(profile.agency_name),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`  ❌ Error updating profile ${profile.agency_name}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated profile: ${profile.agency_name}`);
        updatedProfiles++;
      }
    }

    // Get the listing for this profile
    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!listing) {
      console.log(`  ⚠️ No listing found for ${profile.agency_name}`);
      continue;
    }

    // Check if attributes already exist
    const { data: existingAttrs } = await supabase
      .from("listing_attribute_values")
      .select("attribute_key")
      .eq("listing_id", listing.id);

    const existingKeys = new Set(existingAttrs?.map((a) => a.attribute_key) || []);

    // Prepare missing attributes
    const attributesToInsert = [];

    if (!existingKeys.has("languages")) {
      const extraLanguages = randomElements(
        LANGUAGES.filter((l) => l !== "English"),
        Math.floor(Math.random() * 3)
      );
      attributesToInsert.push({
        listing_id: listing.id,
        attribute_key: "languages",
        value_json: ["English", ...extraLanguages],
      });
    }

    if (!existingKeys.has("diagnoses")) {
      attributesToInsert.push({
        listing_id: listing.id,
        attribute_key: "diagnoses",
        value_json: randomElements(DIAGNOSES, Math.floor(Math.random() * 3) + 2),
      });
    }

    if (!existingKeys.has("clinical_specialties")) {
      attributesToInsert.push({
        listing_id: listing.id,
        attribute_key: "clinical_specialties",
        value_json: randomElements(SPECIALTIES, Math.floor(Math.random() * 3) + 2),
      });
    }

    if (attributesToInsert.length > 0) {
      const { error: attrError } = await supabase
        .from("listing_attribute_values")
        .insert(attributesToInsert);

      if (attrError) {
        console.error(`  ❌ Error updating attributes for ${profile.agency_name}:`, attrError.message);
      } else {
        console.log(`  ✅ Added ${attributesToInsert.length} attributes for: ${profile.agency_name}`);
        updatedListings++;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Update complete!");
  console.log(`   ✅ Updated profiles: ${updatedProfiles}`);
  console.log(`   ✅ Updated listings: ${updatedListings}`);
  console.log("=".repeat(50));
}

updateProviders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
