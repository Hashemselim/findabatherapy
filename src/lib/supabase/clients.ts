import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for use in Client Components.
 * Uses @supabase/ssr to properly handle cookies for auth state.
 */
export const createSupabaseBrowserClient = () => {
  // Only use singleton on client side
  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase client environment variables are not configured");
  }

  const client = createBrowserClient(supabaseUrl, supabaseKey);

  if (typeof window !== "undefined") {
    browserClient = client;
  }

  return client;
};
