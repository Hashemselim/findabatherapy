"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NextImage from "next/image";
import {
  Briefcase,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Heart,
  HelpCircle,
  LogOut,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";

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
import { GoodABALogo } from "@/components/brand/goodaba-logo";
import { getJobsEmployersPath } from "@/lib/utils/public-paths";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { getNewApplicationCount } from "@/lib/actions/applications";
import { getActionableTaskCount } from "@/lib/actions/clients";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { DashboardStatusBadge } from "@/components/dashboard/ui";
import type { NavItem } from "./nav-section";
import {
  mainNavItems,
  sectionNav,
  onboardingNavItem,
  inferActiveSectionFromPath,
  isNavItemActive,
  type NavItemConfig,
} from "./nav-config";

export type { NavItem };

export const DASHBOARD_SIDEBAR_WIDTH_PX = 250;
export const dashboardSidebarShellClassName = "border-r border-border/60 bg-card/95 backdrop-blur-sm";

// ---------------------------------------------------------------------------
// Section state persistence
// ---------------------------------------------------------------------------

const SECTION_STORAGE_KEY = "dashboard_sections_v3";

type SectionId = string;

function getCollapsedState(): Record<SectionId, boolean> {
  const state: Record<string, boolean> = {};
  for (const s of sectionNav) {
    state[s.id] = false;
  }
  return state;
}

function getDefaultOpenState(): Record<SectionId, boolean> {
  const state = getCollapsedState();
  const defaultOpenSection = sectionNav.find((section) => section.defaultOpen)?.id;
  if (defaultOpenSection) {
    state[defaultOpenSection] = true;
  }
  return state;
}

function getAccordionState(openSectionId: SectionId | null): Record<SectionId, boolean> {
  const state = getCollapsedState();
  if (openSectionId) {
    state[openSectionId] = true;
  }
  return state;
}

function hasPersistedSectionState(state: Record<SectionId, boolean> | null | undefined): boolean {
  if (!state) return false;

  return sectionNav.some((section) =>
    Object.prototype.hasOwnProperty.call(state, section.id)
  );
}

function areSectionStatesEqual(
  left: Record<SectionId, boolean>,
  right: Record<SectionId, boolean>,
): boolean {
  return sectionNav.every((section) => (left[section.id] ?? false) === (right[section.id] ?? false));
}

function normalizeSectionState(
  state: Record<SectionId, boolean> | null | undefined,
  preferredOpenSectionId: SectionId | null = null,
): Record<SectionId, boolean> {
  if (preferredOpenSectionId) {
    return getAccordionState(preferredOpenSectionId);
  }

  const firstOpenSection = sectionNav.find((section) => state?.[section.id])?.id;
  if (firstOpenSection) {
    return getAccordionState(firstOpenSection);
  }

  return hasPersistedSectionState(state) ? getCollapsedState() : getDefaultOpenState();
}

function loadSectionState(): Record<SectionId, boolean> {
  try {
    const saved = window.localStorage.getItem(SECTION_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Record<SectionId, boolean>;
  } catch {
    // ignore
  }
  return getDefaultOpenState();
}

function saveSectionState(state: Record<SectionId, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface CompanyProfile {
  name: string;
  logoUrl?: string | null;
  planTier: "free" | "pro";
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
  userProfile?: UserProfile;
  staticUnreadCount?: number;
  customNavItems?: NavItem[];
  dataTour?: string;
  providerSlug?: string | null;
}

export function DashboardSidebar({
  isOnboardingComplete,
  isDemo = false,
  companyProfile,
  staticUnreadCount,
  customNavItems,
  dataTour,
  providerSlug,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(staticUnreadCount ?? 0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [sectionOpen, setSectionOpen] = useState<Record<SectionId, boolean>>(getDefaultOpenState);

  // Hydrate from localStorage and keep the active route's section as the only open one.
  useEffect(() => {
    const activeSection = inferActiveSectionFromPath(pathname);
    const next = normalizeSectionState(loadSectionState(), activeSection);
    setSectionOpen(next);
    saveSectionState(next);
  }, [pathname]);

  // Fetch badge counts
  useEffect(() => {
    if (staticUnreadCount !== undefined) return;

    async function fetchCounts() {
      const [notifCount, applicationResult, taskResult] = await Promise.all([
        getUnreadNotificationCount(),
        getNewApplicationCount(),
        getActionableTaskCount(),
      ]);
      setNotificationCount(notifCount);
      if (applicationResult.success && applicationResult.data !== undefined) {
        setApplicantCount(applicationResult.data);
      }
      if (taskResult.success && taskResult.data !== undefined) {
        setTaskCount(taskResult.data);
      }
    }

    fetchCounts();
  }, [pathname, staticUnreadCount]);

  const handleLogout = async () => {
    document.cookie = "dev_bypass=; path=/; max-age=0";
    await signOut();
  };

  function setSectionExpanded(id: SectionId, isOpen: boolean) {
    setSectionOpen((prev) => {
      const next = isOpen ? getAccordionState(id) : getCollapsedState();
      if (areSectionStatesEqual(prev, next)) return prev;
      saveSectionState(next);
      return next;
    });
  }

  function getBadgeCount(href: string): number {
    if (href === "/dashboard/notifications" || href === "/dashboard/inbox") return notificationCount;
    if (href.includes("applicants")) return applicantCount;
    if (href === "/dashboard/tasks") return taskCount;
    return 0;
  }

  // If custom nav items are provided (demo mode), use the old simple list
  if (customNavItems) {
    return (
      <aside
        data-tour={dataTour}
        className="flex h-full w-full flex-col justify-between overflow-y-auto"
      >
        <div className="px-5 py-6">
          <nav className="space-y-1">
            {customNavItems.map((item) =>
              renderNavLink(item as NavItemConfig, pathname, isOnboardingComplete, isDemo, getBadgeCount)
            )}
          </nav>
        </div>
        <div className="px-5 pb-4">
          {isDemo && <p className="text-center text-xs text-muted-foreground">Demo mode - changes won&apos;t be saved</p>}
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-tour={dataTour}
      className="flex h-full w-full flex-col justify-between overflow-y-auto"
    >
      {/* Top: Logo */}
      <div className="flex flex-col">
        <div className="px-6 pb-2 pt-6">
          <GoodABALogo size="lg" priority />
        </div>

        {/* Divider */}
        <div className="mx-5 my-4 h-px bg-border/50" />

        {/* Main nav items */}
        <nav className="space-y-0.5 px-3">
          {!isOnboardingComplete && renderNavLink(onboardingNavItem, pathname, isOnboardingComplete, isDemo, getBadgeCount)}
          {mainNavItems.map((item) =>
            renderNavLink(item, pathname, isOnboardingComplete, isDemo, getBadgeCount)
          )}
        </nav>

        {/* Collapsible sections */}
        <div className="mt-1 space-y-0.5 px-3">
          {sectionNav.map((section) => {
            const isOpen = sectionOpen[section.id] ?? section.defaultOpen;
            const SectionIcon = section.icon;
            const hasActiveChild = section.items.some((item) => isNavItemActive(item, pathname));

            // Calculate section badge total for collapsed state
            const sectionBadgeTotal = section.items.reduce(
              (sum, item) => sum + (item.showBadge ? getBadgeCount(item.href) : 0),
              0
            );

            return (
              <Collapsible
                key={section.id}
                open={isOpen}
                onOpenChange={(nextOpen) => setSectionExpanded(section.id, nextOpen)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    hasActiveChild && !isOpen
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Active indicator bar (left side) - show when section has active child */}
                  {hasActiveChild && !isOpen && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <SectionIcon className="h-[18px] w-[18px] shrink-0 text-[#222222]" aria-hidden />
                  <span className="flex-1 text-left">{section.label}</span>
                  <div className="flex items-center gap-1.5">
                    {!isOpen && sectionBadgeTotal > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                        {sectionBadgeTotal > 99 ? "99+" : sectionBadgeTotal}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pb-1 pl-6 pt-0.5">
                  {section.items.map((item) =>
                    renderNavLink(item, pathname, isOnboardingComplete, isDemo, getBadgeCount)
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

      </div>

      {/* Sub-brand profile links */}
      {providerSlug && (
        <div className="mx-5 mt-4 border-t border-border/50 pt-4">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Your Profiles
          </p>
          <div className="space-y-1">
            <a
              href={`https://www.findabatherapy.org/provider/${providerSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <Heart className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1 truncate">findabatherapy.org</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" aria-hidden />
            </a>
            <a
              href={`https://www.goodaba.com${getJobsEmployersPath(`/${providerSlug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span className="flex-1 truncate">goodaba.com/jobs</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" aria-hidden />
            </a>
          </div>
        </div>
      )}

      {/* Bottom: Company account dropdown */}
      <div className="mt-auto px-3 pb-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              {/* Company logo */}
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border/50">
                {companyProfile?.logoUrl ? (
                  <NextImage
                    src={companyProfile.logoUrl}
                    alt={companyProfile?.name ?? "Company"}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-bold text-primary">
                    {companyProfile?.name
                      ?.split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "BW"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {companyProfile?.name || "My Company"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {companyProfile?.planTier === "pro" &&
                  (companyProfile?.subscriptionStatus === "active" || companyProfile?.subscriptionStatus === "trialing")
                    ? "Pro Plan"
                    : "Free Plan"}
                </p>
                {!(companyProfile?.planTier === "pro" &&
                  (companyProfile?.subscriptionStatus === "active" || companyProfile?.subscriptionStatus === "trialing")) && (
                  <DashboardStatusBadge tone="warning" className="mt-0.5 w-fit px-2 py-0.5 text-[10px] font-semibold">
                    Preview Mode
                  </DashboardStatusBadge>
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {isDemo && <p className="mt-2 text-center text-xs text-muted-foreground">Demo mode - changes won&apos;t be saved</p>}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Shared nav item renderer — Donezo-style with left active indicator
// ---------------------------------------------------------------------------

function renderNavLink(
  item: NavItemConfig,
  pathname: string,
  isOnboardingComplete: boolean,
  isDemo: boolean,
  getBadgeCount: (href: string) => number
) {
  const Icon = item.icon;
  const isActive = isNavItemActive(item, pathname);
  const isLocked = !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";
  const badgeCount = item.showBadge ? getBadgeCount(item.href) : 0;

  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        isLocked && "pointer-events-none opacity-50"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          isActive ? "text-primary" : "text-[#222222]"
        )}
        aria-hidden
      />
      <span className="flex flex-1 items-center gap-1.5">
        {item.label}
        {item.proBadge && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              isActive
                ? "bg-primary/15 text-primary"
                : "bg-primary/10 text-primary"
            )}
          >
            Pro
          </span>
        )}
      </span>
      {badgeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
