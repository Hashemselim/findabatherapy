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
import { Textarea } from "@/components/ui/textarea";

import type { PortalResourceData } from "@/lib/actions/client-portal";
import { savePortalResource } from "@/lib/actions/client-portal";

interface PortalResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  resource?: PortalResourceData;
  onSuccess?: () => void;
}

export function PortalResourceDialog({
  open,
  onOpenChange,
  clientId,
  resource,
  onSuccess,
}: PortalResourceDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!resource;

  const [title, setTitle] = useState("");
  const [href, setHref] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(resource?.title ?? "");
      setHref(resource?.href ?? "");
      setDescription(resource?.description ?? "");
    }
  }, [open, resource]);

  const isValid = title.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await savePortalResource({
        recordId: resource?.id,
        clientId,
        title: title.trim(),
        description: description.trim() || null,
        href: href.trim() || null,
        category: resource?.category ?? "faq",
        pinned: resource?.pinned ?? true,
        visibility: resource?.visibility ?? "visible",
        recommendedStage: resource?.recommendedStage ?? null,
      });

      if (result.success) {
        toast.success(isEditing ? "Resource updated" : "Resource added");
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
          <DialogTitle>{isEditing ? "Edit resource" : "Add resource"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resource-title">Title</Label>
            <Input
              id="resource-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-link">Link</Label>
            <Input
              id="resource-link"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this resource"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={isPending || !isValid} onClick={handleSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
