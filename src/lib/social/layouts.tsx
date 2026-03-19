/* eslint-disable @next/next/no-img-element */
import type { BrandData } from "./types";
import { ICON_SVG } from "./icons";

interface LayoutComponentProps {
  brand: BrandData;
  headline: string;
  subline?: string;
  icon?: string;
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/** Create a darker shade of the brand color */
function shadeColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Unified Card Layout
// ---------------------------------------------------------------------------

function CardLayout({ brand, headline, subline, icon }: LayoutComponentProps) {
  const darkBrand = shadeColor(brand.brandColor, 0.3);
  // Build a data URI SVG for the icon so Satori renders it as an image
  const iconDataUri = icon && ICON_SVG[icon]
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[icon]}</svg>`
      )}`
    : undefined;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: brand.brandColor,
        padding: "80px 100px",
      }}
    >
      {/* White card — compact, content-driven height */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 24,
          padding: "60px 50px 48px",
          width: "100%",
        }}
      >
        {/* Icon circle — overlapping top edge */}
        {iconDataUri && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: darkBrand,
              marginTop: -125,
              marginBottom: 36,
            }}
          >
            <img src={iconDataUri} alt="" width={60} height={60} />
          </div>
        )}

        {/* Headline */}
        <span
          style={{
            fontSize: 82,
            fontWeight: 800,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          {headline}
        </span>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            width: 56,
            height: 5,
            backgroundColor: brand.brandColor,
            borderRadius: 3,
            marginTop: 28,
            marginBottom: 24,
          }}
        />

        {/* Subline */}
        {subline && (
          <span
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "#555555",
              textAlign: "center",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {subline}
          </span>
        )}

        {/* Brand footer inside card — tighter spacing */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 48,
          }}
        >
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 14, objectFit: "cover" }}
            />
          )}
          <span
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#333333",
            }}
          >
            {brand.agencyName}
          </span>
        </div>
      </div>
    </div>
  );
}

export { CardLayout };

export const LAYOUT_COMPONENTS = {
  card: CardLayout,
  // Backwards-compat aliases (old layout names all resolve to CardLayout)
  "bold-quote": CardLayout,
  "event-banner": CardLayout,
  "tip-card": CardLayout,
  "split-block": CardLayout,
  announcement: CardLayout,
  minimal: CardLayout,
} as const;
