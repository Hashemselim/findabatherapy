"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
import type { ClientListItem, ClientDetail, ClientCounts } from "@/lib/actions/clients";
import {
  getClientById,
  deleteClient as deleteClientAction,
} from "@/lib/actions/clients";
import { TaskFormDialog } from "@/components/dashboard/tasks";

import { ClientsFilters, type ClientFilterValue } from "./clients-filters";
import { ClientsTable } from "./clients-table";
import { ClientDetailPanel } from "./client-detail-panel";

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
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskClientId, setTaskClientId] = useState<string | null>(null);
  const [taskClientName, setTaskClientName] = useState<string>("");

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

  // Handle client selection
  const handleSelectClient = async (client: ClientListItem) => {
    setSelectedClientId(client.id);
    setMobileShowDetail(true);

    const result = await getClientById(client.id);
    if (result.success && result.data) {
      setSelectedClient(result.data);
    }
  };

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
        // Clear selection if deleted client was selected
        if (selectedClientId === clientToDelete) {
          setSelectedClient(null);
          setSelectedClientId(null);
          setMobileShowDetail(false);
        }
      }
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    });
  };

  // Handle back (mobile)
  const handleBackToList = () => {
    setMobileShowDetail(false);
  };

  // Handle add task
  const handleAddTask = (clientId: string, clientName: string) => {
    setTaskClientId(clientId);
    setTaskClientName(clientName);
    setTaskDialogOpen(true);
  };

  return (
    <>
      {/* Mobile layout */}
      <div className="flex flex-col gap-4 lg:hidden">
        {/* Header with filters - hide when viewing detail */}
        {!mobileShowDetail && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">Clients</h1>
              <Button asChild>
                <Link href="/dashboard/clients/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Link>
              </Button>
            </div>
            <ClientsFilters
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </>
        )}

        {/* Show either list or detail */}
        {!mobileShowDetail ? (
          <ClientsTable
            clients={filteredClients}
            selectedId={selectedClientId}
            onSelect={handleSelectClient}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddTask={handleAddTask}
          />
        ) : (
          <ClientDetailPanel
            client={selectedClient}
            onBack={handleBackToList}
            showBackButton
          />
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <ClientsFilters
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Two-panel layout */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left: Table */}
          <div className="w-2/3 overflow-auto">
            <ClientsTable
              clients={filteredClients}
              selectedId={selectedClientId}
              onSelect={handleSelectClient}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddTask={handleAddTask}
            />
          </div>

          {/* Right: Detail panel */}
          <div className="w-1/3 min-w-[350px]">
            <ClientDetailPanel client={selectedClient} />
          </div>
        </div>
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

      {/* Task form dialog */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        clientId={taskClientId}
        clientName={taskClientName}
      />
    </>
  );
}
