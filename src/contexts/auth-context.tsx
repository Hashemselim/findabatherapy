"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/clients";

type Profile = {
  id: string;
  agency_name: string;
  contact_email: string;
  plan_tier: "free" | "pro" | "enterprise";
  has_featured_addon: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch {
        // Auth initialization failed - user is not logged in
      }

      setLoading(false);
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        // Handle specific auth events
        if (event === "SIGNED_IN" && session?.user) {
          // Identify user in PostHog
          posthog.identify(session.user.id, {
            email: session.user.email,
          });
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          // Reset PostHog on logout
          posthog.reset();
          setProfile(null);
          router.refresh();
        }
      } catch {
        // Auth state change can throw when there's no valid session (e.g., dev preview mode)
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAuthenticated: !!user,
        isOnboardingComplete: !!profile?.onboarding_completed_at,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
