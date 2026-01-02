"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  GaugeCircle,
  Image,
  LogOut,
  LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  Settings,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
};

// PRD 4.2: Dashboard navigation structure (matches sidebar)
const dashboardNav: MobileNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/company", label: "Company Details", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/media", label: "Media", icon: Image },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

// Demo navigation - subset of dashboard nav (no billing/settings)
const demoNav: MobileNavItem[] = [
  { href: "/demo", label: "Overview", icon: GaugeCircle },
  { href: "/demo/company", label: "Company Details", icon: FileText },
  { href: "/demo/locations", label: "Locations", icon: MapPin },
  { href: "/demo/media", label: "Media", icon: Image },
  { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/demo/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
];

// Onboarding nav item shown when onboarding is incomplete
const onboardingNavItem: MobileNavItem = {
  href: "/dashboard/onboarding",
  label: "Onboarding",
  icon: ClipboardList,
};

interface DashboardMobileNavProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  /** Custom nav items (overrides default nav) */
  customNavItems?: MobileNavItem[];
  /** Static unread count for demo mode */
  staticUnreadCount?: number;
}

export function DashboardMobileNav({
  isOnboardingComplete,
  isDemo = false,
  customNavItems,
  staticUnreadCount,
}: DashboardMobileNavProps) {
  const pathname = usePathname();

  // Determine nav items: custom > demo > dashboard with onboarding logic
  const navItems = customNavItems
    ?? (isDemo
      ? demoNav
      : isOnboardingComplete
        ? dashboardNav
        : [onboardingNavItem, ...dashboardNav]);

  // Get base path from first nav item
  const basePath = navItems[0]?.href.split("/")[1] ?? "dashboard";

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  return (
    <nav className="mt-6 flex flex-col gap-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        // Exact match for base path (Overview), prefix match for all other routes
        const isActive = item.href === `/${basePath}`
          ? pathname === `/${basePath}`
          : pathname === item.href || pathname.startsWith(item.href + "/");

        // Check if this item should be locked (not onboarding tab and onboarding incomplete)
        // Only applies to real dashboard, not demo
        const isLocked = !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";

        // Show badge if item has showBadge and there's an unread count
        const showBadge = item.showBadge && staticUnreadCount !== undefined && staticUnreadCount > 0;

        return (
          <SheetClose asChild key={item.href}>
            <Link
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-3 rounded-xl px-4 py-3 text-sm min-h-[44px]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                isLocked && "opacity-60"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {staticUnreadCount > 99 ? "99+" : staticUnreadCount}
                </span>
              )}
            </Link>
          </SheetClose>
        );
      })}

      <div className="my-4 h-px bg-border" />

      <SheetClose asChild>
        <Link
          href="/dashboard/feedback"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start gap-3 px-4 py-3 text-sm text-muted-foreground min-h-[44px]"
          )}
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
          Send Feedback
        </Link>
      </SheetClose>

      {isDemo ? (
        <p className="text-center text-xs text-muted-foreground">
          Demo mode - changes won&apos;t be saved
        </p>
      ) : (
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start gap-3 px-4 py-3 text-sm text-muted-foreground min-h-[44px]"
          )}
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Logout
        </button>
      )}
    </nav>
  );
}
