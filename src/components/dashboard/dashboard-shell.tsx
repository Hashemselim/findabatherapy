import { type PropsWithChildren } from "react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

interface DashboardShellProps extends PropsWithChildren {
  isOnboardingComplete: boolean;
}

export function DashboardShell({ children, isOnboardingComplete }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <DashboardTopbar isOnboardingComplete={isOnboardingComplete} />
      <main className="container flex flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <DashboardSidebar isOnboardingComplete={isOnboardingComplete} />
        <div className="min-w-0 flex-1 space-y-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:space-y-6 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
