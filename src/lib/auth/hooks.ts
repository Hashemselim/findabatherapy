"use client";

import { useCallback, useState } from "react";
import { useUser as useClerkUser, useAuth as useClerkAuth } from "@clerk/nextjs";

interface AuthUser {
  id: string;
  email: string | null;
}
export function useUser() {
  const clerkState = useClerkUser();
  const user: AuthUser | null = clerkState.user
    ? {
        id: clerkState.user.id,
        email:
          clerkState.user.primaryEmailAddress?.emailAddress ?? null,
      }
    : null;

  return { user, loading: !clerkState.isLoaded };
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
  const clerkAuth = useClerkAuth();
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async () => {
    setLoading(true);
    await clerkAuth.signOut();
    setLoading(false);
  }, [clerkAuth]);

  return { signOut, loading };
}
