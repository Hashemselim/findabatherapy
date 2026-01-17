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
  Clock,
  Loader2,
  Stethoscope,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  calculateAuthPeriod,
  PARENT_RELATIONSHIP_OPTIONS,
  AUTH_STATUS_OPTIONS,
  AUTH_PAYOR_TYPE_OPTIONS,
  INSURANCE_STATUS_OPTIONS,
  SERVICE_BILLING_MAP,
  CLIENT_FUNDING_SOURCE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  LOCATION_LABEL_OPTIONS,
  GRADE_LEVEL_OPTIONS,
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
import { AddAuthorizationDialog } from "@/components/dashboard/clients/add-authorization-dialog";
import { EditAuthorizationDialog } from "@/components/dashboard/clients/edit-authorization-dialog";

interface ClientFullDetailProps {
  client: ClientDetail;
}

// Brand color for section headers
const SECTION_COLOR = "#8B5CF6"; // CRM purple

// Helper to get display label from option arrays
function getOptionLabel<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const option = options.find((o) => o.value === value);
  return option?.label || value;
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

// Section header component - styled like sidebar nav sections
interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  badgeCount?: number;
  badgeLabel?: string;
  editHref?: string;
  addHref?: string;
  rightContent?: React.ReactNode;
}

function SectionHeader({
  icon: Icon,
  title,
  badgeCount,
  badgeLabel,
  editHref,
  addHref,
  rightContent,
}: SectionHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 -mx-6 -mt-6 mb-4 rounded-t-lg"
      style={{ backgroundColor: `${SECTION_COLOR}15` }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: SECTION_COLOR }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span
          className="text-base font-semibold"
          style={{ color: SECTION_COLOR }}
        >
          {title}
        </span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {badgeLabel ? `${badgeCount} ${badgeLabel}` : badgeCount}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {editHref && (
          <Button variant="ghost" size="sm" asChild>
            <a href={editHref}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </a>
          </Button>
        )}
        {addHref && (
          <Button variant="ghost" size="sm" asChild>
            <a href={addHref}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// Field component - simple label/value display (no icons)
function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={cn("group py-2", className)}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium break-words">{value}</p>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}

// Full-width field for longer text content
function FullWidthField({ label, value }: { label: string; value: string }) {
  return (
    <div className="group">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm whitespace-pre-wrap flex-1">{value}</p>
        <CopyButton value={value} label={label.toLowerCase()} />
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
        {/* SECTION 1: Client Information */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={User}
              title="Client Information"
              editHref={`/dashboard/clients/${client.id}/edit#child`}
            />
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="First Name" value={client.child_first_name} />
              <Field label="Last Name" value={client.child_last_name} />
              <Field
                label="Date of Birth"
                value={client.child_date_of_birth ? format(new Date(client.child_date_of_birth), "MMM d, yyyy") : null}
              />
              <Field label="Age" value={age !== null ? `${age} years old` : null} />
              <Field label="School Name" value={client.child_school_name} />
              <Field label="School District" value={client.child_school_district} />
              <Field label="Grade Level" value={getOptionLabel(GRADE_LEVEL_OPTIONS, client.child_grade_level)} />
              <Field label="Preferred Language" value={client.preferred_language} />
              <Field label="Pediatrician" value={client.child_pediatrician_name} />
              <Field label="Pediatrician Phone" value={client.child_pediatrician_phone} />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Parents/Guardians */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={Users}
              title="Parents / Guardians"
              badgeCount={client.parents?.length}
              addHref={`/dashboard/clients/${client.id}/edit#parents`}
            />
            {client.parents && client.parents.length > 0 ? (
              <div className="space-y-4">
                {client.parents.map((parent) => (
                  <div
                    key={parent.id}
                    className={cn(
                      "p-4 rounded-lg border bg-muted/30",
                      parent.is_primary && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
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
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="First Name" value={parent.first_name} />
                      <Field label="Last Name" value={parent.last_name} />
                      <Field label="Phone" value={parent.phone} />
                      <Field label="Email" value={parent.email} />
                    </div>
                    {parent.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <FullWidthField label="Notes" value={parent.notes} />
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

        {/* SECTION 3: Service Locations */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={MapPin}
              title="Service Locations"
              badgeCount={client.locations?.length}
              addHref={`/dashboard/clients/${client.id}/edit#locations`}
            />
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
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{getOptionLabel(LOCATION_LABEL_OPTIONS, location.label) || "Location"}</span>
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
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Street Address" value={location.street_address} />
                      <Field label="City" value={location.city} />
                      <Field label="State" value={location.state} />
                      <Field label="Postal Code" value={location.postal_code} />
                    </div>
                    {location.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <FullWidthField label="Notes" value={location.notes} />
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

        {/* SECTION 4: Insurance */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={Shield}
              title="Insurance"
              badgeCount={client.insurances?.length}
              addHref={`/dashboard/clients/${client.id}/edit#insurance`}
            />
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
                    <div className="flex items-start justify-between mb-3">
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
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Insurance Name" value={insurance.insurance_name} />
                      <Field label="Member ID" value={insurance.member_id} />
                      <Field label="Group Number" value={insurance.group_number} />
                      <Field label="Plan Name" value={insurance.plan_name} />
                      <Field label="Subscriber Relationship" value={insurance.subscriber_relationship} />
                      <Field label="Effective Date" value={insurance.effective_date ? format(new Date(insurance.effective_date), "MMM d, yyyy") : null} />
                      <Field label="Expiration Date" value={insurance.expiration_date ? format(new Date(insurance.expiration_date), "MMM d, yyyy") : null} />
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
          <CardContent className="pt-6">
            <SectionHeader
              icon={FileText}
              title="Authorizations"
              badgeCount={client.authorizations?.length}
              rightContent={<AddAuthorizationDialog clientId={client.id} />}
            />
            {client.authorizations && client.authorizations.length > 0 ? (
              <div className="space-y-4">
                {client.authorizations.map((auth) => {
                  const daysLeft = auth.end_date ? getDaysUntilAuthExpires(auth.end_date) : null;
                  const daysColor = getAuthDaysColor(daysLeft);
                  const authPeriod = auth.start_date && auth.end_date
                    ? calculateAuthPeriod(auth.start_date, auth.end_date)
                    : null;

                  return (
                    <div key={auth.id} className="p-4 rounded-lg border bg-muted/30">
                      {/* Auth Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {auth.payor_type
                              ? AUTH_PAYOR_TYPE_OPTIONS.find(o => o.value === auth.payor_type)?.label || auth.payor_type
                              : "Authorization"}
                          </span>
                          {auth.auth_reference_number && (
                            <span className="text-muted-foreground text-sm">#{auth.auth_reference_number}</span>
                          )}
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
                        <div className="flex items-center gap-1 shrink-0">
                          <EditAuthorizationDialog
                            authorization={auth}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                      </div>

                      {/* Auth Period Info */}
                      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                        <Field label="Start Date" value={auth.start_date ? format(new Date(auth.start_date), "MMM d, yyyy") : null} />
                        <Field label="End Date" value={auth.end_date ? format(new Date(auth.end_date), "MMM d, yyyy") : null} />
                        {authPeriod && (
                          <>
                            <Field label="Duration" value={`${authPeriod.totalWeeks} weeks`} />
                            <Field label="Payor Type" value={
                              auth.payor_type
                                ? (AUTH_PAYOR_TYPE_OPTIONS.find(o => o.value === auth.payor_type)?.label || auth.payor_type)
                                : null
                            } />
                          </>
                        )}
                      </div>

                      {/* Services */}
                      {auth.services && auth.services.length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <p className="text-sm font-medium text-muted-foreground">Services ({auth.services.length})</p>
                          {auth.services.map((service, svcIndex) => {
                            const remaining = service.units_per_auth && service.units_used !== undefined
                              ? service.units_per_auth - service.units_used
                              : null;
                            const usagePercent = service.units_per_auth && service.units_used !== undefined
                              ? Math.min(100, Math.round((service.units_used / service.units_per_auth) * 100))
                              : null;

                            return (
                              <div key={service.id || svcIndex} className="pl-3 border-l-2 border-primary/20 bg-background/50 rounded-r-lg p-3">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {SERVICE_BILLING_MAP.find(m => m.code === service.billing_code)?.label || service.service_type}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {service.billing_code}
                                  </Badge>
                                </div>
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Hours/Week:</span>{" "}
                                    <span className="font-medium">{service.hours_per_week ?? "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Units/Auth:</span>{" "}
                                    <span className="font-medium">{service.units_per_auth ?? "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Used:</span>{" "}
                                    <span className="font-medium">{service.units_used ?? 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Remaining:</span>{" "}
                                    <span className={cn(
                                      "font-medium",
                                      remaining !== null && remaining <= 0 ? "text-destructive" : ""
                                    )}>
                                      {remaining ?? "—"}
                                    </span>
                                  </div>
                                </div>
                                {/* Usage bar */}
                                {usagePercent !== null && (
                                  <div className="mt-2">
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          usagePercent >= 90 ? "bg-destructive" : usagePercent >= 75 ? "bg-amber-500" : "bg-primary"
                                        )}
                                        style={{ width: `${usagePercent}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{usagePercent}% utilized</p>
                                  </div>
                                )}
                                {service.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">{service.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Legacy display for auths without services */}
                      {(!auth.services || auth.services.length === 0) && (auth.service_type || auth.billing_code) && (
                        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Service Type" value={auth.service_type} />
                          <Field label="Billing Code" value={auth.billing_code} />
                          <Field label="Units Requested" value={auth.units_requested?.toString()} />
                          <Field label="Units Used" value={auth.units_used?.toString()} />
                        </div>
                      )}

                      {auth.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <FullWidthField label="Notes" value={auth.notes} />
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

        {/* SECTION 6: Tasks */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={CheckSquare}
              title="Tasks"
              badgeCount={activeTasks.length}
              badgeLabel="active"
              rightContent={
                <Button variant="ghost" size="sm" onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              }
            />
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

        {/* SECTION 7: Clinical Information */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={Stethoscope}
              title="Clinical Information"
              editHref={`/dashboard/clients/${client.id}/edit#child`}
            />

            {/* Diagnosis */}
            {client.child_diagnosis && client.child_diagnosis.length > 0 && (
              <div className="mb-4">
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

            {/* Clinical text fields in grid */}
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Primary Concerns" value={client.child_primary_concerns} />
              <Field label="ABA History" value={client.child_aba_history} />
              <Field label="Other Therapies" value={client.child_other_therapies} />
            </div>

            {/* Empty state if no clinical info */}
            {!client.child_diagnosis?.length &&
             !client.child_primary_concerns &&
             !client.child_aba_history &&
             !client.child_other_therapies && (
              <EmptyState message="No clinical information added yet" />
            )}
          </CardContent>
        </Card>

        {/* SECTION 8: Status & Service Info */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={ClipboardList}
              title="Status & Service Information"
              rightContent={<ClientStatusBadge status={client.status} />}
              editHref={`/dashboard/clients/${client.id}/edit#status`}
            />
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Referral Source" value={getOptionLabel(REFERRAL_SOURCE_OPTIONS, client.referral_source)} />
              <Field
                label="Referral Date"
                value={client.referral_date ? format(new Date(client.referral_date), "MMM d, yyyy") : null}
              />
              <Field
                label="Service Start Date"
                value={client.service_start_date ? format(new Date(client.service_start_date), "MMM d, yyyy") : null}
              />
              <Field label="Funding Source" value={getOptionLabel(CLIENT_FUNDING_SOURCE_OPTIONS, client.funding_source)} />
            </div>

            {/* Notes - Full Width */}
            {client.notes && (
              <div className="mt-4 pt-4 border-t">
                <FullWidthField label="General Notes" value={client.notes} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 9: Links */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={Link2}
              title="Links"
              badgeCount={client.documents?.length}
              rightContent={
                !isAddingLink && !editingLinkId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingLink(true);
                      setLinkForm({ label: "", url: "", notes: "" });
                      setLinkError(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )
              }
            />
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
                  />                </div>
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
