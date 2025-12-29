/**
 * Google Places Provider Seeding Script
 *
 * Fetches real ABA therapy providers from Google Places API and stores them
 * in the google_places_listings table.
 *
 * Run with: npx tsx scripts/seed-google-places.ts
 *
 * Prerequisites:
 * - GOOGLE_MAPS_API_KEY environment variable
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_ROLE_KEY environment variable
 *
 * The script uses Google Places API (New) with Text Search to find ABA providers.
 * Cost estimate: ~$30 for 1000 providers (well within $200/mo free credit)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { CITIES_BY_STATE, STATE_NAMES, type City } from "../src/lib/data/cities";

// Configuration
const TARGET_PROVIDERS_PER_STATE = 20;
const DELAY_BETWEEN_REQUESTS_MS = 250; // Respect rate limits
const MAX_RESULTS_PER_SEARCH = 20; // Google Places returns max 20 per request

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!googleMapsApiKey) {
  console.error("Missing GOOGLE_MAPS_API_KEY environment variable");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for Google Places API responses
interface GooglePlaceResult {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
}

interface TextSearchResponse {
  places?: GooglePlaceResult[];
  nextPageToken?: string;
}

interface GooglePlacesListing {
  google_place_id: string;
  name: string;
  slug: string;
  street: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
}

// Helper to generate URL-safe slug with 'p-' prefix
function generateSlug(name: string, city: string, state: string): string {
  const base = `${name}-${city}-${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100); // Limit length
  return `p-${base}`;
}

// Helper to delay between requests
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse address components from Google Places response
function parseAddressComponents(
  components: GooglePlaceResult["addressComponents"],
  formattedAddress: string | undefined
): {
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
} {
  if (!components) {
    return { street: null, city: null, state: null, postalCode: null };
  }

  let streetNumber = "";
  let route = "";
  let city: string | null = null;
  let state: string | null = null;
  let postalCode: string | null = null;

  for (const component of components) {
    const types = component.types || [];

    if (types.includes("street_number")) {
      streetNumber = component.longText || "";
    } else if (types.includes("route")) {
      route = component.longText || "";
    } else if (types.includes("locality")) {
      city = component.longText || null;
    } else if (types.includes("administrative_area_level_1")) {
      state = component.longText || null;
    } else if (types.includes("postal_code")) {
      postalCode = component.longText || null;
    }
  }

  const street = streetNumber && route ? `${streetNumber} ${route}` : route || null;

  return { street, city, state, postalCode };
}

// Search for ABA providers in a specific area using Google Places Text Search
async function searchPlacesInArea(
  city: string,
  state: string
): Promise<GooglePlaceResult[]> {
  const query = `ABA therapy ${city} ${state}`;

  const requestBody = {
    textQuery: query,
    maxResultCount: MAX_RESULTS_PER_SEARCH,
    languageCode: "en",
  };

  // Use field mask to minimize API cost (only request fields we need)
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.addressComponents",
  ].join(",");

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleMapsApiKey!,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  API error for ${city}, ${state}: ${response.status} - ${errorText}`);
      return [];
    }

    const data: TextSearchResponse = await response.json();
    return data.places || [];
  } catch (error) {
    console.error(`  Network error for ${city}, ${state}:`, error);
    return [];
  }
}

// Transform Google Place result to our database format
function transformPlaceToListing(
  place: GooglePlaceResult,
  targetCity: string,
  targetState: string
): GooglePlacesListing | null {
  if (!place.id || !place.displayName?.text) {
    return null;
  }

  const name = place.displayName.text;
  const { street, city, state, postalCode } = parseAddressComponents(
    place.addressComponents,
    place.formattedAddress
  );

  // Use parsed city/state if available, otherwise fall back to target
  const finalCity = city || targetCity;
  const finalState = state || targetState;

  return {
    google_place_id: place.id,
    name,
    slug: generateSlug(name, finalCity, finalState),
    street,
    city: finalCity,
    state: finalState,
    postal_code: postalCode,
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    formatted_address: place.formattedAddress || null,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website: place.websiteUri || null,
    google_rating: place.rating || null,
    google_rating_count: place.userRatingCount || null,
  };
}

// Insert listings into database, handling duplicates
async function insertListings(listings: GooglePlacesListing[]): Promise<number> {
  if (listings.length === 0) return 0;

  let inserted = 0;

  for (const listing of listings) {
    try {
      const { error } = await supabase
        .from("google_places_listings")
        .upsert(listing, {
          onConflict: "google_place_id",
          ignoreDuplicates: true,
        });

      if (error) {
        // Check if it's a duplicate slug error
        if (error.code === "23505" && error.message.includes("slug")) {
          // Try with a modified slug
          listing.slug = `${listing.slug}-${Date.now().toString(36)}`;
          const { error: retryError } = await supabase
            .from("google_places_listings")
            .insert(listing);
          if (!retryError) {
            inserted++;
          }
        } else {
          console.error(`  Insert error for ${listing.name}:`, error.message);
        }
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`  Unexpected error inserting ${listing.name}:`, err);
    }
  }

  return inserted;
}

// Get count of existing listings per state
async function getExistingCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await supabase
    .from("google_places_listings")
    .select("state")
    .eq("status", "active");

  if (error) {
    console.error("Error fetching existing counts:", error);
    return counts;
  }

  for (const row of data || []) {
    const current = counts.get(row.state) || 0;
    counts.set(row.state, current + 1);
  }

  return counts;
}

// Main seeding function
async function seedGooglePlaces() {
  console.log("=".repeat(60));
  console.log("Google Places Provider Seeding Script");
  console.log("=".repeat(60));
  console.log(`Target: ~${TARGET_PROVIDERS_PER_STATE} providers per state`);
  console.log("");

  // Get existing counts to avoid over-fetching
  const existingCounts = await getExistingCounts();
  const totalExisting = Array.from(existingCounts.values()).reduce((a, b) => a + b, 0);
  console.log(`Existing providers in database: ${totalExisting}`);
  console.log("");

  let totalCreated = 0;
  let totalSearches = 0;
  const stateResults: Array<{ state: string; count: number }> = [];

  // Process each state
  for (const [stateAbbrev, cities] of Object.entries(CITIES_BY_STATE)) {
    const stateName = STATE_NAMES[stateAbbrev];
    const existingInState = existingCounts.get(stateName) || 0;
    const needed = TARGET_PROVIDERS_PER_STATE - existingInState;

    if (needed <= 0) {
      console.log(`${stateName}: Already has ${existingInState} providers, skipping`);
      stateResults.push({ state: stateName, count: existingInState });
      continue;
    }

    console.log(`\n${stateName} (${stateAbbrev}):`);
    console.log(`  Existing: ${existingInState}, Need: ${needed}`);

    const seenPlaceIds = new Set<string>();
    const allListings: GooglePlacesListing[] = [];

    // Search in cities until we have enough
    for (const city of cities) {
      if (allListings.length >= needed) break;

      await delay(DELAY_BETWEEN_REQUESTS_MS);

      console.log(`  Searching in ${city.name}...`);
      totalSearches++;

      const places = await searchPlacesInArea(city.name, stateName);
      console.log(`    Found ${places.length} results`);

      for (const place of places) {
        if (allListings.length >= needed) break;
        if (seenPlaceIds.has(place.id)) continue;

        seenPlaceIds.add(place.id);
        const listing = transformPlaceToListing(place, city.name, stateName);
        if (listing) {
          allListings.push(listing);
        }
      }
    }

    // Insert all listings for this state
    if (allListings.length > 0) {
      const inserted = await insertListings(allListings);
      totalCreated += inserted;
      console.log(`  Inserted: ${inserted} new providers`);
      stateResults.push({ state: stateName, count: existingInState + inserted });
    } else {
      console.log(`  No new providers found`);
      stateResults.push({ state: stateName, count: existingInState });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SEEDING COMPLETE");
  console.log("=".repeat(60));
  console.log(`Total API searches made: ${totalSearches}`);
  console.log(`Total new providers created: ${totalCreated}`);
  console.log(`Total providers in database: ${totalExisting + totalCreated}`);
  console.log("");

  // State breakdown
  console.log("Providers per state:");
  const sortedResults = stateResults.sort((a, b) => b.count - a.count);
  for (const { state, count } of sortedResults) {
    const bar = "█".repeat(Math.min(count, 30));
    console.log(`  ${state.padEnd(20)} ${count.toString().padStart(3)} ${bar}`);
  }

  console.log("");
  console.log("Done!");
}

// Clear all existing Google Places listings (use with caution)
async function clearGooglePlacesListings() {
  console.log("Clearing all existing Google Places listings...");

  const { error } = await supabase
    .from("google_places_listings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

  if (error) {
    console.error("Error clearing listings:", error);
    return;
  }

  console.log("All Google Places listings cleared.");
}

// CLI argument handling
const args = process.argv.slice(2);

if (args.includes("--clear")) {
  clearGooglePlacesListings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
} else if (args.includes("--fresh")) {
  // Clear existing and then seed fresh
  clearGooglePlacesListings()
    .then(() => seedGooglePlaces())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
} else if (args.includes("--help")) {
  console.log(`
Google Places Provider Seeding Script

Usage:
  npx tsx scripts/seed-google-places.ts [options]

Options:
  --fresh    Clear all existing listings and seed fresh (recommended)
  --clear    Clear all existing Google Places listings only (no seeding)
  --help     Show this help message

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key
  GOOGLE_MAPS_API_KEY          Google Maps API key with Places API enabled
`);
  process.exit(0);
} else {
  seedGooglePlaces()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
