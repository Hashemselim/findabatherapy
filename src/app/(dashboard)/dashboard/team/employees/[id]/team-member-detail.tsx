"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  ExternalLink,
  Link2,
  Clock,
  Check,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";

import {
  type TeamMember,
  type TeamCredential,
  type TeamDocument,
  type TeamTask,
  updateTeamMember,
  addTeamCredential,
  updateTeamCredential,
  deleteTeamCredential,
  addTeamDocument,
  deleteTeamDocument,
  createTeamTask,
} from "@/lib/actions/team";
import { updateClientTask, completeClientTask, deleteClientTask } from "@/lib/actions/clients";
import { TEAM_ROLE_OPTIONS } from "@/lib/validations/team";
import { TASK_STATUS_OPTIONS } from "@/lib/validations/clients";

// =============================================================================
// HELPERS
// =============================================================================

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  TEAM_ROLE_OPTIONS.map((r) => [r.value, r.label])
);

function getInitials(firstName: string, lastName?: string | null): string {
  return (firstName.charAt(0) + (lastName?.charAt(0) || "")).toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCredentialStatus(expirationDate: string | null): {
  label: string;
  color: string;
} {
  if (!expirationDate) return { label: "No expiration", color: "bg-gray-100 text-gray-600" };
  const now = new Date();
  const exp = new Date(expirationDate);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { label: "Expired", color: "bg-red-100 text-red-700 border-red-200" };
  if (daysUntil <= 30) return { label: `${daysUntil}d left`, color: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Current", color: "bg-green-100 text-green-700 border-green-200" };
}

// =============================================================================
// SECTION HEADER
// =============================================================================

function SectionHeader({
  icon: Icon,
  title,
  count,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
          <Icon className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        )}
      </div>
      {action}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TeamMemberDetailProps {
  member: TeamMember;
  initialCredentials: TeamCredential[];
  initialDocuments: TeamDocument[];
  initialTasks: TeamTask[];
}

export function TeamMemberDetail({
  member,
  initialCredentials,
  initialDocuments,
  initialTasks,
}: TeamMemberDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Data state
  const [credentials, setCredentials] = useState(initialCredentials);
  const [documents, setDocuments] = useState(initialDocuments);
  const [tasks, setTasks] = useState(initialTasks);

  // Edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    first_name: member.first_name,
    last_name: member.last_name || "",
    email: member.email || "",
    phone: member.phone || "",
    address: member.address || "",
    role: member.role || "",
    notes: member.notes || "",
    status: member.status,
    hired_date: member.hired_date || "",
  });

  // Credential dialogs
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<TeamCredential | null>(null);
  const [credForm, setCredForm] = useState({ credential_name: "", expiration_date: "", notes: "" });

  // Document form
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docForm, setDocForm] = useState({ label: "", url: "", notes: "" });
  const [docError, setDocError] = useState<string | null>(null);

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", content: "", status: "pending", due_date: "" });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);

  const name = [member.first_name, member.last_name].filter(Boolean).join(" ");
  const roleLabel = ROLE_LABELS[member.role || ""] || member.role;

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);

  // ==========================================================================
  // INFO HANDLERS
  // ==========================================================================

  const handleSaveInfo = () => {
    startTransition(async () => {
      const result = await updateTeamMember(member.id, {
        first_name: infoForm.first_name.trim(),
        last_name: infoForm.last_name.trim() || null,
        email: infoForm.email.trim() || null,
        phone: infoForm.phone.trim() || null,
        address: infoForm.address.trim() || null,
        role: infoForm.role || null,
        notes: infoForm.notes.trim() || null,
        status: infoForm.status,
        hired_date: infoForm.hired_date || null,
      });
      if (result.success) {
        setIsEditingInfo(false);
        router.refresh();
      }
    });
  };

  // ==========================================================================
  // CREDENTIAL HANDLERS
  // ==========================================================================

  const openCredDialog = (cred?: TeamCredential) => {
    if (cred) {
      setEditingCred(cred);
      setCredForm({
        credential_name: cred.credential_name,
        expiration_date: cred.expiration_date || "",
        notes: cred.notes || "",
      });
    } else {
      setEditingCred(null);
      setCredForm({ credential_name: "", expiration_date: "", notes: "" });
    }
    setCredDialogOpen(true);
  };

  const handleSaveCred = () => {
    if (!credForm.credential_name.trim()) return;
    startTransition(async () => {
      if (editingCred) {
        const result = await updateTeamCredential(editingCred.id, {
          credential_name: credForm.credential_name.trim(),
          expiration_date: credForm.expiration_date || null,
          notes: credForm.notes.trim() || null,
        });
        if (result.success) {
          setCredentials((prev) =>
            prev.map((c) =>
              c.id === editingCred.id
                ? { ...c, credential_name: credForm.credential_name.trim(), expiration_date: credForm.expiration_date || null, notes: credForm.notes.trim() || null }
                : c
            )
          );
          setCredDialogOpen(false);
        }
      } else {
        const result = await addTeamCredential(member.id, {
          credential_name: credForm.credential_name.trim(),
          expiration_date: credForm.expiration_date || null,
          notes: credForm.notes.trim() || null,
        });
        if (result.success && result.data) {
          setCredentials((prev) => [
            ...prev,
            {
              id: result.data!.id,
              team_member_id: member.id,
              profile_id: member.profile_id,
              employee_name: name,
              credential_name: credForm.credential_name.trim(),
              expiration_date: credForm.expiration_date || null,
              notes: credForm.notes.trim() || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
          setCredDialogOpen(false);
        }
      }
    });
  };

  // ==========================================================================
  // DOCUMENT HANDLERS
  // ==========================================================================

  const handleAddDoc = () => {
    if (!docForm.label.trim()) {
      setDocError("Label is required");
      return;
    }
    setDocError(null);
    startTransition(async () => {
      const result = await addTeamDocument(member.id, {
        label: docForm.label.trim(),
        url: docForm.url.trim() || null,
        notes: docForm.notes.trim() || null,
      });
      if (result.success && result.data) {
        setDocuments((prev) => [
          ...prev,
          {
            id: result.data!.id,
            team_member_id: member.id,
            label: docForm.label.trim(),
            url: docForm.url.trim() || null,
            file_path: null,
            notes: docForm.notes.trim() || null,
            sort_order: prev.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        setDocForm({ label: "", url: "", notes: "" });
        setIsAddingDoc(false);
      }
    });
  };

  // ==========================================================================
  // TASK HANDLERS
  // ==========================================================================

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;
    startTransition(async () => {
      const result = await createTeamTask(member.id, {
        title: taskForm.title.trim(),
        content: taskForm.content.trim() || null,
        status: taskForm.status,
        due_date: taskForm.due_date || null,
      });
      if (result.success && result.data) {
        setTasks((prev) => [
          {
            id: result.data!.id,
            client_id: null,
            team_member_id: member.id,
            profile_id: member.profile_id,
            title: taskForm.title.trim(),
            content: taskForm.content.trim() || null,
            status: taskForm.status as "pending" | "in_progress" | "completed",
            due_date: taskForm.due_date || null,
            auto_generated: false,
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setTaskForm({ title: "", content: "", status: "pending", due_date: "" });
        setTaskDialogOpen(false);
      }
    });
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    startTransition(async () => {
      let result;
      if (newStatus === "completed") {
        result = await completeClientTask(taskId);
      } else {
        result = await updateClientTask(taskId, {
          status: newStatus as "pending" | "in_progress",
        });
      }
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: newStatus as "pending" | "in_progress" | "completed",
                  completed_at: newStatus === "completed" ? new Date().toISOString() : null,
                }
              : t
          )
        );
      }
    });
  };

  // ==========================================================================
  // DELETE HANDLER
  // ==========================================================================

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      let result;
      if (deleteTarget.type === "credential") {
        result = await deleteTeamCredential(deleteTarget.id);
        if (result.success) setCredentials((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else if (deleteTarget.type === "document") {
        result = await deleteTeamDocument(deleteTarget.id);
        if (result.success) setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      } else if (deleteTarget.type === "task") {
        result = await deleteClientTask(deleteTarget.id);
        if (result.success) setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/team/employees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2">
            <AvatarFallback className="bg-purple-50 text-lg font-semibold text-purple-700">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{name}</h1>
              {member.status === "inactive" && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            {roleLabel && (
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsEditingInfo(!isEditingInfo)}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          {isEditingInfo ? "Cancel Edit" : "Edit Info"}
        </Button>
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: INFO */}
      {/* ================================================================== */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader icon={User} title="Team Member Information" />
          <Separator className="my-4" />

          {isEditingInfo ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>First Name *</Label>
                  <Input
                    value={infoForm.first_name}
                    onChange={(e) => setInfoForm((f) => ({ ...f, first_name: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name</Label>
                  <Input
                    value={infoForm.last_name}
                    onChange={(e) => setInfoForm((f) => ({ ...f, last_name: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={infoForm.email}
                    onChange={(e) => setInfoForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={infoForm.address}
                  onChange={(e) => setInfoForm((f) => ({ ...f, address: e.target.value }))}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select
                    value={infoForm.role}
                    onValueChange={(v) => setInfoForm((f) => ({ ...f, role: v }))}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
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
                  <Label>Status</Label>
                  <Select
                    value={infoForm.status}
                    onValueChange={(v) => setInfoForm((f) => ({ ...f, status: v as "active" | "inactive" }))}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Hire Date</Label>
                  <Input
                    type="date"
                    value={infoForm.hired_date}
                    onChange={(e) => setInfoForm((f) => ({ ...f, hired_date: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={infoForm.notes}
                  onChange={(e) => setInfoForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  disabled={isPending}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditingInfo(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSaveInfo} disabled={isPending || !infoForm.first_name.trim()}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Email" value={member.email} icon={<Mail className="h-3.5 w-3.5" />} />
              <Field label="Phone" value={member.phone} icon={<Phone className="h-3.5 w-3.5" />} />
              <Field label="Address" value={member.address} icon={<MapPin className="h-3.5 w-3.5" />} />
              <Field label="Role" value={roleLabel || null} />
              <Field label="Status" value={member.status === "active" ? "Active" : "Inactive"} />
              <Field label="Hire Date" value={member.hired_date ? formatDate(member.hired_date) : null} />
              {member.notes && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Field label="Notes" value={member.notes} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 2: CREDENTIALS */}
      {/* ================================================================== */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={Award}
            title="Credentials"
            count={credentials.length}
            action={
              <Button size="sm" variant="outline" onClick={() => openCredDialog()} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            }
          />
          <Separator className="my-4" />

          {credentials.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No credentials added yet. Track certifications like BCBA, RBT, and renewal dates.
            </p>
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => {
                const status = getCredentialStatus(cred.expiration_date);
                return (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{cred.credential_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cred.expiration_date && (
                            <span className="text-xs text-muted-foreground">
                              Expires: {formatDate(cred.expiration_date)}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        {cred.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{cred.notes}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCredDialog(cred)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget({ type: "credential", id: cred.id, label: cred.credential_name })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 3: TASKS */}
      {/* ================================================================== */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={CheckSquare}
            title="Tasks"
            count={activeTasks.length}
            action={
              <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            }
          />
          <Separator className="my-4" />

          {tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tasks assigned yet. Create tasks for training, reviews, or follow-ups.
            </p>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleTaskStatusChange}
                  onDelete={() => setDeleteTarget({ type: "task", id: task.id, label: task.title })}
                />
              ))}

              {completedTasks.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Completed ({completedTasks.length})
                  </p>
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onStatusChange={handleTaskStatusChange}
                      onDelete={() => setDeleteTarget({ type: "task", id: task.id, label: task.title })}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 4: DOCUMENTS / LINKS */}
      {/* ================================================================== */}
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            icon={Link2}
            title="Documents & Links"
            count={documents.length}
            action={
              <Button size="sm" variant="outline" onClick={() => setIsAddingDoc(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            }
          />
          <Separator className="my-4" />

          {/* Add form */}
          {isAddingDoc && (
            <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Label *</Label>
                  <Input
                    value={docForm.label}
                    onChange={(e) => setDocForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Training Certificate"
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>URL</Label>
                  <Input
                    value={docForm.url}
                    onChange={(e) => setDocForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={docForm.notes}
                  onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes..."
                  disabled={isPending}
                />
              </div>
              {docError && <p className="text-sm text-destructive">{docError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setIsAddingDoc(false); setDocError(null); }} disabled={isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddDoc} disabled={isPending || !docForm.label.trim()}>
                  {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            </div>
          )}

          {documents.length === 0 && !isAddingDoc ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No documents or links added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.label}</p>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-purple-600 hover:underline truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{doc.url}</span>
                        </a>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setDeleteTarget({ type: "document", id: doc.id, label: doc.label || "this document" })}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* DIALOGS */}
      {/* ================================================================== */}

      {/* Credential Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCred ? "Edit Credential" : "Add Credential"}</DialogTitle>
            <DialogDescription>
              Track certifications and their expiration dates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Credential Name *</Label>
              <Input
                value={credForm.credential_name}
                onChange={(e) => setCredForm((f) => ({ ...f, credential_name: e.target.value }))}
                placeholder="e.g. BCBA, RBT, CPR"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={credForm.expiration_date}
                onChange={(e) => setCredForm((f) => ({ ...f, expiration_date: e.target.value }))}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={credForm.notes}
                onChange={(e) => setCredForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveCred} disabled={isPending || !credForm.credential_name.trim()}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingCred ? "Save Changes" : "Add Credential"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a task for {name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.content}
                onChange={(e) => setTaskForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
                placeholder="Add details..."
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, status: v }))}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={isPending || !taskForm.title.trim()}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.label}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// FIELD COMPONENT
// =============================================================================

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

// =============================================================================
// TASK ROW COMPONENT
// =============================================================================

function TaskRow({
  task,
  onStatusChange,
  onDelete,
}: {
  task: TeamTask;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: () => void;
}) {
  const isCompleted = task.status === "completed";
  const isOverdue =
    !isCompleted && task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Status checkbox */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0">
            <Checkbox
              checked={isCompleted}
              className={
                task.status === "in_progress"
                  ? "border-blue-500 data-[state=checked]:bg-blue-500"
                  : isCompleted
                    ? "border-green-500 data-[state=checked]:bg-green-500"
                    : ""
              }
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {TASK_STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(task.id, option.value)}
            >
              {option.value === task.status && <Check className="mr-2 h-4 w-4" />}
              {option.value !== task.status && <span className="mr-6" />}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Task info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isCompleted ? "line-through" : ""}`}>
            {task.title}
          </span>
          {task.auto_generated && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Auto
            </Badge>
          )}
          {task.status === "in_progress" && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0">
              In Progress
            </Badge>
          )}
        </div>
        {task.due_date && (
          <p className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />
            {isOverdue ? "Overdue: " : "Due: "}
            {formatDate(task.due_date)}
          </p>
        )}
      </div>

      {/* Delete */}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
