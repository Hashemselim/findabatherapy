"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import posthog from "posthog-js";

type Profile = {
  id: string;
  agency_name: string;
  contact_email: string;
  plan_tier: "free" | "pro";
  has_featured_addon: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchCurrentProfile(): Promise<Profile | null> {
  const response = await fetch("/api/auth/profile", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { profile?: Profile | null };
  return payload.profile ?? null;
}

function AuthProviderImpl({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useClerkUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (user) {
      setProfile(await fetchCurrentProfile());
    } else {
      setProfile(null);
    }
    setProfileLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void refreshProfile();
  }, [isLoaded, refreshProfile]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
      });
    } else {
      posthog.reset();
      setProfile(null);
      setProfileLoaded(true);
    }
  }, [isLoaded, user]);

  const value: AuthContextType = {
    user: user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? null,
        }
      : null,
    session: null,
    profile,
    loading: !isLoaded || !profileLoaded,
    isAuthenticated: !!user,
    isOnboardingComplete: !!profile?.onboarding_completed_at,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderImpl>{children}</AuthProviderImpl>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
