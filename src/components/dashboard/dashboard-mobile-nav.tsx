"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Eye,
  FileInput,
  FileText,
  FolderOpen,
  GaugeCircle,
  Globe,
  HelpCircle,
  Image,
  LogOut,
  LucideIcon,
  MapPin,
  MessageSquare,
  User,
  UserCheck,
  UserCircle,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
  isPlaceholder?: boolean;
  isExternal?: boolean;
  exactMatch?: boolean;
};

// Main navigation items - direct links (matches sidebar)
const mainNavItems: MobileNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeCircle, exactMatch: true },
  { href: "/dashboard/inbox", label: "Notifications", icon: Bell, showBadge: true },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
  { href: "/dashboard/employees", label: "Employees", icon: UserCheck, showBadge: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

// Company dropdown items
const companyDropdownItems: MobileNavItem[] = [
  { href: "/dashboard/company", label: "Profile", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
];

// Branded Pages dropdown items
const brandedPagesDropdownItems: MobileNavItem[] = [
  { href: "/dashboard/forms", label: "Forms", icon: FileInput },
  { href: "/dashboard/careers", label: "Careers Page", icon: Globe },
  { href: "/dashboard/resources/clients", label: "Client Resources", icon: FolderOpen },
  { href: "/dashboard/resources/employees", label: "Employee Resources", icon: FolderOpen, isPlaceholder: true },
];

// Demo navigation - simplified flat list
const demoNavItems: MobileNavItem[] = [
  { href: "/demo", label: "Overview", icon: GaugeCircle, exactMatch: true },
  { href: "/demo/company", label: "Company Details", icon: FileText },
  { href: "/demo/locations", label: "Locations", icon: MapPin },
  { href: "/demo/media", label: "Media", icon: Image },
  { href: "/demo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/demo/inbox", label: "Contact Form Inbox", icon: Bell, showBadge: true },
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
  const [companyOpen, setCompanyOpen] = useState(false);
  const [brandedPagesOpen, setBrandedPagesOpen] = useState(false);

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  const basePath = isDemo ? "/demo" : "/dashboard";

  // Get badge count for an item
  const getBadgeCount = (href: string): number => {
    if (badgeCounts[href]) return badgeCounts[href];
    // Fallback for demo mode
    if (staticUnreadCount !== undefined && href.includes("/inbox")) {
      return staticUnreadCount;
    }
    return 0;
  };

  // Check if item is active
  const isItemActive = (item: MobileNavItem): boolean => {
    if (item.isExternal) return false;
    if (item.exactMatch) return pathname === item.href;
    return item.href === basePath
      ? pathname === basePath
      : pathname === item.href || pathname.startsWith(item.href + "/");
  };

  // Check if dropdown has active child
  const hasActiveChild = (items: MobileNavItem[]): boolean => {
    return items.some(isItemActive);
  };

  // Render a single nav item
  const renderNavItem = (item: MobileNavItem, showBadge = true) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const isLocked = !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";
    const badgeCount = showBadge && item.showBadge ? getBadgeCount(item.href) : 0;

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
        {item.isExternal && (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        )}
      </>
    );

    const linkClassName = cn(
      buttonVariants({ variant: "ghost" }),
      "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      isLocked && "opacity-60"
    );

    if (item.isExternal) {
      return (
        <SheetClose asChild key={item.href}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {linkContent}
          </a>
        </SheetClose>
      );
    }

    return (
      <SheetClose asChild key={item.href}>
        <Link href={item.href} className={linkClassName}>
          {linkContent}
        </Link>
      </SheetClose>
    );
  };

  // Render a dropdown section
  const renderDropdown = (
    id: string,
    label: string,
    icon: LucideIcon,
    items: MobileNavItem[],
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const Icon = icon;
    const hasActive = hasActiveChild(items);

    return (
      <Collapsible key={id} open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "rounded-xl overflow-hidden transition-all",
            hasActive && "ring-1 ring-primary/20"
          )}
        >
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between min-h-[44px] px-3 py-2.5 text-sm font-medium transition-all rounded-xl",
              hasActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 px-2 pb-2 pt-1">
            {items.map((item) => renderNavItem(item, false))}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  // Build view profile links
  const viewProfileLinks = providerSlug ? [
    { href: `/provider/${providerSlug}`, label: "Therapy Profile", icon: Eye },
    { href: `/employers/${providerSlug}`, label: "Jobs Profile", icon: Eye },
  ] : [];

  // Get nav items based on mode
  const navItems = customNavItems || (isDemo ? demoNavItems : mainNavItems);

  return (
    <nav className="mt-6 flex flex-col gap-1">
      {/* Onboarding item if needed */}
      {!isOnboardingComplete && !customNavItems && !isDemo && renderNavItem(onboardingNavItem)}

      {/* Main navigation items */}
      {navItems.map((item) => renderNavItem(item))}

      {/* Dropdown sections (only for non-demo, non-custom mode) */}
      {!customNavItems && !isDemo && (
        <div className="pt-2 space-y-1">
          {renderDropdown("company", "Company", Building2, companyDropdownItems, companyOpen, setCompanyOpen)}
          {renderDropdown("brandedPages", "Branded Pages", Globe, brandedPagesDropdownItems, brandedPagesOpen, setBrandedPagesOpen)}
        </div>
      )}

      {/* View Profile links */}
      {viewProfileLinks.length > 0 && (
        <div className="border-t border-border/60 pt-3 mt-3">
          <p className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Public Pages
          </p>
          {viewProfileLinks.map((link) => (
            <SheetClose asChild key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "min-h-[44px] w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{link.label}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </SheetClose>
          ))}
        </div>
      )}

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
