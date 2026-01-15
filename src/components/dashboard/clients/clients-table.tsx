"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Eye, Pencil, Trash2, ListTodo } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { calculateAge, getClientDisplayName } from "@/lib/validations/clients";
import type { ClientListItem } from "@/lib/actions/clients";

import { ClientStatusBadge } from "./client-status-badge";
import { ClientQuickActions } from "./client-quick-actions";

interface ClientsTableProps {
  clients: ClientListItem[];
  selectedId: string | null;
  onSelect: (client: ClientListItem) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onAddTask?: (clientId: string, clientName: string) => void;
}

export function ClientsTable({
  clients,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddTask,
}: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-3">
          <span role="img" aria-label="No clients">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" x2="19" y1="8" y2="14" />
              <line x1="22" x2="16" y1="11" y2="11" />
            </svg>
          </span>
        </div>
        <h3 className="text-lg font-medium text-muted-foreground">No clients found</h3>
        <p className="text-sm text-muted-foreground/80 mt-1">
          Add your first client to get started
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                Parent
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider lg:table-cell">
                Insurance
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider sm:table-cell">
                Added
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => {
              const isSelected = client.id === selectedId;
              const age = client.child_date_of_birth
                ? calculateAge(client.child_date_of_birth)
                : null;

              return (
                <tr
                  key={client.id}
                  onClick={() => onSelect(client)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {getClientDisplayName({
                          child_first_name: client.child_first_name || undefined,
                          child_last_name: client.child_last_name || undefined,
                        })}
                      </span>
                      {age !== null && (
                        <span className="text-xs text-muted-foreground">
                          {age} years old
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-col">
                      {client.primary_parent_name ? (
                        <>
                          <span className="text-sm">{client.primary_parent_name}</span>
                          <ClientQuickActions
                            phone={client.primary_parent_phone}
                            email={client.primary_parent_email}
                            className="mt-1"
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-col">
                      {client.primary_insurance_name ? (
                        <>
                          <span className="text-sm">{client.primary_insurance_name}</span>
                          {client.primary_insurance_member_id && (
                            <span className="text-xs text-muted-foreground">
                              ID: {client.primary_insurance_member_id}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelect(client)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(client.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onAddTask && (
                          <DropdownMenuItem
                            onClick={() =>
                              onAddTask(
                                client.id,
                                getClientDisplayName({
                                  child_first_name: client.child_first_name || undefined,
                                  child_last_name: client.child_last_name || undefined,
                                })
                              )
                            }
                          >
                            <ListTodo className="mr-2 h-4 w-4" />
                            Add Task
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(client.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
