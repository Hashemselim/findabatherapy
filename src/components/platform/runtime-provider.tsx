"use client";

import { type ReactNode, useMemo } from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { platformConfig } from "@/lib/platform/config";

type RuntimeProviderProps = {
  children: ReactNode;
};

function ConvexClerkBridge({ children }: RuntimeProviderProps) {
  const client = useMemo(() => {
    if (!platformConfig.convexUrl) {
      return null;
    }

    return new ConvexReactClient(platformConfig.convexUrl);
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function PlatformRuntimeProvider({ children }: RuntimeProviderProps) {
  if (platformConfig.authProvider !== "clerk") {
    return <>{children}</>;
  }

  if (!platformConfig.clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider>
      {platformConfig.dataProvider === "convex" ? (
        <ConvexClerkBridge>{children}</ConvexClerkBridge>
      ) : (
        children
      )}
    </ClerkProvider>
  );
}
