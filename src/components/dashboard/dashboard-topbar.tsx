"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileInput,
  FileText,
  GaugeCircle,
  Heart,
  Image as ImageIcon,
  Link2,
  LucideIcon,
  Mail,
  MapPin,
  Menu,
  UserPlus,
} from "lucide-react";

import { brandColors } from "@/config/brands";
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
import { DashboardMobileNav } from "./dashboard-mobile-nav";

type QuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exactMatch?: boolean;
};

type QuickLinkSection = {
  id: string;
  label?: string;
  icon?: LucideIcon;
  color?: string;
  links: QuickLink[];
};

// Company brand color (neutral slate) - matches sidebar
const companyColor = "#64748B";

// Section-based quick links for mobile horizontal scroll
const dashboardQuickLinkSections: QuickLinkSection[] = [
  {
    id: "overview",
    links: [{ href: "/dashboard", label: "Dashboard", icon: GaugeCircle }],
  },
  {
    id: "company",
    label: "Company",
    icon: Building2,
    color: companyColor,
    links: [
      { href: "/dashboard/company", label: "Profile", icon: FileText },
      { href: "/dashboard/locations", label: "Locations", icon: MapPin },
      { href: "/dashboard/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    id: "therapy",
    label: "Therapy",
    icon: Heart,
    color: brandColors.therapy,
    links: [
      { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/intake", label: "Intake", icon: FileInput },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: Briefcase,
    color: brandColors.jobs,
    links: [
      { href: "/dashboard/jobs", label: "Postings", icon: Briefcase, exactMatch: true },
      { href: "/dashboard/jobs/applications", label: "Applications", icon: UserPlus },
      { href: "/dashboard/jobs/careers", label: "Careers", icon: Link2 },
    ],
  },
];

// Demo mode sections - simplified flat list
const demoQuickLinkSections: QuickLinkSection[] = [
  {
    id: "demo",
    links: [
      { href: "/demo", label: "Overview", icon: GaugeCircle },
      { href: "/demo/company", label: "Company", icon: FileText },
      { href: "/demo/locations", label: "Locations", icon: MapPin },
      { href: "/demo/media", label: "Media", icon: ImageIcon },
      { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/demo/inbox", label: "Inbox", icon: Mail },
    ],
  },
];

// Helper to get page title from pathname for mobile header
function getPageTitle(pathname: string, isDemo: boolean): string {
  const basePath = isDemo ? "/demo" : "/dashboard";

  if (pathname === basePath) return "Dashboard";
  if (pathname.includes("/company")) return "Company";
  if (pathname.includes("/locations")) return "Locations";
  if (pathname.includes("/media")) return "Media";
  if (pathname.includes("/inbox")) return "Inbox";
  if (pathname.includes("/analytics")) return "Analytics";
  if (pathname.includes("/intake")) return "Intake Form";
  if (pathname.includes("/jobs/applications")) return "Applications";
  if (pathname.includes("/jobs/careers")) return "Careers Page";
  if (pathname.includes("/jobs")) return "Job Postings";
  if (pathname.includes("/clients")) return "Clients";
  if (pathname.includes("/team")) return "Team";
  if (pathname.includes("/account")) return "Account";
  if (pathname.includes("/onboarding")) return "Onboarding";

  return "Dashboard";
}

interface DashboardTopbarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  /** Provider's listing slug for "View Listing" link */
  providerSlug?: string | null;
  /** Custom quick link sections for the mobile nav */
  customQuickLinkSections?: QuickLinkSection[];
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
  customQuickLinkSections,
  mobileNavComponent,
  sheetTitle,
  sheetDescription,
  rightContent,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Determine which quick link sections to use
  const quickLinkSections = customQuickLinkSections ?? (isDemo ? demoQuickLinkSections : dashboardQuickLinkSections);
  const basePath = isDemo ? "/demo" : "/dashboard";

  // Helper to check if a link is active
  const isLinkActive = (link: QuickLink): boolean => {
    if (link.exactMatch) {
      return pathname === link.href;
    }
    return link.href === basePath
      ? pathname === basePath
      : pathname === link.href || pathname.startsWith(link.href + "/");
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
          <Sheet>
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
            <SheetContent side="left" className="flex w-72 flex-col overflow-hidden sm:w-80">
              <SheetHeader>
                <SheetTitle>{sheetTitle ?? (isDemo ? "Demo Dashboard" : "Dashboard")}</SheetTitle>
                <SheetDescription>
                  {sheetDescription ?? (isDemo ? "Explore the provider dashboard" : "Navigate your provider dashboard")}
                </SheetDescription>
              </SheetHeader>
              <div className="-mx-6 flex-1 overflow-y-auto px-6">
                {mobileNavComponent ?? (
                  <DashboardMobileNav isOnboardingComplete={isOnboardingComplete} isDemo={isDemo} providerSlug={providerSlug} />
                )}
              </div>
            </SheetContent>
          </Sheet>
          {/* Mobile page context - show current section */}
          <span className="text-sm font-medium text-foreground">
            {getPageTitle(pathname, isDemo)}
          </span>
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
          {quickLinkSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            const sectionColor = section.color;
            const hasBrandLabel = section.label && SectionIcon && sectionColor;

            return (
              <div key={section.id} className="flex shrink-0 items-center gap-1.5">
                {/* Brand section label - full height with left border */}
                {hasBrandLabel && (
                  <span
                    className="flex shrink-0 items-center gap-1.5 self-stretch border-l-2 pl-3 pr-1"
                    style={{ borderLeftColor: sectionColor }}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ backgroundColor: sectionColor }}
                    >
                      <SectionIcon className="h-3 w-3 text-white" aria-hidden />
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: sectionColor }}
                    >
                      {section.label}
                    </span>
                  </span>
                )}

                {/* Section links */}
                {section.links.map((link) => {
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
                          ? sectionColor
                            ? "text-white shadow-sm"
                            : "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      style={isActive && sectionColor ? { backgroundColor: sectionColor } : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
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
