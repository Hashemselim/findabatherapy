"use client";

import Link from "next/link";
import { MapPin, Clock, DollarSign, Globe, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POSITION_TYPES, EMPLOYMENT_TYPES } from "@/lib/validations/jobs";
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

interface BrandedJobCardProps {
  job: JobSearchResult;
  providerSlug: string;
  index?: number;
  brandColor?: string;
  ctaText?: string;
}

// Helper to create a lighter shade of a color
function getLighterShade(hexColor: string, opacity: number = 0.1) {
  return `${hexColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

/**
 * Job card for the branded careers page
 * Links to /careers/[providerSlug]/[jobSlug] instead of the main site
 */
export function BrandedJobCard({ job, providerSlug, index, brandColor = "#10B981", ctaText = "View Details" }: BrandedJobCardProps) {
  const salary = formatSalary(job);
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
    ? "Remote"
    : "Location TBD";

  const positionLabel = getPositionLabel(job.positionType);
  const employmentLabels = getEmploymentLabels(job.employmentTypes);
  const descriptionPreview = getDescriptionPreview(job.description);

  return (
    <Link href={`/careers/${providerSlug}/${job.slug}`} className="group block">
      <Card
        className="border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px]"
        style={{
          animationDelay: index !== undefined ? `${index * 50}ms` : undefined,
          ["--brand-color" as string]: brandColor,
        }}
      >
        <CardContent className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3
                className="text-xl font-semibold text-foreground transition-colors duration-300"
                style={{ "--hover-color": brandColor } as React.CSSProperties}
              >
                <span className="group-hover:text-[var(--brand-color)]">{job.title}</span>
              </h3>

              {/* Meta info row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
                {job.remoteOption && (
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <Globe className="h-4 w-4" />
                    Remote OK
                  </span>
                )}
                {salary && (
                  <span className="flex items-center gap-1.5 font-medium" style={{ color: brandColor }}>
                    <DollarSign className="h-4 w-4" />
                    {salary}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {getTimeAgo(job.publishedAt)}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="hidden shrink-0 gap-1 sm:flex transition-colors"
              style={{
                color: brandColor,
              }}
            >
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          {/* Description Preview */}
          {descriptionPreview && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {descriptionPreview}
            </p>
          )}

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              style={{
                backgroundColor: getLighterShade(brandColor, 0.12),
                color: brandColor,
              }}
            >
              {positionLabel}
            </Badge>
            {employmentLabels.slice(0, 2).map((label) => (
              <Badge key={label} variant="outline" className="text-muted-foreground">
                {label}
              </Badge>
            ))}
          </div>

          {/* Mobile CTA */}
          <div className="mt-4 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              style={{
                color: brandColor,
                borderColor: brandColor,
              }}
            >
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
