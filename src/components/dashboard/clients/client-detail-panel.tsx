"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Copy,
  Check,
  Shield,
  Link2,
  FileText,
  CheckSquare,
  User,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  calculateAge,
  getClientDisplayName,
  getDaysUntilAuthExpires,
  getAuthDaysColor,
  PARENT_RELATIONSHIP_OPTIONS,
  AUTH_STATUS_OPTIONS,
  INSURANCE_STATUS_OPTIONS,
} from "@/lib/validations/clients";
import type { ClientDetail as ClientDetailType } from "@/lib/actions/clients";
import { TaskFormDialog } from "@/components/dashboard/tasks";

import { ClientStatusBadge } from "./client-status-badge";
import { ClientQuickActions } from "./client-quick-actions";

interface ClientDetailPanelProps {
  client: ClientDetailType | null;
  onBack?: () => void;
  showBackButton?: boolean;
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

function FieldRow({
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
    <div className="group flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm break-words sm:text-right">{value}</span>
        {copyable && <CopyButton value={value} label={label.toLowerCase()} />}
      </div>
    </div>
  );
}

export function ClientDetailPanel({
  client,
  onBack,
  showBackButton,
}: ClientDetailPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    child: true,
    parents: true,
    insurance: true,
    authorizations: false,
    locations: false,
    documents: false,
    tasks: false,
  });
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!client) {
    return (
      <Card className="flex h-full flex-col items-center justify-center p-8 text-center">
        <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No client selected</h3>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Select a client from the list to view details
        </p>
      </Card>
    );
  }

  const displayName = getClientDisplayName({
    child_first_name: client.child_first_name || undefined,
    child_last_name: client.child_last_name || undefined,
  });
  const age = client.child_date_of_birth ? calculateAge(client.child_date_of_birth) : null;
  const primaryParent = client.parents.find((p) => p.is_primary) || client.parents[0];

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="shrink-0 space-y-3 pb-3 px-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            {showBackButton && onBack && (
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">{displayName}</CardTitle>
              {age !== null && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {age} years old
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ClientStatusBadge status={client.status} />
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href={`/dashboard/clients/${client.id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Full View
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick actions */}
        {primaryParent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {primaryParent.first_name || primaryParent.last_name ? (
              <span>
                {[primaryParent.first_name, primaryParent.last_name].filter(Boolean).join(" ")}
              </span>
            ) : null}
            <ClientQuickActions
              phone={primaryParent.phone}
              email={primaryParent.email}
              size="default"
            />
          </div>
        )}
      </CardHeader>

      <Separator />

      {/* Content - scrollable */}
      <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Child Information */}
        <Collapsible open={openSections.child} onOpenChange={() => toggleSection("child")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 shrink-0" />
              Child Information
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {openSections.child ? "Hide" : "Show"}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border p-2 sm:p-3 mt-2 space-y-1">
              <FieldRow label="Name" value={displayName} copyable />
              <FieldRow
                label="Date of Birth"
                value={
                  client.child_date_of_birth
                    ? format(new Date(client.child_date_of_birth), "MMMM d, yyyy")
                    : null
                }
              />
              <FieldRow label="Age" value={age !== null ? `${age} years` : null} />
              {client.child_diagnosis && client.child_diagnosis.length > 0 && (
                <FieldRow label="Diagnosis" value={client.child_diagnosis.join(", ")} />
              )}
              <FieldRow label="School" value={client.child_school_name} />
              <FieldRow label="Grade" value={client.child_grade_level} />
              <FieldRow label="District" value={client.child_school_district} />
              <FieldRow label="Pediatrician" value={client.child_pediatrician_name} />
              <FieldRow label="Pediatrician Phone" value={client.child_pediatrician_phone} copyable />
              {client.child_primary_concerns && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Primary Concerns</p>
                  <p className="text-sm whitespace-pre-wrap">{client.child_primary_concerns}</p>
                </div>
              )}
              {client.child_aba_history && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">ABA History</p>
                  <p className="text-sm whitespace-pre-wrap">{client.child_aba_history}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Parents */}
        {client.parents.length > 0 && (
          <Collapsible open={openSections.parents} onOpenChange={() => toggleSection("parents")}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 shrink-0" />
                Parents/Guardians ({client.parents.length})
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {openSections.parents ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {client.parents.map((parent) => {
                  const relationshipLabel = PARENT_RELATIONSHIP_OPTIONS.find(
                    (opt) => opt.value === parent.relationship
                  )?.label;

                  return (
                    <div key={parent.id} className="rounded-lg border p-2 sm:p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {[parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
                              "Unnamed"}
                            {parent.is_primary && (
                              <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                            )}
                          </p>
                          {relationshipLabel && (
                            <p className="text-sm text-muted-foreground">{relationshipLabel}</p>
                          )}
                        </div>
                        <ClientQuickActions phone={parent.phone} email={parent.email} />
                      </div>
                      <div className="mt-2 space-y-1">
                        <FieldRow label="Phone" value={parent.phone} copyable />
                        <FieldRow label="Email" value={parent.email} copyable />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Insurance */}
        {client.insurances.length > 0 && (
          <Collapsible
            open={openSections.insurance}
            onOpenChange={() => toggleSection("insurance")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 shrink-0" />
                Insurance ({client.insurances.length})
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {openSections.insurance ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {client.insurances.map((insurance) => {
                  const statusOption = INSURANCE_STATUS_OPTIONS.find(
                    (opt) => opt.value === insurance.status
                  );

                  return (
                    <div key={insurance.id} className="rounded-lg border p-2 sm:p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {insurance.insurance_name || "Unnamed Insurance"}
                            {insurance.is_primary && (
                              <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                            )}
                          </p>
                          {statusOption && (
                            <span
                              className={cn(
                                "text-xs",
                                statusOption.color === "green" && "text-green-600",
                                statusOption.color === "gray" && "text-gray-500",
                                statusOption.color === "yellow" && "text-yellow-600"
                              )}
                            >
                              {statusOption.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <FieldRow label="Member ID" value={insurance.member_id} copyable />
                        <FieldRow label="Group #" value={insurance.group_number} copyable />
                        <FieldRow label="Plan" value={insurance.plan_name} />
                        <FieldRow
                          label="Effective"
                          value={
                            insurance.effective_date
                              ? format(new Date(insurance.effective_date), "MM/dd/yyyy")
                              : null
                          }
                        />
                        <FieldRow
                          label="Expires"
                          value={
                            insurance.expiration_date
                              ? format(new Date(insurance.expiration_date), "MM/dd/yyyy")
                              : null
                          }
                        />
                        {(insurance.copay_amount || insurance.coinsurance_percentage) && (
                          <>
                            <FieldRow
                              label="Copay"
                              value={insurance.copay_amount ? `$${insurance.copay_amount}` : null}
                            />
                            <FieldRow
                              label="Coinsurance"
                              value={
                                insurance.coinsurance_percentage
                                  ? `${insurance.coinsurance_percentage}%`
                                  : null
                              }
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Authorizations */}
        {client.authorizations.length > 0 && (
          <Collapsible
            open={openSections.authorizations}
            onOpenChange={() => toggleSection("authorizations")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 shrink-0" />
                Authorizations ({client.authorizations.length})
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {openSections.authorizations ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {client.authorizations.map((auth) => {
                  const statusOption = AUTH_STATUS_OPTIONS.find((opt) => opt.value === auth.status);
                  const daysRemaining = auth.end_date ? getDaysUntilAuthExpires(auth.end_date) : null;
                  const daysColor = getAuthDaysColor(daysRemaining);

                  return (
                    <div key={auth.id} className="rounded-lg border p-2 sm:p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {auth.treatment_requested || auth.service_type || "Authorization"}
                          </p>
                          {statusOption && (
                            <span
                              className={cn(
                                "text-xs",
                                statusOption.color === "green" && "text-green-600",
                                statusOption.color === "red" && "text-red-600",
                                statusOption.color === "blue" && "text-blue-600",
                                statusOption.color === "orange" && "text-orange-600",
                                statusOption.color === "amber" && "text-amber-600",
                                statusOption.color === "gray" && "text-gray-500"
                              )}
                            >
                              {statusOption.label}
                            </span>
                          )}
                        </div>
                        {daysRemaining !== null && (
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded",
                              daysColor === "red" && "bg-red-100 text-red-700",
                              daysColor === "orange" && "bg-orange-100 text-orange-700",
                              daysColor === "amber" && "bg-amber-100 text-amber-700",
                              daysColor === "green" && "bg-green-100 text-green-700",
                              daysColor === "gray" && "bg-gray-100 text-gray-700"
                            )}
                          >
                            {daysRemaining <= 0 ? "Expired" : `${daysRemaining} days`}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <FieldRow label="Auth #" value={auth.auth_reference_number} copyable />
                        <FieldRow label="Billing Code" value={auth.billing_code} />
                        <FieldRow
                          label="Units"
                          value={
                            auth.units_requested
                              ? `${auth.units_used || 0} / ${auth.units_requested}`
                              : null
                          }
                        />
                        <FieldRow
                          label="Period"
                          value={
                            auth.start_date && auth.end_date
                              ? `${format(new Date(auth.start_date), "MM/dd/yy")} - ${format(
                                  new Date(auth.end_date),
                                  "MM/dd/yy"
                                )}`
                              : null
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Locations */}
        {client.locations.length > 0 && (
          <Collapsible
            open={openSections.locations}
            onOpenChange={() => toggleSection("locations")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 shrink-0" />
                Locations ({client.locations.length})
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {openSections.locations ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
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
                    <div key={location.id} className="rounded-lg border p-2 sm:p-3">
                      <p className="font-medium">
                        {location.label || "Location"}
                        {location.is_primary && (
                          <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                        )}
                      </p>
                      {address && (
                        <p className="text-sm text-muted-foreground mt-1">{address}</p>
                      )}
                      {location.notes && (
                        <p className="text-sm mt-2">{location.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tasks */}
        <Collapsible open={openSections.tasks} onOpenChange={() => toggleSection("tasks")}>
          <div className="flex items-center justify-between py-2">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium flex-1 touch-manipulation">
              <CheckSquare className="h-4 w-4 shrink-0" />
              Tasks ({client.tasks.filter((t) => t.status !== "completed").length} active)
              <span className="text-xs text-muted-foreground ml-auto mr-2 shrink-0">
                {openSections.tasks ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 sm:h-7 sm:w-auto sm:px-2 shrink-0"
              onClick={() => setTaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {client.tasks.filter((t) => t.status !== "completed").length > 0 ? (
                client.tasks
                  .filter((t) => t.status !== "completed")
                  .map((task) => (
                    <div key={task.id} className="rounded-lg border p-2 sm:p-3">
                      <div className="flex items-start gap-2">
                        <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due {format(new Date(task.due_date), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No active tasks
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Links */}
        {client.documents.length > 0 && (
          <Collapsible
            open={openSections.documents}
            onOpenChange={() => toggleSection("documents")}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 touch-manipulation">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4 shrink-0" />
                Links ({client.documents.length})
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {openSections.documents ? "Hide" : "Show"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {client.documents.map((doc) => (
                  <div key={doc.id} className="rounded-lg border p-2 sm:p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{doc.label || "Link"}</p>
                        {doc.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>
                        )}
                      </div>
                      {doc.url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Notes */}
        {client.notes && (
          <div className="rounded-lg border p-2 sm:p-3">
            <p className="text-sm font-medium mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground break-words">{client.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Added {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
            </span>
            <span>
              Updated {formatDistanceToNow(new Date(client.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Task form dialog */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        clientId={client.id}
        clientName={displayName}
      />
    </Card>
  );
}
