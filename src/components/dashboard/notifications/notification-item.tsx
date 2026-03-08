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
import { getDashboardToneClasses, type DashboardTone } from "@/components/dashboard/ui";

const TYPE_CONFIG: Record<NotificationType, {
  icon: typeof Bell;
  tone: DashboardTone;
}> = {
  contact_form: {
    icon: Mail,
    tone: "info",
  },
  intake_submission: {
    icon: FileText,
    tone: "premium",
  },
  job_application: {
    icon: UserCheck,
    tone: "success",
  },
  task_overdue: {
    icon: Clock,
    tone: "danger",
  },
  auth_expiring: {
    icon: AlertTriangle,
    tone: "warning",
  },
  credential_expiring: {
    icon: ShieldAlert,
    tone: "warning",
  },
  status_change: {
    icon: ArrowRightLeft,
    tone: "info",
  },
  system: {
    icon: Bell,
    tone: "default",
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
  const toneStyles = getDashboardToneClasses(config.tone);

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
          : "border-primary/20 bg-primary/5 hover:bg-primary/10",
        isPending && "opacity-60"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        toneStyles.icon
      )}>
        <Icon className={cn("h-4.5 w-4.5", toneStyles.emphasis)} />
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
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
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
