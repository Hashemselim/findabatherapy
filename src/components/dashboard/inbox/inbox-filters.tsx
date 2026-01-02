"use client";

import { Mail, MailOpen, Reply, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalyticsLocationFilter, type LocationOption } from "@/components/dashboard/analytics-location-filter";
import type { InquiryStatus } from "@/lib/validations/contact";
import { cn } from "@/lib/utils";

export type InboxFilter = InquiryStatus | "all";

interface InboxFiltersProps {
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  unreadCount: number;
  readCount: number;
  repliedCount: number;
  totalCount: number;
  locations?: LocationOption[];
  selectedLocationIds?: string[];
  onLocationChange?: (ids: string[]) => void;
}

const filterConfig = [
  { key: "all" as const, label: "All", icon: Inbox, countKey: "totalCount" as const },
  { key: "unread" as const, label: "Unread", icon: Mail, countKey: "unreadCount" as const, activeColor: "text-[#5788FF]" },
  { key: "read" as const, label: "Read", icon: MailOpen, countKey: "readCount" as const },
  { key: "replied" as const, label: "Replied", icon: Reply, countKey: "repliedCount" as const, activeColor: "text-emerald-500" },
];

export function InboxFilters({
  filter,
  onFilterChange,
  unreadCount,
  readCount,
  repliedCount,
  totalCount,
  locations,
  selectedLocationIds,
  onLocationChange,
}: InboxFiltersProps) {
  const counts = { unreadCount, readCount, repliedCount, totalCount };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterConfig.map(({ key, label, icon: Icon, countKey, activeColor }) => {
        const isActive = filter === key;
        const count = counts[countKey];
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
            {label}
            <span className={cn(
              "ml-0.5 tabular-nums",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {count}
            </span>
          </Button>
        );
      })}

      {/* Location Filter */}
      {locations && locations.length > 1 && selectedLocationIds && onLocationChange && (
        <AnalyticsLocationFilter
          locations={locations}
          selectedIds={selectedLocationIds}
          onChange={onLocationChange}
        />
      )}
    </div>
  );
}
