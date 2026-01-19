"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { NavItem } from "./nav-section";
import { cn } from "@/lib/utils";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { getNewApplicationCount } from "@/lib/actions/applications";
import { signOut } from "@/lib/auth/actions";
import { useNavCollapseState } from "@/hooks/use-nav-collapse-state";

export type { NavItem };

// Main navigation items - direct links (no collapsible sections)
const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeCircle, exactMatch: true },
  { href: "/dashboard/inbox", label: "Notifications", icon: Bell, showBadge: true },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/clients", label: "Clients", icon: UserCircle },
  { href: "/dashboard/employees", label: "Employees", icon: UserCheck, showBadge: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

// Company dropdown items
const companyDropdownItems: NavItem[] = [
  { href: "/dashboard/company", label: "Profile", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
];

// Branded Pages dropdown items
const brandedPagesDropdownItems: NavItem[] = [
  { href: "/dashboard/intake", label: "Intake Form", icon: FileInput },
  { href: "/dashboard/careers", label: "Careers Page", icon: Globe },
  { href: "/dashboard/resources/clients", label: "Client Resources", icon: FolderOpen, isPlaceholder: true },
  { href: "/dashboard/resources/employees", label: "Employee Resources", icon: FolderOpen, isPlaceholder: true },
];

// Onboarding nav item shown when onboarding is incomplete
const onboardingNavItem: NavItem = {
  href: "/dashboard/onboarding",
  label: "Onboarding",
  icon: ClipboardList,
};

export interface CompanyProfile {
  name: string;
  logoUrl?: string | null;
  planTier: "free" | "pro" | "enterprise";
  subscriptionStatus?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface DashboardSidebarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  companyProfile?: CompanyProfile;
  /** User profile for the sidebar user dropdown */
  userProfile?: UserProfile;
  /** For demo mode: pass static unread count instead of fetching */
  staticUnreadCount?: number;
  /** For demo mode: pass custom nav items */
  customNavItems?: NavItem[];
  /** data-tour attribute for guided tour highlighting */
  dataTour?: string;
  /** Provider's listing slug for "View Profile" links */
  providerSlug?: string | null;
}

export function DashboardSidebar({
  isOnboardingComplete,
  isDemo = false,
  companyProfile,
  userProfile,
  staticUnreadCount,
  customNavItems,
  dataTour,
  providerSlug,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(staticUnreadCount ?? 0);
  const [newApplicationCount, setNewApplicationCount] = useState(0);

  // Smart collapse state for dropdown sections
  const { isSectionOpen, toggleSection } = useNavCollapseState();

  useEffect(() => {
    // Skip fetching if static count is provided (demo mode)
    if (staticUnreadCount !== undefined) return;

    async function fetchCounts() {
      const [inquiryResult, applicationResult] = await Promise.all([
        getUnreadInquiryCount(),
        getNewApplicationCount(),
      ]);
      if (inquiryResult.success && inquiryResult.data) {
        setUnreadCount(inquiryResult.data);
      }
      if (applicationResult.success && applicationResult.data) {
        setNewApplicationCount(applicationResult.data);
      }
    }
    fetchCounts();
  }, [pathname, staticUnreadCount]); // Refetch when pathname changes

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  // Helper function to get badge count for a nav item
  const getBadgeCount = (href: string): number => {
    if (href === "/dashboard/employees") return newApplicationCount;
    if (href === "/dashboard/inbox") return unreadCount;
    return 0;
  };

  // Check if item is active based on pathname
  const isItemActive = (item: NavItem): boolean => {
    if (item.isExternal) return false;
    if (item.exactMatch) return pathname === item.href;
    return item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");
  };

  // Check if dropdown section has an active child
  const hasActiveChild = (items: NavItem[]): boolean => {
    return items.some(isItemActive);
  };

  // Render a single nav item
  const renderNavItem = (item: NavItem, showBadge = true) => {
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
      "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      isLocked && "opacity-60"
    );

    if (item.isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {linkContent}
        </a>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={linkClassName}>
        {linkContent}
      </Link>
    );
  };

  // Render a dropdown section
  const renderDropdown = (
    id: string,
    label: string,
    icon: LucideIcon,
    items: NavItem[]
  ) => {
    const Icon = icon;
    const isOpen = isSectionOpen(id);
    const hasActive = hasActiveChild(items);

    return (
      <Collapsible
        key={id}
        open={isOpen}
        onOpenChange={() => toggleSection(id)}
      >
        <div
          className={cn(
            "rounded-xl overflow-hidden transition-all",
            hasActive && "ring-1 ring-primary/20"
          )}
        >
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition-all rounded-xl",
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

  // Build view profile links for external viewing
  const viewProfileLinks = providerSlug ? [
    { href: `/provider/${providerSlug}`, label: "Therapy Profile", icon: Eye },
    { href: `/employers/${providerSlug}`, label: "Jobs Profile", icon: Eye },
  ] : [];

  return (
    <aside
      data-tour={dataTour}
      className="flex h-full w-full flex-col justify-between overflow-y-auto rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-sm"
    >
      <div className="space-y-4">
        {/* Company Profile Section */}
        {companyProfile && (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
              {companyProfile.logoUrl ? (
                <NextImage
                  src={companyProfile.logoUrl}
                  alt={companyProfile.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#5788FF]/10 text-sm font-bold text-[#5788FF]">
                  {companyProfile.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {companyProfile.name}
              </p>
              <Badge variant="secondary" className="mt-0.5 text-xs">
                {(companyProfile.planTier === "pro" || companyProfile.planTier === "enterprise") &&
                (companyProfile.subscriptionStatus === "active" || companyProfile.subscriptionStatus === "trialing")
                  ? companyProfile.planTier === "enterprise" ? "Enterprise Plan" : "Pro Plan"
                  : "Free Plan"}
              </Badge>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {/* Onboarding item if needed */}
          {!isOnboardingComplete && !customNavItems && renderNavItem(onboardingNavItem)}

          {/* Custom nav items for demo mode */}
          {customNavItems ? (
            customNavItems.map((item) => renderNavItem(item))
          ) : (
            <>
              {/* Main navigation items - flat list */}
              {mainNavItems.map((item) => renderNavItem(item))}

              {/* Dropdown sections */}
              <div className="pt-2">
                {renderDropdown("company", "Company", Building2, companyDropdownItems)}
                {renderDropdown("brandedPages", "Branded Pages", Globe, brandedPagesDropdownItems)}
              </div>

              {/* View Profile links */}
              {viewProfileLinks.length > 0 && (
                <div className="border-t border-border/60 pt-3 mt-3">
                  <p className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Public Pages
                  </p>
                  {viewProfileLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <link.icon className="h-4 w-4" aria-hidden />
                      <span className="flex-1">{link.label}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-border/60 pt-4">
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
                {userProfile?.avatarUrl ? (
                  <NextImage
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                    {userProfile?.name
                      ?.split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || <User className="h-4 w-4" />}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userProfile?.name || "Account"}
                </p>
                {userProfile?.email && (
                  <p className="truncate text-xs text-muted-foreground">
                    {userProfile.email}
                  </p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SupportContactDialog>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Need Help?
              </DropdownMenuItem>
            </SupportContactDialog>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/feedback" className="cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Feedback
              </Link>
            </DropdownMenuItem>
            {!isDemo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {isDemo && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo mode - changes won&apos;t be saved
          </p>
        )}
      </div>
    </aside>
  );
}
