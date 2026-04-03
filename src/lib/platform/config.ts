export type AuthRuntimeProvider = "supabase" | "clerk";
export type DataRuntimeProvider = "supabase" | "convex";

function normalizeAuthProvider(
  value: string | undefined,
): AuthRuntimeProvider {
  return value === "clerk" ? "clerk" : "supabase";
}

function normalizeDataProvider(
  value: string | undefined,
): DataRuntimeProvider {
  return value === "convex" ? "convex" : "supabase";
}

export const platformConfig = {
  authProvider: normalizeAuthProvider(process.env.NEXT_PUBLIC_AUTH_PROVIDER),
  dataProvider: normalizeDataProvider(process.env.NEXT_PUBLIC_DATA_PROVIDER),
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null,
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? null,
};

export function isClerkAuthEnabled() {
  return platformConfig.authProvider === "clerk";
}

export function isConvexDataEnabled() {
  return platformConfig.dataProvider === "convex";
}

export function isClerkConvexRuntimeEnabled() {
  return (
    isClerkAuthEnabled() &&
    isConvexDataEnabled() &&
    Boolean(platformConfig.clerkPublishableKey) &&
    Boolean(platformConfig.convexUrl)
  );
}
