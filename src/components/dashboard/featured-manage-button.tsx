"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
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
import { useRouter } from "next/navigation";

interface FeaturedManageButtonProps {
  locationId: string;
  locationName: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function FeaturedManageButton({
  locationId,
  locationName,
  status,
  billingInterval,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: FeaturedManageButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        setOpen(false);
        router.refresh();
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
        setOpen(false);
        router.refresh();
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
          className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
        >
          <Star className="h-3.5 w-3.5 fill-amber-400" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
            Featured Location
          </DialogTitle>
          <DialogDescription>
            Manage the featured subscription for{" "}
            <span className="font-medium text-foreground">{locationName}</span>
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
