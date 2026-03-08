"use client";

import { Mail, MailOpen, Reply, Inbox } from "lucide-react";

import { DashboardFilterButton, DashboardFilterGroup } from "@/components/dashboard/ui";
import { AnalyticsLocationFilter, type LocationOption } from "@/components/dashboard/analytics-location-filter";
import type { InquiryStatus } from "@/lib/validations/contact";

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
  { key: "unread" as const, label: "Unread", icon: Mail, countKey: "unreadCount" as const },
  { key: "read" as const, label: "Read", icon: MailOpen, countKey: "readCount" as const },
  { key: "replied" as const, label: "Replied", icon: Reply, countKey: "repliedCount" as const },
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
      <DashboardFilterGroup className="min-w-0">
        {filterConfig.map(({ key, label, icon: Icon, countKey }) => {
          const isActive = filter === key;
          const count = counts[countKey];

          return (
            <DashboardFilterButton
              key={key}
              onClick={() => onFilterChange(key)}
              active={isActive}
              className="h-9"
              icon={<Icon className="h-3.5 w-3.5" />}
              count={count}
            >
              {label}
            </DashboardFilterButton>
          );
        })}
      </DashboardFilterGroup>

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
