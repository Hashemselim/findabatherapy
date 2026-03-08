"use client";

import { MoreHorizontal, Pencil, Trash2, Phone, Mail, Copy, Check, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { calculateAge, getClientDisplayName } from "@/lib/validations/clients";
import type { ClientListItem } from "@/lib/actions/clients";

import { ClientStatusBadge } from "./client-status-badge";

interface ClientsTableProps {
  clients: ClientListItem[];
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
}

function ContactCell({
  name,
  phone,
  email
}: {
  name: string | null;
  phone: string | null;
  email: string | null;
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopy = async (value: string, type: "phone" | "email", e: React.MouseEvent) => {
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${phone}`;
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                    className="opacity-0 group-hover/btn:opacity-100 focus-visible:opacity-100 transition-opacity ml-0.5 p-0.5 hover:bg-muted rounded"
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
            </div>
          )}
          {email && (
            <div className="group/btn inline-flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `mailto:${email}`;
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                    className="opacity-0 group-hover/btn:opacity-100 focus-visible:opacity-100 transition-opacity ml-0.5 p-0.5 hover:bg-muted rounded"
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
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ClientsTable({
  clients,
  onEdit,
  onDelete,
}: ClientsTableProps) {
  const router = useRouter();

  const handleRowClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`);
  };

  if (clients.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
        <div className="rounded-full bg-muted/50 p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-medium text-foreground/80">No clients found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
          Add your first client to start tracking their care journey
        </p>
      </Card>
    );
  }

  return (
    <DashboardTableCard>
      <DashboardTable>
        <DashboardTableHeader>
          <DashboardTableRow>
            <DashboardTableHead className="px-5">
                Client
            </DashboardTableHead>
            <DashboardTableHead className="px-5">
                Status
            </DashboardTableHead>
            <DashboardTableHead className="hidden px-5 md:table-cell">
                Contact
            </DashboardTableHead>
            <DashboardTableHead className="hidden px-5 lg:table-cell">
                Insurance
            </DashboardTableHead>
            <DashboardTableHead className="hidden px-5 sm:table-cell">
                Added
            </DashboardTableHead>
            <DashboardTableHead className="w-[50px]" />
          </DashboardTableRow>
        </DashboardTableHeader>
        <DashboardTableBody>
            {clients.map((client, index) => {
              const age = client.child_date_of_birth
                ? calculateAge(client.child_date_of_birth)
                : null;

              return (
                <DashboardTableRow
                  key={client.id}
                  onClick={() => handleRowClick(client.id)}
                  className={cn(
                    "group cursor-pointer transition-all duration-150",
                    index !== clients.length - 1 && "border-b border-border/50"
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
                          <span className="text-xs text-muted-foreground mt-0.5">
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
                    />
                  </DashboardTableCell>
                  <DashboardTableCell className="hidden px-5 py-4 lg:table-cell">
                    {client.primary_insurance_name ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground/90">
                          {client.primary_insurance_name}
                        </span>
                        {client.primary_insurance_member_id && (
                          <span className="text-xs text-muted-foreground mt-0.5 font-mono">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </DashboardTableCell>
                </DashboardTableRow>
              );
            })}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardTableCard>
  );
}
