"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeColor =
  | "blue"
  | "emerald"
  | "teal"
  | "purple"
  | "amber"
  | "orange"
  | "cyan"
  | "pink";

interface ActiveFilterBadgeProps {
  /** Label to display in the badge */
  label: string;
  /** Color scheme for the badge */
  color?: BadgeColor;
  /** Called when the X is clicked to remove */
  onRemove: () => void;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
  /** Optional className */
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  blue: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  teal: "bg-teal-100 text-teal-700 hover:bg-teal-200",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  amber: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  orange: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  cyan: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
  pink: "bg-pink-100 text-pink-700 hover:bg-pink-200",
};

export function ActiveFilterBadge({
  label,
  color = "blue",
  onRemove,
  icon,
  className,
}: ActiveFilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer transition-colors",
        colorClasses[color],
        className
      )}
      onClick={onRemove}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
      <X className="ml-1 h-3 w-3" />
    </Badge>
  );
}
