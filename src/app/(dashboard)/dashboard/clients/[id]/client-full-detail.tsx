"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  User,
  Users,
  MapPin,
  Shield,
  FileText,
  CheckSquare,
  ExternalLink,
  Copy,
  Check,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import { cn } from "@/lib/utils";
import {
  calculateAge,
  getDaysUntilAuthExpires,
  getAuthDaysColor,
  CLIENT_STATUS_OPTIONS,
  PARENT_RELATIONSHIP_OPTIONS,
  AUTH_STATUS_OPTIONS,
  INSURANCE_STATUS_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/validations/clients";
import {
  completeClientTask,
  deleteClientTask,
  deleteClientParent,
  deleteClientInsurance,
  deleteClientAuthorization,
  deleteClientLocation,
  deleteClientDocument,
} from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";

import { ClientStatusBadge } from "@/components/dashboard/clients/client-status-badge";
import { ClientQuickActions } from "@/components/dashboard/clients/client-quick-actions";

interface ClientFullDetailProps {
  client: ClientDetail;
}

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
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
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

function DetailRow({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="group flex items-start justify-between gap-4 py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-right font-medium">{value}</span>
        {copyable && <CopyButton value={value} label={label.toLowerCase()} />}
      </div>
    </div>
  );
}

export function ClientFullDetail({ client }: ClientFullDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "parent" | "insurance" | "authorization" | "location" | "document" | "task";
    id: string;
    label: string;
  } | null>(null);

  const age = client.child_date_of_birth ? calculateAge(client.child_date_of_birth) : null;

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
      // Page will revalidate automatically
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    });
  };

  const handleCompleteTask = async (taskId: string) => {
    startTransition(async () => {
      await completeClientTask(taskId);
    });
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status & Overview</CardTitle>
                <ClientStatusBadge status={client.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <DetailRow label="Referral Source" value={client.referral_source} />
                <DetailRow
                  label="Referral Date"
                  value={client.referral_date ? format(new Date(client.referral_date), "MMMM d, yyyy") : null}
                />
                <DetailRow
                  label="Service Start"
                  value={client.service_start_date ? format(new Date(client.service_start_date), "MMMM d, yyyy") : null}
                />
                <DetailRow label="Funding Source" value={client.funding_source} />
                <DetailRow label="Preferred Language" value={client.preferred_language} />
              </div>
            </CardContent>
          </Card>

          {/* Child Information */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle className="text-lg">Child Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <DetailRow
                  label="Name"
                  value={[client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || null}
                  copyable
                />
                <DetailRow
                  label="Date of Birth"
                  value={client.child_date_of_birth ? format(new Date(client.child_date_of_birth), "MMMM d, yyyy") : null}
                />
                <DetailRow label="Age" value={age !== null ? `${age} years` : null} />
                {client.child_diagnosis && client.child_diagnosis.length > 0 && (
                  <div className="py-2 border-b">
                    <p className="text-sm text-muted-foreground mb-2">Diagnosis</p>
                    <div className="flex flex-wrap gap-1">
                      {client.child_diagnosis.map((d, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <DetailRow label="School" value={client.child_school_name} />
                <DetailRow label="Grade" value={client.child_grade_level} />
                <DetailRow label="District" value={client.child_school_district} />
                <DetailRow label="Pediatrician" value={client.child_pediatrician_name} />
                <DetailRow label="Pediatrician Phone" value={client.child_pediatrician_phone} copyable />
              </div>

              {client.child_primary_concerns && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Primary Concerns</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.child_primary_concerns}
                  </p>
                </div>
              )}

              {client.child_aba_history && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">ABA History</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.child_aba_history}
                  </p>
                </div>
              )}

              {client.child_other_therapies && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Other Therapies</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.child_other_therapies}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle className="text-lg">Parents/Guardians</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#parents`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.parents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No parents/guardians added
                </p>
              ) : (
                <div className="space-y-4">
                  {client.parents.map((parent) => {
                    const relationshipLabel = PARENT_RELATIONSHIP_OPTIONS.find(
                      (opt) => opt.value === parent.relationship
                    )?.label;

                    return (
                      <div key={parent.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {[parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Unnamed"}
                              </p>
                              {parent.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            {relationshipLabel && (
                              <p className="text-sm text-muted-foreground">{relationshipLabel}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <ClientQuickActions phone={parent.phone} email={parent.email} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <a href={`/dashboard/clients/${client.id}/edit#parents`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDelete(
                                      "parent",
                                      parent.id,
                                      [parent.first_name, parent.last_name].filter(Boolean).join(" ") || "this parent"
                                    )
                                  }
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="mt-3 space-y-0">
                          <DetailRow label="Phone" value={parent.phone} copyable />
                          <DetailRow label="Email" value={parent.email} copyable />
                        </div>
                        {parent.notes && (
                          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                            {parent.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <CardTitle className="text-lg">Therapy Locations</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#locations`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations added
                </p>
              ) : (
                <div className="space-y-4">
                  {client.locations.map((location) => {
                    const address = [
                      location.street_address,
                      location.city,
                      location.state,
                      location.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div key={location.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{location.label || "Location"}</p>
                              {location.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            {address && (
                              <p className="text-sm text-muted-foreground mt-1">{address}</p>
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
                                <a href={`/dashboard/clients/${client.id}/edit#locations`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete("location", location.id, location.label || "this location")}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {location.notes && (
                          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                            {location.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Insurance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-lg">Insurance</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#insurance`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.insurances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No insurance added
                </p>
              ) : (
                <div className="space-y-4">
                  {client.insurances.map((insurance) => {
                    const statusOption = INSURANCE_STATUS_OPTIONS.find(
                      (opt) => opt.value === insurance.status
                    );

                    return (
                      <div key={insurance.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {insurance.insurance_name || "Unnamed Insurance"}
                              </p>
                              {insurance.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            {statusOption && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "mt-1 text-xs",
                                  statusOption.color === "green" && "border-green-500 text-green-600",
                                  statusOption.color === "gray" && "border-gray-500 text-gray-600",
                                  statusOption.color === "yellow" && "border-yellow-500 text-yellow-600"
                                )}
                              >
                                {statusOption.label}
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
                                <a href={`/dashboard/clients/${client.id}/edit#insurance`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete("insurance", insurance.id, insurance.insurance_name || "this insurance")
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 space-y-0">
                          <DetailRow label="Member ID" value={insurance.member_id} copyable />
                          <DetailRow label="Group #" value={insurance.group_number} copyable />
                          <DetailRow label="Plan" value={insurance.plan_name} />
                          <DetailRow
                            label="Effective"
                            value={insurance.effective_date ? format(new Date(insurance.effective_date), "MM/dd/yyyy") : null}
                          />
                          <DetailRow
                            label="Expires"
                            value={insurance.expiration_date ? format(new Date(insurance.expiration_date), "MM/dd/yyyy") : null}
                          />
                          <DetailRow
                            label="Copay"
                            value={insurance.copay_amount ? `$${insurance.copay_amount}` : null}
                          />
                          <DetailRow
                            label="Coinsurance"
                            value={insurance.coinsurance_percentage ? `${insurance.coinsurance_percentage}%` : null}
                          />
                          <DetailRow
                            label="Deductible"
                            value={
                              insurance.deductible_total
                                ? `$${insurance.deductible_remaining || 0} remaining of $${insurance.deductible_total}`
                                : null
                            }
                          />
                          <DetailRow
                            label="OOP Max"
                            value={
                              insurance.oop_max_total
                                ? `$${insurance.oop_max_remaining || 0} remaining of $${insurance.oop_max_total}`
                                : null
                            }
                          />
                        </div>
                        {insurance.notes && (
                          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                            {insurance.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorizations */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-lg">Authorizations</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#authorizations`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.authorizations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No authorizations added
                </p>
              ) : (
                <div className="space-y-4">
                  {client.authorizations.map((auth) => {
                    const statusOption = AUTH_STATUS_OPTIONS.find((opt) => opt.value === auth.status);
                    const daysRemaining = auth.end_date ? getDaysUntilAuthExpires(auth.end_date) : null;
                    const daysColor = getAuthDaysColor(daysRemaining);

                    return (
                      <div key={auth.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {auth.treatment_requested || auth.service_type || "Authorization"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {statusOption && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    statusOption.color === "green" && "border-green-500 text-green-600",
                                    statusOption.color === "red" && "border-red-500 text-red-600",
                                    statusOption.color === "blue" && "border-blue-500 text-blue-600",
                                    statusOption.color === "orange" && "border-orange-500 text-orange-600",
                                    statusOption.color === "amber" && "border-amber-500 text-amber-600",
                                    statusOption.color === "gray" && "border-gray-500 text-gray-600"
                                  )}
                                >
                                  {statusOption.label}
                                </Badge>
                              )}
                              {daysRemaining !== null && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    daysColor === "red" && "bg-red-100 text-red-700",
                                    daysColor === "orange" && "bg-orange-100 text-orange-700",
                                    daysColor === "amber" && "bg-amber-100 text-amber-700",
                                    daysColor === "green" && "bg-green-100 text-green-700",
                                    daysColor === "gray" && "bg-gray-100 text-gray-700"
                                  )}
                                >
                                  {daysRemaining <= 0 ? "Expired" : `${daysRemaining} days left`}
                                </Badge>
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
                              <DropdownMenuItem asChild>
                                <a href={`/dashboard/clients/${client.id}/edit#authorizations`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete("authorization", auth.id, auth.auth_reference_number || "this authorization")
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 space-y-0">
                          <DetailRow label="Auth #" value={auth.auth_reference_number} copyable />
                          <DetailRow label="Billing Code" value={auth.billing_code} />
                          <DetailRow
                            label="Units"
                            value={auth.units_requested ? `${auth.units_used || 0} / ${auth.units_requested}` : null}
                          />
                          <DetailRow
                            label="Rate"
                            value={auth.rate_per_unit ? `$${auth.rate_per_unit}/unit` : null}
                          />
                          <DetailRow
                            label="Period"
                            value={
                              auth.start_date && auth.end_date
                                ? `${format(new Date(auth.start_date), "MM/dd/yy")} - ${format(new Date(auth.end_date), "MM/dd/yy")}`
                                : null
                            }
                          />
                        </div>
                        {auth.notes && (
                          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                            {auth.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  <CardTitle className="text-lg">Tasks</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#tasks`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks
                </p>
              ) : (
                <div className="space-y-2">
                  {client.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3",
                        task.status === "completed" && "opacity-60"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 mt-0.5"
                        onClick={() => task.status === "pending" && handleCompleteTask(task.id)}
                        disabled={isPending || task.status === "completed"}
                      >
                        <CheckSquare
                          className={cn(
                            "h-4 w-4",
                            task.status === "completed" ? "text-green-500" : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium", task.status === "completed" && "line-through")}>
                          {task.title}
                        </p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due {format(new Date(task.due_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete("task", task.id, task.title)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-lg">Documents</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/clients/${client.id}/edit#documents`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents
                </p>
              ) : (
                <div className="space-y-2">
                  {client.documents.map((doc) => {
                    const typeLabel = DOCUMENT_TYPE_OPTIONS.find(
                      (opt) => opt.value === doc.document_type
                    )?.label;

                    return (
                      <div key={doc.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{doc.label || "Document"}</p>
                          {typeLabel && (
                            <p className="text-xs text-muted-foreground">{typeLabel}</p>
                          )}
                          {doc.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={`/dashboard/clients/${client.id}/edit#documents`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete("document", doc.id, doc.label || "this document")}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Added {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}</span>
            <span>Updated {formatDistanceToNow(new Date(client.updated_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.label}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
