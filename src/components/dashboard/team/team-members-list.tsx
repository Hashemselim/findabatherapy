"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardEmptyState,
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";

import {
  type TeamMember,
  createTeamMember,
  deleteTeamMember,
} from "@/lib/actions/team";
import { TEAM_ROLE_OPTIONS } from "@/lib/validations/team";

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  TEAM_ROLE_OPTIONS.map((r) => [r.value, r.label])
);

function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return first + last;
}

interface TeamMembersListProps {
  initialMembers: TeamMember[];
}

export function TeamMembersList({ initialMembers }: TeamMembersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  // Add form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
    const role = ROLE_LABELS[m.role || ""] || m.role || "";
    return (
      name.includes(q) ||
      role.toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  const sortedMembers = [...filtered].sort((a, b) => {
    if (a.status === b.status) {
      return `${a.first_name} ${a.last_name ?? ""}`.localeCompare(`${b.first_name} ${b.last_name ?? ""}`);
    }
    return a.status === "active" ? -1 : 1;
  });

  const handleAdd = () => {
    if (!formData.first_name.trim()) {
      setFormError("First name is required");
      return;
    }
    setFormError(null);

    startTransition(async () => {
      const result = await createTeamMember({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role || null,
        notes: formData.notes.trim() || null,
      });

      if (result.success && result.data) {
        setAddDialogOpen(false);
        setFormData({ first_name: "", last_name: "", email: "", phone: "", role: "", notes: "" });
        // Navigate to the new team member's detail page
        router.push(`/dashboard/team/employees/${result.data.id}`);
        router.refresh();
      } else {
        setFormError(result.success ? "Something went wrong" : result.error);
      }
    });
  };

  const handleDelete = (member: TeamMember) => {
    startTransition(async () => {
      const result = await deleteTeamMember(member.id);
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        setDeleteTarget(null);
      }
    });
  };

  if (members.length === 0) {
    return (
      <div className="py-6">
        <DashboardEmptyState
          icon={Users}
          title="No team members yet"
          description="Add your first team member to start tracking credentials, tasks, and documents."
          action={(
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          )}
        />
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          formData={formData}
          setFormData={setFormData}
          formError={formError}
          isPending={isPending}
          onSubmit={handleAdd}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      <DashboardTableCard>
        <DashboardTable>
          <DashboardTableHeader>
            <DashboardTableRow>
              <DashboardTableHead className="pl-5 normal-case tracking-normal">Team member</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal md:table-cell">Role</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal lg:table-cell">Contact</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal sm:table-cell">Credentials</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal sm:table-cell">Status</DashboardTableHead>
              <DashboardTableHead className="pr-5 text-right normal-case tracking-normal">Actions</DashboardTableHead>
            </DashboardTableRow>
          </DashboardTableHeader>
          <DashboardTableBody>
            {sortedMembers.length === 0 ? (
              <DashboardTableRow>
                <DashboardTableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No team members match &quot;{search}&quot;
                </DashboardTableCell>
              </DashboardTableRow>
            ) : (
              sortedMembers.map((member) => {
                const name = [member.first_name, member.last_name].filter(Boolean).join(" ");
                const roleLabel = ROLE_LABELS[member.role || ""] || member.role || "-";
                const hasExpiringCreds = (member.expiring_credential_count ?? 0) > 0;

                return (
                  <DashboardTableRow key={member.id}>
                    <DashboardTableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 border">
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link href={`/dashboard/team/employees/${member.id}`} className="font-medium text-foreground hover:underline">
                            {name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {member.email || member.phone || "No contact details"}
                          </p>
                        </div>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {roleLabel}
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden lg:table-cell">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{member.email || "-"}</p>
                        <p>{member.phone || "-"}</p>
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {member.credential_count ?? 0} credential{(member.credential_count ?? 0) === 1 ? "" : "s"}
                        </span>
                        {hasExpiringCreds && (
                          <DashboardStatusBadge tone="warning" className="text-[10px]">
                            {member.expiring_credential_count} expiring
                          </DashboardStatusBadge>
                        )}
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell className="hidden sm:table-cell">
                      <DashboardStatusBadge tone={member.status === "active" ? "success" : "default"}>
                        {member.status}
                      </DashboardStatusBadge>
                    </DashboardTableCell>
                    <DashboardTableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="relative z-10 h-8 w-8 shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/team/employees/${member.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              View / Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteTarget(member);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DashboardTableCell>
                  </DashboardTableRow>
                );
              })
            )}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardTableCard>

      {/* Add Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        isPending={isPending}
        onSubmit={handleAdd}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium">
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </span>{" "}
              from your team. Their credentials and documents will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// ADD MEMBER DIALOG
// =============================================================================

function AddMemberDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  formError,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: { first_name: string; last_name: string; email: string; phone: string; role: string; notes: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  formError: string | null;
  isPending: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new employee to your team. You can add credentials and documents after creating.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="First name"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Last name"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(v) => setFormData((f) => ({ ...f, role: v }))}
              disabled={isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              disabled={isPending}
            />
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !formData.first_name.trim()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
