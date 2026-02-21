"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Bell,
  FileText,
  Mail,
  UserCheck,
  AlertTriangle,
  ArrowRightLeft,
  ShieldAlert,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { markNotificationAsRead } from "@/lib/actions/notifications";
import type { Notification, NotificationType } from "@/lib/actions/notifications";

const TYPE_CONFIG: Record<NotificationType, {
  icon: typeof Bell;
  color: string;
  bgColor: string;
}> = {
  contact_form: {
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  intake_submission: {
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  job_application: {
    icon: UserCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  task_overdue: {
    icon: Clock,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  auth_expiring: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  credential_expiring: {
    icon: ShieldAlert,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  status_change: {
    icon: ArrowRightLeft,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  system: {
    icon: Bell,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
  },
};

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const Icon = config.icon;

  const handleClick = () => {
    startTransition(async () => {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
        onRead?.(notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        notification.isRead
          ? "border-transparent bg-transparent hover:bg-muted/50"
          : "border-blue-100 bg-blue-50/30 hover:bg-blue-50/50",
        isPending && "opacity-60"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        config.bgColor
      )}>
        <Icon className={cn("h-4.5 w-4.5", config.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-snug",
            notification.isRead ? "text-muted-foreground" : "font-medium text-foreground"
          )}>
            {notification.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {getRelativeTime(notification.createdAt)}
            </span>
            {!notification.isRead && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
            )}
          </div>
        </div>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {notification.body}
          </p>
        )}
      </div>
    </button>
  );
}
