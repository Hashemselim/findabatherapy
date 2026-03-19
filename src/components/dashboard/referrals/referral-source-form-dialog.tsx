"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveReferralSource } from "@/lib/actions/referrals";
import { REFERRAL_SOURCE_CATEGORY_OPTIONS, REFERRAL_SOURCE_STAGE_OPTIONS } from "@/lib/validations/referrals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ReferralSourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: string | null;
}

export function ReferralSourceFormDialog({
  open,
  onOpenChange,
  locationId,
}: ReferralSourceFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pediatrician");
  const [stage, setStage] = useState("qualified");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notesSummary, setNotesSummary] = useState("");

  function reset() {
    setName("");
    setCategory("pediatrician");
    setStage("qualified");
    setPhone("");
    setWebsite("");
    setPublicEmail("");
    setCity("");
    setState("");
    setNotesSummary("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    startTransition(async () => {
      const result = await saveReferralSource({
        locationId: locationId || null,
        name,
        category: category as never,
        stage: stage as never,
        contactability: publicEmail ? "email_unverified" : phone ? "phone_only" : "no_channel_found",
        relationshipHealth: "cold",
        phone,
        website,
        publicEmail,
        city,
        state,
        notesSummary,
        acceptedInsurances: [],
        doNotContact: false,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create referral source");
        return;
      }

      toast.success("Referral source created");
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Referral Source
          </DialogTitle>
          <DialogDescription>
            Add a source manually when you want to start tracking a relationship before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bright Pediatrics" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCE_STAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={publicEmail} onChange={(event) => setPublicEmail(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={state} onChange={(event) => setState(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea value={notesSummary} onChange={(event) => setNotesSummary(event.target.value)} rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
