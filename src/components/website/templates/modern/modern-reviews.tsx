"use client";

import { Star, MapPin } from "lucide-react";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

export function ModernReviews() {
  const { provider, brandColor } = useWebsite();

  if (!provider.websiteSettings.show_reviews) return null;

  // Collect locations that have Google reviews enabled with rating data
  const ratedLocations = provider.locations.filter(
    (l) => l.showGoogleReviews && l.googleRating != null
  );

  if (ratedLocations.length === 0) return null;

  // Calculate aggregate rating
  const totalRating = ratedLocations.reduce(
    (sum, l) => sum + (l.googleRating || 0),
    0
  );
  const totalCount = ratedLocations.reduce(
    (sum, l) => sum + (l.googleRatingCount || 0),
    0
  );
  const avgRating = totalRating / ratedLocations.length;

  return (
    <section className="relative bg-gray-50/50 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 text-center sm:mb-16">
          <span
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            <Star className="h-3.5 w-3.5" />
            Reviews
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            What Families Say
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            See what families in our community have to say about their
            experience.
          </p>
        </div>

        {/* Aggregate Rating Card */}
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div
              className="px-6 py-5 text-center"
              style={{
                background: `linear-gradient(135deg, ${brandColor}08, ${brandColor}03)`,
              }}
            >
              {/* Google logo indicator */}
              <div className="mb-3 flex items-center justify-center gap-1.5">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  Google Reviews
                </span>
              </div>

              {/* Big rating number */}
              <div className="mb-2 text-5xl font-bold text-gray-900">
                {avgRating.toFixed(1)}
              </div>

              {/* Stars */}
              <div className="mb-2 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${
                      i < Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Review count */}
              <p className="text-sm text-gray-500">
                Based on {totalCount.toLocaleString()} review
                {totalCount !== 1 ? "s" : ""}
                {ratedLocations.length > 1
                  ? ` across ${ratedLocations.length} locations`
                  : ""}
              </p>
            </div>

            {/* Per-location breakdown if multiple */}
            {ratedLocations.length > 1 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="space-y-3">
                  {ratedLocations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span>
                          {location.label || `${location.city}, ${location.state}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < Math.round(location.googleRating!)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {location.googleRating!.toFixed(1)}
                        </span>
                        {location.googleRatingCount != null && (
                          <span className="text-xs text-gray-400">
                            ({location.googleRatingCount})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Curved bottom divider — solid brand line, fills into brand contact CTA */}
      <SectionDivider
        variant="arc"
        lineStyle="solid"
        fillColor={brandColor}
      />
    </section>
  );
}
