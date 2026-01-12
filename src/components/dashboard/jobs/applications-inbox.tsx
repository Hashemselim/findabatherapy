"use client";

import { useState, useCallback } from "react";

import {
  ApplicationsFilters,
  type ApplicationsFilter,
} from "./applications-filters";
import { ApplicationsMessageList } from "./applications-message-list";
import { ApplicationsDetailPanel } from "./applications-detail-panel";
import {
  getApplication,
  updateApplicationStatus,
  type ApplicationSummary,
  type ApplicationWithJob,
} from "@/lib/actions/applications";
import type { ApplicationStatus } from "@/lib/validations/jobs";

interface ApplicationsInboxProps {
  initialApplications: ApplicationSummary[];
  initialNewCount: number;
  jobs: { id: string; title: string }[];
}

export function ApplicationsInbox({
  initialApplications,
  initialNewCount,
  jobs,
}: ApplicationsInboxProps) {
  const [applications, setApplications] = useState<ApplicationSummary[]>(initialApplications);
  const [newCount, setNewCount] = useState(initialNewCount);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialApplications[0]?.id || null
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [filter, setFilter] = useState<ApplicationsFilter>("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Calculate counts for each status
  const counts = {
    total: applications.length,
    new: applications.filter((a) => a.status === "new").length,
    reviewed: applications.filter((a) => a.status === "reviewed").length,
    phone_screen: applications.filter((a) => a.status === "phone_screen").length,
    interview: applications.filter((a) => a.status === "interview").length,
    offered: applications.filter((a) => a.status === "offered").length,
    hired: applications.filter((a) => a.status === "hired").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  // Filter applications
  let filteredApplications = filter === "all"
    ? applications
    : applications.filter((a) => a.status === filter);

  // Filter by job
  if (selectedJobId !== "all") {
    filteredApplications = filteredApplications.filter(
      (a) => a.job.id === selectedJobId
    );
  }

  const handleSelectApplication = useCallback(async (app: ApplicationSummary) => {
    setSelectedId(app.id);
    setMobileShowDetail(true);
    setIsLoadingDetail(true);

    // Fetch full application details
    const result = await getApplication(app.id);
    if (result.success && result.data) {
      setSelectedApplication(result.data);

      // Auto-mark as reviewed if status is "new"
      if (app.status === "new") {
        const updateResult = await updateApplicationStatus(app.id, "reviewed");
        if (updateResult.success) {
          // Update local state
          setApplications((prev) =>
            prev.map((a) =>
              a.id === app.id
                ? { ...a, status: "reviewed" as ApplicationStatus }
                : a
            )
          );
          setNewCount((prev) => Math.max(0, prev - 1));
          setSelectedApplication((prev) =>
            prev ? { ...prev, status: "reviewed" as ApplicationStatus } : null
          );
        }
      }
    }

    setIsLoadingDetail(false);
  }, []);

  const handleApplicationUpdate = useCallback((updatedFields: Partial<ApplicationWithJob>) => {
    // Update the full application in state
    setSelectedApplication((prev) =>
      prev ? { ...prev, ...updatedFields } : null
    );

    // Update the summary in the list if status or rating changed
    if (updatedFields.status !== undefined || updatedFields.rating !== undefined) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedId
            ? {
                ...a,
                ...(updatedFields.status !== undefined && { status: updatedFields.status }),
                ...(updatedFields.rating !== undefined && { rating: updatedFields.rating }),
              }
            : a
        )
      );

      // Update new count if status changed from "new"
      if (updatedFields.status !== undefined && updatedFields.status !== "new") {
        const wasNew = applications.find((a) => a.id === selectedId)?.status === "new";
        if (wasNew) {
          setNewCount((prev) => Math.max(0, prev - 1));
        }
      }
    }
  }, [selectedId, applications]);

  const handleBackToList = useCallback(() => {
    setMobileShowDetail(false);
  }, []);

  // Load first application on mount if there are applications
  useState(() => {
    if (initialApplications.length > 0 && !selectedApplication) {
      handleSelectApplication(initialApplications[0]);
    }
  });

  return (
    <>
      {/* Mobile layout - page scrolls naturally */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Filters - hide when viewing detail */}
        {!mobileShowDetail && (
          <ApplicationsFilters
            filter={filter}
            onFilterChange={setFilter}
            counts={counts}
            jobs={jobs}
            selectedJobId={selectedJobId}
            onJobChange={setSelectedJobId}
          />
        )}

        {/* Show either list or detail */}
        {!mobileShowDetail ? (
          <ApplicationsMessageList
            applications={filteredApplications}
            selectedId={selectedId}
            onSelect={handleSelectApplication}
          />
        ) : (
          <ApplicationsDetailPanel
            application={selectedApplication}
            onBack={handleBackToList}
            showBackButton
            onApplicationUpdate={handleApplicationUpdate}
          />
        )}
      </div>

      {/* Desktop layout - fixed height with internal scroll */}
      <div className="hidden min-h-0 flex-1 flex-col gap-3 lg:flex">
        <ApplicationsFilters
          filter={filter}
          onFilterChange={setFilter}
          counts={counts}
          jobs={jobs}
          selectedJobId={selectedJobId}
          onJobChange={setSelectedJobId}
        />

        {/* Two-panel layout */}
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="w-[350px] shrink-0">
            <ApplicationsMessageList
              applications={filteredApplications}
              selectedId={selectedId}
              onSelect={handleSelectApplication}
            />
          </div>
          <div className="flex min-h-0 flex-1">
            <ApplicationsDetailPanel
              application={selectedApplication}
              onApplicationUpdate={handleApplicationUpdate}
            />
          </div>
        </div>
      </div>
    </>
  );
}
