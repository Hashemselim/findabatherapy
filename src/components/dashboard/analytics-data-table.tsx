"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";
import type { TimeSeriesDataPoint } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface AnalyticsDataTableProps {
  data: TimeSeriesDataPoint[];
  dateLabel?: string;
  valueLabel?: string;
  className?: string;
}

type SortDirection = "asc" | "desc";

export function AnalyticsDataTable({
  data,
  dateLabel = "Date",
  valueLabel = "Count",
  className,
}: AnalyticsDataTableProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedData = [...data].sort((a, b) => {
    const comparison = a.date.localeCompare(b.date);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (data.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
        No data for this period
      </div>
    );
  }

  return (
    <DashboardTableCard className={cn("max-h-[300px] overflow-auto", className)}>
      <DashboardTable>
        <DashboardTableHeader className="sticky top-0 z-10">
          <DashboardTableRow>
            <DashboardTableHead className="px-3 py-2 font-medium normal-case tracking-normal">
              <button
                type="button"
                onClick={toggleSort}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                {dateLabel}
                {sortDirection === "asc" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </DashboardTableHead>
            <DashboardTableHead className="px-3 py-2 text-right font-medium normal-case tracking-normal">
              {valueLabel}
            </DashboardTableHead>
          </DashboardTableRow>
        </DashboardTableHeader>
        <DashboardTableBody>
          {sortedData.map((point) => (
            <DashboardTableRow key={point.date}>
              <DashboardTableCell className="px-3 py-2 text-foreground">{formatDate(point.date)}</DashboardTableCell>
              <DashboardTableCell className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                {point.value.toLocaleString()}
              </DashboardTableCell>
            </DashboardTableRow>
          ))}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardTableCard>
  );
}
