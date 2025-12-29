"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createFeaturedLocationCheckout } from "@/lib/stripe/actions";
import { type BillingInterval } from "@/lib/stripe/config";
import { cn } from "@/lib/utils";

// Features are static and don't change
const FEATURED_FEATURES = [
  "Pinned to top of state search results",
  "Featured badge on listing card",
  "Amber highlight in search results",
  "Priority placement over non-featured",
];

export interface FeaturedPricing {
  monthly: { price: number };
  annual: { price: number; totalPrice: number; savings: number; savingsPercent: number };
}

interface FeaturedUpgradeButtonProps {
  locationId: string;
  locationName: string;
  disabled?: boolean;
  pricing: FeaturedPricing;
}

export function FeaturedUpgradeButton({
  locationId,
  locationName,
  disabled,
  pricing,
}: FeaturedUpgradeButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");

  const currentPricing = billingInterval === "year" ? pricing.annual : pricing.monthly;

  const handleUpgrade = () => {
    setError(null);
    startTransition(async () => {
      const result = await createFeaturedLocationCheckout(locationId, billingInterval);
      if (result.success && result.data) {
        if (result.data.directCharge) {
          // Subscription created directly using existing payment method
          // Reload to show updated featured status (webhook will have processed)
          window.location.href = `/dashboard/locations?featured_success=${locationId}`;
        } else if (result.data.url) {
          // Redirect to checkout (no payment method on file)
          window.location.href = result.data.url;
        } else {
          setError("Failed to start checkout");
        }
      } else if (!result.success) {
        setError(result.error);
      } else {
        setError("Failed to start checkout");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
          disabled={disabled}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Feature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Feature This Location
          </DialogTitle>
          <DialogDescription>
            Make <span className="font-medium text-foreground">{locationName}</span> appear
            at the top of all matching search results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Billing interval toggle */}
          <div className="flex items-center justify-center gap-2 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("month")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                billingInterval === "month"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("year")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                billingInterval === "year"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              {pricing.annual.savingsPercent > 0 && (
                <span className="ml-1.5 text-xs opacity-80">
                  (Save {pricing.annual.savingsPercent}%)
                </span>
              )}
            </button>
          </div>

          {/* Pricing card */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                ${billingInterval === "year" ? pricing.annual.price : pricing.monthly.price}
              </span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            {billingInterval === "year" && (
              <p className="mt-1 text-sm text-slate-600">
                ${pricing.annual.totalPrice} billed annually — save {pricing.annual.savingsPercent}% (${pricing.annual.savings})
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {FEATURED_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isPending}
              className="gap-2 bg-amber-500 text-white hover:bg-amber-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {billingInterval === "year"
                    ? `Subscribe for $${pricing.annual.totalPrice}/yr`
                    : `Subscribe for $${pricing.monthly.price}/mo`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
