import { cn } from "@/lib/utils";

const BRAND_BLUE = "#5788FF";
const ACCENT_YELLOW = "#FFDC33";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, { text: string; bar: string }> = {
  xs: { text: "text-base", bar: "bottom-[1px] -right-1.5 h-[2px]" },
  sm: { text: "text-lg", bar: "bottom-[2px] -right-2 h-[3px]" },
  md: { text: "text-2xl", bar: "bottom-[3px] -right-3 h-[4px]" },
  lg: { text: "text-3xl", bar: "bottom-[3px] -right-3 h-[4px]" },
  xl: { text: "text-4xl", bar: "bottom-[4px] -right-4 h-[5px]" },
};

interface BehaviorWorkLogoProps {
  /** Logo size variant */
  size?: LogoSize;
  /** Override text color (defaults to brand blue) */
  color?: string;
  /** Additional CSS classes on the outer span */
  className?: string;
}

export function BehaviorWorkLogo({
  size = "md",
  color = BRAND_BLUE,
  className,
}: BehaviorWorkLogoProps) {
  const s = sizeClasses[size];

  return (
    <span
      className={cn(
        "relative inline-block tracking-[-0.08em]",
        s.text,
        className
      )}
      style={{ color }}
    >
      <span className="relative z-10">
        <span className="font-light">Behavior</span>
        <span className="font-extrabold">Work</span>
      </span>
      <span
        className={cn(
          "absolute left-0 z-0 rounded-full",
          s.bar
        )}
        style={{ backgroundColor: `${ACCENT_YELLOW}80` }}
      />
    </span>
  );
}

/**
 * Inline HTML version of the BehaviorWork logo for use in email templates.
 * Email clients don't support CSS classes, so this uses inline styles only.
 */
export function behaviorWorkLogoHtml(options?: {
  /** Font size in px (default: 24) */
  fontSize?: number;
  /** Text color (default: brand blue) */
  color?: string;
}): string {
  const fontSize = options?.fontSize ?? 24;
  const color = options?.color ?? BRAND_BLUE;
  const barHeight = Math.max(2, Math.round(fontSize / 6));
  const barBottom = Math.max(1, Math.round(fontSize / 8));

  return `<span style="display: inline-block; position: relative; font-size: ${fontSize}px; letter-spacing: -0.08em; color: ${color}; line-height: 1.2;"><!--
  --><span style="position: relative; z-index: 1;"><span style="font-weight: 300;">Behavior</span><span style="font-weight: 800;">Work</span></span><!--
  --><span style="position: absolute; left: 0; right: -8px; bottom: ${barBottom}px; height: ${barHeight}px; border-radius: 9999px; background-color: ${ACCENT_YELLOW}80; z-index: 0;"></span><!--
--></span>`;
}
