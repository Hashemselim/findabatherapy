"use client";

import { type PropsWithChildren, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { DashboardSidebar, DASHBOARD_SIDEBAR_WIDTH_PX, dashboardSidebarShellClassName, type CompanyProfile, type NavItem, type UserProfile } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

interface DashboardShellProps extends PropsWithChildren {
  isOnboardingComplete: boolean;
  /** Provider's listing slug for "View Listing" link */
  providerSlug?: string | null;
  /** Enable demo mode styling and behavior */
  isDemo?: boolean;
  /** Optional banner to render above the topbar (for demo mode) */
  demoBanner?: ReactNode;
  /** Company profile to display in sidebar */
  companyProfile?: CompanyProfile;
  /** User profile to display in sidebar user dropdown */
  userProfile?: UserProfile;
  /** Static unread count for demo mode */
  staticUnreadCount?: number;
  /** Custom nav items for sidebar (for demo mode) */
  customNavItems?: NavItem[];
  /** data-tour attribute for sidebar */
  sidebarDataTour?: string;
}

export function DashboardShell({
  children,
  isOnboardingComplete,
  providerSlug,
  isDemo = false,
  demoBanner,
  companyProfile,
  userProfile,
  staticUnreadCount,
  customNavItems,
  sidebarDataTour,
}: DashboardShellProps) {
  const pathname = usePathname();
  const isOnboardingRoute = pathname.startsWith("/dashboard/onboarding");

  if (isOnboardingRoute) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="dashboard-theme min-h-screen bg-muted/30 text-foreground">
      {demoBanner}
      {/* Fixed header - mobile only (hidden on lg+) */}
      <div className="fixed left-0 right-0 top-0 z-40 lg:hidden">
        <DashboardTopbar
          isOnboardingComplete={isOnboardingComplete}
          isDemo={isDemo}
          providerSlug={providerSlug}
          companyProfile={companyProfile}
          mobileNavComponent={
            <DashboardSidebar
              isOnboardingComplete={isOnboardingComplete}
              isDemo={isDemo}
              companyProfile={companyProfile}
              userProfile={userProfile}
              staticUnreadCount={staticUnreadCount}
              customNavItems={customNavItems}
              providerSlug={providerSlug}
            />
          }
        />
      </div>

      {/* Main layout */}
      {/* Mobile: header (3.5rem) + border (1px) + mobile nav (~2.5rem) + spacing (1rem) */}
      {/* Desktop sm: header (4rem) + border (1px) + mobile nav (~2.5rem) + spacing (1.5rem) */}
      {/* Desktop lg: no header, just spacing */}
      <div className="flex min-h-screen pt-[calc(3.5rem+1px+2.5rem+1rem)] sm:pt-[calc(4rem+1px+2.5rem+1.5rem)] lg:pt-0">
        {/* Fixed sidebar */}
        <div className="hidden flex-none lg:block" style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}>
          <div
            className={`fixed left-0 top-0 h-screen ${dashboardSidebarShellClassName}`}
            style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}
          >
            <DashboardSidebar
              isOnboardingComplete={isOnboardingComplete}
              isDemo={isDemo}
              companyProfile={companyProfile}
              userProfile={userProfile}
              staticUnreadCount={staticUnreadCount}
              customNavItems={customNavItems}
              dataTour={sidebarDataTour}
              providerSlug={providerSlug}
            />
          </div>
        </div>

        {/* Scrolling main content */}
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,hsl(var(--accent))_0%,transparent_28%)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
