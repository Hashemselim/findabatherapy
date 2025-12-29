import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

// Test with ANON key (like the app uses)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function debug() {
  console.log("Testing with ANON key (same as app)...\n");

  // Check published listings
  const { data: listings, error: listingsError, count } = await supabaseAnon
    .from("listings")
    .select("id, slug, headline, status", { count: "exact" })
    .eq("status", "published")
    .limit(5);

  console.log("Published listings count:", count);
  console.log("Listings error:", listingsError);
  console.log("Listings data:", listings);

  // Try the full query
  const { data: fullQuery, error: fullError } = await supabaseAnon
    .from("listings")
    .select(
      `
      id,
      slug,
      headline,
      profiles!inner (
        agency_name,
        plan_tier
      ),
      locations!inner (
        city,
        state,
        is_primary
      )
    `
    )
    .eq("status", "published")
    .limit(3);

  console.log("\nFull query results:", fullQuery?.length || 0);
  console.log("Full query error:", fullError);
  if (fullQuery) {
    console.log("Full query data:", JSON.stringify(fullQuery, null, 2));
  }
}

debug();
