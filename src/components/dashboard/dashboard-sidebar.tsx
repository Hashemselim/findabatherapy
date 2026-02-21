"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  LogOut,
  MessageSquare,
  User,
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
import { getNewApplicationCount } from "@/lib/actions/applications";
import { getActionableTaskCount } from "@/lib/actions/clients";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-section";
import {
  persistentItems,
  sectionNav,
  onboardingNavItem,
  inferActiveSectionFromPath,
  isNavItemActive,
  type NavItemConfig,
} from "./nav-config";

export type { NavItem };

// ---------------------------------------------------------------------------
// Section state persistence
// ---------------------------------------------------------------------------

const SECTION_STORAGE_KEY = "dashboard_sections_v2";

type SectionId = "clients" | "intake_pages" | "team" | "settings";

function getDefaultOpenState(): Record<SectionId, boolean> {
  const state: Record<string, boolean> = {};
  for (const s of sectionNav) {
    state[s.id] = s.defaultOpen;
  }
  return state as Record<SectionId, boolean>;
}

function loadSectionState(): Record<SectionId, boolean> {
  if (typeof window === "undefined") return getDefaultOpenState();
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
  userProfile?: UserProfile;
  staticUnreadCount?: number;
  customNavItems?: NavItem[];
  dataTour?: string;
  providerSlug?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const [notificationCount, setNotificationCount] = useState(staticUnreadCount ?? 0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [sectionOpen, setSectionOpen] = useState<Record<SectionId, boolean>>(getDefaultOpenState);

  // Load persisted section state on mount
  useEffect(() => {
    const saved = loadSectionState();
    setSectionOpen(saved);
  }, []);

  // Auto-expand section containing current route
  useEffect(() => {
    const activeSection = inferActiveSectionFromPath(pathname) as SectionId | null;
    if (activeSection) {
      setSectionOpen((prev) => {
        if (prev[activeSection]) return prev;
        const next = { ...prev, [activeSection]: true };
        saveSectionState(next);
        return next;
      });
    }
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

  function toggleSection(id: SectionId) {
    setSectionOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
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
        className="flex h-full w-full flex-col justify-between overflow-y-auto rounded-2xl border border-border/60 bg-white p-4 shadow-sm dark:bg-zinc-950"
      >
        <div className="space-y-4">
          <nav className="space-y-1">
            {customNavItems.map((item) => renderNavLink(item as NavItemConfig, pathname, isOnboardingComplete, isDemo, getBadgeCount))}
          </nav>
        </div>
        <div className="border-t border-border/60 pt-4">
          {isDemo && <p className="text-center text-xs text-muted-foreground">Demo mode - changes won&apos;t be saved</p>}
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-tour={dataTour}
      className="flex h-full w-full flex-col justify-between overflow-y-auto rounded-2xl border border-border/60 bg-white p-4 shadow-sm dark:bg-zinc-950"
    >
      <div className="space-y-3">
        {/* Company profile card */}
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
              <p className="truncate text-sm font-medium text-foreground">{companyProfile.name}</p>
              <Badge variant="secondary" className="mt-0.5 text-xs">
                {(companyProfile.planTier === "pro" || companyProfile.planTier === "enterprise") &&
                (companyProfile.subscriptionStatus === "active" || companyProfile.subscriptionStatus === "trialing")
                  ? companyProfile.planTier === "enterprise"
                    ? "Enterprise Plan"
                    : "Pro Plan"
                  : "Free Plan"}
              </Badge>
            </div>
          </div>
        )}

        {/* Persistent top-level items: Notifications & Tasks */}
        <div className="space-y-1">
          {!isOnboardingComplete && renderNavLink(onboardingNavItem, pathname, isOnboardingComplete, isDemo, getBadgeCount)}
          {persistentItems.map((item) =>
            renderNavLink(item, pathname, isOnboardingComplete, isDemo, getBadgeCount)
          )}
        </div>

        <div className="h-px bg-border/60" />

        {/* Collapsible section groups */}
        <nav className="space-y-1.5">
          {sectionNav.map((section) => {
            const isOpen = sectionOpen[section.id as SectionId] ?? section.defaultOpen;
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
                onOpenChange={() => toggleSection(section.id as SectionId)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl bg-blue-50/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-blue-100/80 dark:bg-blue-950/25 dark:hover:bg-blue-900/30",
                    hasActiveChild && "ring-[1.5px] ring-inset ring-blue-500 text-blue-900 dark:text-blue-100 dark:ring-blue-400"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon
                      className={cn(
                        "h-4 w-4",
                        hasActiveChild ? "text-blue-600 dark:text-blue-400" : "text-blue-400 dark:text-blue-500"
                      )}
                      aria-hidden
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {section.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isOpen && sectionBadgeTotal > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {sectionBadgeTotal > 99 ? "99+" : sectionBadgeTotal}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        hasActiveChild ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pl-2 pt-0.5">
                  {section.items.map((item) =>
                    renderNavLink(item, pathname, isOnboardingComplete, isDemo, getBadgeCount)
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

      </div>

      {/* User account dropdown */}
      <div className="border-t border-border/60 pt-4">
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
                <p className="truncate text-sm font-medium text-foreground">{userProfile?.name || "Account"}</p>
                {userProfile?.email && <p className="truncate text-xs text-muted-foreground">{userProfile.email}</p>}
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
// Shared nav item renderer
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
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        isLocked && "pointer-events-none opacity-60"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex flex-1 items-center gap-1.5">
        {item.label}
        {item.proBadge && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
            )}
          >
            Pro
          </span>
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
    </Link>
  );
}
