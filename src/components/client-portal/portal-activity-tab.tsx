"use client";

import type { ClientPortalData } from "@/lib/actions/client-portal";
import { DashboardCard } from "@/components/dashboard/ui";
import { formatDate } from "./portal-utils";

export function PortalActivityTab({ data }: { data: ClientPortalData }) {
  const { activity } = data;

  return (
    <div>
      <DashboardCard className="p-0">
        {activity.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No activity recorded yet
          </p>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description || "Activity recorded"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {item.actorName || item.actorType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
