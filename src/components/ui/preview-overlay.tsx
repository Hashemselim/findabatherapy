"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PreviewOverlayProps {
  children: React.ReactNode;
  isPreview: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function PreviewOverlay({
  children,
  isPreview,
  showLabel = true,
  label = "Example data",
  className,
}: PreviewOverlayProps) {
  if (!isPreview) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {showLabel && (
        <Badge
          variant="outline"
          className="absolute right-2 top-2 z-10 border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-300"
        >
          {label}
        </Badge>
      )}
      <div className="pointer-events-none select-none opacity-60">
        {children}
      </div>
    </div>
  );
}
