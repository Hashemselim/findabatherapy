"use client";

import { Navigation, Building2, Home, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DirectionsButton } from "@/components/provider/directions-button";

const SERVICE_MODE_LABELS: Record<string, string> = {
  center_based: "Center-Based",
  in_home: "In-Home",
  both: "Center & In-Home",
};

interface LocationSectionProps {
  city: string;
  state: string;
  street?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
  serviceMode?: string | null;
  serviceRadiusMiles?: number | null;
  insurances?: string[];
  latitude?: number | null;
  longitude?: number | null;
  isHighlighted?: boolean;
}

export function LocationSection({
  city,
  state,
  street,
  postalCode,
  isPrimary = false,
  serviceMode,
  serviceRadiusMiles,
  insurances = [],
  latitude,
  longitude,
  isHighlighted = false,
}: LocationSectionProps) {
  // Build address for directions
  const address = [street, city, state, postalCode].filter(Boolean).join(", ");

  // Determine if we should show directions button
  const showDirections = serviceMode === "center_based" || serviceMode === "both" || (!serviceMode && street);

  return (
    <div
      className="rounded-2xl border border-[#5788FF]/20 bg-[#5788FF]/[0.03] p-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.05] hover:shadow-[0_8px_30px_rgba(87,136,255,0.1)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
          <Navigation className="h-4 w-4 text-[#5788FF]" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {isHighlighted ? "Viewing This Location" : "Location"}
        </h3>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold text-foreground">
              {city}, {state}
            </span>
            {isPrimary && (
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            )}
            {serviceMode && (
              <Badge variant="outline" className="gap-1 text-xs">
                {serviceMode === "center_based" && <Building2 className="h-3 w-3" />}
                {serviceMode === "in_home" && <Home className="h-3 w-3" />}
                {serviceMode === "both" && <CheckCircle className="h-3 w-3" />}
                {SERVICE_MODE_LABELS[serviceMode] || serviceMode}
              </Badge>
            )}
          </div>
          {street && (
            <p className="text-sm text-muted-foreground">
              {street}
              {postalCode && `, ${postalCode}`}
            </p>
          )}
          {(serviceMode === "in_home" || serviceMode === "both") && (
            <p className="text-xs text-muted-foreground">
              Service radius: {serviceRadiusMiles || 25} miles
            </p>
          )}
          {insurances.length > 0 && (
            <div className="pt-1">
              <div className="flex flex-wrap gap-1">
                {insurances.slice(0, 4).map((ins) => (
                  <Badge key={ins} variant="outline" className="text-xs font-normal">
                    {ins}
                  </Badge>
                ))}
                {insurances.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{insurances.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {showDirections && (
          <DirectionsButton
            latitude={latitude || null}
            longitude={longitude || null}
            address={address}
            className="shrink-0"
          />
        )}
      </div>
    </div>
  );
}
