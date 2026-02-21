"use client";

import { type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  MessageSquare,
  User,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SheetClose } from "@/components/ui/sheet";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import {
  persistentItems,
  sectionNav,
  onboardingNavItem,
  isNavItemActive,
  type NavItemConfig,
} from "./nav-config";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  showBadge?: boolean;
  isExternal?: boolean;
  exactMatch?: boolean;
  aliases?: string[];
  proBadge?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DashboardMobileNavProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  customNavItems?: MobileNavItem[];
  staticUnreadCount?: number;
  badgeCounts?: Record<string, number>;
  providerSlug?: string | null;
}

export function DashboardMobileNav({
  isOnboardingComplete,
  isDemo = false,
  customNavItems,
  staticUnreadCount,
  badgeCounts = {},
  providerSlug,
}: DashboardMobileNavProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    document.cookie = "dev_bypass=; path=/; max-age=0";
    await signOut();
  };

  const getBadgeCount = (href: string): number => {
    if (badgeCounts[href]) return badgeCounts[href];
    if (staticUnreadCount !== undefined && (href === "/dashboard/notifications" || href === "/dashboard/inbox")) {
      return staticUnreadCount;
    }
    return 0;
  };

  const renderNavItem = (item: NavItemConfig | MobileNavItem) => {
    const Icon = item.icon;
    const isActive = isNavItemActive(item as NavItemConfig, pathname);
    const isLocked = !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";
    const badgeCount = item.showBadge ? getBadgeCount(item.href) : 0;

    const className = cn(
      buttonVariants({ variant: "ghost" }),
      "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      isLocked && "pointer-events-none opacity-60"
    );

    const content = (
      <>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex flex-1 items-center gap-1.5">
          {item.label}
          {item.proBadge && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
              )}
            >
              Pro
            </span>
          )}
        </span>
        {badgeCount > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
              isActive ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
            )}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </>
    );

    if ("isExternal" in item && item.isExternal) {
      return (
        <SheetClose asChild key={item.href}>
          <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
            {content}
          </a>
        </SheetClose>
      );
    }

    return (
      <SheetClose asChild key={item.href}>
        <Link href={item.href} className={className}>
          {content}
        </Link>
      </SheetClose>
    );
  };

  // Custom nav items mode (demo)
  if (customNavItems) {
    return (
      <nav className="mt-6 flex flex-col gap-1">
        {customNavItems.map((item) => renderNavItem(item))}
      </nav>
    );
  }

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {/* Onboarding item if needed */}
      {!isOnboardingComplete && !isDemo && renderNavItem(onboardingNavItem)}

      {/* Persistent items: Notifications & Tasks */}
      {persistentItems.map((item) => renderNavItem(item))}

      <div className="my-2 h-px bg-border" />

      {/* Section groups - driven from shared config */}
      {sectionNav.map((section) => {
        const SectionIcon = section.icon;
        const hasActiveChild = section.items.some((item) => isNavItemActive(item, pathname));

        return (
          <Collapsible key={section.id} defaultOpen={section.id === "clients"}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50">
              <div className="flex items-center gap-2.5">
                <SectionIcon
                  className={cn(
                    "h-4 w-4",
                    hasActiveChild ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    hasActiveChild ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {section.label}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pl-2 pt-0.5">
              {section.items.map((item) => renderNavItem(item))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <div className="my-4 h-px bg-border" />

      {/* Bottom utilities */}
      <div className="space-y-1">
        <SheetClose asChild>
          <Link
            href="/dashboard/account"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/dashboard/account")
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <User className="h-4 w-4" aria-hidden />
            Account
          </Link>
        </SheetClose>

        <SupportContactDialog>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            Need Help?
          </button>
        </SupportContactDialog>

        <SheetClose asChild>
          <Link
            href="/dashboard/feedback"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Send Feedback
          </Link>
        </SheetClose>

        {isDemo ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo mode - changes won&apos;t be saved
          </p>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
