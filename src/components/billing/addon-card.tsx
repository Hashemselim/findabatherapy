"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, X, Clock, ShieldCheck, Minus, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ActiveAddon, type AddonType, ADDON_INFO } from "@/lib/plans/addon-config";
import { createAddonCheckout, cancelAddon, updateAddonQuantity } from "@/lib/actions/addons";

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
          {(["location_pack", "job_pack", "extra_users", "storage_pack"] as const).map(
            (type) => {
              const existing = addons.find(
                (a) => a.addonType === type && !a.cancelAtPeriodEnd
              );
              return (
                <AddonPurchaseButton
                  key={type}
                  addonType={type}
                  existingAddon={existing ?? null}
                />
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

function AddonRow({ addon }: { addon: ActiveAddon }) {
  const [cancelling, setCancelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(addon.quantity);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const info = ADDON_INFO[addon.addonType];
  const isGrandfathered = !!addon.grandfatheredUntil;
  const isHomepage = addon.addonType === "homepage_placement";
  const totalPrice = editQuantity * info.pricePerPack;
  const totalUnits = addon.quantity * info.unitsPerPack;

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelAddon(addon.id);
    if (result.success) {
      router.refresh();
    }
    setCancelling(false);
  }

  async function handleSaveQuantity() {
    if (editQuantity === addon.quantity) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const result = await updateAddonQuantity(addon.id, editQuantity);
    if (result.success) {
      router.refresh();
    }
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <Package className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900">
                {info.label}
                {addon.quantity > 1 && ` \u00d7 ${addon.quantity}`}
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
              +{totalUnits} {info.unitLabel}
              {totalUnits !== 1 ? "s" : ""}
              {!isGrandfathered && (
                <span className="ml-1">
                  &middot; ${addon.quantity * info.pricePerPack}/mo
                </span>
              )}
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
          <div className="flex items-center gap-1">
            {!isHomepage && !editing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-blue-600"
                onClick={() => {
                  setEditQuantity(addon.quantity);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Change quantity</span>
              </Button>
            )}
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
          </div>
        )}
      </div>

      {/* Inline quantity editor */}
      {editing && (
        <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
          <QuantityStepper
            value={editQuantity}
            onChange={setEditQuantity}
            min={1}
            max={20}
          />
          <span className="text-xs text-slate-500">
            {editQuantity} {editQuantity === 1 ? "pack" : "packs"} &times; ${info.pricePerPack}/mo
            = <span className="font-medium text-slate-700">${totalPrice}/mo</span>
            <span className="ml-1 text-slate-400">
              ({editQuantity * info.unitsPerPack} {info.unitLabel}
              {editQuantity * info.unitsPerPack !== 1 ? "s" : ""})
            </span>
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSaveQuantity}
              disabled={saving || editQuantity === addon.quantity}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddonPurchaseButton({
  addonType,
  existingAddon,
}: {
  addonType: AddonType;
  existingAddon: ActiveAddon | null;
}) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showQuantity, setShowQuantity] = useState(false);
  const router = useRouter();
  const info = ADDON_INFO[addonType];
  const isHomepage = addonType === "homepage_placement";
  const totalPrice = quantity * info.pricePerPack;
  const totalUnits = quantity * info.unitsPerPack;

  async function handlePurchase() {
    setLoading(true);
    const result = await createAddonCheckout(addonType, quantity);
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    } else if (!result.success && result.error === "ALREADY_EXISTS" && existingAddon) {
      // They already have this addon — increase quantity instead
      const newQty = existingAddon.quantity + quantity;
      const updateResult = await updateAddonQuantity(existingAddon.id, newQty);
      if (updateResult.success) {
        router.refresh();
      }
    }
    setLoading(false);
  }

  // If they already have this add-on active, show "Add more" variant
  if (existingAddon) {
    return (
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="flex items-center gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
      >
        <div className="rounded-lg bg-blue-100 p-2">
          <Plus className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            Add more {info.unitLabel}s
          </p>
          <p className="text-xs text-slate-500">
            +{info.unitsPerPack} for ${info.pricePerPack}/mo
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400 hover:bg-slate-50">
      <button
        onClick={() => {
          if (isHomepage) {
            handlePurchase();
          } else {
            setShowQuantity(!showQuantity);
          }
        }}
        disabled={loading}
        className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
      >
        <div className="rounded-lg bg-blue-50 p-2">
          <Plus className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{info.label}</p>
          <p className="text-xs text-slate-500">{info.priceLabel}</p>
        </div>
      </button>

      {showQuantity && !isHomepage && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={10}
            />
            <span className="text-xs text-slate-500">
              {quantity} &times; ${info.pricePerPack} ={" "}
              <span className="font-medium text-slate-700">${totalPrice}/mo</span>
              <span className="ml-1 text-slate-400">
                ({totalUnits} {info.unitLabel}
                {totalUnits !== 1 ? "s" : ""})
              </span>
            </span>
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? "Processing..." : `Purchase \u2014 $${totalPrice}/mo`}
          </Button>
        </div>
      )}
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-30"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="flex h-7 w-8 items-center justify-center border-x border-slate-200 text-xs font-medium text-slate-700">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-30"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
