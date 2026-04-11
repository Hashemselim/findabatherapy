"use client";

import type { ClientPortalData } from "@/lib/actions/client-portal";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { formatDate } from "./portal-utils";

interface PortalOverviewTabProps {
  data: ClientPortalData;
  onTabChange: (tab: string) => void;
}

export function PortalOverviewTab({ data, onTabChange }: PortalOverviewTabProps) {
  const { portal, activity, messages } = data;

  const stats = [
    { label: "Open tasks", value: portal.openTasks },
    { label: "Completion", value: `${portal.completionPercentage}%` },
    { label: "Guardians", value: `${portal.guardiansReady}/${portal.guardiansTotal}` },
    { label: "Messages", value: messages.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Recent activity</p>
        <DashboardCard className="p-0">
          {activity.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No activity yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {activity.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description || "Activity recorded"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
        {activity.length > 0 && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 h-auto p-0 text-xs"
            onClick={() => onTabChange("activity")}
          >
            View all activity →
          </Button>
        )}
      </div>
    </div>
  );
}
