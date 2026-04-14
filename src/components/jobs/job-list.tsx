"use client";

import { useState } from "react";
import Link from "next/link";
import { RelativeTime } from "@/components/ui/relative-time";
import {
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
import {
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
} from "@/components/dashboard/ui";
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
      <DashboardTableCard>
        <DashboardTable>
          <DashboardTableHeader>
            <DashboardTableRow>
              <DashboardTableHead className="pl-5 normal-case tracking-normal">Job</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal md:table-cell">Type</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal lg:table-cell">Location</DashboardTableHead>
              <DashboardTableHead className="hidden text-right normal-case tracking-normal sm:table-cell">Applications</DashboardTableHead>
              <DashboardTableHead className="hidden normal-case tracking-normal sm:table-cell">Status</DashboardTableHead>
              <DashboardTableHead className="pr-5 text-right normal-case tracking-normal">Actions</DashboardTableHead>
            </DashboardTableRow>
          </DashboardTableHeader>
          <DashboardTableBody>
            {jobs.map((job) => (
              <DashboardTableRow key={job.id}>
                <DashboardTableCell className="pl-5">
                  <div className="flex flex-col">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      prefetch={false}
                      className="font-medium text-foreground hover:underline"
                    >
                      {job.title}
                    </Link>
                    <span className="mt-1 text-sm text-muted-foreground">
                      {job.publishedAt ? <>Published <RelativeTime date={job.publishedAt} /></> : <>Created <RelativeTime date={job.createdAt} /></>}
                    </span>
                  </div>
                </DashboardTableCell>
                <DashboardTableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">{getPositionLabel(job.positionType)}</span>
                </DashboardTableCell>
                <DashboardTableCell className="hidden lg:table-cell">
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location ? `${job.location.city}, ${job.location.state}` : "Remote / unspecified"}
                  </span>
                </DashboardTableCell>
                <DashboardTableCell className="hidden text-right sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {job.applicationCount}
                  </span>
                </DashboardTableCell>
                <DashboardTableCell className="hidden sm:table-cell">
                  <JobStatusBadge status={job.status} />
                </DashboardTableCell>
                <DashboardTableCell className="pr-5 text-right">
                  <div className="flex justify-end gap-2">
                    {job.status === "published" && (
                      <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
                        <a href={`/job/${job.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View
                        </a>
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
                          <Link href={`/dashboard/jobs/${job.id}`} prefetch={false}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/jobs/${job.id}/edit`} prefetch={false}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {job.status === "published" && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`/job/${job.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Live
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {job.status === "draft" ? (
                          <DropdownMenuItem onClick={() => handlePublish(job.id)} disabled={isUpdating === job.id}>
                            <Eye className="mr-2 h-4 w-4" />
                            Publish
                          </DropdownMenuItem>
                        ) : job.status === "published" ? (
                          <DropdownMenuItem onClick={() => handleUnpublish(job.id)} disabled={isUpdating === job.id}>
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
                </DashboardTableCell>
              </DashboardTableRow>
            ))}
          </DashboardTableBody>
        </DashboardTable>
      </DashboardTableCard>

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
