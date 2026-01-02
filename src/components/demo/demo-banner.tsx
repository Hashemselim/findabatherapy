"use client";

import Link from "next/link";
import { Info, X, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/demo-context";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { restartTour } = useDemoContext();

  if (dismissed) return null;

  return (
    <div
      data-tour="demo-banner"
      className="sticky top-0 z-50 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 px-4 py-3 text-sm font-medium text-gray-900"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2 sm:items-center">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 sm:mt-0" />
          <span className="text-sm leading-tight">
            You&apos;re viewing a <strong>demo dashboard</strong> with sample Pro account data
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={restartTour}
            className="hidden items-center gap-1 rounded-full bg-white/30 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/50 sm:flex"
          >
            <RotateCcw className="h-3 w-3" />
            Restart Tour
          </button>

          <Button
            asChild
            size="sm"
            className="flex-1 rounded-full bg-gray-900 text-white hover:bg-gray-800 sm:flex-none"
          >
            <Link href="/auth/sign-up?from=demo">Get Started Free</Link>
          </Button>

          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1.5 transition-colors hover:bg-white/30"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
