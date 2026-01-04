import Link from "next/link";
import { ArrowRight, MapPin, Search, Star, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="relative overflow-hidden rounded-xl border border-[#FEE720] bg-gradient-to-br from-[#FFF5C2]/50 via-white to-[#FFF5C2]/30 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(87,136,255,0.05),transparent_50%)]" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#FEE720] bg-[#FFF5C2]">
            <Star className="h-6 w-6 fill-[#5788FF] text-[#5788FF]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {hasFeaturedLocations ? "Feature More Locations" : "Feature Your Listing"}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FEE720] bg-[#FFF5C2] px-2.5 py-0.5 text-xs font-medium text-foreground">
                <Star className="h-3 w-3 fill-[#5788FF] text-[#5788FF]" />
                Premium
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFeaturedLocations
                ? "Boost visibility for more of your locations with featured placement."
                : "Stand out in search results and get seen by more families looking for ABA therapy."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-[#FEE720]/50 bg-white p-4 sm:grid-cols-4">
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
              <TrendingUp className="h-4 w-4 text-[#5788FF]" />
            </div>
            <p className="text-sm font-medium text-foreground">Top Placement</p>
            <p className="text-xs text-muted-foreground">Pinned to top</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
              <Search className="h-4 w-4 text-[#5788FF]" />
            </div>
            <p className="text-sm font-medium text-foreground">State Results</p>
            <p className="text-xs text-muted-foreground">Priority ranking</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF5C2]">
              <Star className="h-4 w-4 fill-[#5788FF] text-[#5788FF]" />
            </div>
            <p className="text-sm font-medium text-foreground">Featured Badge</p>
            <p className="text-xs text-muted-foreground">Stand out</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
              <MapPin className="h-4 w-4 text-[#5788FF]" />
            </div>
            <p className="text-sm font-medium text-foreground">Per Location</p>
            <p className="text-xs text-muted-foreground">Choose which</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#FEE720]/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">${featuredPrice}/mo</span>
            <span className="text-muted-foreground"> per location</span>
          </p>
          <Button
            asChild
            size="sm"
            className="w-full shrink-0 gap-2 rounded-full border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2] sm:w-auto"
          >
            <Link href="/dashboard/locations">
              {hasFeaturedLocations ? "Manage Locations" : "Feature a Location"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
