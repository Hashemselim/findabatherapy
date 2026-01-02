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
      <CardContent className="p-0 pb-4">
        {filteredLocations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No locations match the current filter
          </div>
        ) : (
          <div className="space-y-0">
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
