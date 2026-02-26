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
    <div className="min-h-screen bg-[#F5F5F0] text-foreground dark:bg-zinc-900">
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
              inSheet
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
        <div className="hidden w-[250px] flex-none lg:block">
          <div className="fixed left-0 top-0 h-screen w-[250px] border-r border-border/40 bg-white dark:bg-zinc-950">
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
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-7">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
