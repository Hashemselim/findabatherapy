"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsAsRead,
  type Notification,
  type NotificationType,
} from "@/lib/actions/notifications";
import { NotificationItem } from "./notification-item";

type FilterTab = "all" | NotificationType;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "contact_form", label: "Contacts" },
  { value: "intake_submission", label: "Intake" },
  { value: "job_application", label: "Applications" },
  { value: "auth_expiring", label: "Authorizations" },
  { value: "credential_expiring", label: "Credentials" },
  { value: "status_change", label: "Status Changes" },
  { value: "system", label: "System" },
];

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    const date = new Date(n.createdAt);
    if (date >= today) {
      groups[0].items.push(n);
    } else if (date >= yesterday) {
      groups[1].items.push(n);
    } else if (date >= thisWeek) {
      groups[2].items.push(n);
    } else {
      groups[3].items.push(n);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

interface NotificationListProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  unreadCounts: Partial<Record<NotificationType, number>>;
}

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
  unreadCounts,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isPending, startTransition] = useTransition();

  // Filter by tab
  const filtered = activeTab === "all"
    ? notifications
    : notifications.filter((n) => n.type === activeTab);

  const groups = groupByDate(filtered);

  // Only show tabs that have notifications
  const activeTabs = FILTER_TABS.filter((tab) => {
    if (tab.value === "all") return true;
    return notifications.some((n) => n.type === tab.value);
  });

  const handleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const type = activeTab === "all" ? undefined : activeTab;
      await markAllNotificationsAsRead(type);
      setNotifications((prev) =>
        prev.map((n) => {
          if (activeTab === "all" || n.type === activeTab) {
            return { ...n, isRead: true };
          }
          return n;
        })
      );
      setUnreadCount(activeTab === "all" ? 0 : Math.max(0, unreadCount - (unreadCounts[activeTab] || 0)));
    });
  };

  const getTabUnreadCount = (tab: FilterTab): number => {
    if (tab === "all") return unreadCount;
    return unreadCounts[tab] || 0;
  };

  return (
    <div className="space-y-4">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      {activeTabs.length > 2 && (
        <div className="flex flex-wrap gap-1.5">
          {activeTabs.map((tab) => {
            const count = getTabUnreadCount(tab.value);
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.value
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Notification groups */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {activeTab === "all" ? (
              <Bell className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Inbox className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            {activeTab === "all" ? "No notifications yet" : "No notifications in this category"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeTab === "all"
              ? "Notifications will appear here when you receive new contacts, applications, or alerts."
              : "Try checking a different category."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleRead}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
