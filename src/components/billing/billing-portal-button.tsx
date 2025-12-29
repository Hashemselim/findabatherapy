"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBillingPortalSession } from "@/lib/stripe/actions";

interface BillingPortalButtonProps {
  variant?: "default" | "outline" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function BillingPortalButton({
  variant = "outline",
  size = "default",
  className,
  children,
}: BillingPortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createBillingPortalSession();

      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        setError(result.success ? "Failed to get portal URL" : result.error);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening...
          </>
        ) : (
          children || (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Billing Portal
            </>
          )
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
