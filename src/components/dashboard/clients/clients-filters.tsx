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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
        <Tabs value={tab} onValueChange={(value) => onTabChange(value as ClientsViewTab)}>
          <TabsList className="inline-flex min-h-11 w-auto min-w-full items-center rounded-xl border border-border/60 bg-card p-1 shadow-xs sm:min-w-0">
            {CLIENTS_VIEW_TABS.map((tabOption) => (
              <TabsTrigger
                key={tabOption.value}
                value={tabOption.value}
                className="flex h-9 flex-1 items-center rounded-lg border border-transparent px-4 text-xs font-medium leading-none text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs sm:flex-none"
              >
                {tabOption.label} ({getTabCount(counts, tabOption.value)})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="relative w-full sm:w-64 shrink-0">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-10 sm:h-8 pl-8 pr-8 text-sm"
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 sm:h-6 sm:w-6 -translate-y-1/2"
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
          >
            <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
