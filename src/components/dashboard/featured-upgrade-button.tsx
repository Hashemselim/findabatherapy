"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, Check, CheckCircle2 } from "lucide-react";
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
  "Highlighted in search results",
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
  onSuccess?: (data: { billingInterval: BillingInterval }) => void;
}

export function FeaturedUpgradeButton({
  locationId,
  locationName,
  disabled,
  pricing,
  onSuccess,
}: FeaturedUpgradeButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const currentPricing = billingInterval === "year" ? pricing.annual : pricing.monthly;

  const handleUpgrade = () => {
    setError(null);
    startTransition(async () => {
      const result = await createFeaturedLocationCheckout(locationId, billingInterval);
      if (result.success && result.data) {
        if (result.data.directCharge) {
          // Show success state in modal
          setUpgradeSuccess(true);
          // Auto-close modal after user sees success, THEN update parent
          // (updating parent immediately would unmount this component)
          setTimeout(() => {
            setOpen(false);
            setUpgradeSuccess(false); // Reset for next use
            // Notify parent to update UI after modal is closed
            onSuccess?.({ billingInterval });
          }, 2500);
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
          className="gap-1.5 border-[#FEE720] bg-[#FFF5C2] text-foreground hover:bg-[#FEE720] hover:text-[#333333]"
          disabled={disabled}
        >
          <Star className="h-3.5 w-3.5 fill-[#5788FF] text-[#5788FF]" />
          Feature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-[#5788FF] text-[#5788FF]" />
            Feature This Location
          </DialogTitle>
          <DialogDescription>
            Make <span className="font-medium text-foreground">{locationName}</span> appear
            at the top of all matching search results.
          </DialogDescription>
        </DialogHeader>

        {upgradeSuccess ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground">
              {locationName} is now featured!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your location will appear at the top of search results.
            </p>
          </div>
        ) : (
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
            <div className="rounded-lg border border-[#FEE720] bg-[#FFF5C2] p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  ${billingInterval === "year" ? pricing.annual.price : pricing.monthly.price}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              {billingInterval === "year" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  ${pricing.annual.totalPrice} billed annually — save {pricing.annual.savingsPercent}% (${pricing.annual.savings})
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {FEATURED_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5788FF]" />
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
                className="gap-2 border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 fill-[#5788FF] text-[#5788FF]" />
                    {billingInterval === "year"
                      ? `Subscribe for $${pricing.annual.totalPrice}/yr`
                      : `Subscribe for $${pricing.monthly.price}/mo`}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
