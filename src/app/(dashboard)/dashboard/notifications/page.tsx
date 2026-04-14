import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { getNotifications, getUnreadCountsByType } from "@/lib/actions/notifications";
import { NotificationList } from "@/components/dashboard/notifications/notification-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Notifications | Dashboard",
  description: "View all notifications and alerts",
};

export default async function NotificationsPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Notifications" description="View all notifications and alerts" />

      <Suspense fallback={<NotificationsContentFallback />}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}

async function NotificationsContent() {
  const [result, countsResult] = await Promise.all([
    getNotifications({ limit: 100 }),
    getUnreadCountsByType(),
  ]);

  if (!result.success) {
    return (
      <DashboardCard className="p-5 sm:p-6">
        <DashboardEmptyState
          icon={Bell}
          title="Failed to load notifications"
          description="Please try refreshing the page."
        />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="p-5 sm:p-6">
      <NotificationList
        initialNotifications={result.data?.notifications || []}
        initialUnreadCount={result.data?.unreadCount || 0}
        unreadCounts={countsResult.success ? (countsResult.data || {}) : {}}
      />
    </DashboardCard>
  );
}

function NotificationsContentFallback() {
  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/60 p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
