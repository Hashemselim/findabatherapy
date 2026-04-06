import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env } from "@/env";

export const WORKSPACE_INVITE_COOKIE = "workspace_invite_token";
const isProduction = process.env.NODE_ENV === "production";

export type ProfileRole = "owner" | "admin" | "member";

export interface CurrentMembership {
  id: string;
  profile_id: string;
  user_id: string;
  email: string;
  role: ProfileRole;
  status: "active" | "revoked";
  invited_by_user_id: string | null;
  joined_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceProfile {
  id: string;
  agency_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  full_name?: string | null;
  website?: string | null;
  plan_tier?: string | null;
  subscription_status?: string | null;
  billing_interval?: string | null;
  onboarding_completed_at?: string | null;
  intake_form_settings?: Record<string, unknown> | null;
  primary_intent?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  is_admin?: boolean | null;
  has_featured_addon?: boolean | null;
  email?: string | null;
  slug?: string | null;
  listings?: unknown;
  drip_email_step?: number | null;
  drip_email_last_sent?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CurrentWorkspace {
  membership: CurrentMembership;
  profile: WorkspaceProfile;
}

const ROLE_ORDER: Record<ProfileRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

function assertSupabaseRuntimeAllowed() {
  if (
    isProduction &&
    (process.env.NEXT_PUBLIC_AUTH_PROVIDER !== "supabase" ||
      process.env.NEXT_PUBLIC_DATA_PROVIDER !== "supabase")
  ) {
    throw new Error(
      "Supabase runtime access is disabled in production after the Clerk + Convex cutover.",
    );
  }
}

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * This client uses cookie-based auth and handles the async cookie store properly for Next.js 14+.
 */
export async function createClient() {
  assertSupabaseRuntimeAllowed();
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

export function hasAdminClientEnv() {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
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
  assertSupabaseRuntimeAllowed();
  if (!hasAdminClientEnv()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY as string;

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
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

async function synthesizeOwnerMembership(user: User): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, contact_email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    id: `synthetic-owner-${user.id}`,
    profile_id: profile.id,
    user_id: user.id,
    email: profile.contact_email || user.email || "",
    role: "owner",
    status: "active",
    invited_by_user_id: null,
    joined_at: null,
  };
}

/**
 * Gets the active workspace membership for the current user.
 * Falls back to a synthetic owner membership for pre-migration accounts.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const user = await getUser();
  if (!user) {
    return null;
  }

  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from("profile_memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[WORKSPACE] Failed to load membership:", error);
    }

    if (data) {
      return data as CurrentMembership;
    }
  } catch (error) {
    console.error("[WORKSPACE] Membership lookup failed:", error);
  }

  return synthesizeOwnerMembership(user);
}

/**
 * Gets the current workspace profile id for the logged-in user.
 */
export async function getCurrentProfileId(): Promise<string | null> {
  const membership = await getCurrentMembership();
  return membership?.profile_id ?? null;
}

/**
 * Require the current user to have the specified minimum workspace role.
 */
export async function requireProfileRole(minimumRole: ProfileRole): Promise<CurrentMembership> {
  const membership = await getCurrentMembership();
  if (!membership || membership.status !== "active") {
    throw new Error("Not authenticated");
  }

  if (ROLE_ORDER[membership.role] < ROLE_ORDER[minimumRole]) {
    throw new Error("Insufficient permissions");
  }

  return membership;
}

/**
 * Gets the current workspace profile row and membership.
 */
export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", membership.profile_id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    membership,
    profile: profile as WorkspaceProfile,
  };
}

export async function setWorkspaceInviteCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function getWorkspaceInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_INVITE_COOKIE)?.value ?? null;
}

export async function clearWorkspaceInviteCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(WORKSPACE_INVITE_COOKIE);
}

/**
 * Gets the current workspace profile from the database.
 * Returns null if not authenticated or the workspace doesn't exist.
 */
export async function getProfile() {
  const workspace = await getCurrentWorkspace();
  return workspace?.profile ?? null;
}
