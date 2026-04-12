"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import {
  DashboardEmptyState,
  DashboardStatusBadge,
  DashboardTabsList,
  DashboardTabsTrigger,
} from "@/components/dashboard/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteClientNote, type ClientNote } from "@/lib/actions/client-notes";

import { NoteFormDialog } from "./note-form-dialog";

const NOTE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "session", label: "Session" },
  { value: "call", label: "Call" },
  { value: "admin", label: "Admin" },
  { value: "clinical", label: "Clinical" },
  { value: "general", label: "General" },
] as const;

function categoryTone(category: string) {
  switch (category) {
    case "session":
      return "info" as const;
    case "call":
      return "success" as const;
    case "clinical":
      return "warning" as const;
    case "admin":
      return "default" as const;
    default:
      return "default" as const;
  }
}

interface NotesListProps {
  initialNotes: ClientNote[];
  clients: { id: string; name: string }[];
}

export function NotesList({ initialNotes, clients }: NotesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ClientNote | null>(null);

  // Auto-open dialog when navigating with ?new=1 (from header button)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingNote(undefined);
      setDialogOpen(true);
      // Clean up the URL
      router.replace("/dashboard/notes", { scroll: false });
    }
  }, [searchParams, router]);

  // Filtering
  const filtered = notes.filter((note) => {
    if (categoryFilter !== "all" && note.category !== categoryFilter)
      return false;
    if (clientFilter === "unassigned" && note.clientId !== null) return false;
    if (
      clientFilter !== "all" &&
      clientFilter !== "unassigned" &&
      note.clientId !== clientFilter
    )
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !note.body.toLowerCase().includes(q) &&
        !(note.clientName || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Category counts
  const counts: Record<string, number> = { all: notes.length };
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteClientNote(deleteTarget.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Note deleted");
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  };

  const handleNoteAdded = (note: ClientNote) => {
    setNotes((prev) => [note, ...prev]);
  };

  const handleNoteUpdated = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <DashboardTabsList>
            {NOTE_CATEGORIES.map((cat) => (
              <DashboardTabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
                {(counts[cat.value] ?? 0) > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {counts[cat.value]}
                  </span>
                )}
              </DashboardTabsTrigger>
            ))}
          </DashboardTabsList>
        </Tabs>
        <Button
          size="sm"
          onClick={() => {
            setEditingNote(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Note
        </Button>
      </div>

      {/* Search + client filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {clients.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        notes.length === 0 ? (
          <DashboardEmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Add session notes, call summaries, or internal observations. Notes can optionally be linked to a client."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditingNote(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Note
              </Button>
            }
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No notes match your filters.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="group rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Category + client + date */}
                  <div className="flex flex-wrap items-center gap-2">
                    <DashboardStatusBadge tone={categoryTone(note.category)}>
                      {note.category}
                    </DashboardStatusBadge>
                    {note.clientId && note.clientName && (
                      <Link href={`/dashboard/clients/${note.clientId}`}>
                        <DashboardStatusBadge
                          tone="default"
                          className="w-fit cursor-pointer gap-1 hover:bg-muted"
                        >
                          <User className="h-3 w-3" />
                          <span className="max-w-[150px] truncate">
                            {note.clientName}
                          </span>
                        </DashboardStatusBadge>
                      </Link>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(
                        new Date(note.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>

                  {/* Body */}
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {note.body}
                  </p>

                  {/* Author */}
                  {note.authorName && (
                    <p className="text-xs text-muted-foreground">
                      by {note.authorName}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingNote(note);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(note)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Form Dialog */}
      <NoteFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingNote(undefined);
        }}
        note={editingNote}
        clients={clients}
        onNoteAdded={handleNoteAdded}
        onNoteUpdated={handleNoteUpdated}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
