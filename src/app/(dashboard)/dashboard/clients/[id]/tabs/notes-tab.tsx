"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  addClientNote,
  updateClientNote,
  deleteClientNote,
  type ClientNote,
} from "@/lib/actions/client-notes";

const NOTE_CATEGORIES = [
  { value: "session", label: "Session" },
  { value: "call", label: "Call" },
  { value: "admin", label: "Admin" },
  { value: "clinical", label: "Clinical" },
  { value: "general", label: "General" },
] as const;

function categoryTone(category: string) {
  switch (category) {
    case "session": return "info" as const;
    case "call": return "success" as const;
    case "clinical": return "warning" as const;
    case "admin": return "default" as const;
    default: return "default" as const;
  }
}

interface NotesTabProps {
  clientId: string;
  notes: ClientNote[];
  autoOpenDialog?: boolean;
  onDialogOpened?: () => void;
}

export function NotesTab({ clientId, notes, autoOpenDialog, onDialogOpened }: NotesTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | undefined>();

  // Dialog form state
  const [category, setCategory] = useState<ClientNote["category"]>("general");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-open dialog when triggered from header "Add Note" button
  useEffect(() => {
    if (autoOpenDialog) {
      setEditingNote(undefined);
      setDialogOpen(true);
      onDialogOpened?.();
    }
  }, [autoOpenDialog, onDialogOpened]);

  useEffect(() => {
    if (dialogOpen) {
      setCategory(editingNote?.category ?? "general");
      setBody(editingNote?.body ?? "");
    }
  }, [dialogOpen, editingNote]);

  const handleSave = async () => {
    if (!body.trim()) return;
    setIsSaving(true);
    try {
      if (editingNote) {
        const result = await updateClientNote(editingNote.id, { category, body: body.trim() });
        if (!result.success) { toast.error(result.error); return; }
        toast.success("Note updated");
      } else {
        const result = await addClientNote({ clientId, category, body: body.trim() });
        if (!result.success) { toast.error(result.error); return; }
        toast.success("Note added");
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      try {
        const result = await deleteClientNote(noteId);
        if (!result.success) { toast.error(result.error); return; }
        toast.success("Note deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete note");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
          {notes.length > 0 && (
            <DashboardStatusBadge tone="default">{notes.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingNote(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add note
        </Button>
      </div>

      {notes.length === 0 ? (
        <DashboardEmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Add session notes, call summaries, or internal observations for this client."
          action={
            <Button size="sm" onClick={() => { setEditingNote(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add note
            </Button>
          }
        />
      ) : (
        <DashboardCard className="p-0">
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="group px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <DashboardStatusBadge tone={categoryTone(note.category)}>
                        {NOTE_CATEGORIES.find((c) => c.value === note.category)?.label ?? note.category}
                      </DashboardStatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {note.authorName && (
                        <span className="text-xs text-muted-foreground">
                          by {note.authorName}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingNote(note); setDialogOpen(true); }}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete note</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this note. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(note.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Note Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit note" : "Add note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !body.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingNote ? "Save" : "Add note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
