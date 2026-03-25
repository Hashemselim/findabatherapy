"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronRight,
  Copy,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/utils";
import { calculateAge, getClientDisplayName, type ClientStatus } from "@/lib/validations/clients";

import { ClientStatusBadge } from "./client-status-badge";
import type { ClientStatusGroup, ClientsSortDirection, ClientsSortKey } from "./clients-view";

interface ClientsTableProps {
  groups: ClientStatusGroup[];
  collapsedGroups: Record<ClientStatus, boolean>;
  onToggleGroup: (status: ClientStatus) => void;
  sortKey: ClientsSortKey;
  sortDirection: ClientsSortDirection;
  onSortChange: (sortKey: ClientsSortKey) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  emptyStateTitle: string;
  emptyStateDescription: string;
  previewMode?: boolean;
}

function ContactCell({
  name,
  phone,
  email,
  interactive = true,
}: {
  name: string | null;
  phone: string | null;
  email: string | null;
  interactive?: boolean;
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopy = async (value: string, type: "phone" | "email", e: MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    if (type === "phone") {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1500);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 1500);
    }
  };

  if (!name) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground/90">{name}</span>
        <div className="flex items-center gap-2">
          {phone && (
            <div className="group/btn inline-flex items-center gap-1">
              {interactive ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${phone}`;
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        <span className="tabular-nums">{phone}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Click to call
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(phone, "phone", e)}
                        className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover/btn:opacity-100 hover:bg-muted focus-visible:opacity-100"
                        aria-label="Copy phone number"
                      >
                        {copiedPhone ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Copy phone
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="tabular-nums">{phone}</span>
                </span>
              )}
            </div>
          )}
          {email && (
            <div className="group/btn inline-flex items-center gap-1">
              {interactive ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `mailto:${email}`;
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="max-w-[140px] truncate">{email}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Click to email
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(email, "email", e)}
                        className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover/btn:opacity-100 hover:bg-muted focus-visible:opacity-100"
                        aria-label="Copy email"
                      >
                        {copiedEmail ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Copy email
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="max-w-[140px] truncate">{email}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ClientsTable({
  groups,
  collapsedGroups,
  onToggleGroup,
  sortKey,
  sortDirection,
  onSortChange,
  onEdit,
  onDelete,
  emptyStateTitle,
  emptyStateDescription,
  previewMode = false,
}: ClientsTableProps) {
  const router = useRouter();

  const handleRowClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`);
  };

  if (groups.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed px-8 py-16 text-center">
        <div className="mb-4 rounded-full bg-muted/50 p-4">
          <Users className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-medium text-foreground/80">{emptyStateTitle}</h3>
        <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">{emptyStateDescription}</p>
      </Card>
    );
  }

  return (
    <DashboardTableCard>
      <DashboardTable>
        <DashboardTableHeader>
          <DashboardTableRow>
            <SortableHead
              label="Client"
              sortKey="client"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              className="px-5"
            />
            <SortableHead
              label="Status"
              sortKey="status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              className="px-5"
            />
            <SortableHead
              label="Contact"
              sortKey="contact"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              className="hidden px-5 md:table-cell"
            />
            <SortableHead
              label="Insurance"
              sortKey="insurance"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              className="hidden px-5 lg:table-cell"
            />
            <SortableHead
              label="Added"
              sortKey="added"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              className="hidden px-5 sm:table-cell"
            />
            <DashboardTableHead className="w-[50px]" />
          </DashboardTableRow>
        </DashboardTableHeader>
        <DashboardTableBody>
          {groups.map((group) => {
            const isCollapsed = collapsedGroups[group.status];

            return (
              <Fragment key={group.status}>
                <DashboardTableRow
                  className="border-b border-border/60 bg-muted/20 hover:bg-muted/20"
                >
                  <DashboardTableCell colSpan={6} className="p-0">
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.status)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            !isCollapsed && "rotate-90"
                          )}
                        />
                        <span className="text-sm font-semibold text-foreground">{group.label}</span>
                        <DashboardStatusBadge tone="default" className="text-[11px]">
                          {group.count}
                        </DashboardStatusBadge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isCollapsed ? "Show" : "Hide"}
                      </span>
                    </button>
                  </DashboardTableCell>
                </DashboardTableRow>
                {!isCollapsed &&
                  group.clients.map((client, index) => {
                    const age = client.child_date_of_birth
                      ? calculateAge(client.child_date_of_birth)
                      : null;

                    return (
                      <DashboardTableRow
                        key={client.id}
                        onClick={() => handleRowClick(client.id)}
                        className={cn(
                          "group cursor-pointer transition-all duration-150",
                          index !== group.clients.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <DashboardTableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {getClientDisplayName({
                                  child_first_name: client.child_first_name || undefined,
                                  child_last_name: client.child_last_name || undefined,
                                })}
                              </span>
                              {age !== null && (
                                <span className="mt-0.5 text-xs text-muted-foreground">
                                  {age} {age === 1 ? "year" : "years"} old
                                </span>
                              )}
                            </div>
                          </div>
                        </DashboardTableCell>
                        <DashboardTableCell className="px-5 py-4">
                          <ClientStatusBadge status={client.status} />
                        </DashboardTableCell>
                        <DashboardTableCell className="hidden px-5 py-4 md:table-cell">
                          <ContactCell
                            name={client.primary_parent_name}
                            phone={client.primary_parent_phone}
                            email={client.primary_parent_email}
                            interactive={!previewMode}
                          />
                        </DashboardTableCell>
                        <DashboardTableCell className="hidden px-5 py-4 lg:table-cell">
                          {client.primary_insurance_name ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground/90">
                                {client.primary_insurance_name}
                              </span>
                              {client.primary_insurance_member_id && (
                                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {client.primary_insurance_member_id}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell className="hidden px-5 py-4 sm:table-cell">
                          <RelativeTime date={client.created_at} className="text-sm text-muted-foreground" />
                        </DashboardTableCell>
                        <DashboardTableCell className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {!previewMode && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px]">
                                  {onEdit && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(client.id);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {onDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDelete(client.id);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                          </div>
                        </DashboardTableCell>
                      </DashboardTableRow>
                    );
                  })}
              </Fragment>
            );
          })}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardTableCard>
  );
}

function SortableHead({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: ClientsSortKey;
  activeSortKey: ClientsSortKey;
  sortDirection: ClientsSortDirection;
  onSortChange: (sortKey: ClientsSortKey) => void;
  className?: string;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <DashboardTableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className="inline-flex items-center gap-1.5 text-left"
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
        )}
      </button>
    </DashboardTableHead>
  );
}
