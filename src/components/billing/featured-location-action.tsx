"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddonResultModal } from "@/components/billing/addon-result-modal";
import {
  createFeaturedLocationCheckout,
  cancelFeaturedLocation,
  reactivateFeaturedLocation,
} from "@/lib/stripe/actions";
import { type BillingInterval } from "@/lib/stripe/config";
import { cn } from "@/lib/utils";

const FEATURED_FEATURES = [
  "Pinned to the top of matching FindABATherapy.org state search results",
  "Featured badge on listing card",
  "Highlighted on FindABATherapy.org search results",
  "Priority placement over non-featured locations",
];

export interface FeaturedPricing {
  monthly: { price: number };
  annual: { price: number; totalPrice: number; savings: number; savingsPercent: number };
}

interface FeaturedSubscriptionState {
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface FeaturedLocationActionProps {
  locationId: string;
  locationName: string;
  pricing: FeaturedPricing;
  subscription?: FeaturedSubscriptionState | null;
  disabled?: boolean;
  returnTo?: "locations" | "billing";
  onFeature?: (data: { billingInterval: BillingInterval }) => void;
  onCancel?: () => void;
  onReactivate?: () => void;
}

export function FeaturedLocationAction({
  locationId,
  locationName,
  pricing,
  subscription = null,
  disabled = false,
  returnTo = "locations",
  onFeature,
  onCancel,
  onReactivate,
}: FeaturedLocationActionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    title: string;
    description: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");

  const formattedDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  function showResult(nextResult: {
    type: "success" | "error";
    title: string;
    description: string;
  }) {
    setResult(nextResult);
    setResultOpen(true);
  }

  function handleResultOpenChange(open: boolean) {
    setResultOpen(open);
    if (!open) {
      router.refresh();
    }
  }

  function handleFeature() {
    setError(null);
    startTransition(async () => {
      const result = await createFeaturedLocationCheckout(
        locationId,
        billingInterval,
        returnTo
      );

      if (result.success && result.data) {
        if (result.data.directCharge) {
          setDialogOpen(false);
          onFeature?.({ billingInterval });
          showResult({
            type: "success",
            title: "Featured Location Added!",
            description: `${locationName} is now featured and will appear at the top of FindABATherapy.org search results.`,
          });
          return;
        }

        if (result.data.url) {
          window.location.href = result.data.url;
          return;
        }
      }

      setError(result.success ? "Failed to start checkout" : result.error);
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelFeaturedLocation(locationId);

      if (result.success) {
        setDialogOpen(false);
        onCancel?.();
        showResult({
          type: "success",
          title: "Featured Location Cancelled",
          description: formattedDate
            ? `${locationName} will stay featured until ${formattedDate}.`
            : `${locationName} will stay featured through the current billing period.`,
        });
        return;
      }

      setError(result.error);
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateFeaturedLocation(locationId);

      if (result.success) {
        setDialogOpen(false);
        onReactivate?.();
        showResult({
          type: "success",
          title: "Featured Location Reactivated",
          description: `${locationName} will continue appearing at the top of FindABATherapy.org search results.`,
        });
        return;
      }

      setError(result.error);
    });
  }

  const isManaging = !!subscription;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[#FEE720] bg-[#FFF5C2] text-foreground hover:bg-[#FEE720] hover:text-[#333333]"
            disabled={disabled}
          >
            <Star className="h-3.5 w-3.5 fill-[#5788FF] text-[#5788FF]" />
            {isManaging ? "Manage" : "Feature"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-[#5788FF] text-[#5788FF]" />
              {isManaging ? "Featured Location" : "Feature This Location"}
            </DialogTitle>
            <DialogDescription>
              {isManaging ? (
                <>
                  Manage the featured location add-on for{" "}
                  <span className="font-medium text-foreground">{locationName}</span>
                </>
              ) : (
                <>
                  Make <span className="font-medium text-foreground">{locationName}</span> appear
                  at the top of matching FindABATherapy.org search results.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isManaging && subscription ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {subscription.cancelAtPeriodEnd ? (
                    <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                      Cancelling
                    </Badge>
                  ) : subscription.status === "past_due" ? (
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                      Past Due
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Billing</span>
                  <span className="text-sm font-medium">
                    {subscription.billingInterval === "year" ? "Annual" : "Monthly"}
                  </span>
                </div>

                {formattedDate && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {subscription.cancelAtPeriodEnd ? "Featured until" : "Renews on"}
                    </span>
                    <span className="text-sm font-medium">{formattedDate}</span>
                  </div>
                )}
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    This featured placement ends on {formattedDate}. Reactivate before then to keep it live.
                  </p>
                </div>
              )}

              {subscription.status === "past_due" && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">
                    Payment failed for this featured placement. Update your payment method to keep it active.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
                {subscription.cancelAtPeriodEnd ? (
                  <Button onClick={handleReactivate} disabled={isPending} className="gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                    disabled={isPending}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Cancel Featured"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5788FF]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFeature}
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

      <AddonResultModal
        open={resultOpen}
        onOpenChange={handleResultOpenChange}
        result={result}
      />
    </>
  );
}
