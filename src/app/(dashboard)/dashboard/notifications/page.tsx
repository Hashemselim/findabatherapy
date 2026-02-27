import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getNotifications, getUnreadCountsByType } from "@/lib/actions/notifications";
import { NotificationList } from "@/components/dashboard/notifications/notification-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export const metadata = {
  title: "Notifications | Dashboard",
  description: "View all notifications and alerts",
};

export default async function NotificationsPage() {
  const user = await getUser();
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

        <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-lg font-medium text-muted-foreground">
                Failed to load notifications
              </h2>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Please try refreshing the page
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Notifications" description="View all notifications and alerts" />

      <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
        <NotificationList
          initialNotifications={result.data?.notifications || []}
          initialUnreadCount={result.data?.unreadCount || 0}
          unreadCounts={countsResult.success ? (countsResult.data || {}) : {}}
        />
      </div>
    </div>
  );
}
