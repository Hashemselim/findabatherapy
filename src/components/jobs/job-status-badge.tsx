import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/validations/jobs";

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: "default" | "secondary" | "outline"; className: string }> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  published: {
    label: "Published",
    variant: "default",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  filled: {
    label: "Filled",
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  closed: {
    label: "Closed",
    variant: "outline",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <Badge
      variant={config.variant}
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
