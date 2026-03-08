import { type ReactNode } from "react";

import { DashboardCard } from "@/components/dashboard/ui";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Dashboard title row card — sits above body cards and aligns with the sidebar logo.
 *
 * Usage:
 *   <DashboardPageHeader title="Communications" description="View all client email communications.">
 *     <Button>Action</Button>
 *   </DashboardPageHeader>
 */
export function DashboardPageHeader({
  title,
  description,
  children,
}: DashboardPageHeaderProps) {
  return (
    <DashboardCard className="px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>[data-slot=button]]:w-full sm:[&>[data-slot=button]]:w-auto">
            {children}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
