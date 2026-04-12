import "server-only";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type { FunctionReference } from "convex/server";

import { api } from "../../../../convex/_generated/api";

import { platformConfig } from "@/lib/platform/config";

type ConvexFunctionName = `${string}:${string}`;

function requireConvexUrl() {
  if (!platformConfig.convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required when Convex data is enabled");
  }

  return platformConfig.convexUrl;
}

async function getConvexToken() {
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

function resolveConvexFunction<Operation extends "query" | "mutation", T>(
  functionName: ConvexFunctionName,
) {
  const [moduleName, exportName] = functionName.split(":") as [string, string];
  const apiRoot = api as unknown as Record<string, Record<string, unknown> | undefined>;
  const moduleApi = apiRoot[moduleName];
  const functionReference = moduleApi?.[exportName];

  if (!functionReference) {
    throw new Error(`Unknown Convex function: ${functionName}`);
  }

  return functionReference as FunctionReference<
    Operation,
    "public",
    Record<string, unknown>,
    T
  >;
}

export async function queryConvex<T>(
  functionName: ConvexFunctionName,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchQuery(
    resolveConvexFunction<"query", T>(functionName),
    args,
    {
      token: await getConvexToken(),
      url: requireConvexUrl(),
    },
  );
}

export async function mutateConvex<T>(
  functionName: ConvexFunctionName,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchMutation(
    resolveConvexFunction<"mutation", T>(functionName),
    args,
    {
      token: await getConvexToken(),
      url: requireConvexUrl(),
    },
  );
}

/**
 * Call a Convex query without user authentication.
 * Used for public reads like invite previews where there is no Clerk session.
 */
export async function queryConvexUnauthenticated<T>(
  functionName: ConvexFunctionName,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchQuery(
    resolveConvexFunction<"query", T>(functionName),
    args,
    {
      url: requireConvexUrl(),
    },
  );
}

/**
 * Call a Convex mutation without user authentication.
 * Used by Stripe webhook handlers where there is no Clerk session.
 */
export async function mutateConvexUnauthenticated<T>(
  functionName: ConvexFunctionName,
  args: Record<string, unknown> = {},
): Promise<T> {
  return fetchMutation(
    resolveConvexFunction<"mutation", T>(functionName),
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
