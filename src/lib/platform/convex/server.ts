import "server-only";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";

import { platformConfig } from "@/lib/platform/config";

function requireConvexUrl() {
  if (!platformConfig.convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required when Convex data is enabled");
  }

  return platformConfig.convexUrl;
}

async function getConvexToken() {
  const authState = await clerkAuth();
  const sessionClaims = (authState.sessionClaims ?? null) as { aud?: unknown } | null;

  if (sessionClaims?.aud === "convex") {
    return (await authState.getToken()) ?? undefined;
  }

  return (
    (await authState.getToken({ template: "convex" })) ??
    (await authState.getToken()) ??
    undefined
  );
}

export async function queryConvex<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchQuery(
    makeFunctionReference<"query", Record<string, unknown>, T>(functionName),
    args,
    {
      token: await getConvexToken(),
      url: requireConvexUrl(),
    },
  );
}

export async function mutateConvex<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchMutation(
    makeFunctionReference<"mutation", Record<string, unknown>, T>(functionName),
    args,
    {
      token: await getConvexToken(),
      url: requireConvexUrl(),
    },
  );
}

/**
 * Call a Convex mutation without user authentication.
 * Used by Stripe webhook handlers where there is no Clerk session.
 */
export async function mutateConvexUnauthenticated<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchMutation(
    makeFunctionReference<"mutation", Record<string, unknown>, T>(functionName),
    args,
    {
      url: requireConvexUrl(),
    },
  );
}

export async function uploadFileToConvexStorage(file: Blob): Promise<string> {
  const uploadUrl = await mutateConvex<string>("files:generateUploadUrl");
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers:
      file.type && file.type.length > 0
        ? { "Content-Type": file.type }
        : undefined,
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to Convex storage");
  }

  const payload = (await response.json()) as { storageId?: string };
  if (!payload.storageId) {
    throw new Error("Convex upload did not return a storage ID");
  }

  return payload.storageId;
}
