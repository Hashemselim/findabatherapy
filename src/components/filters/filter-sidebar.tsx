"use client";

import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AccentColor = "blue" | "emerald";

interface FilterSidebarProps {
  /** Filter content to render */
  children: ReactNode;
  /** Theme color for icons/buttons */
  accentColor?: AccentColor;
  /** Number of active filters (shown as badge on mobile trigger) */
  activeFilterCount?: number;
  /** Called to apply filters (required for mobile Sheet) */
  onApply?: () => void;
  /** Called to clear all filters */
  onClear?: () => void;
  /** Called when filters should auto-apply (desktop mode) */
  onAutoApply?: () => void;
  /** Title for the sidebar/sheet header */
  title?: string;
  /** Description for the sheet (mobile only) */
  description?: string;
  /** Additional className for the container */
  className?: string;
  /** Whether auto-apply should be disabled (useful while editing location) */
  disableAutoApply?: boolean;
}

const accentColors: Record<AccentColor, {
  iconBg: string;
  iconText: string;
  buttonBg: string;
  buttonHover: string;
  buttonBorder: string;
  clearHover: string;
}> = {
  blue: {
    iconBg: "bg-[#5788FF]/10",
    iconText: "text-[#5788FF]",
    buttonBg: "bg-[#FEE720]",
    buttonHover: "hover:bg-[#FFF5C2]",
    buttonBorder: "border-[#FEE720]",
    clearHover: "hover:text-[#5788FF] hover:border-[#5788FF]/50",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
    buttonBg: "bg-emerald-600",
    buttonHover: "hover:bg-emerald-700",
    buttonBorder: "border-emerald-600",
    clearHover: "hover:text-emerald-600 hover:border-emerald-500/50",
  },
};

export function FilterSidebar({
  children,
  accentColor = "blue",
  activeFilterCount = 0,
  onApply,
  onClear,
  onAutoApply,
  title = "Filters",
  description = "Narrow down your search results",
  className,
  disableAutoApply = false,
}: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = accentColors[accentColor];

  // Handle apply from mobile sheet
  const handleApply = () => {
    onApply?.();
    setIsOpen(false);
  };

  // Handle clear
  const handleClear = () => {
    onClear?.();
    if (isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <div className={className}>
      {/* Mobile Filter Button + Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 lg:hidden">
            <Filter className="h-4 w-4" />
            {title}
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {/* Scrollable filter content */}
          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4">
            {children}
          </div>
          {/* Sticky footer with Apply button */}
          <div className="sticky bottom-0 border-t bg-background pt-4 pb-2">
            <div className="flex gap-2">
              <Button
                onClick={handleApply}
                className={cn(
                  "flex-1 font-semibold transition-all duration-300 ease-premium",
                  accentColor === "emerald"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]"
                )}
              >
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className={cn("text-muted-foreground", colors.clearHover)}
              >
                Clear
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - filters auto-apply with debounce */}
      <div className="hidden lg:block">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", colors.iconBg)}>
              <Filter className={cn("h-5 w-5", colors.iconText)} />
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {activeFilterCount > 0 && onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className={cn("text-muted-foreground", colors.clearHover)}
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
