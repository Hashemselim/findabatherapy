"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import type { ClientListItem, ClientCounts } from "@/lib/actions/clients";
import { deleteClient as deleteClientAction } from "@/lib/actions/clients";

import { ClientsFilters, type ClientFilterValue } from "./clients-filters";
import { ClientsTable } from "./clients-table";

interface ClientsListProps {
  initialClients: ClientListItem[];
  initialCounts: ClientCounts;
}

export function ClientsList({ initialClients, initialCounts }: ClientsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [clients, setClients] = useState<ClientListItem[]>(initialClients);
  const [counts, setCounts] = useState<ClientCounts>(initialCounts);
  const [filter, setFilter] = useState<ClientFilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Filter clients
  let filteredClients = clients;
  if (filter !== "all") {
    filteredClients = filteredClients.filter((c) => c.status === filter);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredClients = filteredClients.filter((c) => {
      const childName = [c.child_first_name, c.child_last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const parentName = (c.primary_parent_name || "").toLowerCase();
      const phone = (c.primary_parent_phone || "").toLowerCase();
      const email = (c.primary_parent_email || "").toLowerCase();
      const memberId = (c.primary_insurance_member_id || "").toLowerCase();

      return (
        childName.includes(query) ||
        parentName.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        memberId.includes(query)
      );
    });
  }

  // Handle edit
  const handleEdit = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/edit`);
  };

  // Handle delete
  const handleDelete = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    startTransition(async () => {
      const result = await deleteClientAction(clientToDelete);
      if (result.success) {
        // Remove from local state
        setClients((prev) => prev.filter((c) => c.id !== clientToDelete));
        // Update counts
        const deletedClient = clients.find((c) => c.id === clientToDelete);
        if (deletedClient) {
          setCounts((prev) => ({
            ...prev,
            total: prev.total - 1,
            [deletedClient.status]: prev[deletedClient.status as keyof Omit<ClientCounts, "total">] - 1,
          }));
        }
      }
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    });
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Filters */}
      <ClientsFilters
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Table - full width */}
      <div className="flex-1 min-h-0 overflow-auto">
        <ClientsTable
          clients={filteredClients}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
              All associated data (parents, insurance, authorizations, etc.) will be archived.
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
    </div>
  );
}
