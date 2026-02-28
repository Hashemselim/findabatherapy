"use client";

import { Shield } from "lucide-react";
import { useWebsite } from "../../layout/website-provider";
import { SectionDivider } from "./section-divider";

export function ModernInsurance() {
  const { provider, brandColor } = useWebsite();

  const insurances = (provider.attributes.insurances as string[]) || [];

  if (insurances.length === 0) return null;

  return (
    <section className="relative pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
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
            <Shield className="h-3.5 w-3.5" />
            Insurance
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            Insurance We Accept
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            We work with major insurance providers to make therapy accessible
            for your family.
          </p>
        </div>

        {/* Insurance Grid */}
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {insurances.map((insurance) => (
              <div
                key={insurance}
                className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <Shield
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: brandColor }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {insurance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Curved bottom divider — dashed brand line, fills into gray locations section */}
      <SectionDivider
        variant="doubleWave"
        lineStyle="dashed"
        fillColor="#f9fafb"
      />
    </section>
  );
}
