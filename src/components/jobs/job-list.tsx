"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { deleteJobPosting, publishJobPosting, unpublishJobPosting } from "@/lib/actions/jobs";
import { POSITION_TYPES } from "@/lib/validations/jobs";
import type { JobPostingSummary } from "@/lib/actions/jobs";

interface JobListProps {
  jobs: JobPostingSummary[];
}

export function JobList({ jobs: initialJobs }: JobListProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteJobPosting(deleteId);

    if (result.success) {
      setJobs(jobs.filter((j) => j.id !== deleteId));
      toast.success("Job posting deleted");
    } else {
      toast.error(result.error || "Failed to delete job posting");
    }

    setIsDeleting(false);
    setDeleteId(null);
  };

  const handlePublish = async (id: string) => {
    setIsUpdating(id);
    const result = await publishJobPosting(id);

    if (result.success) {
      setJobs(jobs.map((j) =>
        j.id === id ? { ...j, status: "published" as const, publishedAt: new Date().toISOString() } : j
      ));
      toast.success("Job published successfully");
    } else {
      toast.error(result.error || "Failed to publish job");
    }

    setIsUpdating(null);
  };

  const handleUnpublish = async (id: string) => {
    setIsUpdating(id);
    const result = await unpublishJobPosting(id);

    if (result.success) {
      setJobs(jobs.map((j) =>
        j.id === id ? { ...j, status: "draft" as const } : j
      ));
      toast.success("Job unpublished");
    } else {
      toast.error(result.error || "Failed to unpublish job");
    }

    setIsUpdating(null);
  };

  const getPositionLabel = (type: string) => {
    return POSITION_TYPES.find((p) => p.value === type)?.label || type;
  };

  return (
    <>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card
            key={job.id}
            className="transition-all duration-200 hover:border-[#5788FF]/30 hover:shadow-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Job Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-base font-medium text-foreground hover:text-[#5788FF] hover:underline"
                    >
                      {job.title}
                    </Link>
                    <JobStatusBadge status={job.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {getPositionLabel(job.positionType)}
                    </span>

                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location.city}, {job.location.state}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {job.applicationCount} application{job.applicationCount !== 1 ? "s" : ""}
                    </span>

                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {job.publishedAt
                        ? `Published ${formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true })}`
                        : `Created ${formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {job.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:flex"
                      asChild
                    >
                      <Link href={`/job/${job.slug}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/jobs/${job.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>

                      {job.status === "published" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/job/${job.slug}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Live
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {job.status === "draft" ? (
                        <DropdownMenuItem
                          onClick={() => handlePublish(job.id)}
                          disabled={isUpdating === job.id}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Publish
                        </DropdownMenuItem>
                      ) : job.status === "published" ? (
                        <DropdownMenuItem
                          onClick={() => handleUnpublish(job.id)}
                          disabled={isUpdating === job.id}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Unpublish
                        </DropdownMenuItem>
                      ) : null}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(job.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this job posting and all associated applications.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
