import "server-only";

import { currentUser, auth as clerkAuth } from "@clerk/nextjs/server";

import { getUser as getSupabaseUser } from "@/lib/supabase/server";
import { isClerkAuthEnabled } from "@/lib/platform/config";
import type { PlatformUser } from "@/lib/platform/contracts";

export async function getCurrentUser(): Promise<PlatformUser | null> {
  if (!isClerkAuthEnabled()) {
    const user = await getSupabaseUser();
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? null,
      provider: "supabase",
    };
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    provider: "clerk",
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function getConvexAuthToken(): Promise<string | undefined> {
  if (!isClerkAuthEnabled()) {
    return undefined;
  }

  const authState = await clerkAuth();
  if (!authState.userId) {
    return undefined;
  }

  const token = await authState.getToken({ template: "convex" });
  if (!token) {
    throw new Error(
      "Clerk Convex JWT template 'convex' is missing or not issuing tokens. " +
        "Activate Clerk's Convex integration or create a JWT template named 'convex' " +
        'with {"aud":"convex"}.',
    );
  }

  return token;
}
