"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelPendingDowngrade } from "@/lib/stripe/actions";

interface CancelDowngradeButtonProps {
  className?: string;
}

export function CancelDowngradeButton({ className }: CancelDowngradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelPendingDowngrade();

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Canceling...
          </>
        ) : (
          <>
            <Undo2 className="mr-2 h-4 w-4" />
            Keep Current Plan
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
