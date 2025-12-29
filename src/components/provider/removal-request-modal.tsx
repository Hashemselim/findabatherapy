"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitRemovalRequest } from "@/lib/actions/google-places";

interface RemovalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googlePlacesListingId: string;
  providerName: string;
}

export function RemovalRequestModal({
  open,
  onOpenChange,
  googlePlacesListingId,
  providerName,
}: RemovalRequestModalProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      const response = await submitRemovalRequest(googlePlacesListingId, reason || undefined);
      setResult(response);

      // Close modal after success (with delay for feedback)
      if (response.success) {
        setTimeout(() => {
          onOpenChange(false);
          // Refresh the page to update the claim card state
          window.location.reload();
        }, 2000);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setReason("");
      setResult(null);
    }
    onOpenChange(newOpen);
  };

  // Success state
  if (result?.success) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Request Submitted</DialogTitle>
            <DialogDescription className="mt-2">
              We&apos;ll review your request and remove this listing if it matches your practice.
              You&apos;ll be notified once it&apos;s processed.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Listing Removal</DialogTitle>
          <DialogDescription>
            You&apos;re requesting removal of <strong>{providerName}</strong> from our directory.
            This is typically approved when you&apos;ve created your own listing on FindABATherapy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., This is my practice and I've created my own listing..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Adding context helps us process your request faster.
            </p>
          </div>

          {result?.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {result.error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
