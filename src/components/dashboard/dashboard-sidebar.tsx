"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, CreditCard, FileText, GaugeCircle, Image, LogOut, LucideIcon, Mail, MapPin, Settings } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { signOut } from "@/lib/auth/actions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
};

// PRD 4.2: Dashboard navigation structure
const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/listing", label: "Listing Details", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/media", label: "Media", icon: Image },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

// Onboarding nav item shown when onboarding is incomplete
const onboardingNavItem: NavItem = { href: "/dashboard/onboarding", label: "Onboarding", icon: ClipboardList };

interface DashboardSidebarProps {
  isOnboardingComplete: boolean;
}

export function DashboardSidebar({ isOnboardingComplete }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnreadCount() {
      const result = await getUnreadInquiryCount();
      if (result.success && result.data) {
        setUnreadCount(result.data);
      }
    }
    fetchUnreadCount();
  }, [pathname]); // Refetch when pathname changes (e.g., after viewing inquiries)

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  // Build navigation items based on onboarding status
  const navItems = isOnboardingComplete
    ? dashboardNav
    : [onboardingNavItem, ...dashboardNav];

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 flex-none rounded-2xl border border-border/60 bg-muted/30 p-4 lg:flex lg:flex-col lg:justify-between">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Exact match for /dashboard (Overview), prefix match for all other routes
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.showBadge && unreadCount > 0;

          // Check if this item should be locked (not onboarding tab and onboarding incomplete)
          const isLocked = !isOnboardingComplete && item.href !== "/dashboard/onboarding";

          return (
            <Link
              key={item.href}
              href={isLocked ? item.href : item.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isLocked && "opacity-60",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Logout
        </Button>
      </div>
    </aside>
  );
}
