"use client";

import { useCallback, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/clients";

/**
 * Hook to get the current authenticated user.
 * Subscribes to auth state changes.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/**
 * Hook to get the current session.
 * Subscribes to auth state changes.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/**
 * Hook to get auth status (simplified).
 * Returns loading state and whether user is authenticated.
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
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setLoading(false);
    // Redirect will happen via server action or router
  }, []);

  return { signOut, loading };
}
