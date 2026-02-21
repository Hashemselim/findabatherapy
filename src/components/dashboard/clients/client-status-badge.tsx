"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLIENT_STATUS_OPTIONS, type ClientStatus } from "@/lib/validations/clients";

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

const statusColorMap: Record<ClientStatus, string> = {
  inquiry: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  intake_pending: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  waitlist: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  assessment: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  authorization: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100",
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  on_hold: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  discharged: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  const option = CLIENT_STATUS_OPTIONS.find((opt) => opt.value === status);
  const label = option?.label || status;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium",
        statusColorMap[status],
        className
      )}
    >
      {label}
    </Badge>
  );
}
