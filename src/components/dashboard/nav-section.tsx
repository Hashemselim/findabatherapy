"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
  proBadge?: boolean;
  isPlaceholder?: boolean;
  /** If true, opens in new tab with external link icon */
  isExternal?: boolean;
  /** If true, only matches exact path (not child routes) */
  exactMatch?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  icon?: LucideIcon;
  brandColor?: string;
  isCollapsible?: boolean;
  defaultOpen?: boolean;
  items: NavItem[];
};

interface NavSectionProps {
  section: NavSection;
  pathname: string;
  getBadgeCount: (href: string) => number;
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  /** Controlled mode: whether the section is open */
  controlledOpen?: boolean;
  /** Controlled mode: callback when toggle is clicked */
  onToggle?: () => void;
  /** Whether this section is the current brand context */
  isCurrentBrand?: boolean;
  /** Total badge count for collapsed section display */
  sectionBadgeCount?: number;
}

export function NavSectionComponent({
  section,
  pathname,
  getBadgeCount,
  isOnboardingComplete,
  isDemo = false,
  controlledOpen,
  onToggle,
  isCurrentBrand = false,
  sectionBadgeCount = 0,
}: NavSectionProps) {
  // Use internal state if not controlled
  const [internalOpen, setInternalOpen] = useState(section.defaultOpen ?? true);

  // Determine if we're in controlled mode
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled
    ? () => onToggle?.()
    : setInternalOpen;

  // Check if any child is active
  const hasActiveChild = section.items.some((item) => {
    const itemPath = item.href.replace("/dashboard", "");
    return itemPath === ""
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");
  });

  // Get brand color for active states
  const brandColor = section.brandColor || "#6B7280";

  // Render a single nav item
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const itemPath = item.href.replace("/dashboard", "");

    // External links are never "active" in the navigation sense
    // exactMatch items only match their exact path, not child routes
    const isActive = item.isExternal
      ? false
      : item.exactMatch
        ? pathname === item.href
        : itemPath === "" || itemPath === "/dashboard"
          ? pathname === "/dashboard" || pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");

    // Get badge count for this item
    const badgeCount = item.showBadge ? getBadgeCount(item.href) : 0;
    const showBadge = item.showBadge && badgeCount > 0;

    // Check if this item should be locked
    const isLocked =
      !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";

    const linkContent = (
      <>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex flex-1 items-center gap-1.5">
          {item.label}
          {item.proBadge && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-700"
              )}
            >
              Pro
            </span>
          )}
          {item.isPlaceholder && (
            <Badge
              variant="outline"
              className="ml-auto bg-purple-50 px-1.5 py-0 text-[10px] text-purple-600"
            >
              Soon
            </Badge>
          )}
        </span>
        {showBadge && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
              isActive
                ? "bg-white/20 text-white"
                : "text-white"
            )}
            style={!isActive ? { backgroundColor: brandColor } : undefined}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
        {item.isExternal && (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        )}
      </>
    );

    const linkClassName = cn(
      buttonVariants({ variant: "ghost" }),
      "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "shadow-sm text-white"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      isLocked && "opacity-60"
    );

    // Active style with brand color
    const activeStyle = isActive
      ? { backgroundColor: brandColor }
      : undefined;

    // External links use <a> with target="_blank"
    if (item.isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          style={activeStyle}
        >
          {linkContent}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={linkClassName}
        style={activeStyle}
      >
        {linkContent}
      </Link>
    );
  };

  // If section has only one item and no label (like Overview), just render the item
  if (!section.isCollapsible && section.items.length === 1) {
    return <div className="space-y-1">{renderNavItem(section.items[0])}</div>;
  }

  // If not collapsible, render items with a section header
  if (!section.isCollapsible) {
    return (
      <div className="space-y-1">
        {section.label && (
          <div className="flex items-center gap-2 px-3 py-2">
            {section.icon && (
              <section.icon
                className="h-4 w-4"
                style={{ color: section.brandColor }}
              />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </span>
          </div>
        )}
        {section.items.map(renderNavItem)}
      </div>
    );
  }

  // Collapsible section with full-color header
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="rounded-xl overflow-hidden transition-all"
        style={{
          borderLeft: hasActiveChild ? `3px solid ${brandColor}` : "3px solid transparent",
        }}
      >
        <CollapsibleTrigger
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition-all"
          style={{
            backgroundColor: `${brandColor}15`,
          }}
        >
          <div className="flex items-center gap-2.5">
            {section.icon && (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ backgroundColor: brandColor }}
              >
                <section.icon className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <span
              className="text-sm font-semibold"
              style={{ color: brandColor }}
            >
              {section.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Show badge on collapsed state only */}
            {!isOpen && sectionBadgeCount > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {sectionBadgeCount > 99 ? "99+" : sectionBadgeCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              style={{ color: brandColor }}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent
          className="space-y-1 px-2 pb-2 pt-1"
          style={{ backgroundColor: `${brandColor}08` }}
        >
          {section.items.map(renderNavItem)}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
