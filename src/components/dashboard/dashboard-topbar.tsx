"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  GaugeCircle,
  Image as ImageIcon,
  LucideIcon,
  Mail,
  MapPin,
  Menu,
  Settings,
} from "lucide-react";

import { siteConfig } from "@/config/site";
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
import { DashboardMobileNav } from "./dashboard-mobile-nav";

type QuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Quick links for mobile horizontal scroll - dashboard version (all nav items)
const dashboardQuickLinks: QuickLink[] = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/company", label: "Company", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/media", label: "Media", icon: ImageIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// Quick links for demo mode (subset of nav items)
const demoQuickLinks: QuickLink[] = [
  { href: "/demo", label: "Overview", icon: GaugeCircle },
  { href: "/demo/company", label: "Company", icon: FileText },
  { href: "/demo/locations", label: "Locations", icon: MapPin },
  { href: "/demo/media", label: "Media", icon: ImageIcon },
  { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/demo/inbox", label: "Inbox", icon: Mail },
];

interface DashboardTopbarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  /** Custom quick links for the mobile nav */
  customQuickLinks?: QuickLink[];
  /** Custom mobile nav component for demo mode */
  mobileNavComponent?: React.ReactNode;
  /** Title for the mobile sheet */
  sheetTitle?: string;
  /** Description for the mobile sheet */
  sheetDescription?: string;
  /** Right side content (for demo: sign up buttons, for dashboard: notifications) */
  rightContent?: React.ReactNode;
}

export function DashboardTopbar({
  isOnboardingComplete,
  isDemo = false,
  customQuickLinks,
  mobileNavComponent,
  sheetTitle,
  sheetDescription,
  rightContent,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Determine which quick links to use
  const quickLinks = customQuickLinks ?? (isDemo ? demoQuickLinks : dashboardQuickLinks);
  const basePath = isDemo ? "/demo" : "/dashboard";

  // Check scroll position and update indicators
  const updateScrollIndicators = () => {
    const nav = navRef.current;
    if (!nav) return;

    const { scrollLeft, scrollWidth, clientWidth } = nav;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  // Scroll to active item on mount and when pathname changes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Find the active link element
    const activeLink = nav.querySelector("[data-active='true']") as HTMLElement;
    if (activeLink) {
      // Scroll to center the active item
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const scrollLeft = activeLink.offsetLeft - navRect.width / 2 + linkRect.width / 2;
      nav.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
    }

    // Initial check for scroll indicators
    setTimeout(updateScrollIndicators, 100);
  }, [pathname]);

  // Update indicators on scroll
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    nav.addEventListener("scroll", updateScrollIndicators);
    window.addEventListener("resize", updateScrollIndicators);

    return () => {
      nav.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, []);

  // Default right content based on mode
  const defaultRightContent = isDemo ? (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Button asChild variant="outline" size="sm" className="hidden rounded-full sm:inline-flex">
        <Link href="/get-listed">View Pricing</Link>
      </Button>
      <Button asChild size="sm" className="shrink-0 whitespace-nowrap rounded-full px-3 text-xs sm:px-4 sm:text-sm">
        <Link href="/auth/sign-up?from=demo">Sign Up</Link>
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
        <Bell className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  );

  return (
    <header className="border-b border-border/60 bg-background">
      <div className="container flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:w-80">
              <SheetHeader>
                <SheetTitle>{sheetTitle ?? (isDemo ? "Demo Dashboard" : "Dashboard")}</SheetTitle>
                <SheetDescription>
                  {sheetDescription ?? (isDemo ? "Explore the provider dashboard" : "Navigate your provider dashboard")}
                </SheetDescription>
              </SheetHeader>
              {mobileNavComponent ?? (
                <DashboardMobileNav isOnboardingComplete={isOnboardingComplete} isDemo={isDemo} />
              )}
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex min-w-0 shrink items-center">
            <Image
              src="/logo-full.png"
              alt={siteConfig.name}
              width={540}
              height={55}
              className="h-6 w-auto min-w-0 sm:h-8"
              priority
            />
          </Link>
        </div>
        {rightContent ?? defaultRightContent}
      </div>

      {/* Mobile Quick Links - horizontal scroll */}
      <div className="relative border-t border-border/40 lg:hidden">
        {/* Left scroll indicator */}
        <div
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-background via-background/80 to-transparent pl-1 pr-4 transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>

        <nav
          ref={navRef}
          className="scrollbar-hide flex gap-1 overflow-x-auto px-2 py-2"
        >
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === basePath
                ? pathname === basePath
                : pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={isActive}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right scroll indicator */}
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 z-10 flex h-full items-center bg-gradient-to-l from-background via-background/80 to-transparent pl-4 pr-1 transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </header>
  );
}
