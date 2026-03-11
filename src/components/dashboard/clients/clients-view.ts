import type { ClientCounts, ClientListItem } from "@/lib/actions/clients";
import {
  CLIENT_STATUS_OPTIONS,
  getClientDisplayName,
  type ClientStatus,
} from "@/lib/validations/clients";

export type ClientsViewTab =
  | "all"
  | "waitlist"
  | "in-progress"
  | "clients"
  | "discharged";

export type ClientsSortKey = "status" | "client" | "contact" | "insurance" | "added";
export type ClientsSortDirection = "asc" | "desc";

export interface ClientStatusGroup {
  status: ClientStatus;
  label: string;
  clients: ClientListItem[];
  count: number;
}

export const CLIENTS_VIEW_STORAGE_KEY = "dashboard_clients_collapsed_groups_v1";

export const CLIENT_STATUS_ORDER: ClientStatus[] = [
  "inquiry",
  "intake_pending",
  "waitlist",
  "assessment",
  "authorization",
  "active",
  "on_hold",
  "discharged",
];

const STATUS_LABELS = Object.fromEntries(
  CLIENT_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<ClientStatus, string>;

export const CLIENTS_VIEW_TABS: Array<{ value: ClientsViewTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "waitlist", label: "Waitlist" },
  { value: "in-progress", label: "In Progress" },
  { value: "clients", label: "Clients" },
  { value: "discharged", label: "Discharged" },
];

const CLIENTS_TAB_STATUS_MAP: Record<ClientsViewTab, ClientStatus[]> = {
  all: CLIENT_STATUS_ORDER,
  waitlist: ["waitlist"],
  "in-progress": ["assessment", "authorization"],
  clients: ["active", "on_hold"],
  discharged: ["discharged"],
};

export function parseClientsViewTab(value: string | null | undefined): ClientsViewTab {
  if (!value) return "all";
  return CLIENTS_VIEW_TABS.some((tab) => tab.value === value)
    ? (value as ClientsViewTab)
    : "all";
}

export function parseClientsSortKey(value: string | null | undefined): ClientsSortKey {
  switch (value) {
    case "client":
    case "contact":
    case "insurance":
    case "added":
    case "status":
      return value;
    default:
      return "status";
  }
}

export function parseClientsSortDirection(
  value: string | null | undefined
): ClientsSortDirection {
  return value === "desc" ? "desc" : "asc";
}

export function getStatusesForTab(tab: ClientsViewTab): ClientStatus[] {
  return CLIENTS_TAB_STATUS_MAP[tab];
}

export function getStatusLabel(status: ClientStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getTabCount(counts: ClientCounts, tab: ClientsViewTab): number {
  if (tab === "all") {
    return counts.total;
  }

  return getStatusesForTab(tab).reduce((sum, status) => sum + counts[status], 0);
}

export function filterClientsByTab(
  clients: ClientListItem[],
  tab: ClientsViewTab
): ClientListItem[] {
  if (tab === "all") {
    return clients;
  }

  const allowedStatuses = new Set(getStatusesForTab(tab));
  return clients.filter((client) => allowedStatuses.has(client.status));
}

export function filterClientsBySearch(
  clients: ClientListItem[],
  query: string
): ClientListItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return clients;
  }

  return clients.filter((client) => {
    const childName = [client.child_first_name, client.child_last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      childName.includes(normalizedQuery) ||
      (client.primary_parent_name || "").toLowerCase().includes(normalizedQuery) ||
      (client.primary_parent_phone || "").toLowerCase().includes(normalizedQuery) ||
      (client.primary_parent_email || "").toLowerCase().includes(normalizedQuery) ||
      (client.primary_insurance_name || "").toLowerCase().includes(normalizedQuery) ||
      (client.primary_insurance_member_id || "").toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getDefaultCollapsedGroups(): Record<ClientStatus, boolean> {
  return {
    inquiry: false,
    intake_pending: false,
    waitlist: false,
    assessment: false,
    authorization: false,
    active: false,
    on_hold: false,
    discharged: true,
  };
}

export function getEmptyStateCopy(
  tab: ClientsViewTab,
  query: string
): { title: string; description: string } {
  if (query.trim()) {
    return {
      title: "No matching clients",
      description: "Try adjusting your search or switching to another view.",
    };
  }

  switch (tab) {
    case "waitlist":
      return {
        title: "No waitlisted clients",
        description: "Clients marked as waitlist will appear here.",
      };
    case "in-progress":
      return {
        title: "No in-progress clients",
        description: "Assessment and authorization work will appear here.",
      };
    case "clients":
      return {
        title: "No active clients",
        description: "Active and on-hold clients will appear here.",
      };
    case "discharged":
      return {
        title: "No discharged clients",
        description: "Discharged clients will appear here once services end.",
      };
    case "all":
    default:
      return {
        title: "No clients found",
        description: "Add your first client to start tracking their care journey.",
      };
  }
}

export function buildClientStatusGroups({
  clients,
  tab,
  sortKey,
  direction,
}: {
  clients: ClientListItem[];
  tab: ClientsViewTab;
  sortKey: ClientsSortKey;
  direction: ClientsSortDirection;
}): ClientStatusGroup[] {
  const originalOrder = new Map(clients.map((client, index) => [client.id, index]));
  const visibleStatuses = getStatusesForTab(tab);
  const groupOrder =
    sortKey === "status" && direction === "desc"
      ? [...visibleStatuses].reverse()
      : visibleStatuses;

  return groupOrder
    .map((status) => {
      const groupClients = clients
        .filter((client) => client.status === status)
        .sort((left, right) =>
          compareClients(left, right, sortKey, direction, originalOrder)
        );

      return {
        status,
        label: getStatusLabel(status),
        clients: groupClients,
        count: groupClients.length,
      };
    })
    .filter((group) => group.count > 0);
}

function compareClients(
  left: ClientListItem,
  right: ClientListItem,
  sortKey: ClientsSortKey,
  direction: ClientsSortDirection,
  originalOrder: Map<string, number>
): number {
  if (sortKey === "status") {
    return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
  }

  const sortFactor = direction === "desc" ? -1 : 1;
  const leftValue = getSortValue(left, sortKey);
  const rightValue = getSortValue(right, sortKey);

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    if (leftValue === rightValue) {
      return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    }
    return (leftValue - rightValue) * sortFactor;
  }

  const leftString = String(leftValue);
  const rightString = String(rightValue);

  const comparison = leftString.localeCompare(rightString, undefined, {
    sensitivity: "base",
  });

  if (comparison === 0) {
    return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
  }

  return comparison * sortFactor;
}

function getSortValue(client: ClientListItem, sortKey: ClientsSortKey): number | string {
  switch (sortKey) {
    case "client":
      return getClientDisplayName({
        child_first_name: client.child_first_name || undefined,
        child_last_name: client.child_last_name || undefined,
      });
    case "contact":
      return client.primary_parent_name || "";
    case "insurance":
      return client.primary_insurance_name || "";
    case "added":
      return new Date(client.created_at).getTime();
    case "status":
    default:
      return CLIENT_STATUS_ORDER.indexOf(client.status);
  }
}
