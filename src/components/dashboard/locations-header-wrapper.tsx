"use client";

import { useRef, useCallback } from "react";
import { Plus, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { LocationsManager, type CompanyDefaults } from "@/components/dashboard/locations-manager";
import type { LocationData } from "@/lib/actions/locations";
import type { FeaturedPricing } from "@/components/dashboard/featured-upgrade-button";

interface LocationsPageContentProps {
  locations: LocationData[];
  locationLimit: number;
  effectivePlanTier: string;
  featuredPricing: FeaturedPricing;
  companyDefaults: CompanyDefaults;
}

/**
 * Client wrapper that coordinates the "Add Location" button in the page header
 * with the LocationsManager dialog state.
 */
export function LocationsPageContent({
  locations,
  locationLimit,
  effectivePlanTier,
  featuredPricing,
  companyDefaults,
}: LocationsPageContentProps) {
  const openDialogRef = useRef<(() => void) | null>(null);

  const handleAddClick = useCallback(() => {
    openDialogRef.current?.();
  }, []);

  const canAddMore = locations.length < locationLimit;

  return (
    <>
      {/* Page Header with Add Location button */}
      <DashboardPageHeader
        title="Service Locations"
        description="Manage your service locations and coverage areas."
      >
        {canAddMore && (
          <Button onClick={handleAddClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        )}
      </DashboardPageHeader>

      {/* Location Limit Info Card */}
      <Card className="border-[#5788FF]/30 bg-[#5788FF]/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#5788FF]" />
            <div>
              <p className="font-medium text-foreground">
                {locationLimit === Infinity
                  ? `${locations.length} location${locations.length !== 1 ? "s" : ""}`
                  : `${locations.length} of ${locationLimit} location${locationLimit !== 1 ? "s" : ""} used`}
              </p>
              <p className="text-sm text-muted-foreground">
                {effectivePlanTier === "enterprise"
                  ? "Enterprise plan includes unlimited locations"
                  : effectivePlanTier === "pro"
                    ? "Pro plan includes up to 5 locations"
                    : "Free plan includes 1 location"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Manager */}
      <LocationsManager
        initialLocations={locations}
        locationLimit={locationLimit}
        planTier={effectivePlanTier}
        featuredPricing={featuredPricing}
        companyDefaults={companyDefaults}
        renderHeaderAction={(openDialog) => {
          openDialogRef.current = openDialog;
          return null;
        }}
      />
    </>
  );
}
