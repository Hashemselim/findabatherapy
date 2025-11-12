import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/env";

const clientConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

type CookieStore = ReturnType<typeof cookies>;

export const createSupabaseBrowserClient = () => {
  if (!clientConfig.supabaseUrl || !clientConfig.supabaseKey) {
    throw new Error("Supabase client environment variables are not configured");
  }

  return createBrowserClient(clientConfig.supabaseUrl, clientConfig.supabaseKey, {
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return undefined;
        const match = document.cookie.match(
          `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`,
        );
        return match?.[1];
      },
    },
  });
};

const bindCookieStore = (store: CookieStore) => ({
  get(name: string) {
    return store.get(name)?.value;
  },
  set(name: string, value: string, options: CookieOptions) {
    try {
      store.set({ name, value, ...options });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to set cookie", error);
      }
    }
  },
  remove(name: string, options: CookieOptions) {
    try {
      store.delete({ name, ...options });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to remove cookie", error);
      }
    }
  },
});

export const createSupabaseServerClient = () =>
  createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: bindCookieStore(cookies()),
  });
