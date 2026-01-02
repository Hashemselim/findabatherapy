"use client";

import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

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
    <div className={cn("rounded-lg border border-border/60 m-4 first:mt-0 last:mb-0 overflow-hidden", className)}>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-col gap-4 p-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5788FF]/10">
            <MapPin className="h-5 w-5 text-[#5788FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{displayName}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform sm:hidden",
              isExpanded && "rotate-180"
            )}
          />
        </div>

        {/* Stats - Grid on mobile, flex row on desktop */}
        <div className="grid grid-cols-4 gap-4 text-center sm:flex sm:gap-6 sm:text-right">
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {location.metrics.views.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {location.metrics.impressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Impr.</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {location.metrics.clicks.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">
              {location.metrics.ctr}%
            </p>
            <p className="text-xs text-muted-foreground">CTR</p>
          </div>
          <ChevronDown
            className={cn(
              "hidden h-4 w-4 flex-shrink-0 self-center text-muted-foreground transition-transform sm:block",
              isExpanded && "rotate-180"
            )}
          />
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
