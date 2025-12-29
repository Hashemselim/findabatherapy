import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DirectionsButtonProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button that opens Google Maps directions to a location.
 * Uses lat/lng if available, otherwise falls back to address search.
 */
export function DirectionsButton({
  latitude,
  longitude,
  address,
  className,
  variant = "outline",
  size = "sm",
}: DirectionsButtonProps) {
  // Build Google Maps directions URL
  // If we have coordinates, use them for accuracy
  // Otherwise fall back to address search
  const googleMapsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
        <MapPin className="h-4 w-4" />
        Get Directions
      </a>
    </Button>
  );
}
