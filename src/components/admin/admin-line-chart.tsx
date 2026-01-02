"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TimeSeriesData {
  date: string;
  count: number;
}

interface DataSeries {
  key: string;
  label: string;
  data: TimeSeriesData[];
  color: string;
}

interface AdminLineChartProps {
  title: string;
  description?: string;
  series: DataSeries[];
  className?: string;
}

export function AdminLineChart({ title, description, series, className }: AdminLineChartProps) {
  const [activeSeries, setActiveSeries] = useState<Set<string>>(
    new Set(series.map((s) => s.key))
  );

  const toggleSeries = (key: string) => {
    const newActive = new Set(activeSeries);
    if (newActive.has(key)) {
      if (newActive.size > 1) {
        newActive.delete(key);
      }
    } else {
      newActive.add(key);
    }
    setActiveSeries(newActive);
  };

  // Get all unique dates across all series
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.date)))
  ).sort();

  // Calculate max value across active series
  const maxValue = Math.max(
    ...series
      .filter((s) => activeSeries.has(s.key))
      .flatMap((s) => s.data.map((d) => d.count)),
    1
  );

  // Chart dimensions
  const chartHeight = 200;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex flex-wrap gap-2">
            {series.map((s) => (
              <Button
                key={s.key}
                variant={activeSeries.has(s.key) ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                style={{
                  backgroundColor: activeSeries.has(s.key) ? s.color : undefined,
                  borderColor: s.color,
                  color: activeSeries.has(s.key) ? "white" : s.color,
                }}
                onClick={() => toggleSeries(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allDates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          <div className="relative" style={{ height: chartHeight }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 flex h-full w-10 flex-col justify-between text-right text-xs text-muted-foreground">
              <span>{maxValue.toLocaleString()}</span>
              <span>{Math.round(maxValue / 2).toLocaleString()}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 h-full">
              {/* Grid lines */}
              <div className="absolute inset-y-0 right-0 left-12 flex flex-col justify-between">
                <div className="border-t border-dashed border-muted" />
                <div className="border-t border-dashed border-muted" />
                <div className="border-t border-muted" />
              </div>

              {/* Bars */}
              <div className="relative flex h-full items-end justify-between gap-1">
                {allDates.map((date, index) => (
                  <div key={date} className="group relative flex flex-1 flex-col items-center">
                    {/* Stacked bars for each series */}
                    <div className="flex w-full flex-1 flex-col items-center justify-end gap-0.5">
                      {series
                        .filter((s) => activeSeries.has(s.key))
                        .map((s) => {
                          const dataPoint = s.data.find((d) => d.date === date);
                          const value = dataPoint?.count || 0;
                          const height = (value / maxValue) * 100;
                          return (
                            <div
                              key={s.key}
                              className="w-full max-w-[20px] rounded-t transition-all"
                              style={{
                                height: `${height}%`,
                                backgroundColor: s.color,
                                minHeight: value > 0 ? 2 : 0,
                              }}
                            />
                          );
                        })}
                    </div>

                    {/* X-axis label (show every nth label based on data density) */}
                    {(index === 0 ||
                      index === allDates.length - 1 ||
                      (allDates.length <= 14 && index % 2 === 0) ||
                      (allDates.length > 14 && index % Math.ceil(allDates.length / 7) === 0)) && (
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {format(new Date(date), "M/d")}
                      </span>
                    )}

                    {/* Tooltip on hover */}
                    <div className="absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full group-hover:block">
                      <div className="rounded-md bg-popover px-2 py-1 text-xs shadow-md">
                        <p className="font-medium">{format(new Date(date), "MMM d, yyyy")}</p>
                        {series
                          .filter((s) => activeSeries.has(s.key))
                          .map((s) => {
                            const dataPoint = s.data.find((d) => d.date === date);
                            return (
                              <p key={s.key} style={{ color: s.color }}>
                                {s.label}: {(dataPoint?.count || 0).toLocaleString()}
                              </p>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
