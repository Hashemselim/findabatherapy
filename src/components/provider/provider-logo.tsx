import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const FALLBACK_GRADIENT: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at 20% 20%, rgba(255, 247, 217, 0.95), rgba(255, 247, 217, 0) 55%), radial-gradient(circle at 80% 0%, rgba(183, 210, 255, 0.9), rgba(183, 210, 255, 0) 45%), radial-gradient(circle at 0% 100%, rgba(255, 232, 170, 0.9), rgba(255, 232, 170, 0) 60%), radial-gradient(circle at 100% 100%, rgba(225, 240, 255, 0.85), rgba(225, 240, 255, 0) 50%)",
  backgroundColor: "#FFFDF4",
};

type ProviderLogoProps = {
  name: string;
  logoUrl?: string;
  size?: "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<ProviderLogoProps["size"]>, string> = {
  md: "max-h-16 max-w-[200px]",
  lg: "max-h-24 max-w-[280px] sm:max-h-28 sm:max-w-[340px]",
};

export function ProviderLogo({ name, logoUrl, size = "md", className }: ProviderLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white/90 p-2",
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className={cn(
            "block h-auto w-auto max-w-full rounded-xl object-contain",
            SIZE_CLASSES[size]
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-xl",
            size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16"
          )}
          aria-hidden
          style={FALLBACK_GRADIENT}
        />
      )}
      <span className="sr-only">{name} logo</span>
    </div>
  );
}
