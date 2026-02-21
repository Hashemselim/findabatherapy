import Link from "next/link";
import {
  Briefcase,
  Eye,
  Heart,
  Mail,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { brandColors } from "@/config/brands";
import { cn } from "@/lib/utils";

interface MultiBrandStatsProps {
  // Find ABA Therapy stats
  therapyViews?: number;
  therapyViewsTrend?: number;
  therapyInquiries?: number;
  // Find ABA Jobs stats
  jobApplications?: number;
  activeJobs?: number;
  // Plan info
  isPaidPlan: boolean;
}

export function MultiBrandStats({
  therapyViews = 0,
  therapyViewsTrend,
  therapyInquiries = 0,
  jobApplications = 0,
  activeJobs = 0,
  isPaidPlan,
}: MultiBrandStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Find ABA Therapy - Profile Views */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1.5">
            <Heart
              className="h-3.5 w-3.5"
              style={{ color: brandColors.therapy }}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">Profile Views</p>
          </div>
          <Eye className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {therapyViews.toLocaleString()}
            </span>
            {therapyViewsTrend !== undefined && therapyViewsTrend !== 0 && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  therapyViewsTrend > 0 ? "text-emerald-600" : "text-red-500"
                )}
              >
                <TrendingUp
                  className={cn(
                    "mr-0.5 h-3 w-3",
                    therapyViewsTrend < 0 && "rotate-180"
                  )}
                />
                {Math.abs(therapyViewsTrend)}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPaidPlan ? (
              <Link
                href="/dashboard/analytics"
                className="hover:underline"
                style={{ color: brandColors.therapy }}
              >
                View analytics
              </Link>
            ) : (
              "Families viewing your listing"
            )}
          </p>
        </CardContent>
      </Card>

      {/* Find ABA Therapy - Inquiries */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1.5">
            <Heart
              className="h-3.5 w-3.5"
              style={{ color: brandColors.therapy }}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">New Inquiries</p>
          </div>
          <Mail className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground">
            {therapyInquiries}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPaidPlan ? (
              <Link
                href="/dashboard/notifications"
                className="hover:underline"
                style={{ color: brandColors.therapy }}
              >
                View notifications
              </Link>
            ) : (
              "Upgrade to receive inquiries"
            )}
          </p>
        </CardContent>
      </Card>

      {/* Find ABA Jobs - Applications */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1.5">
            <Briefcase
              className="h-3.5 w-3.5"
              style={{ color: brandColors.jobs }}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">New Applications</p>
          </div>
          <UserPlus className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground">
            {jobApplications}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link
              href="/dashboard/employees"
              className="hover:underline"
              style={{ color: brandColors.jobs }}
            >
              Review applications
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Find ABA Jobs - Active Jobs */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1.5">
            <Briefcase
              className="h-3.5 w-3.5"
              style={{ color: brandColors.jobs }}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </div>
          <Briefcase className="h-4 w-4 text-muted-foreground/60" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-foreground">
            {activeJobs}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link
              href="/dashboard/jobs"
              className="hover:underline"
              style={{ color: brandColors.jobs }}
            >
              Manage job postings
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
