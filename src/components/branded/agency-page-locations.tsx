import { MapPin, Building2, Home, CheckCircle, Phone, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DirectionsButton } from "@/components/provider/directions-button";

interface LocationData {
  id: string;
  label: string | null;
  street: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  isPrimary: boolean;
  serviceMode?: "center_based" | "in_home" | "both";
  serviceRadiusMiles?: number;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactWebsite?: string | null;
  useCompanyContact?: boolean;
}

interface AgencyPageLocationsProps {
  locations: LocationData[];
  agencyPhone: string | null;
  agencyWebsite: string | null;
  brandColor?: string;
}

const SERVICE_MODE_LABELS: Record<string, string> = {
  center_based: "Center-Based",
  in_home: "In-Home",
  both: "Center & In-Home",
};

export function AgencyPageLocations({
  locations,
  agencyPhone,
  agencyWebsite,
  brandColor = "#5788FF",
}: AgencyPageLocationsProps) {
  if (locations.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 text-xl font-semibold text-foreground sm:text-2xl">
        Our Locations
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {locations.map((location) => {
          const showDirections =
            location.serviceMode === "center_based" ||
            location.serviceMode === "both";
          const locationPhone =
            location.useCompanyContact === false && location.contactPhone
              ? location.contactPhone
              : agencyPhone;
          const locationWebsite =
            location.useCompanyContact === false && location.contactWebsite
              ? location.contactWebsite
              : agencyWebsite;

          return (
            <Card
              key={location.id}
              className="border border-border/60 transition-all duration-300 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="space-y-3">
                  {/* City, State + Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" style={{ color: brandColor }} />
                    <span className="font-semibold text-foreground">
                      {location.label || `${location.city}, ${location.state}`}
                    </span>
                    {location.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>

                  {/* Address */}
                  {location.street && (
                    <p className="text-sm text-muted-foreground">
                      {location.street}
                      <br />
                      {location.city}, {location.state}
                      {location.postalCode && ` ${location.postalCode}`}
                    </p>
                  )}
                  {!location.street && (
                    <p className="text-sm text-muted-foreground">
                      {location.city}, {location.state}
                      {location.postalCode && ` ${location.postalCode}`}
                    </p>
                  )}

                  {/* Service Mode */}
                  {location.serviceMode && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      {location.serviceMode === "center_based" && (
                        <Building2 className="h-3 w-3" />
                      )}
                      {location.serviceMode === "in_home" && (
                        <Home className="h-3 w-3" />
                      )}
                      {location.serviceMode === "both" && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {SERVICE_MODE_LABELS[location.serviceMode] ||
                        location.serviceMode}
                    </Badge>
                  )}

                  {/* Service radius for in-home */}
                  {(location.serviceMode === "in_home" ||
                    location.serviceMode === "both") && (
                    <p className="text-xs text-muted-foreground">
                      Service radius: {location.serviceRadiusMiles || 25} miles
                    </p>
                  )}

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {locationPhone && (
                      <a
                        href={`tel:+1${locationPhone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-sm hover:underline"
                        style={{ color: brandColor }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {locationPhone}
                      </a>
                    )}
                    {locationWebsite && (
                      <a
                        href={locationWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm hover:underline"
                        style={{ color: brandColor }}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                  </div>

                  {/* Directions button */}
                  {showDirections && (
                    <DirectionsButton
                      latitude={location.latitude || null}
                      longitude={location.longitude || null}
                      address={[
                        location.street,
                        location.city,
                        location.state,
                        location.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      className="mt-2 w-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
