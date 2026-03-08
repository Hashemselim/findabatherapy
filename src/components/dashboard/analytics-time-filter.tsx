"use client";

import { DashboardFilterButton, DashboardFilterGroup } from "@/components/dashboard/ui";
import type { TimePeriod } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface AnalyticsTimeFilterProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

export function AnalyticsTimeFilter({ value, onChange, className }: AnalyticsTimeFilterProps) {
  return (
    <DashboardFilterGroup className={cn("inline-flex min-w-0", className)}>
      {PERIOD_OPTIONS.map((option) => (
        <DashboardFilterButton
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          active={value === option.value}
          className="h-8 px-3 text-sm"
        >
          {option.label}
        </DashboardFilterButton>
      ))}
    </DashboardFilterGroup>
  );
}
