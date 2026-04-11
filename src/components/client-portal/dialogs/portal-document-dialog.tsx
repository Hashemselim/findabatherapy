"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { uploadProviderPortalDocument } from "@/lib/actions/client-portal";
import { VISIBILITY_OPTIONS } from "../portal-constants";

interface PortalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

export function PortalDocumentDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: PortalDocumentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [familyNote, setFamilyNote] = useState("");
  const [visibility, setVisibility] = useState("visible");
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setLabel("");
      setCategory("");
      setFamilyNote("");
      setVisibility("visible");
      setAcknowledgementRequired(false);
    }
  }, [open]);

  const isValid = !!file;

  function handleSubmit() {
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("label", label.trim() || file.name);
      formData.set("document_type", category.trim() || "administrative");
      formData.set("portal_note", familyNote.trim());
      formData.set("portal_visibility", visibility);
      formData.set("portal_ack_required", acknowledgementRequired ? "true" : "false");

      const result = await uploadProviderPortalDocument(clientId, formData);

      if (result.success) {
        toast.success("Document uploaded");
        router.refresh();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-label">Label</Label>
            <Input
              id="doc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Document label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-category">Category</Label>
            <Input
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. insurance_card, referral"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-note">Family note</Label>
            <Textarea
              id="doc-note"
              value={familyNote}
              onChange={(e) => setFamilyNote(e.target.value)}
              placeholder="Optional note visible to the family"
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="doc-ack">Require acknowledgement</Label>
              <p className="text-muted-foreground text-xs">
                Family must acknowledge receipt of this document
              </p>
            </div>
            <Switch
              id="doc-ack"
              checked={acknowledgementRequired}
              onCheckedChange={setAcknowledgementRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={isPending || !isValid} onClick={handleSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
