import Link from "next/link";
import { ArrowRight, MapPin, Search, Star, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardFeatureCard } from "@/components/dashboard/ui";

interface FeaturedUpsellProps {
  hasFeaturedLocations: boolean;
  locationCount: number;
  featuredPrice: number;
}

export function FeaturedUpsell({
  hasFeaturedLocations,
  locationCount,
  featuredPrice,
}: FeaturedUpsellProps) {
  // Don't show if user already has all locations featured
  if (hasFeaturedLocations && locationCount <= 1) {
    return null;
  }

  return (
    <DashboardFeatureCard
      tone="premium"
      icon={Star}
      title={hasFeaturedLocations ? "Feature More Locations" : "Feature Your Listing"}
      description={
        hasFeaturedLocations
          ? "Boost visibility for more of your locations with featured placement."
          : "Stand out in search results and get seen by more families looking for ABA therapy."
      }
      highlights={[
        {
          title: "Top Placement",
          description: "Pinned to top",
          icon: TrendingUp,
          tone: "info",
        },
        {
          title: "State Results",
          description: "Priority ranking",
          icon: Search,
          tone: "info",
        },
        {
          title: "Featured Badge",
          description: "Stand out",
          icon: Star,
          tone: "premium",
        },
        {
          title: "Per Location",
          description: "Choose which",
          icon: MapPin,
          tone: "info",
        },
      ]}
      footer={(
        <>
          <span className="font-semibold text-foreground">${featuredPrice}/mo</span> per location
        </>
      )}
      action={(
        <Button asChild size="sm" className="w-full shrink-0 gap-2 sm:w-auto">
          <Link href="/dashboard/locations">
            {hasFeaturedLocations ? "Manage Locations" : "Feature a Location"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    />
  );
}
