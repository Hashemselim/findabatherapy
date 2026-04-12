"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  addClientNote,
  updateClientNote,
  type ClientNote,
} from "@/lib/actions/client-notes";

const NOTE_CATEGORIES = [
  { value: "session", label: "Session" },
  { value: "call", label: "Call" },
  { value: "admin", label: "Admin" },
  { value: "clinical", label: "Clinical" },
  { value: "general", label: "General" },
] as const;

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: ClientNote;
  clients: { id: string; name: string }[];
  onNoteAdded?: (note: ClientNote) => void;
  onNoteUpdated?: () => void;
}

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  clients,
  onNoteAdded,
  onNoteUpdated,
}: NoteFormDialogProps) {
  const isEditing = !!note;
  const [category, setCategory] = useState<ClientNote["category"]>("general");
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState<string>("__none__");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(note?.category ?? "general");
      setBody(note?.body ?? "");
      setClientId(note?.clientId ?? "__none__");
    }
  }, [open, note]);

  const handleSave = async () => {
    if (!body.trim()) return;
    setIsSaving(true);
    try {
      if (isEditing) {
        const result = await updateClientNote(note.id, {
          category,
          body: body.trim(),
          clientId: clientId === "__none__" ? null : clientId,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Note updated");
        onNoteUpdated?.();
      } else {
        const result = await addClientNote({
          clientId: clientId === "__none__" ? null : clientId,
          category,
          body: body.trim(),
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Note added");
        if (result.data) onNoteAdded?.(result.data);
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit note" : "Add note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as ClientNote["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your note here..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !body.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
