"use client";

import { MapPin } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAnalyticsRow } from "./location-analytics-row";
import type { LocationAnalytics } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface LocationAnalyticsSectionProps {
  locations: LocationAnalytics[];
  selectedLocationIds: string[];
  className?: string;
}

export function LocationAnalyticsSection({
  locations,
  selectedLocationIds,
  className,
}: LocationAnalyticsSectionProps) {
  // Filter locations based on selection
  // If no selection or all selected, show all
  const filteredLocations =
    selectedLocationIds.length === 0 || selectedLocationIds.length === locations.length
      ? locations
      : locations.filter((loc) => selectedLocationIds.includes(loc.locationId));

  if (locations.length === 0) {
    return null;
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Performance
        </CardTitle>
        <CardDescription>
          Analytics breakdown by service location
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {filteredLocations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No locations match the current filter
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {/* Header row */}
            <div className="hidden items-center gap-4 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground sm:flex">
              <div className="w-4" /> {/* Spacer for chevron */}
              <div className="flex-1">Location</div>
              <div className="flex items-center gap-6">
                <div className="w-16 text-right">Views</div>
                <div className="w-16 text-right">Impr.</div>
                <div className="w-16 text-right">Clicks</div>
                <div className="w-16 text-right">CTR</div>
              </div>
            </div>

            {/* Location rows */}
            {filteredLocations.map((location) => (
              <LocationAnalyticsRow key={location.locationId} location={location} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
