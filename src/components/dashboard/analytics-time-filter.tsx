"use client";

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
    <div className={cn("inline-flex rounded-lg border border-border bg-muted/50 p-1", className)}>
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
