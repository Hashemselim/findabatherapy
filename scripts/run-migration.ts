/**
 * Run migration to add phone and website columns
 *
 * Run with: npx tsx scripts/run-migration.ts
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

async function checkColumns() {
  console.log("Checking if contact_phone and website columns exist...\n");

  // Try to select the columns
  const { data, error } = await supabase
    .from("profiles")
    .select("contact_phone, website")
    .limit(1);

  if (error && error.message.includes("column")) {
    console.log("❌ Columns don't exist yet.\n");
    console.log("Please run this SQL in your Supabase Dashboard SQL Editor:");
    console.log("(Go to: https://supabase.com/dashboard/project/ltihdvlduohufwcfwops/sql/new)\n");
    console.log("----------------------------------------");
    console.log(`
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS website text;

CREATE INDEX IF NOT EXISTS idx_profiles_website ON public.profiles(website) WHERE website IS NOT NULL;
    `);
    console.log("----------------------------------------");
    return false;
  } else if (error) {
    console.error("Unexpected error:", error.message);
    return false;
  } else {
    console.log("✅ Columns already exist!");
    return true;
  }
}

checkColumns()
  .then((exists) => process.exit(exists ? 0 : 1))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
