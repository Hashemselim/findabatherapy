/**
 * Seed / Reset Test User
 *
 * Usage:
 *   npm run seed:test-user          # Create persistent test user (idempotent)
 *   npm run seed:reset              # Delete + recreate (wipes all data via CASCADE)
 *
 * Reads E2E_USER_EMAIL and E2E_USER_PASSWORD from .env.local.
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin operations.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const E2E_EMAIL = process.env.E2E_USER_EMAIL || "e2e-test@test.findabatherapy.com";
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD || "E2eTestPass123!";

const isReset = process.argv.includes("--reset");

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Email:  ${E2E_EMAIL}`);
  console.log(`Mode:   ${isReset ? "RESET (delete + recreate)" : "CREATE (idempotent)"}\n`);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === E2E_EMAIL);

  if (isReset && existingUser) {
    console.log(`Deleting user ${existingUser.id}...`);
    console.log("  (CASCADE will wipe profiles + all child tables)");
    const { error } = await supabase.auth.admin.deleteUser(existingUser.id);
    if (error) {
      console.error("Failed to delete user:", error.message);
      process.exit(1);
    }
    console.log("  Deleted.\n");
  } else if (!isReset && existingUser) {
    console.log(`User already exists (${existingUser.id}). Skipping creation.`);
    return;
  }

  // Create auth user
  console.log("Creating auth user...");
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: {
      agency_name: "E2E Test Agency",
      selected_plan: "pro",
      billing_interval: "month",
      selected_intent: "both",
    },
  });

  if (createError || !newUser.user) {
    console.error("Failed to create user:", createError?.message);
    process.exit(1);
  }

  console.log(`  Created: ${newUser.user.id}`);

  // Create profile row
  console.log("Creating profile...");
  const { error: profileError } = await supabase.from("profiles").insert({
    id: newUser.user.id,
    agency_name: "E2E Test Agency",
    contact_email: E2E_EMAIL,
    plan_tier: "pro",
    billing_interval: "month",
    primary_intent: "both",
    onboarding_completed_at: isReset ? null : new Date().toISOString(),
  });

  if (profileError) {
    console.error("Failed to create profile:", profileError.message);
    // Clean up the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(newUser.user.id);
    process.exit(1);
  }

  const state = isReset ? "fresh (no onboarding)" : "onboarded, pro plan";
  console.log(`  Profile created (${state})`);
  console.log("\nDone! Test user ready.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
