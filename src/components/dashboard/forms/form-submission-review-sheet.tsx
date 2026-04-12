"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Paperclip, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  attachFormSubmissionToClient,
  getFormFileUrl,
  getFormSubmissionDetail,
  updateFormSubmissionReviewState,
  type FormSubmissionDetail,
} from "@/lib/actions/forms";
import { FORM_REVIEW_STATE_OPTIONS } from "@/lib/validations/forms";
import { FormAnswerReview } from "@/components/forms/form-answer-review";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function reviewTone(reviewState: string) {
  switch (reviewState) {
    case "reviewed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "flagged":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "archived":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
}

export function FormSubmissionReviewSheet({
  submissionId,
  open,
  onOpenChange,
  availableClients,
  onSubmissionAttached,
}: {
  submissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableClients: Array<{ id: string; name: string }>;
  onSubmissionAttached?: (submission: {
    id: string;
    templateId: string;
    templateTitle: string;
    versionNumber: number;
    reviewState: string;
    submittedAt: string;
    assignmentId: string | null;
  }) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<FormSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!open || !submissionId) {
      setDetail(null);
      setSelectedClientId("");
      return;
    }

    setLoading(true);
    const loadDetail = async (attempt: number) => {
      const result = await getFormSubmissionDetail(submissionId);
      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        if (attempt < 2) {
          retryTimeout = setTimeout(() => {
            void loadDetail(attempt + 1);
          }, 1200 * (attempt + 1));
          return;
        }

        toast.error(result.success ? "Failed to load submission details." : result.error);
        setDetail(null);
        setLoading(false);
        return;
      }

      setDetail(result.data);
      setSelectedClientId(result.data.clientId ?? "");
      setLoading(false);
    };

    void loadDetail(0);

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [open, submissionId]);

  const handleReviewStateChange = (reviewState: string) => {
    if (!detail) {
      return;
    }

    startTransition(async () => {
      const result = await updateFormSubmissionReviewState({
        submissionId: detail.id,
        reviewState: reviewState as "submitted" | "reviewed" | "flagged" | "archived",
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update review state.");
        return;
      }

      setDetail((current) => (current ? { ...current, reviewState } : current));
      toast.success("Review state updated.");
    });
  };

  const handleAttach = () => {
    if (!detail || !selectedClientId || detail.clientId) {
      return;
    }

    startTransition(async () => {
      const result = await attachFormSubmissionToClient({
        submissionId: detail.id,
        clientId: selectedClientId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to attach submission.");
        return;
      }

      const matchedClient = availableClients.find((client) => client.id === selectedClientId);
      setDetail((current) =>
        current
          ? {
              ...current,
              clientId: selectedClientId,
              clientName: matchedClient?.name ?? current.clientName,
            }
          : current,
      );
      onSubmissionAttached?.({
        id: detail.id,
        templateId: detail.templateId,
        templateTitle: detail.templateTitle,
        versionNumber: detail.versionNumber,
        reviewState: detail.reviewState,
        submittedAt: detail.submittedAt,
        assignmentId: detail.assignmentId,
      });
      router.refresh();
      toast.success("Submission attached to client.");
    });
  };

  const handleOpenFile = async (fileId: string) => {
    const result = await getFormFileUrl(fileId);
    if (!result.success || !result.data) {
      toast.error(result.success ? "Failed to open file." : result.error);
      return;
    }

    window.open(result.data.url, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={reviewTone(detail?.reviewState ?? "submitted")}>
              {FORM_REVIEW_STATE_OPTIONS.find((option) => option.value === detail?.reviewState)?.label ?? "Submitted"}
            </Badge>
            {detail?.clientName ? (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                <UserRound className="mr-1 h-3.5 w-3.5" />
                {detail.clientName}
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                Unassigned submission
              </Badge>
            )}
          </div>
          <div>
            <SheetTitle>{detail?.templateTitle ?? "Form submission"}</SheetTitle>
            <SheetDescription>
              {detail
                ? `Submitted ${format(new Date(detail.submittedAt), "MMMM d, yyyy 'at' h:mm a")}`
                : "Loading submission details"}
            </SheetDescription>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading submission details…
          </div>
        ) : detail ? (
          <div className="space-y-6 py-6">
            <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Version
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Version {detail.versionNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Responder
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {detail.responderName || detail.clientName || "Unknown"}
                </p>
                {detail.responderEmail ? (
                  <p className="mt-1 text-xs text-muted-foreground">{detail.responderEmail}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Provider review state</p>
                <Select
                  value={detail.reviewState}
                  onValueChange={handleReviewStateChange}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Review state" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_REVIEW_STATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Client record</p>
                {detail.clientId ? (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                    Attached to {detail.clientName}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Attach to a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={!selectedClientId || isPending}
                      onClick={handleAttach}
                    >
                      <Paperclip className="h-4 w-4" />
                      Attach
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <FormAnswerReview
              questions={detail.questions}
              answers={detail.answers}
              onOpenFile={handleOpenFile}
            />
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Submission details are not available.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
