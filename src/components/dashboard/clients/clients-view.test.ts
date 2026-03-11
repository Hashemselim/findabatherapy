import { describe, expect, it } from "vitest";

import type { ClientCounts, ClientListItem } from "@/lib/actions/clients";

import {
  buildClientStatusGroups,
  filterClientsBySearch,
  filterClientsByTab,
  getTabCount,
  parseClientsSortDirection,
  parseClientsSortKey,
  parseClientsViewTab,
} from "./clients-view";

const clients: ClientListItem[] = [
  {
    id: "1",
    status: "inquiry",
    child_first_name: "Harper",
    child_last_name: "Davis",
    child_date_of_birth: null,
    created_at: "2026-03-10T10:00:00.000Z",
    updated_at: "2026-03-10T10:00:00.000Z",
    primary_parent_name: "Samantha Davis",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: null,
  },
  {
    id: "2",
    status: "intake_pending",
    child_first_name: "Lucas",
    child_last_name: "Miller",
    child_date_of_birth: null,
    created_at: "2026-03-08T10:00:00.000Z",
    updated_at: "2026-03-08T10:00:00.000Z",
    primary_parent_name: "Ana Miller",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "Blue Shield",
    primary_insurance_member_id: null,
  },
  {
    id: "3",
    status: "authorization",
    child_first_name: "Sophia",
    child_last_name: "Kim",
    child_date_of_birth: null,
    created_at: "2026-03-09T10:00:00.000Z",
    updated_at: "2026-03-09T10:00:00.000Z",
    primary_parent_name: "Jisoo Kim",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "Cigna",
    primary_insurance_member_id: null,
  },
  {
    id: "4",
    status: "assessment",
    child_first_name: "Noah",
    child_last_name: "Rivera",
    child_date_of_birth: null,
    created_at: "2026-03-07T10:00:00.000Z",
    updated_at: "2026-03-07T10:00:00.000Z",
    primary_parent_name: "Maria Rivera",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "United",
    primary_insurance_member_id: null,
  },
  {
    id: "5",
    status: "active",
    child_first_name: "Ethan",
    child_last_name: "Williams",
    child_date_of_birth: null,
    created_at: "2026-03-06T10:00:00.000Z",
    updated_at: "2026-03-06T10:00:00.000Z",
    primary_parent_name: "Jessica Williams",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: null,
  },
  {
    id: "6",
    status: "discharged",
    child_first_name: "Emma",
    child_last_name: "Johnson",
    child_date_of_birth: null,
    created_at: "2026-02-10T10:00:00.000Z",
    updated_at: "2026-02-10T10:00:00.000Z",
    primary_parent_name: "David Johnson",
    primary_parent_phone: null,
    primary_parent_email: null,
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: null,
  },
];

const counts: ClientCounts = {
  total: 6,
  inquiry: 1,
  intake_pending: 1,
  waitlist: 0,
  assessment: 1,
  authorization: 1,
  active: 1,
  on_hold: 0,
  discharged: 1,
};

describe("clients-view helpers", () => {
  it("parses tabs and sort params with safe defaults", () => {
    expect(parseClientsViewTab(null)).toBe("all");
    expect(parseClientsViewTab("clients")).toBe("clients");
    expect(parseClientsViewTab("bad-value")).toBe("all");

    expect(parseClientsSortKey(undefined)).toBe("status");
    expect(parseClientsSortKey("added")).toBe("added");
    expect(parseClientsSortDirection("desc")).toBe("desc");
    expect(parseClientsSortDirection("weird")).toBe("asc");
  });

  it("maps grouped tab counts and filters correctly", () => {
    expect(getTabCount(counts, "in-progress")).toBe(2);
    expect(getTabCount(counts, "clients")).toBe(1);

    expect(filterClientsByTab(clients, "in-progress").map((client) => client.id)).toEqual(["3", "4"]);
    expect(filterClientsByTab(clients, "waitlist")).toEqual([]);
    expect(filterClientsBySearch(clients, "kim").map((client) => client.id)).toEqual(["3"]);
  });

  it("builds lifecycle groups and sorts rows within each group", () => {
    const groups = buildClientStatusGroups({
      clients,
      tab: "all",
      sortKey: "client",
      direction: "asc",
    });

    expect(groups.map((group) => group.status)).toEqual([
      "inquiry",
      "intake_pending",
      "assessment",
      "authorization",
      "active",
      "discharged",
    ]);

    const inProgressGroups = buildClientStatusGroups({
      clients,
      tab: "in-progress",
      sortKey: "added",
      direction: "desc",
    });

    expect(inProgressGroups.map((group) => group.status)).toEqual([
      "assessment",
      "authorization",
    ]);
    expect(inProgressGroups[0].clients[0].id).toBe("4");
    expect(inProgressGroups[1].clients[0].id).toBe("3");
  });
});
