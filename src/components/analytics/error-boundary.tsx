"use client";

import { useEffect } from "react";
import { trackError } from "@/lib/posthog/events";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Client component to track errors to PostHog
 * Used in error.tsx files
 */
export function ErrorTracker({ error }: Pick<ErrorBoundaryProps, "error">) {
  useEffect(() => {
    trackError({
      errorType: "runtime",
      errorMessage: error.message,
      errorCode: error.digest,
      additionalData: {
        stack: error.stack?.slice(0, 500),
      },
    });
  }, [error]);

  return null;
}
