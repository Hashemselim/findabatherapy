"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

interface BehaviorWorkCtaButtonProps {
  href: string;
  label: string;
  section: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function BehaviorWorkCtaButton({
  href,
  label,
  section,
  variant = "default",
  size = "default",
  className,
}: BehaviorWorkCtaButtonProps) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      onClick={() =>
        trackBehaviorWorkCtaClick({
          section,
          ctaLabel: label,
          destination: href,
          source: "behaviorwork",
        })
      }
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}
