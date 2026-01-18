import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Linkedin,
  FileText,
  Calendar,
  Briefcase,
  Clock,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getApplication } from "@/lib/actions/applications";
import { POSITION_TYPES, APPLICATION_STATUSES, APPLICATION_SOURCES, type ApplicationStatus } from "@/lib/validations/jobs";
import { ApplicationActions } from "@/components/jobs/application-actions";

interface EmployeeApplicationPageProps {
  params: Promise<{ id: string }>;
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
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function EmployeeApplicationPage({ params }: EmployeeApplicationPageProps) {
  const { id } = await params;
  const result = await getApplication(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const application = result.data;
  const positionLabel = POSITION_TYPES.find((p) => p.value === application.job.positionType)?.label || application.job.positionType;
  const statusInfo = APPLICATION_STATUSES.find((s) => s.value === application.status);
  const statusColor = STATUS_COLORS[application.status as ApplicationStatus];
  const sourceInfo = APPLICATION_SOURCES.find((s) => s.value === application.source);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Application Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarFallback className="bg-emerald-50 text-xl font-semibold text-emerald-700">
                    {getInitials(application.applicantName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">
                      {application.applicantName}
                    </h1>
                    <Badge variant="outline" className={statusColor}>
                      {statusInfo?.label || application.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <a
                      href={`mailto:${application.applicantEmail}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-600"
                    >
                      <Mail className="h-4 w-4" />
                      {application.applicantEmail}
                    </a>
                    {application.applicantPhone && (
                      <a
                        href={`tel:${application.applicantPhone}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-600"
                      >
                        <Phone className="h-4 w-4" />
                        {application.applicantPhone}
                      </a>
                    )}
                    {application.linkedinUrl && (
                      <a
                        href={application.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-600"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Applied {getTimeAgo(application.createdAt)}
                    </span>
                    {sourceInfo && (
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        Source: {sourceInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Quick Actions */}
              <ApplicationActions
                applicationId={application.id}
                currentStatus={application.status as ApplicationStatus}
                currentRating={application.rating}
                currentNotes={application.notes}
                hasResume={!!application.resumePath}
              />
            </CardContent>
          </Card>

          {/* Cover Letter */}
          {application.coverLetter && (
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {application.coverLetter}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {application.notes ? (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {application.notes}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No internal notes yet. Add notes using the panel above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Job & Timeline */}
        <div className="space-y-6">
          {/* Job Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applied Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <Link
                    href={`/dashboard/jobs/${application.job.id}`}
                    className="font-semibold text-foreground hover:text-emerald-600"
                  >
                    {application.job.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {positionLabel}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/jobs/${application.job.id}`}>
                  View Job Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Application Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <User className="h-4 w-4" />
                    </div>
                    {application.reviewedAt && (
                      <div className="mt-1 h-full w-0.5 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-sm">Application Submitted</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(application.createdAt)}
                    </p>
                  </div>
                </div>

                {application.reviewedAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Reviewed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(application.reviewedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resume Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume</CardTitle>
            </CardHeader>
            <CardContent>
              {application.resumePath ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Resume Attached</p>
                    <p className="text-xs text-muted-foreground">
                      Click the download button to view
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No resume was provided with this application.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
