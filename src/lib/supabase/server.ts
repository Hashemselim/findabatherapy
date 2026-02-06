import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env } from "@/env";

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * This client uses cookie-based auth and handles the async cookie store properly for Next.js 14+.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client with service role key for privileged operations.
 * Use this for operations that need to bypass RLS (e.g., creating profiles on signup, analytics).
 *
 * WARNING: Only use this in trusted server-side contexts. Never expose to the client.
 *
 * NOTE: Uses the standard Supabase client (not SSR) because the service role key
 * only bypasses RLS when used with createClient from @supabase/supabase-js.
 * The SSR variant's createServerClient does not bypass RLS even with service role key.
 */
export async function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Gets the current authenticated user from the server.
 * Returns null if not authenticated.
 */
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    // Supabase auth can throw AbortError when there's no valid session
    return null;
  }
}

/**
 * Gets the current session from the server.
 * Returns null if no active session.
 */
export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Gets the user's profile from the database.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getProfile() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}
