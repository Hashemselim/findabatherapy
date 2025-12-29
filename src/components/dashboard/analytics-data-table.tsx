"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

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
    <div className={cn("max-h-[300px] overflow-auto rounded-md border", className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
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
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              {valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((point) => (
            <tr key={point.date} className="border-t border-border/50">
              <td className="px-3 py-2 text-foreground">{formatDate(point.date)}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                {point.value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
