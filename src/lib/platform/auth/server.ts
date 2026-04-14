import "server-only";

import { cache } from "react";
import { currentUser, auth as clerkAuth } from "@clerk/nextjs/server";

import type { PlatformUser } from "@/lib/platform/contracts";

const getCurrentUserCached = cache(async (): Promise<PlatformUser | null> => {
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
});

export async function getCurrentUser(): Promise<PlatformUser | null> {
  return getCurrentUserCached();
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

const getConvexAuthTokenCached = cache(async (): Promise<string | undefined> => {
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
});

export async function getConvexAuthToken(): Promise<string | undefined> {
  return getConvexAuthTokenCached();
}
