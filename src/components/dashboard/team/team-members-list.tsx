"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Mail,
  Phone,
  Award,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const activeMembers = filtered.filter((m) => m.status === "active");
  const inactiveMembers = filtered.filter((m) => m.status === "inactive");

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
          <Users className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold">No team members yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add your first team member to start tracking credentials, tasks, and documents.
        </p>
        <Button onClick={() => setAddDialogOpen(true)} className="mt-6 gap-2">
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
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

      {/* Active Members */}
      {activeMembers.length > 0 && (
        <div className="space-y-2">
          {inactiveMembers.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground">
              Active ({activeMembers.length})
            </h3>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onDelete={() => setDeleteTarget(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Inactive ({inactiveMembers.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactiveMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onDelete={() => setDeleteTarget(member)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && search && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No team members match &quot;{search}&quot;
        </div>
      )}

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
// TEAM MEMBER CARD
// =============================================================================

function TeamMemberCard({
  member,
  onDelete,
}: {
  member: TeamMember;
  onDelete: () => void;
}) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ");
  const roleLabel = ROLE_LABELS[member.role || ""] || member.role;
  const hasExpiringCreds = (member.expiring_credential_count ?? 0) > 0;

  return (
    <Card className="group relative transition-colors hover:border-purple-200">
      <Link
        href={`/dashboard/team/employees/${member.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${name}`}
      />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 border">
            <AvatarFallback className="bg-purple-50 text-sm font-semibold text-purple-700">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {name}
              </span>
              {member.status === "inactive" && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>

            {roleLabel && (
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            )}

            {/* Contact info */}
            <div className="mt-2 space-y-0.5">
              {member.email && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </p>
              )}
              {member.phone && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {member.phone}
                </p>
              )}
            </div>

            {/* Credential status */}
            {(member.credential_count ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {member.credential_count} credential{(member.credential_count ?? 0) !== 1 ? "s" : ""}
                </span>
                {hasExpiringCreds && (
                  <Badge
                    variant="outline"
                    className="ml-1 border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0"
                  >
                    <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                    {member.expiring_credential_count} expiring
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
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
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
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
