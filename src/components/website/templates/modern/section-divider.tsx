"use client";

import { useWebsite } from "../../layout/website-provider";

/**
 * Curved section dividers that create organic flow between page sections.
 *
 * Variants:
 * - "wave"        — gentle S-curve wave
 * - "arc"         — smooth single arc / hill
 * - "swoopLeft"   — asymmetric swoop biased left
 * - "swoopRight"  — asymmetric swoop biased right
 * - "doubleWave"  — two-peak ripple
 *
 * Line styles:
 * - "dashed"  — brand-colored dashed stroke overlaid on the curve
 * - "solid"   — thin solid border line along the curve
 * - "none"    — just the fill, no visible line
 *
 * `fillColor` controls the SVG fill (should match the NEXT section's bg).
 * The SVG is positioned absolutely at the bottom of the current section.
 */

type CurveVariant = "wave" | "arc" | "swoopLeft" | "swoopRight" | "doubleWave";
type LineStyle = "dashed" | "solid" | "none";

interface SectionDividerProps {
  variant?: CurveVariant;
  lineStyle?: LineStyle;
  /** Fill color — should match the NEXT section's background. Defaults to white. */
  fillColor?: string;
  /** Flip vertically — use for top-of-section dividers */
  flip?: boolean;
  className?: string;
}

/**
 * SVG path data for each curve variant.
 * ViewBox is always 0 0 1440 80.
 * Paths start from left edge, create a curve, then fill to the bottom-right corner.
 */
const CURVE_PATHS: Record<CurveVariant, string> = {
  wave: "M0 40C240 70 480 80 720 60C960 40 1200 20 1440 40V80H0V40Z",
  arc: "M0 60C360 10 1080 10 1440 60V80H0V60Z",
  swoopLeft:
    "M0 30C200 75 500 80 720 65C940 50 1200 45 1440 55V80H0V30Z",
  swoopRight:
    "M0 55C240 45 500 50 720 65C940 80 1200 75 1440 30V80H0V55Z",
  doubleWave:
    "M0 50C180 70 360 30 540 50C720 70 900 30 1080 50C1260 70 1380 55 1440 45V80H0V50Z",
};

/**
 * A separate stroke-only path (slightly offset) for the decorative line.
 * These trace the same contour but without the fill-to-bottom portion.
 */
const STROKE_PATHS: Record<CurveVariant, string> = {
  wave: "M0 40C240 70 480 80 720 60C960 40 1200 20 1440 40",
  arc: "M0 60C360 10 1080 10 1440 60",
  swoopLeft:
    "M0 30C200 75 500 80 720 65C940 50 1200 45 1440 55",
  swoopRight:
    "M0 55C240 45 500 50 720 65C940 80 1200 75 1440 30",
  doubleWave:
    "M0 50C180 70 360 30 540 50C720 70 900 30 1080 50C1260 70 1380 55 1440 45",
};

export function SectionDivider({
  variant = "wave",
  lineStyle = "none",
  fillColor = "white",
  flip = false,
  className = "",
}: SectionDividerProps) {
  const { brandColor } = useWebsite();

  const curvePath = CURVE_PATHS[variant];
  const strokePath = STROKE_PATHS[variant];

  return (
    <div
      className={`pointer-events-none absolute left-0 w-full ${
        flip ? "top-0 rotate-180" : "bottom-0"
      } ${className}`}
      style={{ [flip ? "top" : "bottom"]: "-1px" }}
    >
      <svg
        viewBox="0 0 1440 80"
        fill="none"
        className="block h-10 w-full sm:h-14 lg:h-16"
        preserveAspectRatio="none"
      >
        {/* Fill shape — matches next section's bg */}
        <path d={curvePath} fill={fillColor} />

        {/* Decorative stroke line — offset above the fill boundary so it
            sits entirely within the current section's background color */}
        {lineStyle === "dashed" && (
          <path
            d={strokePath}
            stroke={brandColor}
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
            transform="translate(0, -10)"
          />
        )}
        {lineStyle === "solid" && (
          <path
            d={strokePath}
            stroke={brandColor}
            strokeWidth="1.5"
            fill="none"
            opacity="0.2"
            transform="translate(0, -10)"
          />
        )}
      </svg>
    </div>
  );
}
