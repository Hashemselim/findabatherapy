/* eslint-disable @next/next/no-img-element */
import type { BrandData } from "./types";
import { ICON_PATHS } from "./icons";

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
  const iconPath = icon ? ICON_PATHS[icon] : undefined;

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
        padding: 80,
      }}
    >
      {/* White card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.93)",
          borderRadius: 32,
          padding: "70px 60px 50px",
          width: "100%",
          flex: 1,
          position: "relative",
        }}
      >
        {/* Icon circle — positioned at top, overlapping card edge */}
        {iconPath && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: darkBrand,
              marginTop: -110,
              marginBottom: 40,
            }}
          >
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none">
              <path d={iconPath} fill="#ffffff" />
            </svg>
          </div>
        )}

        {/* Headline */}
        <span
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: -2,
          }}
        >
          {headline}
        </span>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            width: 60,
            height: 4,
            backgroundColor: brand.brandColor,
            borderRadius: 2,
            marginTop: 28,
            marginBottom: 24,
          }}
        />

        {/* Subline */}
        {subline && (
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#666666",
              textAlign: "center",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {subline}
          </span>
        )}

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Brand footer inside card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: 10, objectFit: "cover" }}
            />
          )}
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#444444",
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
