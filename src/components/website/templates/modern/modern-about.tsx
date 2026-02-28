"use client";

import { Heart } from "lucide-react";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

export function ModernAbout() {
  const { provider, brandColor } = useWebsite();

  if (!provider.description && !provider.summary) return null;

  return (
    <section className="relative pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Section badge */}
          <div className="mb-6 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
            >
              <Heart className="h-3.5 w-3.5" />
              About Us
            </span>
          </div>

          <h2 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
            {provider.headline || "Making a Difference, One Family at a Time"}
          </h2>

          <div className="space-y-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            {provider.description ? (
              provider.description.split("\n").filter(Boolean).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))
            ) : provider.summary ? (
              <p>{provider.summary}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Curved bottom divider — dashed brand line, fills into brand services section */}
      <SectionDivider
        variant="arc"
        lineStyle="dashed"
        fillColor={brandColor}
      />
    </section>
  );
}
