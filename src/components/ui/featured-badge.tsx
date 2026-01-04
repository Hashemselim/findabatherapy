import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeaturedBadgeProps {
  className?: string;
  /** Whether to show hover animation (useful when inside a group) */
  withHover?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Data attribute for tour targeting */
  "data-tour"?: string;
}

export function FeaturedBadge({ className, withHover = false, size = "default", "data-tour": dataTour }: FeaturedBadgeProps) {
  return (
    <Badge
      data-tour={dataTour}
      className={cn(
        "gap-1 border-[#FEE720] bg-[#FFF5C2] text-foreground",
        withHover && "transition-all duration-300 ease-premium group-hover:bg-[#FEE720]",
        size === "sm" && "text-xs",
        className
      )}
    >
      <Star className={cn("fill-[#5788FF] text-[#5788FF]", size === "sm" ? "h-3 w-3" : "h-3 w-3")} />
      Featured
    </Badge>
  );
}
