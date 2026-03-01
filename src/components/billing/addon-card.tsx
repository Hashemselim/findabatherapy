"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, X, Clock, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ActiveAddon, type AddonType, ADDON_INFO } from "@/lib/plans/addon-config";
import { createAddonCheckout, cancelAddon } from "@/lib/actions/addons";

interface AddonCardProps {
  addons: ActiveAddon[];
}

export function AddonCard({ addons }: AddonCardProps) {
  return (
    <div className="space-y-3">
      {addons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Active Add-ons</h3>
          {addons.map((addon) => (
            <AddonRow key={addon.id} addon={addon} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">
          {addons.length > 0 ? "Add More Capacity" : "Available Add-ons"}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <AddonPurchaseButton addonType="location_pack" />
          <AddonPurchaseButton addonType="job_pack" />
          <AddonPurchaseButton addonType="extra_users" />
          <AddonPurchaseButton addonType="storage_pack" />
        </div>
      </div>
    </div>
  );
}

function AddonRow({ addon }: { addon: ActiveAddon }) {
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();
  const info = ADDON_INFO[addon.addonType];
  const isGrandfathered = !!addon.grandfatheredUntil;

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelAddon(addon.id);
    if (result.success) {
      router.refresh();
    }
    setCancelling(false);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2">
          <Package className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">
              {info.label} (x{addon.quantity})
            </p>
            {isGrandfathered && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-700 text-xs px-1.5 py-0"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Grandfathered
              </Badge>
            )}
            {addon.cancelAtPeriodEnd && (
              <Badge
                variant="outline"
                className="border-orange-300 bg-orange-50 text-orange-700 text-xs px-1.5 py-0"
              >
                Cancelling
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            +{addon.quantity * info.unitsPerPack} {info.unitLabel}
            {addon.quantity * info.unitsPerPack !== 1 ? "s" : ""}
            {isGrandfathered && addon.grandfatheredUntil && (
              <span className="ml-1">
                &middot; Free until{" "}
                {new Date(addon.grandfatheredUntil).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {!isGrandfathered && addon.currentPeriodEnd && (
              <span className="ml-1">
                &middot; Renews{" "}
                {new Date(addon.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </p>
        </div>
      </div>
      {!addon.cancelAtPeriodEnd && (
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-red-600"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span className="sr-only">Cancel</span>
        </Button>
      )}
    </div>
  );
}

function AddonPurchaseButton({ addonType }: { addonType: AddonType }) {
  const [loading, setLoading] = useState(false);
  const info = ADDON_INFO[addonType];

  async function handlePurchase() {
    setLoading(true);
    const result = await createAddonCheckout(addonType, 1);
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
    >
      <div className="rounded-lg bg-blue-50 p-2">
        <Plus className="h-4 w-4 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{info.label}</p>
        <p className="text-xs text-slate-500">{info.priceLabel}</p>
      </div>
    </button>
  );
}
