"use client";

import { DashboardStatusBadge, type DashboardTone } from "@/components/dashboard/ui";

const STAGE_TONES: Record<string, DashboardTone> = {
  discovered: "default",
  qualified: "info",
  ready_to_contact: "premium",
  contacted: "warning",
  engaged: "warning",
  active_referrer: "success",
  nurture: "premium",
  do_not_contact: "danger",
  archived: "default",
};

export function ReferralStageBadge({ stage }: { stage: string }) {
  return (
    <DashboardStatusBadge tone={STAGE_TONES[stage] || "default"} className="text-xs">
      {stage.replace(/_/g, " ")}
    </DashboardStatusBadge>
  );
}
