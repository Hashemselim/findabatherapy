"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TimeSeriesDataPoint } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface AnalyticsChartProps {
  views: TimeSeriesDataPoint[];
  impressions: TimeSeriesDataPoint[];
  clicks: TimeSeriesDataPoint[];
}

type MetricKey = "views" | "impressions" | "clicks";

const METRIC_CONFIG: Record<MetricKey, { label: string; color: string }> = {
  views: { label: "Page Views", color: "bg-primary" },
  impressions: { label: "Search Impressions", color: "bg-blue-500" },
  clicks: { label: "Search Clicks", color: "bg-emerald-500" },
};

export function AnalyticsChart({ views, impressions, clicks }: AnalyticsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("views");

  const data: Record<MetricKey, TimeSeriesDataPoint[]> = {
    views,
    impressions,
    clicks,
  };

  const currentData = data[selectedMetric];
  const maxValue = Math.max(...currentData.map((d) => d.value), 1);
  const total = currentData.reduce((sum, d) => sum + d.value, 0);

  // Take last 14 days for display
  const displayData = currentData.slice(-14);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Performance Over Time</CardTitle>
            <CardDescription>Last 14 days of activity</CardDescription>
          </div>
          <div className="flex gap-2">
            {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
              <Button
                key={key}
                variant={selectedMetric === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(key)}
              >
                {METRIC_CONFIG[key].label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{total.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">
            total {METRIC_CONFIG[selectedMetric].label.toLowerCase()}
          </span>
        </div>

        {/* Chart */}
        <div className="flex h-48 items-end gap-1">
          {displayData.map((point, index) => {
            const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            const date = new Date(point.date);
            const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

            return (
              <div
                key={point.date}
                className="group relative flex flex-1 flex-col items-center"
              >
                {/* Bar */}
                <div className="relative w-full flex-1">
                  <div
                    className={cn(
                      "absolute bottom-0 w-full rounded-t transition-all",
                      METRIC_CONFIG[selectedMetric].color,
                      "opacity-80 group-hover:opacity-100"
                    )}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>

                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {point.value}
                </div>

                {/* Day label (show every other day) */}
                {index % 2 === 0 && (
                  <span className="mt-2 text-xs text-muted-foreground">{dayLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="mt-2 h-4 w-32 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 h-9 w-32 rounded bg-muted" />
        <div className="flex h-48 items-end gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-muted"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
