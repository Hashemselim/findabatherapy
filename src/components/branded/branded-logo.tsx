"use client";

import { cn } from "@/lib/utils";

type BrandedLogoVariant = "hero" | "compact" | "footer";

interface BrandedLogoProps {
  logoUrl: string | null;
  agencyName: string;
  brandColor: string;
  borderColor?: string;
  variant?: BrandedLogoVariant;
  className?: string;
}

function getLighterShade(hexColor: string, opacity = 0.12) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

const shellClasses: Record<BrandedLogoVariant, string> = {
  hero: "rounded-[28px] border-4 px-4 py-3 sm:px-6 sm:py-4",
  compact: "rounded-2xl border-2 px-3 py-2.5 sm:px-4 sm:py-3",
  footer: "rounded-md border px-2.5 py-1.5",
};

const imageClasses: Record<BrandedLogoVariant, string> = {
  hero: "max-h-20 max-w-[280px] sm:max-h-24 sm:max-w-[340px]",
  compact: "max-h-16 max-w-[220px] sm:max-h-[4.5rem] sm:max-w-[240px]",
  footer: "max-h-9 max-w-[144px]",
};

const fallbackClasses: Record<BrandedLogoVariant, string> = {
  hero: "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
  compact: "h-16 w-16 text-lg sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl",
  footer: "h-9 w-9 text-[10px]",
};

export function BrandedLogo({
  logoUrl,
  agencyName,
  brandColor,
  borderColor,
  variant = "hero",
  className,
}: BrandedLogoProps) {
  const initials = agencyName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "mx-auto inline-flex max-w-full items-center justify-center overflow-hidden bg-white/95 shadow-lg backdrop-blur-xs",
        shellClasses[variant],
        className
      )}
      style={{ borderColor: borderColor ?? brandColor }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={agencyName}
          className={cn("block h-auto w-auto max-w-full object-contain", imageClasses[variant])}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full font-bold",
            fallbackClasses[variant]
          )}
          style={{
            backgroundColor: getLighterShade(brandColor, 0.15),
            color: brandColor,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
