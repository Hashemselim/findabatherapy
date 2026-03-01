"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillingPortalButton } from "@/components/billing/billing-portal-button";

interface AddonResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    type: "success" | "error";
    title: string;
    description: string;
  } | null;
}

export function AddonResultModal({
  open,
  onOpenChange,
  result,
}: AddonResultModalProps) {
  if (!result) return null;

  const isSuccess = result.type === "success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-opacity-10"
            style={{ backgroundColor: isSuccess ? "rgb(16 185 129 / 0.1)" : "rgb(239 68 68 / 0.1)" }}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <DialogTitle>{result.title}</DialogTitle>
          <DialogDescription>{result.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          {isSuccess ? (
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          ) : (
            <>
              <BillingPortalButton variant="default" className="w-full">
                Update Payment Method
              </BillingPortalButton>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
