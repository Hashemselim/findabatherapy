"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import posthog from "posthog-js";

import { PostHogProvider } from "@/components/posthog-provider";
import { PlatformRuntimeProvider } from "@/components/platform/runtime-provider";

type ProvidersProps = {
  children: ReactNode;
};

function AuthAnalyticsProvider({ children }: ProvidersProps) {
  const { user, isLoaded } = useClerkUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
      });
      return;
    }

    posthog.reset();
  }, [isLoaded, user]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <PlatformRuntimeProvider>
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>
          <AuthAnalyticsProvider>{children}</AuthAnalyticsProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </PlatformRuntimeProvider>
  );
}
