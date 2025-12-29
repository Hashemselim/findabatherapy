import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

// Test with ANON key (same as the app uses) to check RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Using anon key, not service role
);

console.log("Using ANON key to test RLS policies\n");

async function debug() {
  console.log("=== DEBUG SEARCH ISSUE ===\n");

  // Step 1: Check all listings
  console.log("Step 1: All listings");
  const { data: allListings, error: listingsError } = await supabase
    .from("listings")
    .select("id, slug, status, profile_id");

  console.log("All listings count:", allListings?.length || 0);
  if (listingsError) console.log("Error:", listingsError);
  allListings?.forEach((l) => console.log(`  - ${l.slug}: ${l.status}`));

  // Step 2: Check published listings
  console.log("\nStep 2: Published listings only");
  const { data: publishedListings } = await supabase
    .from("listings")
    .select("id, slug, status")
    .eq("status", "published");

  console.log("Published count:", publishedListings?.length || 0);
  publishedListings?.forEach((l) => console.log(`  - ${l.slug}`));

  // Step 3: All locations
  console.log("\nStep 3: All locations");
  const { data: allLocations } = await supabase
    .from("locations")
    .select("id, city, state, listing_id, service_mode");

  console.log("All locations count:", allLocations?.length || 0);
  allLocations?.forEach((l) =>
    console.log(`  - ${l.city}, ${l.state} (mode: ${l.service_mode}, listing: ${l.listing_id})`)
  );

  // Step 4: Locations with state = "NJ" (exact match)
  console.log("\nStep 4: Locations where state = 'NJ' (exact)");
  const { data: njLocations } = await supabase
    .from("locations")
    .select("id, city, state, listing_id")
    .eq("state", "NJ");

  console.log("NJ locations count:", njLocations?.length || 0);
  njLocations?.forEach((l) => console.log(`  - ${l.city}, ${l.state}`));

  // Step 5: Check what states exist
  console.log("\nStep 5: Distinct states in locations table");
  const { data: distinctStates } = await supabase
    .from("locations")
    .select("state");

  const states = [...new Set(distinctStates?.map((l) => l.state))];
  console.log("States found:", states);

  // Step 6: The EXACT query from searchLocations
  console.log("\nStep 6: EXACT search query (locations with published listings, state=NJ)");
  const { data: searchResults, error: searchError, count } = await supabase
    .from("locations")
    .select(
      `
      id,
      city,
      state,
      service_mode,
      listing_id,
      listings!inner (
        id,
        slug,
        status,
        profiles!inner (
          agency_name,
          plan_tier,
          has_featured_addon
        )
      )
    `,
      { count: "exact" }
    )
    .eq("listings.status", "published")
    .eq("state", "NJ");

  console.log("Search results count:", count);
  if (searchError) console.log("Search error:", searchError);
  searchResults?.forEach((r: any) =>
    console.log(`  - ${r.city}, ${r.state} - ${r.listings?.profiles?.agency_name}`)
  );

  // Step 7: Check Foundations Autism specifically
  console.log("\nStep 7: Check 'foundations-autism' listing directly");
  const { data: foundationsListing, error: fError } = await supabase
    .from("listings")
    .select(
      `
      id,
      slug,
      status,
      profile_id,
      profiles (
        agency_name,
        plan_tier
      ),
      locations (
        id,
        city,
        state,
        service_mode
      )
    `
    )
    .eq("slug", "foundations-autism")
    .single();

  if (fError) {
    console.log("Error finding foundations-autism:", fError);
  } else {
    console.log("Found listing:");
    console.log("  Slug:", foundationsListing.slug);
    console.log("  Status:", foundationsListing.status);
    console.log("  Profile:", foundationsListing.profiles);
    console.log("  Locations:", foundationsListing.locations);
  }
}

debug();
