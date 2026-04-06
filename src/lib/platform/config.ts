export type AuthRuntimeProvider = "supabase" | "clerk";
export type DataRuntimeProvider = "supabase" | "convex";

const isProduction = process.env.NODE_ENV === "production";

function normalizeAuthProvider(
  value: string | undefined,
): AuthRuntimeProvider {
  if (value === "clerk" || value === "supabase") {
    return value;
  }

  if (isProduction) {
    throw new Error(
      "NEXT_PUBLIC_AUTH_PROVIDER must be explicitly set to 'clerk' in production.",
    );
  }

  return "clerk";
}

function normalizeDataProvider(
  value: string | undefined,
): DataRuntimeProvider {
  if (value === "convex" || value === "supabase") {
    return value;
  }

  if (isProduction) {
    throw new Error(
      "NEXT_PUBLIC_DATA_PROVIDER must be explicitly set to 'convex' in production.",
    );
  }

  return "convex";
}

const authProvider = normalizeAuthProvider(process.env.NEXT_PUBLIC_AUTH_PROVIDER);
const dataProvider = normalizeDataProvider(process.env.NEXT_PUBLIC_DATA_PROVIDER);
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? null;

if (isProduction) {
  if (authProvider !== "clerk" || dataProvider !== "convex") {
    throw new Error(
      "Production runtime must use Clerk auth and Convex data. Supabase is not an allowed production provider.",
    );
  }

  if (!clerkPublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required in production when Clerk auth is enabled.",
    );
  }

  if (!convexUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is required in production when Convex data is enabled.",
    );
  }
}

export const platformConfig = {
  authProvider,
  dataProvider,
  clerkPublishableKey,
  convexUrl,
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
