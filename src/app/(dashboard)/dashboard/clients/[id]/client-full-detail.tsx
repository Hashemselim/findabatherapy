"use client";

import { format } from "date-fns";
import {
  User,
  Users,
  MapPin,
  Shield,
  Link2,
  FileText,
  CheckSquare,
  ExternalLink,
  Copy,
  Check,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  ClipboardList,
  Building2,
  CreditCard,
  Clock,
  Loader2,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  calculateAge,
  getDaysUntilAuthExpires,
  getAuthDaysColor,
  PARENT_RELATIONSHIP_OPTIONS,
  AUTH_STATUS_OPTIONS,
  INSURANCE_STATUS_OPTIONS,
} from "@/lib/validations/clients";
import {
  updateClientTask,
  deleteClientTask,
  deleteClientParent,
  deleteClientInsurance,
  deleteClientAuthorization,
  deleteClientLocation,
  deleteClientDocument,
  addClientDocument,
  updateClientDocument,
} from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";
import { TASK_STATUS_OPTIONS, type ClientTask } from "@/lib/validations/clients";

import { ClientStatusBadge } from "@/components/dashboard/clients/client-status-badge";
import { TaskFormDialog } from "@/components/dashboard/tasks";

interface ClientFullDetailProps {
  client: ClientDetail;
}

// Copy button component
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : `Copy ${label}`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Field component - always copyable
function Field({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={cn("group flex items-start gap-2 sm:gap-3 py-2", className)}>
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium break-words">{value}</p>
          <CopyButton value={value} label={label.toLowerCase()} />
        </div>
      </div>
    </div>
  );
}

// Empty state placeholder
function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center">{message}</p>
  );
}

type TaskStatus = "pending" | "in_progress" | "completed";

export function ClientFullDetail({ client }: ClientFullDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "parent" | "insurance" | "authorization" | "location" | "document" | "task";
    id: string;
    label: string;
  } | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<(ClientTask & { id: string }) | null>(null);

  // Link management state
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ label: "", url: "", notes: "" });
  const [linkError, setLinkError] = useState<string | null>(null);

  const age = client.child_date_of_birth ? calculateAge(client.child_date_of_birth) : null;
  const childName = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Client";
  const activeTasks = client.tasks?.filter((t) => t.status !== "completed") || [];
  const completedTasks = client.tasks?.filter((t) => t.status === "completed") || [];

  const handleDelete = (
    type: "parent" | "insurance" | "authorization" | "location" | "document" | "task",
    id: string,
    label: string
  ) => {
    setDeleteTarget({ type, id, label });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      switch (deleteTarget.type) {
        case "parent":
          await deleteClientParent(deleteTarget.id);
          break;
        case "insurance":
          await deleteClientInsurance(deleteTarget.id);
          break;
        case "authorization":
          await deleteClientAuthorization(deleteTarget.id);
          break;
        case "location":
          await deleteClientLocation(deleteTarget.id);
          break;
        case "document":
          await deleteClientDocument(deleteTarget.id);
          break;
        case "task":
          await deleteClientTask(deleteTarget.id);
          break;
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    });
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    startTransition(async () => {
      await updateClientTask(taskId, { status: newStatus });
    });
  };

  const handleEditTask = (task: ClientTask & { id: string }) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  // Link handlers
  const resetLinkForm = () => {
    setLinkForm({ label: "", url: "", notes: "" });
    setLinkError(null);
    setIsAddingLink(false);
    setEditingLinkId(null);
  };

  const startEditLink = (doc: { id?: string; label?: string | null; url?: string | null; notes?: string | null }) => {
    setLinkForm({
      label: doc.label || "",
      url: doc.url || "",
      notes: doc.notes || "",
    });
    setEditingLinkId(doc.id || null);
    setIsAddingLink(false);
    setLinkError(null);
  };

  const handleSaveLink = async () => {
    setLinkError(null);

    // Validate
    if (!linkForm.label.trim()) {
      setLinkError("Label is required");
      return;
    }
    if (!linkForm.url.trim()) {
      setLinkError("URL is required");
      return;
    }

    // Basic URL validation
    try {
      new URL(linkForm.url);
    } catch {
      setLinkError("Please enter a valid URL");
      return;
    }

    startTransition(async () => {
      const data = {
        label: linkForm.label.trim(),
        url: linkForm.url.trim(),
        notes: linkForm.notes.trim() || undefined,
      };

      let result;
      if (editingLinkId) {
        result = await updateClientDocument(editingLinkId, data);
      } else {
        result = await addClientDocument(client.id, data);
      }

      if (result.success) {
        resetLinkForm();
      } else {
        setLinkError(result.error || "Failed to save link");
      }
    });
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <>
      <div className="space-y-6">
        {/* SECTION 1: Child Information - Most Important */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Child Information</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" asChild>
                <a href={`/dashboard/clients/${client.id}/edit#child`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="First Name" value={client.child_first_name} />
              <Field label="Last Name" value={client.child_last_name} />
              <Field
                label="Date of Birth"
                value={client.child_date_of_birth ? format(new Date(client.child_date_of_birth), "MMM d, yyyy") : null}
                icon={Calendar}
              />
              <Field label="Age" value={age !== null ? `${age} years old` : null} />
              <Field label="School Name" value={client.child_school_name} icon={Building2} />
              <Field label="School District" value={client.child_school_district} />
              <Field label="Grade Level" value={client.child_grade_level} />
              <Field label="Preferred Language" value={client.preferred_language} />
              <Field label="Pediatrician" value={client.child_pediatrician_name} />
              <Field label="Pediatrician Phone" value={client.child_pediatrician_phone} icon={Phone} />
            </div>

            {/* Diagnosis - Full Width */}
            {client.child_diagnosis && client.child_diagnosis.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Diagnosis</p>
                <div className="flex flex-wrap gap-2">
                  {client.child_diagnosis.map((d, i) => (
                    <div key={i} className="group flex items-center gap-1">
                      <Badge variant="secondary">{d}</Badge>
                      <CopyButton value={d} label="diagnosis" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Concerns - Full Width */}
            {client.child_primary_concerns && (
              <div className="mt-4 pt-4 border-t group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Primary Concerns</p>
                    <p className="text-sm">{client.child_primary_concerns}</p>
                  </div>
                  <CopyButton value={client.child_primary_concerns} label="primary concerns" />
                </div>
              </div>
            )}

            {/* ABA History - Full Width */}
            {client.child_aba_history && (
              <div className="mt-4 pt-4 border-t group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">ABA History</p>
                    <p className="text-sm">{client.child_aba_history}</p>
                  </div>
                  <CopyButton value={client.child_aba_history} label="ABA history" />
                </div>
              </div>
            )}

            {/* Other Therapies - Full Width */}
            {client.child_other_therapies && (
              <div className="mt-4 pt-4 border-t group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Other Therapies</p>
                    <p className="text-sm">{client.child_other_therapies}</p>
                  </div>
                  <CopyButton value={client.child_other_therapies} label="other therapies" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: Parents/Guardians - Second Most Important */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Parents / Guardians</CardTitle>
                {client.parents && client.parents.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{client.parents.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" asChild>
                <a href={`/dashboard/clients/${client.id}/edit#parents`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {client.parents && client.parents.length > 0 ? (
              <div className="space-y-4">
                {client.parents.map((parent, index) => (
                  <div
                    key={parent.id}
                    className={cn(
                      "p-4 rounded-lg border bg-muted/30",
                      parent.is_primary && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {[parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Unnamed"}
                        </span>
                        {parent.is_primary && (
                          <Badge variant="default" className="text-xs shrink-0">Primary</Badge>
                        )}
                        {parent.relationship && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {PARENT_RELATIONSHIP_OPTIONS.find((r) => r.value === parent.relationship)?.label || parent.relationship}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/dashboard/clients/${client.id}/edit#parents`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete("parent", parent.id, `${parent.first_name} ${parent.last_name}`)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="First Name" value={parent.first_name} />
                      <Field label="Last Name" value={parent.last_name} />
                      <Field label="Phone" value={parent.phone} icon={Phone} />
                      <Field label="Email" value={parent.email} icon={Mail} />
                    </div>
                    {parent.notes && (
                      <div className="mt-3 pt-3 border-t group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm">{parent.notes}</p>
                          </div>
                          <CopyButton value={parent.notes} label="notes" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No parents or guardians added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: Status & Service Info */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Status & Service Information</CardTitle>
              </div>
              <ClientStatusBadge status={client.status} />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Referral Source" value={client.referral_source} />
              <Field
                label="Referral Date"
                value={client.referral_date ? format(new Date(client.referral_date), "MMM d, yyyy") : null}
                icon={Calendar}
              />
              <Field
                label="Service Start Date"
                value={client.service_start_date ? format(new Date(client.service_start_date), "MMM d, yyyy") : null}
                icon={Calendar}
              />
              <Field label="Funding Source" value={client.funding_source} />
            </div>

            {/* Notes - Full Width */}
            {client.notes && (
              <div className="mt-4 pt-4 border-t group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">General Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  </div>
                  <CopyButton value={client.notes} label="notes" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: Insurance */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Shield className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Insurance</CardTitle>
                {client.insurances && client.insurances.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{client.insurances.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" asChild>
                <a href={`/dashboard/clients/${client.id}/edit#insurance`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {client.insurances && client.insurances.length > 0 ? (
              <div className="space-y-4">
                {client.insurances.map((insurance) => (
                  <div
                    key={insurance.id}
                    className={cn(
                      "p-4 rounded-lg border bg-muted/30",
                      insurance.is_primary && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{insurance.insurance_name || "Unnamed Insurance"}</span>
                        {insurance.is_primary && (
                          <Badge variant="default" className="text-xs shrink-0">Primary</Badge>
                        )}
                        {insurance.insurance_type && (
                          <Badge variant="outline" className="text-xs shrink-0">{insurance.insurance_type}</Badge>
                        )}
                        {insurance.status && (
                          <Badge
                            variant={insurance.status === "active" ? "default" : "secondary"}
                            className="text-xs shrink-0"
                          >
                            {INSURANCE_STATUS_OPTIONS.find((s) => s.value === insurance.status)?.label || insurance.status}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/dashboard/clients/${client.id}/edit#insurance`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete("insurance", insurance.id, insurance.insurance_name || "Insurance")}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Insurance Name" value={insurance.insurance_name} />
                      <Field label="Member ID" value={insurance.member_id} icon={CreditCard} />
                      <Field label="Group Number" value={insurance.group_number} />
                      <Field label="Plan Name" value={insurance.plan_name} />
                      <Field label="Subscriber Relationship" value={insurance.subscriber_relationship} />
                      <Field label="Effective Date" value={insurance.effective_date ? format(new Date(insurance.effective_date), "MMM d, yyyy") : null} icon={Calendar} />
                      <Field label="Expiration Date" value={insurance.expiration_date ? format(new Date(insurance.expiration_date), "MMM d, yyyy") : null} icon={Calendar} />
                      <Field label="Copay" value={insurance.copay_amount ? `$${insurance.copay_amount}` : null} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No insurance information added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 5: Authorizations */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Authorizations</CardTitle>
                {client.authorizations && client.authorizations.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{client.authorizations.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" asChild>
                <a href={`/dashboard/clients/${client.id}/edit#authorizations`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {client.authorizations && client.authorizations.length > 0 ? (
              <div className="space-y-4">
                {client.authorizations.map((auth) => {
                  const daysLeft = auth.end_date ? getDaysUntilAuthExpires(auth.end_date) : null;
                  const daysColor = getAuthDaysColor(daysLeft);
                  const remainingUnits = auth.units_requested && auth.units_used !== undefined
                    ? auth.units_requested - auth.units_used
                    : null;

                  return (
                    <div key={auth.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{auth.service_type || auth.payor_type || "Authorization"}</span>
                          {auth.status && (
                            <Badge
                              variant={auth.status === "approved" ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {AUTH_STATUS_OPTIONS.find((s) => s.value === auth.status)?.label || auth.status}
                            </Badge>
                          )}
                          {daysLeft !== null && auth.status === "approved" && (
                            <Badge variant="outline" className={cn("text-xs shrink-0", daysColor)}>
                              {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Expires today" : "Expired"}
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={`/dashboard/clients/${client.id}/edit#authorizations`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete("authorization", auth.id!, auth.auth_reference_number || "Authorization")}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Auth Reference #" value={auth.auth_reference_number} />
                        <Field label="Service Type" value={auth.service_type} />
                        <Field label="Start Date" value={auth.start_date ? format(new Date(auth.start_date), "MMM d, yyyy") : null} icon={Calendar} />
                        <Field label="End Date" value={auth.end_date ? format(new Date(auth.end_date), "MMM d, yyyy") : null} icon={Calendar} />
                        <Field label="Units Requested" value={auth.units_requested?.toString()} />
                        <Field label="Units Used" value={auth.units_used?.toString()} />
                        <Field label="Remaining Units" value={remainingUnits?.toString()} />
                        <Field label="Billing Code" value={auth.billing_code} />
                      </div>
                      {auth.notes && (
                        <div className="mt-3 pt-3 border-t group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{auth.notes}</p>
                            </div>
                            <CopyButton value={auth.notes} label="notes" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No authorizations added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 6: Locations */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Service Locations</CardTitle>
                {client.locations && client.locations.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{client.locations.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" asChild>
                <a href={`/dashboard/clients/${client.id}/edit#locations`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {client.locations && client.locations.length > 0 ? (
              <div className="space-y-4">
                {client.locations.map((location) => (
                  <div
                    key={location.id}
                    className={cn(
                      "p-4 rounded-lg border bg-muted/30",
                      location.is_primary && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{location.label || "Location"}</span>
                        {location.is_primary && (
                          <Badge variant="default" className="text-xs shrink-0">Primary</Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/dashboard/clients/${client.id}/edit#locations`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete("location", location.id, location.label || "Location")}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Street Address" value={location.street_address} />
                      <Field label="City" value={location.city} />
                      <Field label="State" value={location.state} />
                      <Field label="Postal Code" value={location.postal_code} />
                    </div>
                    {location.notes && (
                      <div className="mt-3 pt-3 border-t group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm">{location.notes}</p>
                          </div>
                          <CopyButton value={location.notes} label="notes" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No service locations added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 7: Tasks */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Tasks</CardTitle>
                {activeTasks.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{activeTasks.length} active</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {client.tasks && client.tasks.length > 0 ? (
              <div className="space-y-2">
                {/* Active Tasks (To Do + In Progress) */}
                {activeTasks.map((task) => {
                  const statusOption = TASK_STATUS_OPTIONS.find((o) => o.value === task.status);
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 group"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={isPending}
                            className="mt-0.5 shrink-0 transition-colors hover:opacity-80"
                          >
                            <Checkbox
                              checked={task.status === "completed"}
                              className={cn(
                                task.status === "in_progress" && "border-blue-500 data-[state=checked]:bg-blue-500"
                              )}
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {TASK_STATUS_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleTaskStatusChange(task.id, option.value as TaskStatus)}
                              className={cn(task.status === option.value && "bg-muted")}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <p className="text-sm font-medium break-words">{task.title}</p>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs shrink-0",
                                task.status === "pending" && "bg-gray-100 text-gray-700",
                                task.status === "in_progress" && "bg-blue-100 text-blue-700"
                              )}
                            >
                              {statusOption?.label}
                            </Badge>
                            <CopyButton value={task.title} label="task" />
                          </div>
                        </div>
                        {task.content && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.content}</p>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Due {format(new Date(task.due_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTask(task)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete("task", task.id, task.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Done ({completedTasks.length})</p>
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 opacity-60 group"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" disabled={isPending} className="mt-0.5 shrink-0">
                              <Checkbox checked className="data-[state=checked]:bg-green-500 border-green-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {TASK_STATUS_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onClick={() => handleTaskStatusChange(task.id, option.value as TaskStatus)}
                                className={cn(task.status === option.value && "bg-muted")}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-through">{task.title}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete("task", task.id, task.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No tasks added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 8: Links */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Link2 className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base sm:text-lg">Links</CardTitle>
                {client.documents && client.documents.length > 0 && (
                  <Badge variant="secondary" className="shrink-0">{client.documents.length}</Badge>
                )}
              </div>
              {!isAddingLink && !editingLinkId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto justify-center"
                  onClick={() => {
                    setIsAddingLink(true);
                    setLinkForm({ label: "", url: "", notes: "" });
                    setLinkError(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Add Link Form */}
            {isAddingLink && (
              <div className="mb-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="link-label">Label *</Label>
                  <Input
                    id="link-label"
                    placeholder="e.g., Assessment Report, Insurance Card"
                    value={linkForm.label}
                    onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-url">URL *</Label>
                  <Input
                    id="link-url"
                    placeholder="https://docs.google.com/..."
                    value={linkForm.url}
                    onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-notes">Notes</Label>
                  <Textarea
                    id="link-notes"
                    placeholder="Optional notes about this link..."
                    value={linkForm.notes}
                    onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
                    disabled={isPending}
                    rows={2}
                  />
                </div>
                {linkError && (
                  <p className="text-sm text-destructive">{linkError}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveLink}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Link"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLinkForm}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Links List */}
            {client.documents && client.documents.length > 0 ? (
              <div className="space-y-2">
                {client.documents.map((doc) => (
                  editingLinkId === doc.id ? (
                    /* Edit Form */
                    <div key={doc.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-label-${doc.id}`}>Label *</Label>
                        <Input
                          id={`edit-label-${doc.id}`}
                          placeholder="e.g., Assessment Report"
                          value={linkForm.label}
                          onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-url-${doc.id}`}>URL *</Label>
                        <Input
                          id={`edit-url-${doc.id}`}
                          placeholder="https://..."
                          value={linkForm.url}
                          onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-notes-${doc.id}`}>Notes</Label>
                        <Textarea
                          id={`edit-notes-${doc.id}`}
                          placeholder="Optional notes..."
                          value={linkForm.notes}
                          onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
                          disabled={isPending}
                          rows={2}
                        />
                      </div>
                      {linkError && (
                        <p className="text-sm text-destructive">{linkError}</p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={handleSaveLink}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetLinkForm}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg border bg-muted/30 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <Link2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{doc.label || "Link"}</p>
                              {doc.label && <CopyButton value={doc.label} label="link name" />}
                            </div>
                            {doc.url && (
                              <div className="flex items-center gap-1 mt-1">
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                  {doc.url}
                                </p>
                                <CopyButton value={doc.url} label="URL" />
                              </div>
                            )}
                            {doc.notes && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {doc.url && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Open link</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditLink(doc)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {doc.url && (
                                <DropdownMenuItem onClick={() => handleCopyUrl(doc.url!)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy URL
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete("document", doc.id!, doc.label || "Link")}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              !isAddingLink && <EmptyState message="No links added yet" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.label}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={
          editingTask
            ? {
                id: editingTask.id,
                title: editingTask.title,
                content: editingTask.content || "",
                status: editingTask.status as "pending" | "in_progress" | "completed",
                due_date: editingTask.due_date || "",
                client_id: client.id,
                client_name: childName,
              }
            : null
        }
        clientId={client.id}
        clientName={childName}
      />
    </>
  );
}
