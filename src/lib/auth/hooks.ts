"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser as useClerkUser, useAuth as useClerkAuth } from "@clerk/nextjs";

import { platformConfig } from "@/lib/platform/config";

interface AuthUser {
  id: string;
  email: string | null;
}

function useClerkMode() {
  return platformConfig.authProvider === "clerk";
}

/**
 * Hook to get the current authenticated user.
 * Routes to Clerk or Supabase depending on platform config.
 */
export function useUser() {
  const isClerk = useClerkMode();

  // Clerk path
  const clerkState = useClerkUser();

  // Supabase path
  const [supabaseUser, setSupabaseUser] = useState<AuthUser | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(!isClerk);

  useEffect(() => {
    if (isClerk) return;

    let cancelled = false;

    import("@/lib/supabase/clients").then(({ createSupabaseBrowserClient }) => {
      if (cancelled) return;
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (cancelled) return;
        setSupabaseUser(
          user ? { id: user.id, email: user.email ?? null } : null,
        );
        setSupabaseLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        const u = session?.user;
        setSupabaseUser(u ? { id: u.id, email: u.email ?? null } : null);
        setSupabaseLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    });

    return () => {
      cancelled = true;
    };
  }, [isClerk]);

  if (isClerk) {
    const user: AuthUser | null = clerkState.user
      ? {
          id: clerkState.user.id,
          email:
            clerkState.user.primaryEmailAddress?.emailAddress ?? null,
        }
      : null;
    return { user, loading: !clerkState.isLoaded };
  }

  return { user: supabaseUser, loading: supabaseLoading };
}

/**
 * Hook to get auth status (simplified).
 */
export function useAuthStatus() {
  const { user, loading } = useUser();

  return {
    loading,
    isAuthenticated: !!user,
    user,
  };
}

/**
 * Hook to sign out the user on the client side.
 */
export function useSignOut() {
  const isClerk = useClerkMode();
  const clerkAuth = useClerkAuth();
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async () => {
    setLoading(true);
    if (isClerk) {
      await clerkAuth.signOut();
    } else {
      const { createSupabaseBrowserClient } = await import(
        "@/lib/supabase/clients"
      );
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    setLoading(false);
  }, [isClerk, clerkAuth]);

  return { signOut, loading };
}
