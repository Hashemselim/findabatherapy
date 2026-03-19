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
        padding: 120,
      }}
    >
      {/* White card — compact, centered */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: 28,
          padding: "60px 50px 44px",
          width: "100%",
          flex: 1,
        }}
      >
        {/* Icon circle — overlapping top edge */}
        {iconPath && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: darkBrand,
              marginTop: -100,
              marginBottom: 36,
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path d={iconPath} fill="#ffffff" />
            </svg>
          </div>
        )}

        {/* Headline */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#1a1a1a",
            textAlign: "center",
            lineHeight: 1.08,
            letterSpacing: -2.5,
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
              fontSize: 28,
              fontWeight: 600,
              color: "#555555",
              textAlign: "center",
              letterSpacing: 4,
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
            gap: 18,
          }}
        >
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              width={56}
              height={56}
              style={{ borderRadius: 12, objectFit: "cover" }}
            />
          )}
          <span
            style={{
              fontSize: 34,
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
