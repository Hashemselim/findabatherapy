"use client";

import { format } from "date-fns";
import {
  User,
  Users,
  MapPin,
  Shield,
  Link2,
  FileText,
  FileImage,
  File,
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
  Mail,
  Upload,
  Eye,
  Download,
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
import { toast } from "sonner";
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
  getDocumentSignedUrl,
  downloadClientDocument,
} from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";
import { TASK_STATUS_OPTIONS, DOCUMENT_TYPE_OPTIONS, type ClientTask } from "@/lib/validations/clients";
import { formatFileSize, getDocumentIconName } from "@/lib/storage/config";

import { ClientStatusBadge } from "@/components/dashboard/clients/client-status-badge";
import { TaskFormDialog } from "@/components/dashboard/tasks";
import { AddAuthorizationDialog } from "@/components/dashboard/clients/add-authorization-dialog";
import { EditAuthorizationDialog } from "@/components/dashboard/clients/edit-authorization-dialog";
import {
  ParentEditDialog,
  InsuranceEditDialog,
  LocationEditDialog,
  ChildInfoEditDialog,
  ClinicalInfoEditDialog,
  StatusEditDialog,
} from "@/components/dashboard/clients/edit";
import { SendCommunicationDialog } from "@/components/dashboard/clients/send-communication-dialog";
import { createIntakeToken } from "@/lib/actions/intake";
import { CommunicationHistory } from "@/components/dashboard/clients/communication-history";
import { DocumentEditDialog } from "@/components/dashboard/clients/edit/document-edit-dialog";

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
  onEdit?: () => void;
  onAdd?: () => void;
  rightContent?: React.ReactNode;
}

function SectionHeader({
  icon: Icon,
  title,
  badgeCount,
  badgeLabel,
  onEdit,
  onAdd,
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
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {onAdd && (
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add
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

  // Edit dialog states
  const [childInfoDialogOpen, setChildInfoDialogOpen] = useState(false);
  const [clinicalInfoDialogOpen, setClinicalInfoDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<(typeof client.parents)[number] | undefined>(undefined);
  const [insuranceDialogOpen, setInsuranceDialogOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<(typeof client.insurances)[number] | undefined>(undefined);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<(typeof client.locations)[number] | undefined>(undefined);

  // Communication dialog state
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  const [communicationRefreshKey, setCommunicationRefreshKey] = useState(0);

  // Intake token state
  const [intakeLinkCopied, setIntakeLinkCopied] = useState(false);
  const [intakeLinkLoading, setIntakeLinkLoading] = useState(false);

  // Document management state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<(typeof client.documents)[number] | undefined>(undefined);

  const age = client.child_date_of_birth ? calculateAge(client.child_date_of_birth) : null;
  const childName = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Client";
  const activeTasks = client.tasks?.filter((t) => t.status !== "completed") || [];
  const completedTasks = client.tasks?.filter((t) => t.status === "completed") || [];
  const primaryParent = client.parents?.find((p) => p.is_primary) || client.parents?.[0];
  const recipientsWithEmail = (client.parents || [])
    .filter((p) => p.email)
    .map((p) => ({
      email: p.email!,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Parent/Guardian",
      relationship: p.relationship || "guardian",
      isPrimary: p.is_primary,
    }));

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

  // Document handlers
  const handleViewDocument = async (docId: string) => {
    const result = await getDocumentSignedUrl(docId);
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
    } else {
      toast.error(result.success === false ? result.error : "Failed to open document. Please try again.");
    }
  };

  const handleDownloadDocument = async (docId: string) => {
    const result = await downloadClientDocument(docId);
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
    } else {
      toast.error(result.success === false ? result.error : "Failed to download document. Please try again.");
    }
  };

  const handleEditDocument = (doc: (typeof client.documents)[number]) => {
    setEditingDocument(doc);
    setDocumentDialogOpen(true);
  };

  const handleAddDocument = () => {
    setEditingDocument(undefined);
    setDocumentDialogOpen(true);
  };

  const handleSendIntakeForm = async () => {
    setIntakeLinkLoading(true);
    try {
      const result = await createIntakeToken(client.id);
      if (result.success && result.data) {
        await navigator.clipboard.writeText(result.data.url);
        setIntakeLinkCopied(true);
        setTimeout(() => setIntakeLinkCopied(false), 3000);
      }
    } finally {
      setIntakeLinkLoading(false);
    }
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
              onEdit={() => setChildInfoDialogOpen(true)}
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
              onAdd={() => {
                setEditingParent(undefined);
                setParentDialogOpen(true);
              }}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingParent(parent);
                              setParentDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
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

        {/* SECTION 3: Locations */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={MapPin}
              title="Locations"
              badgeCount={client.locations?.length}
              onAdd={() => {
                setEditingLocation(undefined);
                setLocationDialogOpen(true);
              }}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingLocation(location);
                              setLocationDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
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
              onAdd={() => {
                setEditingInsurance(undefined);
                setInsuranceDialogOpen(true);
              }}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingInsurance(insurance);
                              setInsuranceDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
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
                          <div className="group flex items-center gap-1">
                            <span className="font-medium">
                              {auth.payor_type
                                ? AUTH_PAYOR_TYPE_OPTIONS.find(o => o.value === auth.payor_type)?.label || auth.payor_type
                                : "Authorization"}
                            </span>
                            {auth.payor_type && (
                              <CopyButton value={AUTH_PAYOR_TYPE_OPTIONS.find(o => o.value === auth.payor_type)?.label || auth.payor_type} label="payor type" />
                            )}
                          </div>
                          {auth.auth_reference_number && (
                            <div className="group flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">#{auth.auth_reference_number}</span>
                              <CopyButton value={auth.auth_reference_number} label="auth reference" />
                            </div>
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
                                  <div className="group flex items-center gap-1">
                                    <span className="font-medium text-sm">
                                      {SERVICE_BILLING_MAP.find(m => m.code === service.billing_code)?.label || service.service_type}
                                    </span>
                                    <CopyButton value={SERVICE_BILLING_MAP.find(m => m.code === service.billing_code)?.label || service.service_type || ""} label="service type" />
                                  </div>
                                  <div className="group flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {service.billing_code}
                                    </Badge>
                                    <CopyButton value={service.billing_code || ""} label="billing code" />
                                  </div>
                                </div>
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-sm">
                                  <div className="group flex items-center gap-1">
                                    <span className="text-muted-foreground">Hours/Week:</span>{" "}
                                    <span className="font-medium">{service.hours_per_week ?? "—"}</span>
                                    {service.hours_per_week && <CopyButton value={service.hours_per_week.toString()} label="hours/week" />}
                                  </div>
                                  <div className="group flex items-center gap-1">
                                    <span className="text-muted-foreground">Units/Auth:</span>{" "}
                                    <span className="font-medium">{service.units_per_auth ?? "—"}</span>
                                    {service.units_per_auth && <CopyButton value={service.units_per_auth.toString()} label="units/auth" />}
                                  </div>
                                  <div className="group flex items-center gap-1">
                                    <span className="text-muted-foreground">Used:</span>{" "}
                                    <span className="font-medium">{service.units_used ?? 0}</span>
                                    <CopyButton value={(service.units_used ?? 0).toString()} label="units used" />
                                  </div>
                                  <div className="group flex items-center gap-1">
                                    <span className="text-muted-foreground">Remaining:</span>{" "}
                                    <span className={cn(
                                      "font-medium",
                                      remaining !== null && remaining <= 0 ? "text-destructive" : ""
                                    )}>
                                      {remaining ?? "—"}
                                    </span>
                                    {remaining !== null && <CopyButton value={remaining.toString()} label="remaining units" />}
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
                                  <div className="group mt-2">
                                    <p className="text-xs text-muted-foreground inline">{service.notes}</p>
                                    <CopyButton value={service.notes} label="notes" />
                                  </div>
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
                          <div
                            role="button"
                            tabIndex={0}
                            aria-disabled={isPending || undefined}
                            className={cn(
                              "mt-0.5 shrink-0 transition-colors hover:opacity-80 cursor-pointer",
                              isPending && "pointer-events-none opacity-50"
                            )}
                          >
                            <Checkbox
                              checked={task.status === "completed"}
                              tabIndex={-1}
                              className={cn(
                                "pointer-events-none",
                                task.status === "in_progress" && "border-blue-500 data-[state=checked]:bg-blue-500"
                              )}
                            />
                          </div>
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
                            <div
                              role="button"
                              tabIndex={0}
                              aria-disabled={isPending || undefined}
                              className={cn(
                                "mt-0.5 shrink-0 cursor-pointer",
                                isPending && "pointer-events-none opacity-50"
                              )}
                            >
                              <Checkbox checked tabIndex={-1} className="pointer-events-none data-[state=checked]:bg-green-500 border-green-500" />
                            </div>
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
              onEdit={() => setClinicalInfoDialogOpen(true)}
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
              <Field label="Pediatrician" value={client.child_pediatrician_name} />
              <Field label="Pediatrician Phone" value={client.child_pediatrician_phone} />
            </div>

            {/* Empty state if no clinical info */}
            {!client.child_diagnosis?.length &&
             !client.child_primary_concerns &&
             !client.child_aba_history &&
             !client.child_other_therapies &&
             !client.child_pediatrician_name && (
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
              onEdit={() => setStatusDialogOpen(true)}
            />
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Referral Source" value={getOptionLabel(REFERRAL_SOURCE_OPTIONS, client.referral_source)} />
              <Field
                label="Referral Date"
                value={client.referral_date ? format(new Date(client.referral_date), "MMM d, yyyy") : null}
              />
              <Field
                label="First Day of Services"
                value={client.service_start_date ? format(new Date(client.service_start_date), "MMM d, yyyy") : null}
              />
              <Field
                label="Last Day of Services"
                value={client.service_end_date ? format(new Date(client.service_end_date), "MMM d, yyyy") : null}
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

        {/* SECTION 9: Documents */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={FileText}
              title="Documents"
              badgeCount={client.documents?.length}
              rightContent={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddDocument}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              }
            />

            {client.documents && client.documents.length > 0 ? (
              <div className="space-y-2">
                {client.documents.map((doc) => {
                  const docRecord = doc as Record<string, unknown>;
                  const hasFile = !!doc.file_path;
                  const fileType = docRecord.file_type as string | null;
                  const fileSize = docRecord.file_size as number | null;
                  const fileName = docRecord.file_name as string | null;
                  const fileDescription = docRecord.file_description as string | null;
                  const docTypeLabel = DOCUMENT_TYPE_OPTIONS.find(
                    (o) => o.value === doc.document_type
                  )?.label;
                  const iconType = getDocumentIconName(fileType);

                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg border bg-muted/30 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* File type icon */}
                          <div className="shrink-0 mt-0.5">
                            {iconType === "pdf" ? (
                              <FileText className="h-5 w-5 text-red-500" />
                            ) : iconType === "image" ? (
                              <FileImage className="h-5 w-5 text-blue-500" />
                            ) : iconType === "doc" ? (
                              <FileText className="h-5 w-5 text-blue-600" />
                            ) : hasFile ? (
                              <File className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Link2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Document name + type badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">
                                {doc.label || fileName || "Document"}
                              </p>
                              {docTypeLabel && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {docTypeLabel}
                                </Badge>
                              )}
                            </div>
                            {/* Description */}
                            {fileDescription && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {fileDescription}
                              </p>
                            )}
                            {/* File metadata */}
                            {hasFile && (
                              <div className="flex items-center gap-2 mt-1">
                                {fileSize && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(fileSize)}
                                  </span>
                                )}
                                {fileType && (
                                  <span className="text-xs text-muted-foreground">
                                    {fileType.split("/").pop()?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* URL for legacy link-type documents */}
                            {!hasFile && doc.url && (
                              <div className="flex items-center gap-1 mt-1">
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                  {doc.url}
                                </p>
                                <CopyButton value={doc.url} label="URL" />
                              </div>
                            )}
                            {/* Notes */}
                            {doc.notes && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* View button for uploaded files */}
                          {hasFile && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDocument(doc.id!)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View document</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* Open link for URL-based docs */}
                          {!hasFile && doc.url && (
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
                              {hasFile && (
                                <>
                                  <DropdownMenuItem onClick={() => handleViewDocument(doc.id!)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadDocument(doc.id!)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleEditDocument(doc)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete("document", doc.id!, doc.label || "Document")}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No documents uploaded yet" />
            )}
          </CardContent>
        </Card>

        {/* Document Upload/Edit Dialog */}
        <DocumentEditDialog
          open={documentDialogOpen}
          onOpenChange={setDocumentDialogOpen}
          clientId={client.id}
          document={editingDocument as (typeof editingDocument & { id: string }) | undefined}
          onSuccess={() => setDocumentDialogOpen(false)}
        />

        {/* SECTION 10: Communications */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader
              icon={Mail}
              title="Communications"
              rightContent={
                <div className="flex items-center gap-1">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSendIntakeForm}
                          disabled={intakeLinkLoading}
                        >
                          {intakeLinkLoading ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : intakeLinkCopied ? (
                            <Check className="h-4 w-4 mr-1 text-green-600" />
                          ) : (
                            <ClipboardList className="h-4 w-4 mr-1" />
                          )}
                          {intakeLinkCopied ? "Copied!" : "Intake Link"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate a pre-filled intake form link and copy to clipboard</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {recipientsWithEmail.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCommunicationDialogOpen(true)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              }
            />
            {recipientsWithEmail.length > 0 ? (
              <CommunicationHistory
                key={communicationRefreshKey}
                clientId={client.id}
              />
            ) : (
              <EmptyState message="Add a parent email address to send communications" />
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

      {/* Child Info Edit Dialog */}
      <ChildInfoEditDialog
        open={childInfoDialogOpen}
        onOpenChange={setChildInfoDialogOpen}
        clientId={client.id}
        client={client}
      />

      {/* Clinical Info Edit Dialog */}
      <ClinicalInfoEditDialog
        open={clinicalInfoDialogOpen}
        onOpenChange={setClinicalInfoDialogOpen}
        clientId={client.id}
        client={client}
      />

      {/* Status Edit Dialog */}
      <StatusEditDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        clientId={client.id}
        client={client}
      />

      {/* Parent Edit Dialog */}
      <ParentEditDialog
        open={parentDialogOpen}
        onOpenChange={(open) => {
          setParentDialogOpen(open);
          if (!open) setEditingParent(undefined);
        }}
        clientId={client.id}
        parent={editingParent}
      />

      {/* Insurance Edit Dialog */}
      <InsuranceEditDialog
        open={insuranceDialogOpen}
        onOpenChange={(open) => {
          setInsuranceDialogOpen(open);
          if (!open) setEditingInsurance(undefined);
        }}
        clientId={client.id}
        insurance={editingInsurance}
      />

      {/* Location Edit Dialog */}
      <LocationEditDialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open);
          if (!open) setEditingLocation(undefined);
        }}
        clientId={client.id}
        location={editingLocation}
      />

      {/* Send Communication Dialog */}
      {recipientsWithEmail.length > 0 && (
        <SendCommunicationDialog
          open={communicationDialogOpen}
          onOpenChange={setCommunicationDialogOpen}
          clientId={client.id}
          clientName={childName}
          recipients={recipientsWithEmail}
          currentStage={client.status}
          onSuccess={() => setCommunicationRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
