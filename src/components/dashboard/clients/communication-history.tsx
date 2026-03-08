"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

import { DashboardStatusBadge, type DashboardTone } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import {
  getClientCommunications,
  type ClientCommunication,
} from "@/lib/actions/communications";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; tone: DashboardTone; label: string }> = {
  sent: { icon: CheckCircle2, tone: "success", label: "Sent" },
  failed: { icon: XCircle, tone: "danger", label: "Failed" },
  bounced: { icon: AlertCircle, tone: "warning", label: "Bounced" },
};

const STATUS_ICON_CLASSES: Record<DashboardTone, string> = {
  default: "text-muted-foreground",
  info: "text-primary",
  success: "text-primary",
  warning: "text-amber-700",
  danger: "text-destructive",
  premium: "text-primary",
};

interface CommunicationHistoryProps {
  clientId: string;
}

export function CommunicationHistory({ clientId }: CommunicationHistoryProps) {
  const [communications, setCommunications] = useState<ClientCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getClientCommunications(clientId).then((result) => {
      if (result.success && result.data) {
        setCommunications(result.data);
      }
      setIsLoading(false);
    });
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading communications...
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No communications sent yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {communications.map((comm) => {
        const statusConfig = STATUS_CONFIG[comm.status] || STATUS_CONFIG.sent;
        const StatusIcon = statusConfig.icon;
        const isExpanded = expandedId === comm.id;

        return (
          <div
            key={comm.id}
            className="border rounded-lg overflow-hidden"
          >
            {/* Summary row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : comm.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <StatusIcon className={cn("h-4 w-4 shrink-0", STATUS_ICON_CLASSES[statusConfig.tone])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{comm.subject}</p>
                <p className="text-xs text-muted-foreground">
                  To: {comm.recipient_email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comm.sent_at), "MMM d, yyyy")}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t px-3 py-3 bg-muted/30 space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(comm.sent_at), "PPP 'at' p")}
                  </span>
                  <DashboardStatusBadge tone={statusConfig.tone} className="text-xs">
                    {statusConfig.label}
                  </DashboardStatusBadge>
                  {comm.template_slug && (
                    <DashboardStatusBadge tone="default" className="text-xs">
                      Template: {comm.template_slug}
                    </DashboardStatusBadge>
                  )}
                </div>
                <div
                  className="text-sm prose prose-sm max-w-none bg-white rounded-md p-3 border"
                  dangerouslySetInnerHTML={{ __html: comm.body }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
