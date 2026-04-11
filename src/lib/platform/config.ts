export type AuthRuntimeProvider = "clerk";
export type DataRuntimeProvider = "convex";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? null;

if (process.env.NODE_ENV === "production") {
  if (!clerkPublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required in production.",
    );
  }

  if (!convexUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is required in production.",
    );
  }
}

export const platformConfig = {
  authProvider: "clerk" as const,
  dataProvider: "convex" as const,
  clerkPublishableKey,
  convexUrl,
};

export function isClerkAuthEnabled() {
  return true;
}

export function isConvexDataEnabled() {
  return true;
}

export function isClerkConvexRuntimeEnabled() {
  return Boolean(clerkPublishableKey && convexUrl);
}
