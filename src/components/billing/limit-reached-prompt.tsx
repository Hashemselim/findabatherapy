"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type AddonType,
  ADDON_INFO,
  createAddonCheckout,
} from "@/lib/actions/addons";

interface LimitReachedPromptProps {
  addonType: AddonType;
  currentCount: number;
  maxCount: number;
}

/**
 * Inline prompt shown when a Pro user hits a limit.
 * Example: "You've used 10 of 10 locations. Add 5 more for $10/mo."
 */
export function LimitReachedPrompt({
  addonType,
  currentCount,
  maxCount,
}: LimitReachedPromptProps) {
  const [loading, setLoading] = useState(false);
  const info = ADDON_INFO[addonType];

  async function handleAddMore() {
    setLoading(true);
    const result = await createAddonCheckout(addonType, 1);
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-blue-800">
          You&apos;ve used{" "}
          <span className="font-semibold">
            {currentCount} of {maxCount}
          </span>{" "}
          {info.unitLabel}
          {maxCount !== 1 ? "s" : ""}. Add {info.unitsPerPack} more for{" "}
          {info.priceLabel}.
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleAddMore}
        disabled={loading}
        className="shrink-0 gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add {info.unitLabel}s
      </Button>
    </div>
  );
}
