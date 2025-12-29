/**
 * Test script to verify combined search is working
 * Run with: npx tsx scripts/test-search.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Testing search queries...\n");

  // 1. Check Google Places listings count
  const { count: gpCount, error: gpError } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  console.log(`Google Places listings (active): ${gpCount || 0}`);
  if (gpError) console.error("Error:", gpError.message);

  // 2. Check Google Places listings in Florida
  const { data: floridaGP, count: floridaGPCount, error: floridaGPError } = await supabase
    .from("google_places_listings")
    .select("id, name, city, state", { count: "exact" })
    .eq("status", "active")
    .eq("state", "Florida")
    .limit(5);

  console.log(`\nGoogle Places in Florida: ${floridaGPCount || 0}`);
  if (floridaGP && floridaGP.length > 0) {
    console.log("Sample:");
    floridaGP.forEach((gp) => {
      console.log(`  - ${gp.name} (${gp.city}, ${gp.state})`);
    });
  }
  if (floridaGPError) console.error("Error:", floridaGPError.message);

  // 3. Check real listings count
  const { count: realCount, error: realError } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  console.log(`\nReal published listings: ${realCount || 0}`);
  if (realError) console.error("Error:", realError.message);

  // 4. Check what states are in the Google Places data
  const { data: statesData } = await supabase
    .from("google_places_listings")
    .select("state")
    .eq("status", "active");

  if (statesData) {
    const uniqueStates = [...new Set(statesData.map((s) => s.state))].sort();
    console.log(`\nStates with Google Places data (${uniqueStates.length}):`);
    console.log(uniqueStates.slice(0, 10).join(", ") + (uniqueStates.length > 10 ? "..." : ""));
  }
}

main();
