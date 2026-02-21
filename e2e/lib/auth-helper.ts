import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env.local for Supabase credentials
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Gets a Supabase admin client (service role key) for user management.
 * Bypasses RLS — use only in test setup/teardown.
 */
export function getAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for test user management");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Signs in via Supabase REST API and returns a storage state object
 * compatible with Playwright's `use({ storageState })`.
 *
 * ~50ms vs ~3s for UI-based sign-in.
 */
export async function signInViaAPI(
  email: string,
  password: string
): Promise<{
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}> {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sign-in failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Extract the project ref from the Supabase URL for cookie naming
  // e.g., https://abc123.supabase.co → abc123
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  // Build the auth token value that Supabase SSR expects
  const tokenValue = JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
  });

  // Supabase SSR splits cookies into chunks — base64 encode the value
  const base64Value = Buffer.from(tokenValue).toString("base64");

  return {
    cookies: [
      {
        name: `${cookieName}.0`,
        value: `base64-${base64Value}`,
        domain: "localhost",
        path: "/",
        expires: data.expires_at ?? -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}
