"use client";

import { ModernHero } from "./modern-hero";
import { ModernAbout } from "./modern-about";
import { ModernServices } from "./modern-services";
import { ModernInsurance } from "./modern-insurance";
import { ModernLocations } from "./modern-locations";
import { ModernGallery } from "./modern-gallery";
import { ModernReviews } from "./modern-reviews";
import { ModernContactCta } from "./modern-contact-cta";

/**
 * Default section ordering — used when website_settings.sections_order
 * is missing or incomplete. Each key maps to a component.
 */
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  hero: ModernHero,
  about: ModernAbout,
  services: ModernServices,
  insurance: ModernInsurance,
  locations: ModernLocations,
  gallery: ModernGallery,
  reviews: ModernReviews,
};

const DEFAULT_ORDER = [
  "hero",
  "about",
  "services",
  "insurance",
  "locations",
  "gallery",
  "reviews",
];

interface ModernHomeProps {
  sectionsOrder?: string[];
}

export function ModernHome({ sectionsOrder }: ModernHomeProps) {
  const order = sectionsOrder && sectionsOrder.length > 0 ? sectionsOrder : DEFAULT_ORDER;

  return (
    <>
      {order.map((sectionKey) => {
        const Component = SECTION_COMPONENTS[sectionKey];
        if (!Component) return null;
        return <Component key={sectionKey} />;
      })}

      {/* Contact CTA always appears at the bottom */}
      <ModernContactCta />
    </>
  );
}
