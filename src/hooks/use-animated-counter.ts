"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface UseAnimatedCounterOptions {
  /** Final target value */
  end: number;
  /** Duration in ms (default 1800) */
  duration?: number;
  /** Start value (default 0) */
  start?: number;
  /** Prefix string, e.g. "$" */
  prefix?: string;
  /** Suffix string, e.g. "+" or "K" */
  suffix?: string;
  /** Whether to format with commas */
  formatCommas?: boolean;
  /** Decimal places (default 0) */
  decimals?: number;
  /** InView margin for early trigger */
  margin?: string;
}

/**
 * Animated counter that triggers when scrolled into view.
 * Uses easeOutExpo for a satisfying deceleration curve.
 */
export function useAnimatedCounter({
  end,
  duration = 1800,
  start = 0,
  prefix = "",
  suffix = "",
  formatCommas = true,
  decimals = 0,
  margin = "-80px",
}: UseAnimatedCounterOptions) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: margin as `${number}px` });
  const [display, setDisplay] = useState(
    `${prefix}${formatNumber(start, formatCommas, decimals)}${suffix}`
  );
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const range = end - start;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo: fast start, smooth deceleration
      const eased =
        progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const current = start + range * eased;
      setDisplay(
        `${prefix}${formatNumber(current, formatCommas, decimals)}${suffix}`
      );

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [isInView, end, start, duration, prefix, suffix, formatCommas, decimals]);

  return { ref, display, isInView };
}

function formatNumber(
  value: number,
  useCommas: boolean,
  decimals: number
): string {
  const fixed = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  if (!useCommas) return fixed;

  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}
