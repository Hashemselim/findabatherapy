/**
 * Apply migration via Supabase Management API
 *
 * Run with: npx tsx scripts/apply-migration.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

const SUPABASE_PROJECT_REF = "ltihdvlduohufwcfwops";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SQL = `
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS website text;

CREATE INDEX IF NOT EXISTS idx_profiles_website ON public.profiles(website) WHERE website IS NOT NULL;
`;

async function applyMigration() {
  console.log("Applying migration via Supabase REST API...\n");

  // Use the postgrest endpoint with raw SQL
  const url = `https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/rpc/exec`;

  // First, let's try a simpler approach - use the management API
  const mgmtUrl = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

  try {
    const response = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Management API not available, trying alternative...\n");

      // Alternative: Create a temporary function to execute SQL
      await tryDirectApproach();
      return;
    }

    const result = await response.json();
    console.log("✅ Migration applied successfully!");
    console.log(result);
  } catch (error) {
    console.log("Management API failed, trying direct approach...\n");
    await tryDirectApproach();
  }
}

async function tryDirectApproach() {
  // Use supabase-js to check if columns exist, then guide user
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    `https://${SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_KEY
  );

  // Check if columns exist by trying to select them
  const { data, error } = await supabase
    .from("profiles")
    .select("id, contact_phone, website")
    .limit(1);

  if (error && error.message.includes("column")) {
    console.log("❌ Columns don't exist. Cannot apply via CLI without direct DB access.\n");
    console.log("Please run this SQL in Supabase Dashboard SQL Editor:");
    console.log("https://supabase.com/dashboard/project/ltihdvlduohufwcfwops/sql/new\n");
    console.log("----------------------------------------");
    console.log(SQL);
    console.log("----------------------------------------");
    process.exit(1);
  } else if (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  } else {
    console.log("✅ Columns already exist! Migration not needed.");
    console.log("Sample data:", data);
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
