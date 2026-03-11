"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  CLIENTS_VIEW_TABS,
  getTabCount,
  type ClientsViewTab,
} from "./clients-view";
import type { ClientCounts } from "@/lib/actions/clients";

interface ClientsFiltersProps {
  tab: ClientsViewTab;
  onTabChange: (tab: ClientsViewTab) => void;
  counts: ClientCounts;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ClientsFilters({
  tab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
}: ClientsFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [debouncedSearch] = useDebounce(localSearch, 300);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, searchQuery]);

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as ClientsViewTab)}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto min-w-max bg-card p-1 shadow-xs">
            {CLIENTS_VIEW_TABS.map((tabOption) => (
              <TabsTrigger
                key={tabOption.value}
                value={tabOption.value}
                className="gap-2 px-3 py-2 text-xs sm:text-sm"
              >
                <span>{tabOption.label}</span>
                <span className="tabular-nums text-[11px] text-muted-foreground data-[state=active]:text-foreground">
                  {getTabCount(counts, tabOption.value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-10 pl-9 pr-9 text-sm"
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
