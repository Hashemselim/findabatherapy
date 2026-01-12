"use client";

import {
  Inbox,
  Sparkles,
  Eye,
  Phone,
  CalendarDays,
  Gift,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/validations/jobs";

export type ApplicationsFilter = ApplicationStatus | "all";

interface ApplicationsFiltersProps {
  filter: ApplicationsFilter;
  onFilterChange: (filter: ApplicationsFilter) => void;
  counts: {
    total: number;
    new: number;
    reviewed: number;
    phone_screen: number;
    interview: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  jobs?: { id: string; title: string }[];
  selectedJobId?: string;
  onJobChange?: (jobId: string) => void;
}

const filterConfig = [
  { key: "all" as const, label: "All", icon: Inbox, countKey: "total" as const },
  { key: "new" as const, label: "New", icon: Sparkles, countKey: "new" as const, activeColor: "text-emerald-500" },
  { key: "reviewed" as const, label: "Reviewed", icon: Eye, countKey: "reviewed" as const },
  { key: "phone_screen" as const, label: "Phone", icon: Phone, countKey: "phone_screen" as const, activeColor: "text-purple-500" },
  { key: "interview" as const, label: "Interview", icon: CalendarDays, countKey: "interview" as const, activeColor: "text-orange-500" },
  { key: "offered" as const, label: "Offered", icon: Gift, countKey: "offered" as const, activeColor: "text-emerald-500" },
  { key: "hired" as const, label: "Hired", icon: CheckCircle, countKey: "hired" as const, activeColor: "text-green-500" },
  { key: "rejected" as const, label: "Rejected", icon: XCircle, countKey: "rejected" as const, activeColor: "text-red-500" },
];

export function ApplicationsFilters({
  filter,
  onFilterChange,
  counts,
  jobs,
  selectedJobId,
  onJobChange,
}: ApplicationsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterConfig.map(({ key, label, icon: Icon, countKey, activeColor }) => {
        const isActive = filter === key;
        const count = counts[countKey];

        // Hide filters with 0 count (except All and New)
        if (count === 0 && key !== "all" && key !== "new") {
          return null;
        }

        return (
          <Button
            key={key}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(key)}
            className={cn(
              "h-8 gap-1.5 px-2.5 text-xs",
              !isActive && activeColor
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span className={cn(
              "ml-0.5 tabular-nums",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {count}
            </span>
          </Button>
        );
      })}

      {/* Job Filter */}
      {jobs && jobs.length > 1 && onJobChange && (
        <Select value={selectedJobId || "all"} onValueChange={onJobChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
