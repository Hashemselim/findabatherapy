"use client";

import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

function getLighterShade(hexColor: string, opacity: number) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function ModernLocations() {
  const { provider, brandColor } = useWebsite();

  if (provider.locations.length === 0) return null;

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
            <MapPin className="h-3.5 w-3.5" />
            Our Locations
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            Find Us Near You
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            {provider.locations.length === 1
              ? "Visit us at our conveniently located facility."
              : `We serve families across ${provider.locations.length} locations.`}
          </p>
        </div>

        {/* Location Cards */}
        <div
          className={`grid gap-6 ${
            provider.locations.length === 1
              ? "max-w-lg mx-auto"
              : provider.locations.length === 2
                ? "max-w-3xl mx-auto sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {provider.locations.map((location) => {
            const phone =
              location.useCompanyContact || !location.contactPhone
                ? provider.profile.contactPhone
                : location.contactPhone;
            const email =
              location.useCompanyContact || !location.contactEmail
                ? provider.profile.contactEmail
                : location.contactEmail;

            const mapQuery = encodeURIComponent(
              [location.street, location.city, location.state, location.postalCode]
                .filter(Boolean)
                .join(", ")
            );

            return (
              <div
                key={location.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Primary badge */}
                {location.isPrimary && provider.locations.length > 1 && (
                  <div
                    className="absolute top-4 right-4 z-10 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    Main
                  </div>
                )}

                {/* Map placeholder */}
                <div className="relative h-36 overflow-hidden bg-gray-100">
                  <div
                    className="flex h-full items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${getLighterShade(brandColor, 0.06)}, ${getLighterShade(brandColor, 0.02)})`,
                    }}
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 text-gray-400 transition-colors hover:text-gray-600"
                    >
                      <Navigation
                        className="h-8 w-8"
                        style={{ color: `${brandColor}60` }}
                      />
                      <span className="text-xs font-medium">
                        Open in Maps
                      </span>
                    </a>
                  </div>
                </div>

                <div className="p-5">
                  {/* Label */}
                  {location.label && (
                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                      {location.label}
                    </h3>
                  )}

                  {/* Address */}
                  <div className="mb-3 flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span>
                      {location.street && `${location.street}, `}
                      {location.city}, {location.state}
                      {location.postalCode && ` ${location.postalCode}`}
                    </span>
                  </div>

                  {/* Google Rating */}
                  {location.showGoogleReviews &&
                    location.googleRating != null && (
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.round(location.googleRating!)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {location.googleRating.toFixed(1)}
                        </span>
                        {location.googleRatingCount != null && (
                          <span className="text-xs text-gray-400">
                            ({location.googleRatingCount} reviews)
                          </span>
                        )}
                      </div>
                    )}

                  {/* Contact */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {phone}
                      </a>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {email}
                      </a>
                    )}
                  </div>

                  {/* Directions Button */}
                  <div className="mt-4">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl"
                    >
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="mr-2 h-3.5 w-3.5" />
                        Get Directions
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Curved bottom divider — solid brand line, fills into white gallery section */}
      <SectionDivider
        variant="swoopRight"
        lineStyle="solid"
        fillColor="white"
      />
    </section>
  );
}
