"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  Eye,
  FileInput,
  FileText,
  GaugeCircle,
  Heart,
  HelpCircle,
  Image,
  Link2,
  LogOut,
  LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  User,
  UserCircle,
  UserPlus,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { brandColors } from "@/config/brands";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
  isPlaceholder?: boolean;
  isExternal?: boolean;
};

export type MobileNavSection = {
  id: string;
  label: string;
  icon?: LucideIcon;
  brandColor?: string;
  items: MobileNavItem[];
};

// Company brand color (neutral slate)
const companyColor = "#64748B";

// Section-based mobile navigation (matches sidebar structure)
const dashboardNavSections: MobileNavSection[] = [
  {
    id: "overview",
    label: "",
    items: [{ href: "/dashboard", label: "Dashboard", icon: GaugeCircle }],
  },
  {
    id: "company",
    label: "Company Details",
    icon: Building2,
    brandColor: companyColor,
    items: [
      { href: "/dashboard/company", label: "Company Profile", icon: FileText },
      { href: "/dashboard/locations", label: "Locations", icon: MapPin },
      { href: "/dashboard/media", label: "Media", icon: Image },
    ],
  },
  {
    id: "therapy",
    label: "Find ABA Therapy",
    icon: Heart,
    brandColor: brandColors.therapy,
    items: [
      { href: "/dashboard/inbox", label: "Inbox", icon: Mail, showBadge: true },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/intake", label: "Intake Form", icon: FileInput },
    ],
  },
  {
    id: "jobs",
    label: "Find ABA Jobs",
    icon: Briefcase,
    brandColor: brandColors.jobs,
    items: [
      { href: "/dashboard/jobs", label: "Job Postings", icon: Briefcase },
      { href: "/dashboard/jobs/applications", label: "Applications", icon: UserPlus, showBadge: true },
      { href: "/dashboard/jobs/careers", label: "Careers Page", icon: Link2 },
    ],
  },
  {
    id: "crm",
    label: "Team & CRM",
    icon: Users,
    brandColor: brandColors.crm,
    items: [
      { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
      { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/dashboard/team", label: "Staff / Team", icon: Users, isPlaceholder: true },
    ],
  },
];

// Demo navigation - simplified flat list
const demoNavSections: MobileNavSection[] = [
  {
    id: "demo",
    label: "",
    items: [
      { href: "/demo", label: "Overview", icon: GaugeCircle },
      { href: "/demo/company", label: "Company Details", icon: FileText },
      { href: "/demo/locations", label: "Locations", icon: MapPin },
      { href: "/demo/media", label: "Media", icon: Image },
      { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/demo/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
    ],
  },
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
  /** Badge counts by href */
  badgeCounts?: Record<string, number>;
  /** Provider's listing slug for "View Profile" links */
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
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  // Get badge count for an item
  const getBadgeCount = (href: string): number => {
    if (badgeCounts[href]) return badgeCounts[href];
    // Fallback for demo mode
    if (staticUnreadCount !== undefined && href.includes("/inbox")) {
      return staticUnreadCount;
    }
    return 0;
  };

  // Build navigation sections
  const getNavSections = (): MobileNavSection[] => {
    // If custom nav items provided, wrap in single section
    if (customNavItems) {
      return [{ id: "custom", label: "", items: customNavItems }];
    }

    if (isDemo) {
      return demoNavSections;
    }

    // Inject "View Profile" items when providerSlug is available
    const sectionsWithProfiles = providerSlug
      ? dashboardNavSections.map((section) => {
          if (section.id === "jobs") {
            return {
              ...section,
              items: [
                ...section.items,
                {
                  href: `/employers/${providerSlug}`,
                  label: "View Profile",
                  icon: Eye,
                  isExternal: true,
                },
              ],
            };
          }
          if (section.id === "therapy") {
            return {
              ...section,
              items: [
                ...section.items,
                {
                  href: `/provider/${providerSlug}`,
                  label: "View Profile",
                  icon: Eye,
                  isExternal: true,
                },
              ],
            };
          }
          return section;
        })
      : dashboardNavSections;

    // If onboarding incomplete, add onboarding item first
    if (!isOnboardingComplete) {
      return [
        { id: "onboarding", label: "", items: [onboardingNavItem] },
        ...sectionsWithProfiles,
      ];
    }

    return sectionsWithProfiles;
  };

  const navSections = getNavSections();
  const basePath = isDemo ? "/demo" : "/dashboard";

  // Render a single nav item with brand color support
  const renderNavItem = (item: MobileNavItem, brandColor: string) => {
    const Icon = item.icon;
    // External links are never "active"
    const isActive = item.isExternal
      ? false
      : item.href === basePath
        ? pathname === basePath
        : pathname === item.href || pathname.startsWith(item.href + "/");

    const isLocked =
      !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";

    const badgeCount = item.showBadge ? getBadgeCount(item.href) : 0;
    const showBadge = item.showBadge && badgeCount > 0;

    const linkContent = (
      <>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex flex-1 items-center gap-1.5">
          {item.label}
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
              isActive ? "bg-white/20 text-white" : "text-white"
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
      "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
      isActive
        ? "shadow-sm text-white"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      isLocked && "opacity-60"
    );

    // Active style with brand color
    const activeStyle = isActive ? { backgroundColor: brandColor } : undefined;

    // External links use <a> with target="_blank"
    if (item.isExternal) {
      return (
        <SheetClose asChild key={item.href}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            style={activeStyle}
          >
            {linkContent}
          </a>
        </SheetClose>
      );
    }

    return (
      <SheetClose asChild key={item.href}>
        <Link href={item.href} className={linkClassName} style={activeStyle}>
          {linkContent}
        </Link>
      </SheetClose>
    );
  };

  // Check if section has an active child
  const sectionHasActiveChild = (section: MobileNavSection): boolean => {
    return section.items.some((item) => {
      if (item.isExternal) return false;
      return item.href === basePath
        ? pathname === basePath
        : pathname === item.href || pathname.startsWith(item.href + "/");
    });
  };

  return (
    <nav className="mt-6 flex flex-col gap-2">
      {navSections.map((section) => {
        const brandColor = section.brandColor || "#6B7280";
        const hasActiveChild = sectionHasActiveChild(section);

        // Non-labeled sections (like overview) render items directly
        if (!section.label) {
          return (
            <div key={section.id} className="space-y-1">
              {section.items.map((item) => renderNavItem(item, brandColor))}
            </div>
          );
        }

        // Labeled sections get the styled container matching desktop
        return (
          <div
            key={section.id}
            className="rounded-xl overflow-hidden transition-all"
            style={{
              borderLeft: hasActiveChild
                ? `3px solid ${brandColor}`
                : "3px solid transparent",
            }}
          >
            {/* Section header - matches desktop style */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              {section.icon && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ backgroundColor: brandColor }}
                >
                  <section.icon className="h-3.5 w-3.5 text-white" aria-hidden />
                </div>
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: brandColor }}
              >
                {section.label}
              </span>
            </div>

            {/* Section items with tinted background */}
            <div
              className="space-y-1 px-2 pb-2 pt-1"
              style={{ backgroundColor: `${brandColor}08` }}
            >
              {section.items.map((item) => renderNavItem(item, brandColor))}
            </div>
          </div>
        );
      })}

      <div className="my-4 h-px bg-border" />

      {/* Bottom actions - Account, Help, Feedback, Logout */}
      <div className="space-y-1">
        <SheetClose asChild>
          <Link
            href="/dashboard/account"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/dashboard/account") ||
                pathname === "/dashboard/billing" ||
                pathname === "/dashboard/settings"
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
