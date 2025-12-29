/**
 * Cleanup script to delete old seeded fake profiles
 * Run with: npx tsx scripts/cleanup-seeded.ts
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
  console.log("Deleting old seeded profiles...");

  // Delete old seeded profiles (cascades to listings, locations, attributes)
  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("is_seeded", true)
    .select("id");

  if (error) {
    console.error("Error deleting seeded profiles:", error);
    return;
  }

  console.log(`Deleted ${data?.length || 0} seeded profiles (and their related data)`);
}

main();
