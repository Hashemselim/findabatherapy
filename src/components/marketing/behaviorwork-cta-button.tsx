"use client";

import Link from "next/link";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

interface BehaviorWorkCtaButtonProps {
  href: string;
  label: string;
  section: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
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
