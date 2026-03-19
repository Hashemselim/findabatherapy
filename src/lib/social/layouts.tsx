/* eslint-disable @next/next/no-img-element */
import type { BrandData } from "./types";

interface LayoutComponentProps {
  brand: BrandData;
  headline: string;
  subline?: string;
  accent?: string;
}

/** Get text color that contrasts with background */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function BrandFooter({
  brand,
  textColor = "#ffffff",
}: {
  brand: BrandData;
  textColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {brand.logoUrl && (
        <img
          src={brand.logoUrl}
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 8, objectFit: "cover" }}
        />
      )}
      <span style={{ fontSize: 28, color: textColor, fontWeight: 600 }}>
        {brand.agencyName}
      </span>
    </div>
  );
}

/** Layout 1: Bold quote — large centered text on brand color */
export function BoldQuoteLayout({
  brand,
  headline,
  subline,
}: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 32,
              color: textColor,
              opacity: 0.85,
              marginTop: 24,
              textAlign: "center",
            }}
          >
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor={textColor} />
    </div>
  );
}

/** Layout 2: Event banner — event name big, date, border accent */
export function EventBannerLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  const bgLight = lightenColor(brand.brandColor, 40);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: bgLight,
        border: `12px solid ${brand.brandColor}`,
        padding: 70,
      }}
    >
      {accent && (
        <div style={{ display: "flex" }}>
          <span style={{ fontSize: 56, marginBottom: 16 }}>{accent}</span>
        </div>
      )}
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
            fontSize: 68,
            fontWeight: 800,
            color: "#1a1a1a",
            lineHeight: 1.15,
          }}
        >
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 30, color: "#444444", marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Layout 3: Tip card — header badge, body text, accent bar */
export function TipCardLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 70,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 8,
          backgroundColor: brand.brandColor,
          borderRadius: 4,
          marginBottom: 40,
        }}
      />
      {accent && (
        <div style={{ display: "flex" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: brand.brandColor,
              backgroundColor: `${brand.brandColor}15`,
              padding: "8px 20px",
              borderRadius: 24,
              letterSpacing: 1,
              textTransform: "uppercase" as const,
            }}
          >
            {accent}
          </span>
        </div>
      )}
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
            fontSize: 60,
            fontWeight: 800,
            color: "#1a1a1a",
            lineHeight: 1.15,
          }}
        >
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 28, color: "#555555", marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Layout 4: Split block — left brand color, right white */
export function SplitBlockLayout({
  brand,
  headline,
  subline,
  accent,
}: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "row",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 540,
          backgroundColor: brand.brandColor,
          padding: 60,
          justifyContent: "center",
        }}
      >
        {accent && (
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: 48, marginBottom: 16 }}>{accent}</span>
          </div>
        )}
        <span
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.15,
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 26,
              color: textColor,
              opacity: 0.85,
              marginTop: 20,
            }}
          >
            {subline}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 540,
          backgroundColor: "#ffffff",
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt=""
            width={160}
            height={160}
            style={{
              borderRadius: 16,
              objectFit: "cover",
              marginBottom: 24,
            }}
          />
        )}
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#1a1a1a",
            textAlign: "center",
          }}
        >
          {brand.agencyName}
        </span>
      </div>
    </div>
  );
}

/** Layout 5: Announcement — bold headline on brand color */
export function AnnouncementLayout({
  brand,
  headline,
  subline,
}: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
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
      {brand.logoUrl && (
        <img
          src={brand.logoUrl}
          alt=""
          width={100}
          height={100}
          style={{
            borderRadius: 16,
            objectFit: "cover",
            marginBottom: 40,
          }}
        />
      )}
      <span
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: textColor,
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        {headline}
      </span>
      {subline && (
        <span
          style={{
            fontSize: 32,
            color: textColor,
            opacity: 0.85,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          {subline}
        </span>
      )}
      <span
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: textColor,
          opacity: 0.7,
          marginTop: 40,
        }}
      >
        {brand.agencyName}
      </span>
    </div>
  );
}

/** Layout 6: Minimal — white bg, thin brand border, centered text */
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
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        border: `6px solid ${brand.brandColor}`,
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1a1a1a",
            lineHeight: 1.15,
            textAlign: "center",
          }}
        >
          {headline}
        </span>
        {subline && (
          <span
            style={{
              fontSize: 28,
              color: "#555555",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Map layout ID to component */
export const LAYOUT_COMPONENTS = {
  "bold-quote": BoldQuoteLayout,
  "event-banner": EventBannerLayout,
  "tip-card": TipCardLayout,
  "split-block": SplitBlockLayout,
  announcement: AnnouncementLayout,
  minimal: MinimalLayout,
} as const;
