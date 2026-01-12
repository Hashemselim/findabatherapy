"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Briefcase,
  Clock,
  Star,
  Filter,
  ChevronRight,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/validations/jobs";
import type { ApplicationSummary } from "@/lib/actions/applications";

interface ApplicationsListProps {
  applications: ApplicationSummary[];
  jobs: { id: string; title: string }[];
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  reviewed: "bg-gray-100 text-gray-700 border-gray-200",
  phone_screen: "bg-purple-100 text-purple-700 border-purple-200",
  interview: "bg-orange-100 text-orange-700 border-orange-200",
  offered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  hired: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

function getTimeAgo(date: string): string {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ApplicationsList({ applications, jobs }: ApplicationsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");

  const filteredApplications = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (jobFilter !== "all" && app.job.id !== jobFilter) return false;
    return true;
  });

  if (applications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Applications from job seekers will appear here when candidates apply to your job postings.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/dashboard/jobs">
              View Job Postings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter by:</span>
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {jobs.length > 1 && (
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
          <p className="text-sm text-muted-foreground">
            {filteredApplications.length} application{filteredApplications.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Applications */}
      {filteredApplications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <p className="text-muted-foreground">No applications match your filters.</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => {
                setStatusFilter("all");
                setJobFilter("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => {
            const statusInfo = APPLICATION_STATUSES.find((s) => s.value === app.status);
            const statusColor = STATUS_COLORS[app.status as ApplicationStatus];

            return (
              <Link key={app.id} href={`/dashboard/jobs/applications/${app.id}`}>
                <Card className="transition-all hover:border-emerald-300 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarFallback className="bg-emerald-50 text-emerald-700 font-medium">
                        {getInitials(app.applicantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {app.applicantName}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${statusColor}`}
                        >
                          {statusInfo?.label || app.status}
                        </Badge>
                        {app.status === "new" && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{app.applicantEmail}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span className="truncate">{app.job.title}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {getTimeAgo(app.createdAt)}
                        </span>
                        {app.rating && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {app.rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
