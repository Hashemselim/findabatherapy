/**
 * Seed / Reset Test Users
 *
 * Usage:
 *   npm run seed:test-user          # Create Pro test user (idempotent)
 *   npm run seed:test-user:free     # Create Free test user (idempotent)
 *   npm run seed:reset              # Delete + recreate Pro user (wipes all data via CASCADE)
 *   npm run seed:reset:free         # Delete + recreate Free user
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

const isReset = process.argv.includes("--reset");
const isFree = process.argv.includes("--free");

// Account config based on plan tier
const config = isFree
  ? {
      email: "e2e-free@test.findabatherapy.com",
      password: "E2eFreePass123!",
      agencyName: "E2E Free Agency",
      planTier: "free" as const,
    }
  : {
      email: process.env.E2E_USER_EMAIL || "e2e-test@test.findabatherapy.com",
      password: process.env.E2E_USER_PASSWORD || "E2eTestPass123!",
      agencyName: "E2E Test Agency",
      planTier: "pro" as const,
    };

async function seedUser() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Email:  ${config.email}`);
  console.log(`Plan:   ${config.planTier}`);
  console.log(`Mode:   ${isReset ? "RESET (delete + recreate)" : "CREATE (idempotent)"}\n`);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === config.email);

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
    email: config.email,
    password: config.password,
    email_confirm: true,
    user_metadata: {
      agency_name: config.agencyName,
      selected_plan: config.planTier,
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
    agency_name: config.agencyName,
    contact_email: config.email,
    plan_tier: config.planTier,
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

  const state = isReset ? "fresh (no onboarding)" : `onboarded, ${config.planTier} plan`;
  console.log(`  Profile created (${state})`);
  console.log("\nDone! Test user ready.");
}

seedUser().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
