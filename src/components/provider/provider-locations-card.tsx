"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProviderLocation = {
  city: string;
  state: string;
  address: string;
};

type ProviderLocationsCardProps = {
  locations: ProviderLocation[];
};

const LOCATIONS_BATCH_SIZE = 5;

export function ProviderLocationsCard({ locations }: ProviderLocationsCardProps) {
  const [visibleCount, setVisibleCount] = useState(Math.min(LOCATIONS_BATCH_SIZE, locations.length));
  const hiddenCount = Math.max(locations.length - visibleCount, 0);

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOCATIONS_BATCH_SIZE, locations.length));
  };

  return (
    <Card className="border border-border/80">
      <CardHeader>
        <CardTitle>Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.slice(0, visibleCount).map((location) => (
          <div key={location.address} className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-foreground">
              {location.city}, {location.state}
            </p>
            <p className="text-muted-foreground">{location.address}</p>
          </div>
        ))}
        {hiddenCount > 0 && (
          <Button variant="outline" className="w-full rounded-full text-sm" onClick={handleShowMore}>
            {hiddenCount} More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
