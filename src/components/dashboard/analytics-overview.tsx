"use client";

import { TrendingUp, TrendingDown, Eye, Search, MousePointer, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListingMetrics } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface AnalyticsOverviewProps {
  current: ListingMetrics;
  previous: ListingMetrics;
}

export function AnalyticsOverview({ current, previous }: AnalyticsOverviewProps) {
  const metrics = [
    {
      title: "Page Views",
      value: current.views,
      previousValue: previous.views,
      icon: Eye,
      format: "number",
    },
    {
      title: "Search Impressions",
      value: current.searchImpressions,
      previousValue: previous.searchImpressions,
      icon: Search,
      format: "number",
    },
    {
      title: "Click-through Rate",
      value: current.clickThroughRate,
      previousValue: previous.clickThroughRate,
      icon: MousePointer,
      format: "percent",
    },
    {
      title: "Inquiries",
      value: current.inquiries,
      previousValue: previous.inquiries,
      icon: MessageSquare,
      format: "number",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const change = metric.previousValue
          ? ((metric.value - metric.previousValue) / metric.previousValue) * 100
          : 0;
        const isPositive = change > 0;
        const isNeutral = change === 0;

        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.format === "percent"
                  ? `${metric.value.toFixed(1)}%`
                  : metric.value.toLocaleString()}
              </div>
              {!isNeutral && (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-xs",
                    isPositive ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(change).toFixed(1)}% from previous period
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-4 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="mt-2 h-3 w-32 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
