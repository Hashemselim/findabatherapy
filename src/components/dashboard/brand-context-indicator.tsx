"use client";

import { Briefcase, Heart } from "lucide-react";
import { brandsConfig, brandColors } from "@/config/brands";
import { cn } from "@/lib/utils";

type BrandSection = "jobs" | "therapy";

interface BrandContextIndicatorProps {
  /** Current brand section the user is in */
  currentBrand: BrandSection | null;
  /** Optional additional className */
  className?: string;
}

const brandConfig: Record<
  BrandSection,
  {
    name: string;
    color: string;
    icon: typeof Briefcase;
  }
> = {
  jobs: {
    name: brandsConfig.findABAJobs.name,
    color: brandColors.jobs,
    icon: Briefcase,
  },
  therapy: {
    name: brandsConfig.findABATherapy.name,
    color: brandColors.therapy,
    icon: Heart,
  },
};

/**
 * Shows the current brand context when user is in a brand-specific section.
 * Displays a small pill with the brand icon and name.
 */
export function BrandContextIndicator({
  currentBrand,
  className,
}: BrandContextIndicatorProps) {
  // Don't show if not in a brand section or on Company pages
  if (!currentBrand || !(currentBrand in brandConfig)) {
    return null;
  }

  const brand = brandConfig[currentBrand];
  const Icon = brand.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
        className
      )}
      style={{
        backgroundColor: `${brand.color}15`,
        color: brand.color,
      }}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{brand.name}</span>
    </div>
  );
}
