/**
 * Set a user as admin
 * Run with: npx tsx scripts/set-admin.ts <email>
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
  const email = process.argv[2] || "hash@behaviorwork.com";

  console.log(`Setting ${email} as admin...`);

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_admin: true })
    .eq("contact_email", email)
    .select("id, contact_email, is_admin");

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No profile found with that email");
    return;
  }

  console.log(`✓ ${data[0].contact_email} is now an admin`);
}

main();
