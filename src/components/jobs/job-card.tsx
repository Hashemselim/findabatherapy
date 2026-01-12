"use client";

import Link from "next/link";
import { MapPin, Clock, DollarSign, Building2, Navigation, BadgeCheck, Globe2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { POSITION_TYPES, EMPLOYMENT_TYPES, US_STATES } from "@/lib/validations/jobs";
import type { JobSearchResult } from "@/lib/queries/jobs";
import { cn } from "@/lib/utils";

function formatSalary(job: JobSearchResult): string | null {
  if (!job.salaryMin) return null;

  const formatNumber = (n: number) => {
    if (job.salaryType === "annual") {
      if (n >= 1000) {
        return `$${(n / 1000).toFixed(0)}k`;
      }
    }
    return `$${n}`;
  };

  const suffix = job.salaryType === "hourly" ? "/hr" : "/yr";

  if (job.salaryMax && job.salaryMax > job.salaryMin) {
    return `${formatNumber(job.salaryMin)} - ${formatNumber(job.salaryMax)}${suffix}`;
  }

  return `${formatNumber(job.salaryMin)}${suffix}`;
}

function getPositionLabel(value: string): string {
  return POSITION_TYPES.find((p) => p.value === value)?.label || value;
}

function getEmploymentLabels(values: string[]): string[] {
  return values.map((v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v);
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/** Strip HTML tags and truncate for preview */
function getDescriptionPreview(description: string | null): string | null {
  if (!description) return null;
  // Strip HTML tags
  const text = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

/** Format service states for display */
function formatServiceArea(serviceStates: string[] | null | undefined): string | null {
  if (!serviceStates || serviceStates.length === 0) return null;
  if (serviceStates.includes("*")) return "Nationwide";
  if (serviceStates.length === 1) {
    const state = US_STATES.find((s) => s.value === serviceStates[0]);
    return state?.label || serviceStates[0];
  }
  if (serviceStates.length <= 3) {
    return serviceStates.join(", ");
  }
  return `${serviceStates.slice(0, 2).join(", ")} +${serviceStates.length - 2}`;
}

interface JobCardProps {
  job: JobSearchResult;
  index?: number;
}

export function JobCard({ job, index }: JobCardProps) {
  const salary = formatSalary(job);
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
    ? "Remote"
    : "Location TBD";

  const positionLabel = getPositionLabel(job.positionType);
  const employmentLabels = getEmploymentLabels(job.employmentTypes);
  const isPremium = job.provider.planTier !== "free";
  const descriptionPreview = getDescriptionPreview(job.description);
  const serviceArea = formatServiceArea(job.serviceStates);

  return (
    <Link href={`/job/${job.slug}`} className="group block">
      <Card
        className={cn(
          "border transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]",
          isPremium
            ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-400/50"
            : "border-border/60 bg-white hover:border-emerald-500/30"
        )}
        style={index !== undefined ? { animationDelay: `${index * 50}ms` } : undefined}
      >
        <CardContent className="flex gap-4 p-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Avatar className="h-14 w-14 border border-border/60 transition-all duration-300 ease-premium group-hover:border-emerald-500/30 group-hover:scale-[1.02]">
              {job.provider.logoUrl ? (
                <AvatarImage src={job.provider.logoUrl} alt={job.provider.agencyName} />
              ) : null}
              <AvatarFallback className="bg-emerald-50 text-base font-semibold text-emerald-700">
                {job.provider.agencyName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-emerald-700">
                {job.title}
              </h3>
              {isPremium && (
                <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-700 transition-all duration-300 ease-premium group-hover:scale-[1.02] group-hover:bg-emerald-50">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Company Name */}
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{job.provider.agencyName}</span>
            </div>

            {/* Location and Salary Row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
              {job.distanceFormatted && (
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <Navigation className="h-3.5 w-3.5" />
                  {job.distanceFormatted}
                </span>
              )}
              {salary && (
                <span className="flex items-center gap-1 font-medium text-emerald-600">
                  <DollarSign className="h-3.5 w-3.5" />
                  {salary}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getTimeAgo(job.publishedAt)}
              </span>
            </div>

            {/* Description Preview */}
            {descriptionPreview && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {descriptionPreview}
              </p>
            )}

            {/* Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                {positionLabel}
              </Badge>
              {employmentLabels.slice(0, 2).map((label) => (
                <Badge key={label} variant="outline" className="text-muted-foreground">
                  {label}
                </Badge>
              ))}
              {job.remoteOption && (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                  Remote OK
                </Badge>
              )}
              {serviceArea && (
                <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700">
                  <Globe2 className="h-3 w-3" />
                  {serviceArea}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
