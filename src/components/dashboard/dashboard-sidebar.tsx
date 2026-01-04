"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  GaugeCircle,
  HelpCircle,
  Image,
  LogOut,
  LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  Settings,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { cn } from "@/lib/utils";
import { getUnreadInquiryCount } from "@/lib/actions/inquiries";
import { signOut } from "@/lib/auth/actions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
};

// PRD 4.2: Dashboard navigation structure
const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/company", label: "Company Details", icon: FileText },
  { href: "/dashboard/locations", label: "Locations", icon: MapPin },
  { href: "/dashboard/media", label: "Media", icon: Image },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Contact Form Inbox", icon: Mail, showBadge: true },
  { href: "/dashboard/billing", label: "Plan & Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
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

interface DashboardSidebarProps {
  isOnboardingComplete: boolean;
  isDemo?: boolean;
  companyProfile?: CompanyProfile;
  /** For demo mode: pass static unread count instead of fetching */
  staticUnreadCount?: number;
  /** For demo mode: pass custom nav items */
  customNavItems?: NavItem[];
  /** data-tour attribute for guided tour highlighting */
  dataTour?: string;
}

export function DashboardSidebar({
  isOnboardingComplete,
  isDemo = false,
  companyProfile,
  staticUnreadCount,
  customNavItems,
  dataTour,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(staticUnreadCount ?? 0);

  useEffect(() => {
    // Skip fetching if static count is provided (demo mode)
    if (staticUnreadCount !== undefined) return;

    async function fetchUnreadCount() {
      const result = await getUnreadInquiryCount();
      if (result.success && result.data) {
        setUnreadCount(result.data);
      }
    }
    fetchUnreadCount();
  }, [pathname, staticUnreadCount]); // Refetch when pathname changes (e.g., after viewing inquiries)

  const handleLogout = async () => {
    // Clear dev bypass cookie on client side
    document.cookie = "dev_bypass=; path=/; max-age=0";
    // Use server action for reliable logout
    await signOut();
  };

  // Use custom nav items if provided (demo mode), otherwise build based on onboarding status
  const navItems = customNavItems
    ?? (isOnboardingComplete ? dashboardNav : [onboardingNavItem, ...dashboardNav]);

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
          {navItems.map((item) => {
            const Icon = item.icon;
            // Determine base path from the first nav item's href
            const basePath = navItems[0]?.href.split("/")[1] ?? "dashboard";
            const itemPath = item.href.replace(`/${basePath}`, "");
            const baseHref = `/${basePath}`;

            // Exact match for base path (Overview), prefix match for all other routes
            const isActive = itemPath === "" || itemPath === `/${basePath}`
              ? pathname === baseHref || pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const showBadge = item.showBadge && unreadCount > 0;

            // Check if this item should be locked (not onboarding tab and onboarding incomplete)
            // Only applies to real dashboard, not demo
            const isLocked = !isDemo && !isOnboardingComplete && item.href !== "/dashboard/onboarding";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isLocked && "opacity-60"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <SupportContactDialog>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            Need Help?
          </button>
        </SupportContactDialog>
        <Link
          href="/dashboard/feedback"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          Send Feedback
        </Link>
        {isDemo ? (
          <p className="text-center text-xs text-muted-foreground">
            Demo mode - changes won&apos;t be saved
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Logout
          </Button>
        )}
      </div>
    </aside>
  );
}
