"use client";

import type { TimeSeriesDataPoint } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

interface MiniSparklineProps {
  data: TimeSeriesDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = "#5788FF",
  className,
}: MiniSparklineProps) {
  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ width, height }}
      >
        <span className="text-xs">--</span>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Calculate padding to prevent line from touching edges
  const padding = 2;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Generate path points
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((value - min) / range) * graphHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Create gradient fill area
  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];
  const fillD = `M ${fillPoints.join(" L ")} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path
        d={fillD}
        fill={`url(#gradient-${color.replace("#", "")})`}
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
