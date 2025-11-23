import type { CSSProperties } from "react";
import Image from "next/image";

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
  md: "h-16 w-16",
  lg: "h-24 w-24 sm:h-28 sm:w-28",
};

export function ProviderLogo({ name, logoUrl, size = "md", className }: ProviderLogoProps) {
  const sizes = size === "lg" ? "(min-width: 640px) 112px, 96px" : "64px";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white/90 p-2",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          fill
          sizes={sizes}
          className="rounded-xl object-cover"
        />
      ) : (
        <div className="h-full w-full rounded-xl" aria-hidden style={FALLBACK_GRADIENT} />
      )}
      <span className="sr-only">{name} logo</span>
    </div>
  );
}
