import { type PropsWithChildren, type ReactNode } from "react";

import { DashboardSidebar, type CompanyProfile, type NavItem } from "@/components/dashboard/dashboard-sidebar";
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
  staticUnreadCount,
  customNavItems,
  sidebarDataTour,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {demoBanner}
      {/* Fixed header */}
      <div className="fixed left-0 right-0 top-0 z-40">
        <DashboardTopbar isOnboardingComplete={isOnboardingComplete} isDemo={isDemo} providerSlug={providerSlug} />
      </div>

      {/* Main layout with fixed sidebar */}
      {/* Mobile: header (3.5rem) + border (1px) + mobile nav (~2.5rem) + spacing (1rem) */}
      {/* Desktop sm: header (4rem) + border (1px) + mobile nav (~2.5rem) + spacing (1.5rem) */}
      {/* Desktop lg: header (4rem) + border (1px) + spacing (2rem) - no mobile nav */}
      <div className="container flex gap-6 px-4 pt-[calc(3.5rem+1px+2.5rem+1rem)] sm:px-6 sm:pt-[calc(4rem+1px+2.5rem+1.5rem)] lg:pt-[calc(4rem+1px+2rem)]">
        {/* Fixed sidebar - positioned relative to container */}
        <div className="hidden w-64 flex-none lg:block">
          <div className="fixed w-64 top-[calc(4rem+1px+2rem)]" style={{ height: 'calc(100vh - 4rem - 1px - 4rem)' }}>
            <DashboardSidebar
              isOnboardingComplete={isOnboardingComplete}
              isDemo={isDemo}
              companyProfile={companyProfile}
              staticUnreadCount={staticUnreadCount}
              customNavItems={customNavItems}
              dataTour={sidebarDataTour}
            />
          </div>
        </div>

        {/* Scrolling main content */}
        <main className="min-w-0 flex-1 pb-6 sm:pb-8">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
