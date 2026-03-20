"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateReferralSourceStage } from "@/lib/actions/referrals";
import { REFERRAL_SOURCE_STAGE_OPTIONS, type ReferralSourceStage } from "@/lib/validations/referrals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceIds: string[];
}

export function ReferralStageChangeDialog({ open, onOpenChange, sourceIds }: StageChangeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<string>("ready_to_contact");

  function handleApply() {
    startTransition(async () => {
      let successCount = 0;
      for (const id of sourceIds) {
        const result = await updateReferralSourceStage(id, stage as ReferralSourceStage);
        if (result.success) successCount++;
      }
      toast.success(`Updated ${successCount} source${successCount !== 1 ? "s" : ""}`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Stage</DialogTitle>
          <DialogDescription>
            Set the stage for {sourceIds.length} selected source{sourceIds.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label>New stage</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_SOURCE_STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={isPending}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
