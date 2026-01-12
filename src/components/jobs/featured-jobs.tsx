import Link from "next/link";
import { MapPin, Clock, DollarSign, Building2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { POSITION_TYPES, EMPLOYMENT_TYPES } from "@/lib/validations/jobs";
import type { JobSearchResult } from "@/lib/queries/jobs";

function formatSalary(job: JobSearchResult): string | null {
  if (!job.salaryMin) return null;

  const formatNumber = (n: number) => {
    if (n >= 1000) {
      return `$${(n / 1000).toFixed(0)}k`;
    }
    return `$${n}`;
  };

  const type = job.salaryType === "hourly" ? "/hr" : "/yr";

  if (job.salaryMax && job.salaryMax > job.salaryMin) {
    return `${formatNumber(job.salaryMin)} - ${formatNumber(job.salaryMax)}${type}`;
  }

  return `${formatNumber(job.salaryMin)}${type}`;
}

function getPositionLabel(value: string): string {
  return POSITION_TYPES.find((p) => p.value === value)?.label || value;
}

function getEmploymentLabel(values: string[]): string {
  return values
    .map((v) => EMPLOYMENT_TYPES.find((e) => e.value === v)?.label || v)
    .join(" / ");
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

interface FeaturedJobCardProps {
  job: JobSearchResult;
}

export function FeaturedJobCard({ job }: FeaturedJobCardProps) {
  const salary = formatSalary(job);
  const location = job.location
    ? `${job.location.city}, ${job.location.state}`
    : job.remoteOption
    ? "Remote"
    : "Location TBD";

  return (
    <Link href={`/job/${job.slug}`} className="group block">
      <Card className="h-full border border-border/60 bg-white transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border border-border/60 transition-all duration-300 ease-premium group-hover:border-emerald-500/30 group-hover:scale-[1.03]">
              {job.provider.logoUrl ? (
                <AvatarImage src={job.provider.logoUrl} alt={job.provider.agencyName} />
              ) : null}
              <AvatarFallback className="bg-emerald-50 font-semibold text-emerald-700">
                {job.provider.agencyName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base transition-colors duration-300 group-hover:text-emerald-700">
                {job.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3" />
                {job.provider.agencyName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
            {salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {salary}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {getPositionLabel(job.positionType)}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {getEmploymentLabel(job.employmentTypes)}
            </Badge>
            {job.remoteOption && (
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Remote OK
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {getTimeAgo(job.publishedAt)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface FeaturedJobsProps {
  jobs: JobSearchResult[];
}

export function FeaturedJobs({ jobs }: FeaturedJobsProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <FeaturedJobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
