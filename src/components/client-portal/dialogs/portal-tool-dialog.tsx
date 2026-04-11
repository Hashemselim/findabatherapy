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

import type { PortalToolData } from "@/lib/actions/client-portal";
import { savePortalTool } from "@/lib/actions/client-portal";

interface PortalToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  tool?: PortalToolData;
  onSuccess?: () => void;
}

export function PortalToolDialog({
  open,
  onOpenChange,
  clientId,
  tool,
  onSuccess,
}: PortalToolDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!tool;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [whenToUse, setWhenToUse] = useState("");

  useEffect(() => {
    if (open) {
      setName(tool?.name ?? "");
      setUrl(tool?.url ?? "");
      setDescription(tool?.description ?? "");
      setWhenToUse(tool?.whenToUse ?? "");
    }
  }, [open, tool]);

  const isValid = name.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await savePortalTool({
        recordId: tool?.id,
        clientId,
        name: name.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        category: tool?.category ?? "general",
        whenToUse: whenToUse.trim() || null,
        logoLabel: tool?.logoLabel ?? null,
        visibility: tool?.visibility ?? "visible",
      });

      if (result.success) {
        toast.success(isEditing ? "Tool updated" : "Tool added");
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
          <DialogTitle>{isEditing ? "Edit tool" : "Add tool"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tool-name">Name</Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tool name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-url">URL</Label>
            <Input
              id="tool-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-when">When to use</Label>
            <Textarea
              id="tool-when"
              value={whenToUse}
              onChange={(e) => setWhenToUse(e.target.value)}
              placeholder="When should families use this tool?"
              rows={2}
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
