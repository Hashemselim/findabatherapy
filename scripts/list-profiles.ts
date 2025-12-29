/**
 * List all profiles to find admin user
 * Run with: npx tsx scripts/list-profiles.ts
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
  console.log("Listing all profiles...\n");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, contact_email, agency_name, is_admin, is_seeded")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No profiles found");
    return;
  }

  console.log(`Found ${data.length} profile(s):\n`);
  for (const profile of data) {
    console.log(`- ${profile.contact_email || "(no email)"}`);
    console.log(`  ID: ${profile.id}`);
    console.log(`  Agency: ${profile.agency_name || "(none)"}`);
    console.log(`  Admin: ${profile.is_admin}`);
    console.log("");
  }
}

main();
