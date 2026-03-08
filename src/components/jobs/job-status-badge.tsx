import { DashboardStatusBadge, type DashboardTone } from "@/components/dashboard/ui";
import type { JobStatus } from "@/lib/validations/jobs";

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; tone: DashboardTone }> = {
  draft: {
    label: "Draft",
    tone: "default",
  },
  published: {
    label: "Published",
    tone: "success",
  },
  filled: {
    label: "Filled",
    tone: "info",
  },
  closed: {
    label: "Closed",
    tone: "danger",
  },
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <DashboardStatusBadge tone={config.tone} className={className}>
      {config.label}
    </DashboardStatusBadge>
  );
}
