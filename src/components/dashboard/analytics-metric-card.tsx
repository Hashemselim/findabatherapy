"use client";

import { useState } from "react";
import { BarChart3, Table2, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsDataTable } from "./analytics-data-table";
import type { TimeSeriesDataPoint } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface AnalyticsMetricCardProps {
  title: string;
  total: number;
  trend?: number; // percentage change
  data: TimeSeriesDataPoint[];
  className?: string;
}

type ViewMode = "chart" | "table";

export function AnalyticsMetricCard({
  title,
  total,
  trend,
  data,
  className,
}: AnalyticsMetricCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  const showTrend = trend !== undefined && trend !== 0;
  const isPositive = trend !== undefined && trend > 0;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);

  // Find indices for data labels (first, last, and max value)
  const maxIndex = values.indexOf(Math.max(...values));
  const labelIndices = new Set([0, data.length - 1, maxIndex]);

  // Calculate nice Y-axis values
  const yAxisMax = Math.ceil(maxValue * 1.1);
  const yAxisMid = Math.round(yAxisMax / 2);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {total.toLocaleString()}
            </span>
            {showTrend && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-0.5 h-3 w-3" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-md border border-border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("chart")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "chart"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Chart view"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === "chart" ? (
          <div className="mt-2">
            {data.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 flex h-32 w-8 flex-col justify-between pr-2 text-right text-[10px] text-muted-foreground">
                  <span>{yAxisMax}</span>
                  <span>{yAxisMid}</span>
                  <span>0</span>
                </div>

                {/* Chart area with grid */}
                <div className="ml-10">
                  {/* Grid lines */}
                  <div className="absolute left-10 right-0 top-0 h-32">
                    <div className="absolute left-0 right-0 top-0 border-t border-dashed border-border/50" />
                    <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border/50" />
                    <div className="absolute bottom-0 left-0 right-0 border-t border-border" />
                  </div>

                  {/* Bars container */}
                  <div className="relative flex h-32 items-end gap-[2px]">
                    {data.map((point, index) => {
                      const barHeight = yAxisMax > 0 ? (point.value / yAxisMax) * 100 : 0;
                      const showLabel = labelIndices.has(index);

                      return (
                        <div
                          key={point.date}
                          className="group relative flex flex-1 flex-col items-center justify-end"
                          style={{ height: "100%" }}
                        >
                          {/* Data label above bar */}
                          {showLabel && point.value > 0 && (
                            <span className="absolute -top-4 text-[10px] font-medium text-foreground">
                              {point.value}
                            </span>
                          )}
                          {/* Bar */}
                          <div
                            className="w-full min-w-[4px] max-w-[16px] rounded-t-sm bg-[#5788FF] transition-all hover:bg-[#4070ee]"
                            style={{
                              height: `${Math.max(barHeight, point.value > 0 ? 2 : 0)}%`,
                              minHeight: point.value > 0 ? "4px" : "0"
                            }}
                          />
                          {/* Tooltip on hover */}
                          <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                            <div className="font-medium">{point.value.toLocaleString()}</div>
                            <div className="text-gray-300">{formatDateLabel(point.date)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels */}
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    {data.length > 0 && <span>{formatDateLabel(data[0].date)}</span>}
                    {data.length > 2 && (
                      <span>{formatDateLabel(data[Math.floor(data.length / 2)].date)}</span>
                    )}
                    {data.length > 1 && <span>{formatDateLabel(data[data.length - 1].date)}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AnalyticsDataTable data={data} valueLabel={title} className="mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
