import Link from "next/link";
import { ArrowRight, MapPin, Search, Star, TrendingUp, Sparkles } from "lucide-react";

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
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.08),transparent_50%)]" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">
                {hasFeaturedLocations ? "Feature More Locations" : "Feature Your Listing"}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3 fill-current" />
                Premium
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {hasFeaturedLocations
                ? "Boost visibility for more of your locations with featured placement."
                : "Stand out in search results and get seen by more families looking for ABA therapy."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-amber-100 bg-white p-4 sm:grid-cols-4">
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Top Placement</p>
            <p className="text-xs text-slate-500">Pinned to top</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
              <Search className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">State Results</p>
            <p className="text-xs text-slate-500">Priority ranking</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Featured Badge</p>
            <p className="text-xs text-slate-500">Stand out</p>
          </div>
          <div className="space-y-1 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
              <MapPin className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Per Location</p>
            <p className="text-xs text-slate-500">Choose which</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-amber-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">${featuredPrice}/mo</span>
            <span className="text-slate-400"> per location</span>
          </p>
          <Button
            asChild
            size="sm"
            className="w-full shrink-0 gap-2 rounded-full bg-amber-500 hover:bg-amber-600 sm:w-auto"
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
