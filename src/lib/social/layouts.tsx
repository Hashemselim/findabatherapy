/* eslint-disable @next/next/no-img-element */
import type { BrandData } from "./types";

interface LayoutComponentProps {
  brand: BrandData;
  headline: string;
  subline?: string;
  accent?: string;
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

/** Create a soft tint of the brand color (mix toward white) */
function tintColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

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
// Shared brand components
// ---------------------------------------------------------------------------

function BrandBar({
  brand,
  variant = "light",
}: {
  brand: BrandData;
  variant?: "light" | "dark" | "color";
}) {
  const textColor =
    variant === "light"
      ? "#ffffff"
      : variant === "color"
        ? brand.brandColor
        : "#1a1a1a";
  const subtleColor =
    variant === "light"
      ? "rgba(255,255,255,0.6)"
      : variant === "color"
        ? `${brand.brandColor}99`
        : "rgba(0,0,0,0.4)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt=""
            width={72}
            height={72}
            style={{ borderRadius: 14, objectFit: "cover" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: textColor,
              letterSpacing: -0.5,
            }}
          >
            {brand.agencyName}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: subtleColor,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 1: Bold Quote
// Deep brand color background, massive centered typography, editorial feel
// ---------------------------------------------------------------------------

export function BoldQuoteLayout({
  brand,
  headline,
  subline,
}: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  const accentLine =
    textColor === "#ffffff" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)";
  const subtleText =
    textColor === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: brand.brandColor,
        padding: 80,
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          display: "flex",
          width: 80,
          height: 6,
          backgroundColor: accentLine,
          borderRadius: 3,
        }}
      />

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          paddingRight: 40,
        }}
      >
        <span
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: subtleText,
              marginTop: 32,
              lineHeight: 1.4,
              letterSpacing: -0.5,
            }}
          >
            {subline}
          </span>
        )}
      </div>

      {/* Brand footer */}
      <BrandBar brand={brand} variant="light" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 2: Event Banner
// Clean white card with bold brand color accent block at top
// ---------------------------------------------------------------------------

export function EventBannerLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  const darkBrand = shadeColor(brand.brandColor, 0.15);

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fafafa",
      }}
    >
      {/* Top color block — visual anchor */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 280,
          backgroundColor: brand.brandColor,
          padding: "0 80px",
        }}
      >
        {accent && (
          <span style={{ fontSize: 100 }}>{accent}</span>
        )}
      </div>

      {/* Content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "60px 80px 70px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#111111",
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            {headline}
          </span>
          {subline && (
            <span
              style={{
                fontSize: 34,
                fontWeight: 400,
                color: "#666666",
                marginTop: 24,
                lineHeight: 1.4,
              }}
            >
              {subline}
            </span>
          )}
        </div>

        {/* Bottom bar with brand + color dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BrandBar brand={brand} variant="dark" />
        </div>
      </div>

      {/* Bottom brand color strip */}
      <div
        style={{
          display: "flex",
          height: 12,
          backgroundColor: darkBrand,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 3: Tip Card
// Professional "card" feel — white with strong brand accent, educational tone
// ---------------------------------------------------------------------------

export function TipCardLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  const tint = tintColor(brand.brandColor, 0.92);

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 80,
      }}
    >
      {/* Badge + accent bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 6,
            height: 52,
            backgroundColor: brand.brandColor,
            borderRadius: 3,
          }}
        />
        {accent && (
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: brand.brandColor,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
            }}
          >
            {accent}
          </span>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 76,
            fontWeight: 800,
            color: "#111111",
            lineHeight: 1.08,
            letterSpacing: -2.5,
          }}
        >
          {headline}
        </span>
        {subline && (
          <div
            style={{
              display: "flex",
              marginTop: 36,
              padding: "28px 36px",
              backgroundColor: tint,
              borderRadius: 20,
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: "#444444",
                lineHeight: 1.45,
              }}
            >
              {subline}
            </span>
          </div>
        )}
      </div>

      {/* Brand footer */}
      <BrandBar brand={brand} variant="dark" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 4: Split Block
// Dramatic 60/40 vertical split — brand color top, white bottom
// ---------------------------------------------------------------------------

export function SplitBlockLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  const subtleText =
    textColor === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top: Brand color area with headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 660,
          backgroundColor: brand.brandColor,
          padding: "70px 80px 50px",
          justifyContent: "space-between",
        }}
      >
        {accent && (
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: 64 }}>{accent}</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 82,
              fontWeight: 800,
              color: textColor,
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            {headline}
          </span>
          {subline && (
            <span
              style={{
                fontSize: 34,
                fontWeight: 400,
                color: subtleText,
                marginTop: 24,
                lineHeight: 1.35,
              }}
            >
              {subline}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: White area with brand */}
      <div
        style={{
          display: "flex",
          height: 420,
          backgroundColor: "#ffffff",
          padding: "0 80px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt=""
              width={88}
              height={88}
              style={{ borderRadius: 18, objectFit: "cover" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#111111",
                letterSpacing: -0.5,
              }}
            >
              {brand.agencyName}
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: brand.brandColor,
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              ABA Therapy Services
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 5: Announcement
// High-impact, centered, dark background with brand color accents
// ---------------------------------------------------------------------------

export function AnnouncementLayout({
  brand,
  headline,
  subline,
}: LayoutComponentProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#111111",
        padding: 80,
        justifyContent: "space-between",
      }}
    >
      {/* Top: Logo + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
            fontSize: 32,
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: -0.3,
          }}
        >
          {brand.agencyName}
        </span>
      </div>

      {/* Center: Headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        {/* Brand color accent bar */}
        <div
          style={{
            display: "flex",
            width: 60,
            height: 6,
            backgroundColor: brand.brandColor,
            borderRadius: 3,
            marginBottom: 48,
          }}
        />
        <span
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.0,
            letterSpacing: -4,
            textAlign: "center",
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "rgba(255,255,255,0.55)",
              marginTop: 32,
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            {subline}
          </span>
        )}
      </div>

      {/* Bottom: Brand color bar */}
      <div
        style={{
          display: "flex",
          height: 8,
          backgroundColor: brand.brandColor,
          borderRadius: 4,
          width: "100%",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout 6: Minimal
// Refined, lots of whitespace, subtle brand color usage, editorial
// ---------------------------------------------------------------------------

export function MinimalLayout({
  brand,
  headline,
  subline,
}: LayoutComponentProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 90,
        justifyContent: "space-between",
      }}
    >
      {/* Top: Decorative brand dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: brand.brandColor,
          }}
        />
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: tintColor(brand.brandColor, 0.5),
          }}
        />
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: tintColor(brand.brandColor, 0.8),
          }}
        />
      </div>

      {/* Center: Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingRight: 80,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#111111",
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 34,
              fontWeight: 400,
              color: "#888888",
              marginTop: 28,
              lineHeight: 1.4,
              letterSpacing: -0.3,
            }}
          >
            {subline}
          </span>
        )}
      </div>

      {/* Bottom: Brand bar with left color accent */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            width: 6,
            height: 56,
            backgroundColor: brand.brandColor,
            borderRadius: 3,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
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
              fontSize: 32,
              fontWeight: 600,
              color: "#333333",
              letterSpacing: -0.3,
            }}
          >
            {brand.agencyName}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout map
// ---------------------------------------------------------------------------

export const LAYOUT_COMPONENTS = {
  "bold-quote": BoldQuoteLayout,
  "event-banner": EventBannerLayout,
  "tip-card": TipCardLayout,
  "split-block": SplitBlockLayout,
  announcement: AnnouncementLayout,
  minimal: MinimalLayout,
} as const;
