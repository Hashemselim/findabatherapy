"use client";

import { Mail, MailOpen, Reply, Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

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
    { label: "Total", value: totalCount, icon: Inbox, color: "text-slate-600" },
    { label: "Unread", value: unreadCount, icon: Mail, color: "text-[#5788FF]" },
    { label: "Read", value: readCount, icon: MailOpen, color: "text-slate-500" },
    { label: "Replied", value: repliedCount, icon: Reply, color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
