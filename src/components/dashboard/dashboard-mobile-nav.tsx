"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, CreditCard, FileText, GaugeCircle, Image, LogOut, LucideIcon, Mail, MapPin, Settings } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// PRD 4.2: Dashboard navigation structure (matches sidebar)
const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/listing", label: "Listing Details", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/media", label: "Media", icon: Image },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Contact Form Inbox", icon: Mail },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

// Onboarding nav item shown when onboarding is incomplete
const onboardingNavItem: NavItem = { href: "/dashboard/onboarding", label: "Onboarding", icon: ClipboardList };

interface DashboardMobileNavProps {
  isOnboardingComplete: boolean;
}

export function DashboardMobileNav({ isOnboardingComplete }: DashboardMobileNavProps) {
  const pathname = usePathname();

  // Build navigation items based on onboarding status
  const navItems = isOnboardingComplete
    ? dashboardNav
    : [onboardingNavItem, ...dashboardNav];

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
        // Exact match for /dashboard (Overview), prefix match for all other routes
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(item.href + "/");

        // Check if this item should be locked (not onboarding tab and onboarding incomplete)
        const isLocked = !isOnboardingComplete && item.href !== "/dashboard/onboarding";

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
                isLocked && "opacity-60",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          </SheetClose>
        );
      })}

      <div className="my-4 h-px bg-border" />

      <button
        type="button"
        onClick={handleLogout}
        className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-3 px-4 py-3 text-sm text-muted-foreground min-h-[44px]")}
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Logout
      </button>
    </nav>
  );
}
