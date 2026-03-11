"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type ActiveAddon, type AddonType, ADDON_INFO } from "@/lib/plans/addon-config";
import { cancelAddon, createAddonSubscription, reactivateAddon } from "@/lib/actions/addons";
import { createBillingPortalSession } from "@/lib/stripe/actions";
import { AddonResultModal } from "@/components/billing/addon-result-modal";

interface AddonCardProps {
  addons: ActiveAddon[];
}

export function AddonCard({ addons }: AddonCardProps) {
  const [modalResult, setModalResult] = useState<{
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  function showResult(result: { type: "success" | "error"; title: string; description: string }) {
    setModalResult(result);
    setModalOpen(true);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* My Add-ons */}
      {addons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">My Add-ons</h3>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {addons.map((addon) => (
              <AddonRow key={addon.id} addon={addon} onResult={showResult} />
            ))}
          </div>
          <ManageAddonsButton />
        </div>
      )}

      {/* Available Add-ons / Add More Capacity */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">Available Add-ons</h3>
        <div className="grid gap-2 sm:grid-cols-2 items-start">
          {(["location_pack", "job_pack", "extra_users", "storage_pack", "homepage_placement"] as const).map(
            (type) => {
              const existing = addons.find(
                (a) => a.addonType === type && !a.cancelAtPeriodEnd
              );
              const hasHomepagePlacement = addons.some(
                (a) => a.addonType === "homepage_placement"
              );
              if (type === "homepage_placement" && hasHomepagePlacement) {
                return null;
              }
              return (
                <AddonPurchaseButton
                  key={type}
                  addonType={type}
                  existingAddon={existing ?? null}
                  onResult={showResult}
                />
              );
            }
          )}
        </div>
      </div>

      <AddonResultModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        result={modalResult}
      />
    </div>
  );
}

/** Read-only row showing an active add-on */
function AddonRow({
  addon,
  onResult,
}: {
  addon: ActiveAddon;
  onResult: (result: { type: "success" | "error"; title: string; description: string }) => void;
}) {
  const info = ADDON_INFO[addon.addonType];
  const isGrandfathered = !!addon.grandfatheredUntil;
  const totalUnits = addon.quantity * info.unitsPerPack;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const result = await cancelAddon(addon.id);
    if (result.success) {
      setOpen(false);
      onResult({
        type: "success",
        title: `${info.label} Cancelling`,
        description: addon.currentPeriodEnd
          ? `Your ${info.label.toLowerCase()} stays active until ${new Date(addon.currentPeriodEnd).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}.`
          : `Your ${info.label.toLowerCase()} stays active through the current billing period.`,
      });
    } else {
      onResult({
        type: "error",
        title: "Unable to Update Add-on",
        description: result.error || "Something went wrong. Please try again.",
      });
    }
    setLoading(false);
  }

  async function handleReactivate() {
    setLoading(true);
    const result = await reactivateAddon(addon.id);
    if (result.success) {
      setOpen(false);
      onResult({
        type: "success",
        title: `${info.label} Reactivated`,
        description: `Your ${info.label.toLowerCase()} will continue renewing normally.`,
      });
    } else {
      onResult({
        type: "error",
        title: "Unable to Update Add-on",
        description: result.error || "Something went wrong. Please try again.",
      });
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="rounded-lg bg-slate-100 p-2">
        <Package className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
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
      {!isGrandfathered && addon.stripeSubscriptionId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              Manage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{info.label}</DialogTitle>
              <DialogDescription>
                Manage this add-on subscription.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {addon.cancelAtPeriodEnd ? (
                    <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                      Cancelling
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Included</span>
                  <span className="text-sm font-medium">
                    +{totalUnits} {info.unitLabel}{totalUnits !== 1 ? "s" : ""}
                  </span>
                </div>
                {addon.currentPeriodEnd && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {addon.cancelAtPeriodEnd ? "Active until" : "Renews on"}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(addon.currentPeriodEnd).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {addon.cancelAtPeriodEnd && (
                <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    This add-on will expire at the end of the current billing period unless you reactivate it.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                {addon.cancelAtPeriodEnd ? (
                  <Button onClick={handleReactivate} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Reactivate"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Cancel Add-on"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Button to open Stripe Billing Portal for add-on management */
function ManageAddonsButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await createBillingPortalSession();
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : null}
      Billing Portal
    </Button>
  );
}

/** Purchase button for a single add-on type */
function AddonPurchaseButton({
  addonType,
  existingAddon,
  onResult,
}: {
  addonType: AddonType;
  existingAddon: ActiveAddon | null;
  onResult: (result: { type: "success" | "error"; title: string; description: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showQuantity, setShowQuantity] = useState(false);
  const info = ADDON_INFO[addonType];
  const isHomepage = addonType === "homepage_placement";
  const totalPrice = quantity * info.pricePerPack;
  const totalUnits = quantity * info.unitsPerPack;

  async function handlePurchase() {
    setLoading(true);
    const result = await createAddonSubscription(addonType, quantity);

    if (result.success && result.data) {
      if (result.data.directCharge) {
        // Inline success — show modal
        onResult({
          type: "success",
          title: `${info.label} Added!`,
          description: `+${totalUnits} ${info.unitLabel}${totalUnits !== 1 ? "s" : ""} added to your plan. Your card was charged $${totalPrice}/mo.`,
        });
        setShowQuantity(false);
        setQuantity(1);
      } else if (result.data.url) {
        // No payment method — redirect to Checkout
        window.location.href = result.data.url;
        return; // Don't setLoading(false), page is navigating
      }
    } else if (!result.success) {
      if (result.error === "ALREADY_EXISTS" && existingAddon) {
        onResult({
          type: "error",
          title: "Add-on Already Active",
          description: `You already have a ${info.label}. Use the billing portal to change your quantity.`,
        });
      } else if (result.error === "ALREADY_EXISTS" && isHomepage) {
        onResult({
          type: "error",
          title: "Homepage Placement Already Active",
          description: "This homepage placement is already active or scheduled to renew. Use Manage on the active add-on to review it.",
        });
      } else {
        onResult({
          type: "error",
          title: "Payment Failed",
          description: result.error || "Something went wrong. Please update your payment method and try again.",
        });
      }
    }
    setLoading(false);
  }

  // If they already have this add-on active, show "Add more" variant
  if (existingAddon) {
    return (
      <div
        id={addonType === "extra_users" ? "add-user-seat" : undefined}
        className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <button
          onClick={() => setShowQuantity(!showQuantity)}
          disabled={loading}
          className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
        >
          <div className="rounded-lg bg-blue-100 p-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : (
              <Plus className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              Add more {info.unitLabel}s
            </p>
            <p className="text-xs text-slate-500">
              Current quantity: {existingAddon.quantity}
            </p>
          </div>
        </button>

        {showQuantity && (
          <div className="space-y-2 border-t border-blue-200 px-3 pb-3 pt-2">
            {!isHomepage && (
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={10}
                />
                <span className="text-xs text-slate-500">
                  Add {quantity * info.unitsPerPack} {info.unitLabel}
                  {quantity * info.unitsPerPack !== 1 ? "s" : ""} for{" "}
                  <span className="font-medium text-slate-700">${totalPrice}/mo</span>
                </span>
              </div>
            )}
            <Button
              size="sm"
              className="h-8 w-full text-xs"
              onClick={handlePurchase}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  {isHomepage ? "Processing..." : "Updating..."}
                </>
              ) : isHomepage ? (
                `Purchase — $${info.pricePerPack}/mo`
              ) : (
                `Add More — $${totalPrice}/mo`
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      id={addonType === "extra_users" ? "add-user-seat" : undefined}
      className="rounded-lg border border-dashed border-slate-300 bg-white transition-colors hover:border-slate-400 hover:bg-slate-50"
    >
      <button
        onClick={() => setShowQuantity(!showQuantity)}
        disabled={loading}
        className="flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
      >
        <div className="rounded-lg bg-blue-50 p-2">
          {loading ? (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{info.label}</p>
          <p className="text-xs text-slate-500">{info.priceLabel}</p>
        </div>
      </button>

      {showQuantity && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2 space-y-2">
          {!isHomepage && (
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
          )}
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase \u2014 $${totalPrice}/mo`
            )}
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
        <span className="text-sm font-medium">&minus;</span>
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
