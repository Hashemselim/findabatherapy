import { type PropsWithChildren, type ReactNode } from "react";

import { DashboardSidebar, type CompanyProfile, type NavItem, type UserProfile } from "@/components/dashboard/dashboard-sidebar";
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      {demoBanner}
      {/* Fixed header - mobile only (hidden on lg+) */}
      <div className="fixed left-0 right-0 top-0 z-40 lg:hidden">
        <DashboardTopbar
          isOnboardingComplete={isOnboardingComplete}
          isDemo={isDemo}
          providerSlug={providerSlug}
          companyProfile={companyProfile}
        />
      </div>

      {/* Main layout with fixed sidebar */}
      {/* Mobile: header (3.5rem) + border (1px) + mobile nav (~2.5rem) + spacing (1rem) */}
      {/* Desktop sm: header (4rem) + border (1px) + mobile nav (~2.5rem) + spacing (1.5rem) */}
      {/* Desktop lg: no header, just spacing (2rem) */}
      <div className="container flex gap-6 px-4 pt-[calc(3.5rem+1px+2.5rem+1rem)] sm:px-6 sm:pt-[calc(4rem+1px+2.5rem+1.5rem)] lg:pt-8">
        {/* Fixed sidebar - positioned relative to container */}
        <div className="hidden w-72 flex-none lg:block">
          <div className="fixed w-72 top-8" style={{ height: 'calc(100vh - 4rem)' }}>
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
        <main className="min-w-0 flex-1 pb-6 sm:pb-8">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
