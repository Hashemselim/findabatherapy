import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/platform/auth/server";
import { getNotifications, getUnreadCountsByType } from "@/lib/actions/notifications";
import { NotificationList } from "@/components/dashboard/notifications/notification-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Notifications | Dashboard",
  description: "View all notifications and alerts",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const [result, countsResult] = await Promise.all([
    getNotifications({ limit: 100 }),
    getUnreadCountsByType(),
  ]);

  if (!result.success) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader title="Notifications" description="View all notifications and alerts" />

        <DashboardCard className="p-5 sm:p-6">
          <DashboardEmptyState
            icon={Bell}
            title="Failed to load notifications"
            description="Please try refreshing the page."
          />
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Notifications" description="View all notifications and alerts" />

      <DashboardCard className="p-5 sm:p-6">
        <NotificationList
          initialNotifications={result.data?.notifications || []}
          initialUnreadCount={result.data?.unreadCount || 0}
          unreadCounts={countsResult.success ? (countsResult.data || {}) : {}}
        />
      </DashboardCard>
    </div>
  );
}
