"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  cancelFeaturedLocation,
  reactivateFeaturedLocation,
} from "@/lib/stripe/actions";

interface FeaturedManageButtonProps {
  locationId: string;
  locationName: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  onCancel?: () => void;
  onReactivate?: () => void;
}

export function FeaturedManageButton({
  locationId,
  locationName,
  status,
  billingInterval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  onCancel,
  onReactivate,
}: FeaturedManageButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<"cancel" | "reactivate" | null>(null);

  const formattedDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelFeaturedLocation(locationId);
      if (result.success) {
        setActionSuccess("cancel");
        onCancel?.();
        setTimeout(() => {
          setOpen(false);
          setActionSuccess(null);
        }, 2500);
      } else {
        setError(result.error || "Failed to cancel subscription");
      }
    });
  };

  const handleReactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await reactivateFeaturedLocation(locationId);
      if (result.success) {
        setActionSuccess("reactivate");
        onReactivate?.();
        setTimeout(() => {
          setOpen(false);
          setActionSuccess(null);
        }, 2500);
      } else {
        setError(result.error || "Failed to reactivate subscription");
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
        >
          <Star className="h-3.5 w-3.5 fill-[#5788FF] text-[#5788FF]" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-[#5788FF] text-[#5788FF]" />
            Featured Location
          </DialogTitle>
          <DialogDescription>
            Manage the featured subscription for{" "}
            <span className="font-medium text-foreground">{locationName}</span>
          </DialogDescription>
        </DialogHeader>

        {actionSuccess === "cancel" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
              <XCircle className="h-7 w-7 text-orange-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground">
              Featured status cancelled
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locationName} will remain featured until {formattedDate}.
            </p>
          </div>
        ) : actionSuccess === "reactivate" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground">
              Featured status reactivated!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locationName} will continue to appear at the top of search results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status card */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {cancelAtPeriodEnd ? (
                  <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                    Cancelling
                  </Badge>
                ) : status === "past_due" ? (
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
                  {billingInterval === "year" ? "Annual" : "Monthly"}
                </span>
              </div>

              {formattedDate && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {cancelAtPeriodEnd ? "Featured until" : "Renews on"}
                  </span>
                  <span className="text-sm font-medium">{formattedDate}</span>
                </div>
              )}
            </div>

            {/* Warning for cancellation */}
            {cancelAtPeriodEnd && (
              <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                <p className="text-sm text-orange-800">
                  Your featured status will end on {formattedDate}. You can reactivate
                  at any time before then to keep your featured placement.
                </p>
              </div>
            )}

            {/* Warning for past due */}
            {status === "past_due" && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-800">
                  Your payment failed. Please update your payment method to keep your
                  featured placement.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>

              {cancelAtPeriodEnd ? (
                <Button
                  onClick={handleReactivate}
                  disabled={isPending}
                  className="gap-2"
                >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
