"use client";

import { DashboardStatusBadge, type DashboardTone } from "@/components/dashboard/ui";
import { CLIENT_STATUS_OPTIONS, type ClientStatus } from "@/lib/validations/clients";

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

const statusToneMap: Record<ClientStatus, DashboardTone> = {
  inquiry: "info",
  intake_pending: "premium",
  waitlist: "warning",
  assessment: "warning",
  authorization: "info",
  active: "success",
  on_hold: "warning",
  discharged: "default",
};

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  const option = CLIENT_STATUS_OPTIONS.find((opt) => opt.value === status);
  const label = option?.label || status;

  return (
    <DashboardStatusBadge tone={statusToneMap[status]} className={className}>
      {label}
    </DashboardStatusBadge>
  );
}
