"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Linkedin,
  Clock,
  ArrowLeft,
  Briefcase,
  Download,
  Star,
  MessageSquare,
  Loader2,
  Save,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateApplicationStatus,
  updateApplicationDetails,
  getResumeDownloadUrl,
  type ApplicationWithJob,
} from "@/lib/actions/applications";
import {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
  type ApplicationStatus,
} from "@/lib/validations/jobs";
import { RelativeTime } from "@/components/ui/relative-time";

interface ApplicationsDetailPanelProps {
  application: ApplicationWithJob | null;
  onBack?: () => void;
  showBackButton?: boolean;
  onApplicationUpdate?: (updatedApp: Partial<ApplicationWithJob>) => void;
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

const STATUS_BORDER_COLORS: Record<ApplicationStatus, string> = {
  new: "border-blue-300 focus:ring-blue-500",
  reviewed: "border-gray-300 focus:ring-gray-500",
  phone_screen: "border-purple-300 focus:ring-purple-500",
  interview: "border-orange-300 focus:ring-orange-500",
  offered: "border-emerald-300 focus:ring-emerald-500",
  hired: "border-green-300 focus:ring-green-500",
  rejected: "border-red-300 focus:ring-red-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ApplicationsDetailPanel({
  application,
  onBack,
  showBackButton = false,
  onApplicationUpdate,
}: ApplicationsDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(application?.status || "new");
  const [rating, setRating] = useState(application?.rating || 0);
  const [notes, setNotes] = useState(application?.notes || "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset state when application changes
  if (application && status !== application.status) {
    setStatus(application.status);
  }
  if (application && rating !== (application.rating || 0)) {
    setRating(application.rating || 0);
  }
  if (application && notes !== (application.notes || "")) {
    setNotes(application.notes || "");
  }

  const handleStatusChange = (newStatus: string) => {
    if (!application) return;
    const oldStatus = status;
    setStatus(newStatus as ApplicationStatus);
    startTransition(async () => {
      const result = await updateApplicationStatus(application.id, newStatus as ApplicationStatus);
      if (result.success) {
        toast.success("Status updated");
        onApplicationUpdate?.({ status: newStatus as ApplicationStatus });
      } else {
        toast.error(result.error || "Failed to update status");
        setStatus(oldStatus);
      }
    });
  };

  const handleRatingClick = (newRating: number) => {
    if (!application) return;
    const oldRating = rating;
    const finalRating = newRating === rating ? 0 : newRating;
    setRating(finalRating);
    startTransition(async () => {
      const result = await updateApplicationDetails(application.id, {
        rating: finalRating || null,
      });
      if (result.success) {
        toast.success(finalRating ? `Rated ${finalRating}/5` : "Rating cleared");
        onApplicationUpdate?.({ rating: finalRating || null });
      } else {
        toast.error(result.error || "Failed to update rating");
        setRating(oldRating);
      }
    });
  };

  const handleSaveNotes = () => {
    if (!application) return;
    startTransition(async () => {
      const result = await updateApplicationDetails(application.id, {
        notes: notes || null,
      });
      if (result.success) {
        toast.success("Notes saved");
        setNotesOpen(false);
        onApplicationUpdate?.({ notes: notes || null });
      } else {
        toast.error(result.error || "Failed to save notes");
      }
    });
  };

  const handleDownloadResume = async () => {
    if (!application) return;
    setIsDownloading(true);
    try {
      const result = await getResumeDownloadUrl(application.id);
      if (result.success && result.data?.url) {
        window.open(result.data.url, "_blank");
      } else if (!result.success) {
        toast.error(result.error || "Failed to get resume download link");
      }
    } catch {
      toast.error("Failed to download resume");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!application) {
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-border/60">
        <CardContent className="py-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Select an application to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = APPLICATION_STATUSES.find((s) => s.value === application.status);
  const statusColor = STATUS_COLORS[application.status as ApplicationStatus];
  const statusBorderColor = STATUS_BORDER_COLORS[status as ApplicationStatus];
  const sourceInfo = APPLICATION_SOURCES.find((s) => s.value === application.source);

  return (
    <Card className="flex min-h-0 flex-1 flex-col border-border/60">
      <CardHeader className="shrink-0">
        {/* Back button for mobile */}
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-2 w-fit gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Button>
        )}

        {/* Header with Avatar and Name */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarFallback className="bg-emerald-50 text-lg font-semibold text-emerald-700">
              {getInitials(application.applicantName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold truncate">
                {application.applicantName}
              </h2>
              <Badge variant="outline" className={statusColor}>
                {statusInfo?.label || application.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {application.applicantEmail}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {/* Contact Info */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={`mailto:${application.applicantEmail}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600"
          >
            <Mail className="h-4 w-4" />
            {application.applicantEmail}
          </a>
          {application.applicantPhone && (
            <a
              href={`tel:${application.applicantPhone}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600"
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
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {format(new Date(application.createdAt), "MMM d, yyyy")}
            <span className="text-muted-foreground/70">
              (<RelativeTime date={application.createdAt} />)
            </span>
          </span>
          {sourceInfo && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              {sourceInfo.label}
            </span>
          )}
        </div>

        {/* Job Info */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Briefcase className="h-4 w-4 text-emerald-600" />
          <span className="text-sm">
            Applied for: <strong>{application.job.title}</strong>
          </span>
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          {/* Status Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status:</Label>
            <Select
              value={status}
              onValueChange={handleStatusChange}
              disabled={isPending}
            >
              <SelectTrigger className={`h-8 w-[140px] text-xs ${statusBorderColor}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Rating:</Label>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  disabled={isPending}
                  className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 hover:text-amber-400"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes Button */}
          <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                {application.notes ? "Notes" : "Add Notes"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Internal Notes</DialogTitle>
                <DialogDescription>
                  Add private notes about this applicant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this applicant..."
                  className="min-h-[150px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNotes(application.notes || "");
                      setNotesOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNotes} disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Notes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Download Resume */}
          {application.resumePath && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadResume}
              disabled={isDownloading}
              className="h-8 gap-1.5 text-xs"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Resume
            </Button>
          )}
        </div>

        {/* Cover Letter */}
        {application.coverLetter && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Cover Letter</p>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {application.coverLetter}
              </p>
            </div>
          </div>
        )}

        {/* Notes Display */}
        {application.notes && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Internal Notes</p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {application.notes}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
