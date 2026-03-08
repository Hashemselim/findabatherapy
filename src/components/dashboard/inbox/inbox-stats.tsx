"use client";

import { Mail, MailOpen, Reply, Inbox } from "lucide-react";

import { DashboardStatCard, type DashboardTone } from "@/components/dashboard/ui";

interface InboxStatsProps {
  unreadCount: number;
  readCount: number;
  repliedCount: number;
  totalCount: number;
}

export function InboxStats({
  unreadCount,
  readCount,
  repliedCount,
  totalCount,
}: InboxStatsProps) {
  const stats = [
    { label: "Total", value: totalCount, icon: Inbox, tone: "default" as DashboardTone },
    { label: "Unread", value: unreadCount, icon: Mail, tone: "info" as DashboardTone },
    { label: "Read", value: readCount, icon: MailOpen, tone: "default" as DashboardTone },
    { label: "Replied", value: repliedCount, icon: Reply, tone: "success" as DashboardTone },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <DashboardStatCard
          key={label}
          label={label}
          value={value}
          icon={<Icon className="h-5 w-5" />}
          tone={tone}
          className="h-full"
        />
      ))}
    </div>
  );
}
