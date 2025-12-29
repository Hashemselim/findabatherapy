"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

/**
 * Client component that refreshes the user's profile data.
 * Used on the onboarding success page to ensure the sidebar
 * updates to hide the onboarding tab.
 */
export function ProfileRefresher() {
  const { refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return null;
}
