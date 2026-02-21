"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  GaugeCircle,
  Heart,
  Image as ImageIcon,
  LucideIcon,
  MapPin,
  Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./dashboard-sidebar";
import {
  getQuickLinkGroups,
  isNavItemActive,
  type NavItemConfig,
} from "./nav-config";

type QuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exactMatch?: boolean;
  aliases?: string[];
};

// Demo mode - simplified flat list (not driven by shared config)
const demoQuickLinks: QuickLink[] = [
  { href: "/demo", label: "Overview", icon: GaugeCircle, exactMatch: true },
  { href: "/demo/company", label: "Company", icon: FileText },
  { href: "/demo/locations", label: "Locations", icon: MapPin },
  { href: "/demo/media", label: "Media", icon: ImageIcon },
  { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/demo/inbox", label: "Inbox", icon: Bell },
];

// Helper to get page title from pathname for mobile header
function getPageTitle(pathname: string, isDemo: boolean): string {
  const basePath = isDemo ? "/demo" : "/dashboard";

  if (pathname === basePath) return "Dashboard";
  if (pathname.includes("/pipeline")) return "Pipeline";
  if (pathname.includes("/communications")) return "Communications";
  if (pathname.includes("/inbox") || pathname.includes("/notifications")) return "Notifications";
  if (pathname.includes("/leads")) return "Leads";
  if (pathname.includes("/intake-form") || pathname.includes("/intake-pages/intake")) return "Intake Form";
  if (pathname.includes("/contact-form")) return "Contact Form";
  if (pathname.includes("/directory")) return "Directory Listing";
  if (pathname.includes("/profile") || pathname.includes("/company")) return "Profile";
  if (pathname.includes("/locations")) return "Locations";
  if (pathname.includes("/media")) return "Media";
  if (pathname.includes("/analytics")) return "Analytics";
  if (pathname.includes("/forms")) return "Branded Forms";
  if (pathname.includes("/branding")) return "Brand Style";
  if (pathname.includes("/applicants")) return "Applicants";
  if (pathname.includes("/employees")) return "Employees";
  if (pathname.includes("/careers")) return "Careers Page";
  if (pathname.includes("/jobs")) return "Jobs";
  if (pathname.includes("/clients")) return "Clients";
  if (pathname.includes("/tasks")) return "Tasks";
  if (pathname.includes("/resources")) return "Resources";
  if (pathname.includes("/billing")) return "Billing";
  if (pathname.includes("/account")) return "Account";
  if (pathname.includes("/onboarding")) return "Onboarding";

  return "Dashboard";
}

export interface CompanyProfile {
  name: string;
  logoUrl?: string | null;
  planTier: "free" | "pro" | "enterprise";
  subscriptionStatus?: string | null;
}

interface DashboardTopbarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  /** Provider's listing slug for "View Listing" link */
  providerSlug?: string | null;
  /** Company profile to display in mobile header */
  companyProfile?: CompanyProfile;
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
  providerSlug,
  companyProfile,
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
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close mobile sheet on navigation
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Build quick link groups from shared config (memoised so it doesn't
  // recompute on every render).
  const quickLinkGroups = useMemo(() => getQuickLinkGroups(), []);

  // For demo / custom overrides we fall back to a flat list
  const useGroupedLinks = !isDemo && !customQuickLinks;
  const flatQuickLinks = customQuickLinks ?? (isDemo ? demoQuickLinks : []);

  const basePath = isDemo ? "/demo" : "/dashboard";

  // Helper to check if a link is active
  const isLinkActive = (link: QuickLink | NavItemConfig): boolean => {
    // NavItemConfig items use the shared helper
    if ("quickLink" in link) return isNavItemActive(link, pathname);

    if (link.exactMatch) return pathname === link.href;
    const pathsToMatch = [link.href, ...(link.aliases || [])];
    return pathsToMatch.some((p) =>
      link.href === basePath
        ? pathname === basePath || pathname === p
        : pathname === p || pathname.startsWith(p + "/")
    );
  };

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
  ) : providerSlug ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
          <span className="hidden sm:inline">View Pages</span>
          <span className="sm:hidden">View</span>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link
            href={`/provider/${providerSlug}`}
            target="_blank"
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4 text-[#5788FF]" aria-hidden />
            <span className="flex-1">Find ABA Therapy Profile</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/employers/${providerSlug}`}
            target="_blank"
            className="flex items-center gap-2"
          >
            <Briefcase className="h-4 w-4 text-emerald-600" aria-hidden />
            <span className="flex-1">Find ABA Jobs Profile</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <header className="border-b border-border/60 bg-background lg:hidden">
      <div className="container flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col overflow-hidden p-0 sm:w-80">
              <SheetHeader className="sr-only">
                <SheetTitle>{sheetTitle ?? (isDemo ? "Demo Dashboard" : "Dashboard")}</SheetTitle>
                <SheetDescription>
                  {sheetDescription ?? (isDemo ? "Explore the provider dashboard" : "Navigate your provider dashboard")}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                {sheetOpen && (mobileNavComponent ?? (
                  <DashboardSidebar
                    inSheet
                    isOnboardingComplete={isOnboardingComplete}
                    isDemo={isDemo}
                    providerSlug={providerSlug}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
          {/* Mobile header - show company logo or page title */}
          {companyProfile ? (
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-border/60">
                {companyProfile.logoUrl ? (
                  <NextImage
                    src={companyProfile.logoUrl}
                    alt={companyProfile.name}
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#5788FF]/10 text-[10px] font-bold text-[#5788FF]">
                    {companyProfile.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                )}
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {companyProfile.name}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {getPageTitle(pathname, isDemo)}
            </span>
          )}
        </div>
        {rightContent ?? defaultRightContent}
      </div>

      {/* Mobile Quick Links - horizontal scroll */}
      <div className="relative border-t border-border/40">
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
          className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto px-2 py-2"
        >
          {useGroupedLinks
            ? /* ── Grouped quick links with section labels & dividers ── */
              quickLinkGroups.map((group, groupIdx) => (
                <Fragment key={group.sectionId ?? "persistent"}>
                  {/* Divider between groups */}
                  {groupIdx > 0 && (
                    <div className="mx-0.5 h-5 w-px shrink-0 bg-border/60" aria-hidden />
                  )}

                  {/* Section label chip (skip for persistent items) */}
                  {group.sectionLabel && (
                    <span className="shrink-0 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group.sectionLabel}
                    </span>
                  )}

                  {/* Items in this group */}
                  {group.items.map((link) => {
                    const Icon = link.icon;
                    const isActive = isNavItemActive(link, pathname);

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        data-active={isActive}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {link.label}
                      </Link>
                    );
                  })}
                </Fragment>
              ))
            : /* ── Flat quick links (demo / custom) ── */
              flatQuickLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-active={isActive}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
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
