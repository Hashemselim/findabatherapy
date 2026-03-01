"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type AddonType, ADDON_INFO } from "@/lib/plans/addon-config";
import { createAddonSubscription } from "@/lib/actions/addons";
import { AddonResultModal } from "@/components/billing/addon-result-modal";

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalResult, setModalResult] = useState<{
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const info = ADDON_INFO[addonType];

  async function handleAddMore() {
    setLoading(true);
    const result = await createAddonSubscription(addonType, 1);

    if (result.success && result.data) {
      if (result.data.directCharge) {
        // Inline charge succeeded — show success modal
        const totalUnits = info.unitsPerPack;
        setModalResult({
          type: "success",
          title: `${info.label} Added!`,
          description: `+${totalUnits} ${info.unitLabel}${totalUnits !== 1 ? "s" : ""} added to your plan at ${info.priceLabel}.`,
        });
        setModalOpen(true);
        router.refresh();
      } else if (result.data.url) {
        // No saved payment method — redirect to Checkout
        window.location.href = result.data.url;
        return; // Don't clear loading, page is navigating
      }
    } else {
      setModalResult({
        type: "error",
        title: "Add-on Failed",
        description: result.success ? "Unexpected error" : result.error,
      });
      setModalOpen(true);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-blue-800 dark:text-blue-200">
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

      <AddonResultModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={modalResult}
      />
    </>
  );
}
