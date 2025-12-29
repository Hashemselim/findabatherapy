"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { MiniSparkline } from "./mini-sparkline";
import type { LocationAnalytics } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface LocationAnalyticsRowProps {
  location: LocationAnalytics;
  className?: string;
}

export function LocationAnalyticsRow({ location, className }: LocationAnalyticsRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayName = location.label || `${location.city}, ${location.state}`;
  const subtitle = location.label ? `${location.city}, ${location.state}` : null;

  return (
    <div className={cn("border-b border-border/60 last:border-b-0", className)}>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />

        {/* Location name */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{displayName}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="w-16 text-right">
            <p className="font-medium tabular-nums text-foreground">
              {location.metrics.views.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="w-16 text-right">
            <p className="font-medium tabular-nums text-foreground">
              {location.metrics.impressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Impr.</p>
          </div>
          <div className="w-16 text-right">
            <p className="font-medium tabular-nums text-foreground">
              {location.metrics.clicks.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <div className="w-16 text-right">
            <p className="font-medium tabular-nums text-foreground">
              {location.metrics.ctr}%
            </p>
            <p className="text-xs text-muted-foreground">CTR</p>
          </div>
        </div>
      </button>

      {/* Expanded content - Sparklines only */}
      {isExpanded && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-4">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Views trend */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Views Trend</p>
              <MiniSparkline
                data={location.timeSeries.views}
                color="#3b82f6"
                width={200}
                height={80}
              />
            </div>

            {/* Impressions trend */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Impressions Trend</p>
              <MiniSparkline
                data={location.timeSeries.impressions}
                color="#9333ea"
                width={200}
                height={80}
              />
            </div>

            {/* Clicks trend */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Clicks Trend</p>
              <MiniSparkline
                data={location.timeSeries.clicks}
                color="#10b981"
                width={200}
                height={80}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
