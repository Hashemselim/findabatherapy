"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(note?.category ?? "general");
      setBody(note?.body ?? "");
      setClientId(note?.clientId ?? null);
    }
  }, [open, note]);

  const selectedClientName = clientId
    ? clients.find((c) => c.id === clientId)?.name ?? "Unknown"
    : null;

  const handleSave = async () => {
    if (!body.trim()) return;
    setIsSaving(true);
    try {
      if (isEditing) {
        const result = await updateClientNote(note.id, {
          category,
          body: body.trim(),
          clientId,
        });
        if (!result.success) { toast.error(result.error); return; }
        toast.success("Note updated");
        onNoteUpdated?.();
      } else {
        const result = await addClientNote({
          clientId,
          category,
          body: body.trim(),
        });
        if (!result.success) { toast.error(result.error); return; }
        toast.success("Note added");
        if (result.data) {
          // Enrich with client name from the clients list since the server action doesn't look it up
          const enriched = {
            ...result.data,
            clientName: clientId ? (clients.find((c) => c.id === clientId)?.name ?? null) : null,
          };
          onNoteAdded?.(enriched);
        }
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
              <Select value={category} onValueChange={(v) => setCategory(v as ClientNote["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen} modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedClientName ?? "No client"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => { setClientId(null); setClientOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", clientId === null ? "opacity-100" : "opacity-0")} />
                          No client
                        </CommandItem>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => { setClientId(client.id); setClientOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", clientId === client.id ? "opacity-100" : "opacity-0")} />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
