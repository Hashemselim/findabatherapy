import Image from "next/image";

import { cn } from "@/lib/utils";
import {
  GOODABA_LOGO_ALT,
  GOODABA_LOGO_HEIGHT,
  GOODABA_LOGO_PATH,
  GOODABA_LOGO_WIDTH,
} from "@/lib/brand/goodaba";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
type LogoSurface = "plain" | "white";

const sizeClasses: Record<LogoSize, string> = {
  xs: "h-5",
  sm: "h-6",
  md: "h-7",
  lg: "h-8",
  xl: "h-10",
};

const surfaceClasses: Record<LogoSurface, string> = {
  plain: "",
  white: "rounded-xl bg-white px-3 py-2 shadow-sm",
};

interface GoodABALogoProps {
  className?: string;
  priority?: boolean;
  size?: LogoSize;
  surface?: LogoSurface;
}

export function GoodABALogo({
  className,
  priority = false,
  size = "md",
  surface = "plain",
}: GoodABALogoProps) {
  return (
    <span className={cn("inline-flex items-center", surfaceClasses[surface], className)}>
      <Image
        src={GOODABA_LOGO_PATH}
        alt={GOODABA_LOGO_ALT}
        width={GOODABA_LOGO_WIDTH}
        height={GOODABA_LOGO_HEIGHT}
        priority={priority}
        className={cn("w-auto", sizeClasses[size])}
      />
    </span>
  );
}
