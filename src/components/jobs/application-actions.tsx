"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Star,
  MessageSquare,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/lib/actions/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/validations/jobs";

interface ApplicationActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
  currentRating: number | null;
  currentNotes: string | null;
  hasResume: boolean;
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "border-blue-300 focus:ring-blue-500",
  reviewed: "border-gray-300 focus:ring-gray-500",
  phone_screen: "border-purple-300 focus:ring-purple-500",
  interview: "border-orange-300 focus:ring-orange-500",
  offered: "border-emerald-300 focus:ring-emerald-500",
  hired: "border-green-300 focus:ring-green-500",
  rejected: "border-red-300 focus:ring-red-500",
};

export function ApplicationActions({
  applicationId,
  currentStatus,
  currentRating,
  currentNotes,
  hasResume,
}: ApplicationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [rating, setRating] = useState(currentRating || 0);
  const [notes, setNotes] = useState(currentNotes || "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as ApplicationStatus);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus as ApplicationStatus);
      if (result.success) {
        toast.success("Status updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
        setStatus(currentStatus); // Revert on error
      }
    });
  };

  const handleRatingClick = (newRating: number) => {
    // Toggle off if clicking same rating
    const finalRating = newRating === rating ? 0 : newRating;
    setRating(finalRating);
    startTransition(async () => {
      const result = await updateApplicationDetails(applicationId, {
        rating: finalRating || null,
      });
      if (result.success) {
        toast.success(finalRating ? `Rated ${finalRating}/5` : "Rating cleared");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update rating");
        setRating(currentRating || 0); // Revert on error
      }
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      const result = await updateApplicationDetails(applicationId, {
        notes: notes || null,
      });
      if (result.success) {
        toast.success("Notes saved");
        setNotesOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save notes");
      }
    });
  };

  const handleDownloadResume = async () => {
    setIsDownloading(true);
    try {
      const result = await getResumeDownloadUrl(applicationId);
      if (result.success && result.data?.url) {
        // Open the signed URL in a new tab
        window.open(result.data.url, "_blank");
      } else if (!result.success) {
        toast.error(result.error || "Failed to get resume download link");
      } else {
        toast.error("Failed to get resume download link");
      }
    } catch {
      toast.error("Failed to download resume");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Status:</Label>
        <Select
          value={status}
          onValueChange={handleStatusChange}
          disabled={isPending}
        >
          <SelectTrigger className={`w-[160px] ${STATUS_COLORS[status]}`}>
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
        <Label className="text-sm text-muted-foreground">Rating:</Label>
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
                className={`h-5 w-5 ${
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
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {currentNotes ? "Edit Notes" : "Add Notes"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Internal Notes</DialogTitle>
            <DialogDescription>
              Add private notes about this applicant. These are only visible to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this applicant, interview feedback, etc..."
              className="min-h-[150px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNotes(currentNotes || "");
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
      {hasResume && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadResume}
          disabled={isDownloading}
          className="gap-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Resume
        </Button>
      )}
    </div>
  );
}
