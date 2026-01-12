"use client";

import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEARCH_POSITION_OPTIONS } from "@/lib/validations/jobs";
import { BrandedJobCard } from "@/components/jobs/branded-job-card";
import type { JobSearchResult } from "@/lib/queries/jobs";

interface CareersJobFilterProps {
  jobs: JobSearchResult[];
  brandColor: string;
  providerSlug: string;
  ctaText: string;
}

export function CareersJobFilter({ jobs, brandColor, providerSlug, ctaText }: CareersJobFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Get unique position types from the jobs
  const availablePositions = useMemo(() => {
    const positions = new Set(jobs.map((job) => job.positionType));
    return SEARCH_POSITION_OPTIONS.filter((option) => {
      // Handle combined RBT/BT option
      if (option.value === "rbt_bt") {
        return positions.has("rbt") || positions.has("bt");
      }
      return positions.has(option.value);
    });
  }, [jobs]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesLocation =
          job.location?.city.toLowerCase().includes(query) ||
          job.location?.state.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLocation) return false;
      }

      // Position type filter
      if (selectedPositions.length > 0) {
        const matchesPosition = selectedPositions.some((pos) => {
          if (pos === "rbt_bt") {
            return job.positionType === "rbt" || job.positionType === "bt";
          }
          return job.positionType === pos;
        });
        if (!matchesPosition) return false;
      }

      return true;
    });
  }, [jobs, searchQuery, selectedPositions]);

  const togglePosition = (position: string) => {
    setSelectedPositions((prev) =>
      prev.includes(position)
        ? prev.filter((p) => p !== position)
        : [...prev, position]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPositions([]);
  };

  const hasActiveFilters = searchQuery || selectedPositions.length > 0;

  // Helper to calculate contrasting text color
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  // Render job cards
  const renderJobCards = (jobsToRender: JobSearchResult[]) => (
    <>
      {jobsToRender.length === 0 ? (
        <div className="rounded-xl border border-border/60 py-8 text-center">
          <p className="text-muted-foreground">
            No positions match your search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobsToRender.map((job, index) => (
            <BrandedJobCard
              key={job.id}
              job={job}
              providerSlug={providerSlug}
              index={index}
              brandColor={brandColor}
              ctaText={ctaText}
            />
          ))}
        </div>
      )}
    </>
  );

  if (jobs.length <= 1) {
    // Don't show filters for 0-1 jobs
    return renderJobCards(jobs);
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search positions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Position Type Filters */}
      {availablePositions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filter:
          </span>
          {availablePositions.map((option) => {
            const isSelected = selectedPositions.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => togglePosition(option.value)}
                className="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                style={
                  isSelected
                    ? {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                        color: getContrastColor(brandColor),
                      }
                    : {
                        backgroundColor: "white",
                        borderColor: "rgba(0,0,0,0.1)",
                        color: "inherit",
                      }
                }
              >
                {option.label}
              </button>
            );
          })}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredJobs.length} of {jobs.length} position{jobs.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Filtered jobs */}
      {renderJobCards(filteredJobs)}
    </div>
  );
}
