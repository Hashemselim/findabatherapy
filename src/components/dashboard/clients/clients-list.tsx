"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import type { ClientCounts, ClientListItem } from "@/lib/actions/clients";
import { deleteClient as deleteClientAction } from "@/lib/actions/clients";
import type { ClientStatus } from "@/lib/validations/clients";

import { ClientsFilters } from "./clients-filters";
import { ClientsTable } from "./clients-table";
import {
  buildClientStatusGroups,
  CLIENTS_VIEW_STORAGE_KEY,
  filterClientsBySearch,
  filterClientsByTab,
  getDefaultCollapsedGroups,
  getEmptyStateCopy,
  getTabForLegacyStatus,
  parseClientsSortDirection,
  parseClientsSortKey,
  parseClientsViewTab,
  type ClientsSortDirection,
  type ClientsSortKey,
  type ClientsViewTab,
} from "./clients-view";

interface ClientsListProps {
  initialClients: ClientListItem[];
  initialCounts: ClientCounts;
  previewMode?: boolean;
}

function loadCollapsedGroups(): {
  hasSavedState: boolean;
  state: Record<ClientStatus, boolean>;
} {
  if (typeof window === "undefined") {
    return { hasSavedState: false, state: getDefaultCollapsedGroups() };
  }

  try {
    const savedState = window.localStorage.getItem(CLIENTS_VIEW_STORAGE_KEY);
    if (!savedState) {
      return { hasSavedState: false, state: getDefaultCollapsedGroups() };
    }

    return {
      hasSavedState: true,
      state: {
        ...getDefaultCollapsedGroups(),
        ...(JSON.parse(savedState) as Partial<Record<ClientStatus, boolean>>),
      },
    };
  } catch {
    return { hasSavedState: false, state: getDefaultCollapsedGroups() };
  }
}

function saveCollapsedGroups(state: Record<ClientStatus, boolean>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CLIENTS_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors so the page still works.
  }
}

export function ClientsList({
  initialClients,
  initialCounts,
  previewMode = false,
}: ClientsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [clients, setClients] = useState<ClientListItem[]>(initialClients);
  const [counts, setCounts] = useState<ClientCounts>(initialCounts);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<ClientStatus, boolean>>(
    getDefaultCollapsedGroups
  );
  const [hasSavedCollapseState, setHasSavedCollapseState] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadedState = loadCollapsedGroups();
    setCollapsedGroups(loadedState.state);
    setHasSavedCollapseState(loadedState.hasSavedState);
  }, []);

  const legacyStatus = searchParams.get("status");
  const tab = parseClientsViewTab(searchParams.get("tab") ?? getTabForLegacyStatus(legacyStatus));
  const sortKey = parseClientsSortKey(searchParams.get("sort"));
  const sortDirection = parseClientsSortDirection(searchParams.get("dir"));
  const searchQuery = searchParams.get("q") || "";

  const setQueryState = (
    updates: Partial<Record<"tab" | "sort" | "dir" | "q", string | null>>
  ) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("status");

    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        (key === "tab" && value === "all") ||
        (key === "sort" && value === "status") ||
        (key === "dir" && value === "asc")
      ) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleTabChange = (nextTab: ClientsViewTab) => {
    setQueryState({ tab: nextTab });
  };

  const handleSearchChange = (query: string) => {
    setQueryState({ q: query || null });
  };

  const handleSortChange = (nextSortKey: ClientsSortKey) => {
    const nextDirection: ClientsSortDirection =
      sortKey === nextSortKey && sortDirection === "asc" ? "desc" : "asc";

    setQueryState({
      sort: nextSortKey,
      dir: nextDirection,
    });
  };

  const visibleClients = useMemo(() => {
    const clientsForTab = filterClientsByTab(clients, tab);
    return filterClientsBySearch(clientsForTab, searchQuery);
  }, [clients, searchQuery, tab]);

  const groups = useMemo(
    () =>
      buildClientStatusGroups({
        clients: visibleClients,
        tab,
        sortKey,
        direction: sortDirection,
      }),
    [sortDirection, sortKey, tab, visibleClients]
  );

  const emptyState = getEmptyStateCopy(tab, searchQuery);
  const effectiveCollapsedGroups = useMemo(() => {
    if (hasSavedCollapseState || tab === "all" || tab === "leads") {
      return collapsedGroups;
    }

    return {
      ...collapsedGroups,
      discharged: false,
    };
  }, [collapsedGroups, hasSavedCollapseState, tab]);

  const toggleGroup = (status: ClientStatus) => {
    setCollapsedGroups((prev) => {
      const nextState = { ...prev, [status]: !prev[status] };
      saveCollapsedGroups(nextState);
      setHasSavedCollapseState(true);
      return nextState;
    });
  };

  const handleEdit = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/edit`);
  };

  const handleDelete = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    startTransition(async () => {
      const result = await deleteClientAction(clientToDelete);
      if (result.success) {
        const deletedClient = clients.find((client) => client.id === clientToDelete);

        setClients((prev) => prev.filter((client) => client.id !== clientToDelete));

        if (deletedClient) {
          setCounts((prev) => ({
            ...prev,
            total: prev.total - 1,
            [deletedClient.status]: prev[deletedClient.status] - 1,
          }));
        }
      }

      setDeleteDialogOpen(false);
      setClientToDelete(null);
    });
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <ClientsFilters
        tab={tab}
        onTabChange={handleTabChange}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <ClientsTable
          groups={groups}
          collapsedGroups={effectiveCollapsedGroups}
          onToggleGroup={toggleGroup}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onEdit={previewMode ? undefined : handleEdit}
          onDelete={previewMode ? undefined : handleDelete}
          emptyStateTitle={emptyState.title}
          emptyStateDescription={emptyState.description}
          previewMode={previewMode}
        />
      </div>

      <AlertDialog open={!previewMode && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
