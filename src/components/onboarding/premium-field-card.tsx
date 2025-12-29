"use client";

import { type ReactNode } from "react";
import { Lock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PremiumFieldCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Whether the user has paid and this field is unlocked */
  isPaid: boolean;
  /** Form fields or content to render */
  children: ReactNode;
  /** Optional additional class names */
  className?: string;
}

/**
 * A card wrapper for premium fields in onboarding.
 * When isPaid is false, shows a lock icon and blurs the content.
 * When isPaid is true, renders content normally.
 */
export function PremiumFieldCard({
  title,
  description,
  isPaid,
  children,
  className,
}: PremiumFieldCardProps) {
  return (
    <Card
      className={cn(
        "border-border/60 transition-all",
        !isPaid && "border-dashed opacity-75",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {title}
          {!isPaid && <Lock className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPaid ? (
          children
        ) : (
          <div className="pointer-events-none select-none blur-[2px]" aria-hidden="true">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
