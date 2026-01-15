"use client";

import {
  Users,
  UserPlus,
  Clock,
  ClipboardList,
  UserCheck,
  Pause,
  UserX,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/validations/clients";
import type { ClientCounts } from "@/lib/actions/clients";

export type ClientFilterValue = ClientStatus | "all";

interface ClientsFiltersProps {
  filter: ClientFilterValue;
  onFilterChange: (filter: ClientFilterValue) => void;
  counts: ClientCounts;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const filterConfig: {
  key: ClientFilterValue;
  label: string;
  icon: typeof Users;
  countKey: keyof ClientCounts;
  activeColor?: string;
}[] = [
  { key: "all", label: "All", icon: Users, countKey: "total" },
  { key: "inquiry", label: "Inquiry", icon: UserPlus, countKey: "inquiry", activeColor: "text-blue-500" },
  { key: "intake_pending", label: "Intake", icon: ClipboardList, countKey: "intake_pending", activeColor: "text-purple-500" },
  { key: "waitlist", label: "Waitlist", icon: Clock, countKey: "waitlist", activeColor: "text-amber-500" },
  { key: "assessment", label: "Assessment", icon: ClipboardList, countKey: "assessment", activeColor: "text-orange-500" },
  { key: "active", label: "Active", icon: UserCheck, countKey: "active", activeColor: "text-green-500" },
  { key: "on_hold", label: "On Hold", icon: Pause, countKey: "on_hold", activeColor: "text-yellow-500" },
  { key: "discharged", label: "Discharged", icon: UserX, countKey: "discharged", activeColor: "text-gray-500" },
];

export function ClientsFilters({
  filter,
  onFilterChange,
  counts,
  searchQuery,
  onSearchChange,
}: ClientsFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [debouncedSearch] = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, searchQuery, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filterConfig.map(({ key, label, icon: Icon, countKey, activeColor }) => {
          const isActive = filter === key;
          const count = counts[countKey];

          // Hide filters with 0 count (except "all")
          if (key !== "all" && count === 0) return null;

          return (
            <Button
              key={key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(key)}
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs",
                !isActive && activeColor
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className={cn(
                "tabular-nums",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
