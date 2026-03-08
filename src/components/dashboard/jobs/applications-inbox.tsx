"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import {
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  ApplicationsFilters,
  type ApplicationsFilter,
} from "./applications-filters";
import { useState } from "react";
import type { ApplicationSummary } from "@/lib/actions/applications";

interface ApplicationsInboxProps {
  initialApplications: ApplicationSummary[];
  initialNewCount: number;
  jobs: { id: string; title: string }[];
}

const STATUS_TONES = {
  new: "info",
  reviewed: "default",
  phone_screen: "premium",
  interview: "warning",
  offered: "success",
  hired: "success",
  rejected: "danger",
} as const;

export function ApplicationsInbox({
  initialApplications,
  initialNewCount,
  jobs,
}: ApplicationsInboxProps) {
  const [filter, setFilter] = useState<ApplicationsFilter>("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("all");

  const counts = {
    total: initialApplications.length,
    new: initialNewCount,
    reviewed: initialApplications.filter((a) => a.status === "reviewed").length,
    phone_screen: initialApplications.filter((a) => a.status === "phone_screen").length,
    interview: initialApplications.filter((a) => a.status === "interview").length,
    offered: initialApplications.filter((a) => a.status === "offered").length,
    hired: initialApplications.filter((a) => a.status === "hired").length,
    rejected: initialApplications.filter((a) => a.status === "rejected").length,
  };

  let filteredApplications = filter === "all"
    ? initialApplications
    : initialApplications.filter((a) => a.status === filter);

  if (selectedJobId !== "all") {
    filteredApplications = filteredApplications.filter((a) => a.job.id === selectedJobId);
  }

  return (
    <div className="space-y-3">
      <ApplicationsFilters
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onJobChange={setSelectedJobId}
      />

      <DashboardTableCard>
        <DashboardTable>
          <DashboardTableHeader>
            <DashboardTableRow>
              <DashboardTableHead className="pl-5 normal-case tracking-normal">Applicant</DashboardTableHead>
              <DashboardTableHead className="normal-case tracking-normal">Job</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal md:table-cell">Status</DashboardTableHead>
              <DashboardTableHead className="hidden text-right normal-case tracking-normal sm:table-cell">Rating</DashboardTableHead>
              <DashboardTableHead className="pr-5 text-right normal-case tracking-normal">Applied</DashboardTableHead>
            </DashboardTableRow>
          </DashboardTableHeader>
          <DashboardTableBody>
            {filteredApplications.length === 0 ? (
              <DashboardTableRow>
                <DashboardTableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No applications match the current filters.
                </DashboardTableCell>
              </DashboardTableRow>
            ) : (
              filteredApplications.map((application) => (
                <DashboardTableRow key={application.id} className="group cursor-pointer">
                  <DashboardTableCell className="pl-5">
                    <Link href={`/dashboard/team/applicants/${application.id}`} className="block">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground group-hover:underline">
                          {application.applicantName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {application.applicantEmail}
                        </span>
                      </div>
                    </Link>
                  </DashboardTableCell>
                  <DashboardTableCell>
                    <Link href={`/dashboard/team/applicants/${application.id}`} className="block text-muted-foreground">
                      {application.job.title}
                    </Link>
                  </DashboardTableCell>
                  <DashboardTableCell className="hidden md:table-cell">
                    <DashboardStatusBadge tone={STATUS_TONES[application.status] ?? "default"}>
                      {application.status.replace(/_/g, " ")}
                    </DashboardStatusBadge>
                  </DashboardTableCell>
                  <DashboardTableCell className="hidden text-right sm:table-cell">
                    {application.rating ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                        {application.rating}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </DashboardTableCell>
                  <DashboardTableCell className="pr-5 text-right">
                    <RelativeTime date={application.createdAt} className="text-sm text-muted-foreground" />
                  </DashboardTableCell>
                </DashboardTableRow>
              ))
            )}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardTableCard>
    </div>
  );
}
