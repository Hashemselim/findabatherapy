"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, ClipboardList, Copy, Loader2, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  assignFormsToClient,
  type ClientFormsData,
} from "@/lib/actions/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSubmissionReviewSheet } from "@/components/dashboard/forms/form-submission-review-sheet";

export function ClientFormsSection({
  clientId,
  clientName,
  data,
  availableForms,
  clients,
}: {
  clientId: string;
  clientName: string;
  data: ClientFormsData;
  availableForms: Array<{
    id: string;
    title: string;
    description: string | null;
    slug: string;
    latestVersionId: string;
    latestVersionNumber: number;
  }>;
  clients: Array<{ id: string; name: string }>;
}) {
  const [sectionData, setSectionData] = useState(data);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);
  const [recentAssignmentLinks, setRecentAssignmentLinks] = useState<
    Array<{ assignmentId: string; title: string; linkUrl: string }>
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSectionData(data);
  }, [data]);

  const openAssignments = useMemo(
    () => sectionData.assignments.filter((assignment) => assignment.status !== "completed"),
    [sectionData.assignments],
  );
  const completedAssignments = useMemo(
    () => sectionData.assignments.filter((assignment) => assignment.status === "completed"),
    [sectionData.assignments],
  );

  const toggleTemplate = (templateId: string, checked: boolean) => {
    setSelectedTemplateIds((current) =>
      checked ? [...current, templateId] : current.filter((id) => id !== templateId),
    );
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const handleAssign = () => {
    if (!selectedTemplateIds.length) {
      toast.error("Choose at least one form to assign.");
      return;
    }

    startTransition(async () => {
      const result = await assignFormsToClient({
        clientId,
        templateIds: selectedTemplateIds,
        dueDate: dueDate || null,
      });

      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to assign forms." : result.error);
        return;
      }

      setAssignDialogOpen(false);
      setSelectedTemplateIds([]);
      setDueDate("");
      setRecentAssignmentLinks(
        result.data.assignments.map((assignment) => ({
          assignmentId: assignment.assignmentId,
          title: assignment.title,
          linkUrl: assignment.linkUrl,
        })),
      );
      toast.success(
        result.data.assignments.length === 1
          ? "Form assigned and emailed to the family."
          : `${result.data.assignments.length} forms assigned and emailed to the family.`,
      );
    });
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="-mx-6 mb-4 -mt-6 flex items-center justify-between rounded-t-lg bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold text-foreground">Forms</span>
              <Badge variant="secondary">
                {openAssignments.length} open
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAssignDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Assign forms
            </Button>
          </div>

          <div className="space-y-4">
            {openAssignments.length ? (
              <div className="space-y-3">
                {openAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {assignment.templateTitle}
                          </p>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                            Version {assignment.versionNumber}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                            {assignment.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Assigned {format(new Date(assignment.createdAt), "MMM d, yyyy")}
                          {assignment.dueDate ? ` • Due ${format(new Date(assignment.dueDate), "MMM d, yyyy")}` : ""}
                        </p>
                      </div>
                      {assignment.linkUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            await navigator.clipboard.writeText(assignment.linkUrl!);
                            toast.success("Client-specific link copied.");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No open assigned forms</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign one or more reusable forms to create client tasks instantly.
                </p>
              </div>
            )}

            {sectionData.submissions.length ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Submission history</p>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                    {sectionData.submissions.length} total
                  </Badge>
                </div>
                <div className="space-y-2">
                  {sectionData.submissions.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left hover:border-primary/40"
                      onClick={() => setOpenSubmissionId(submission.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {submission.templateTitle}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          Version {submission.versionNumber}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                          {submission.reviewState}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentAssignmentLinks.length ? (
              <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Recently created links</p>
                {recentAssignmentLinks.map((assignment) => (
                  <div
                    key={assignment.assignmentId}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm font-medium text-foreground">{assignment.title}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(assignment.linkUrl);
                        toast.success("Assignment link copied.");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy client link
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {sectionData.unassignedSubmissions.length ? (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Unassigned submissions</p>
                    <p className="text-xs text-muted-foreground">
                      Attach standalone form responses to {clientName} when they belong here.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                    {sectionData.unassignedSubmissions.length} ready
                  </Badge>
                </div>
                <div className="space-y-2">
                  {sectionData.unassignedSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {submission.templateTitle}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {submission.responderName || submission.responderEmail || "Unknown responder"} •{" "}
                          {format(new Date(submission.submittedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setOpenSubmissionId(submission.id)}
                      >
                        <Send className="h-4 w-4" />
                        Review and attach
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {completedAssignments.length ? (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-foreground">Completed assignments</p>
                </div>
                {completedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {assignment.templateTitle}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed {assignment.completedAt ? format(new Date(assignment.completedAt), "MMM d, yyyy") : "recently"}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                      Version {assignment.versionNumber}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign forms to {clientName}</DialogTitle>
            <DialogDescription>
              Each selected form creates its own client task and version snapshot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-3">
              <Label>Available published forms</Label>
              {availableForms.length ? (
                <div className="space-y-2">
                  {availableForms.map((form) => {
                    const checked = selectedTemplateIds.includes(form.id);
                    return (
                      <div
                        key={form.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={checked}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/40 ${
                          checked
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/60"
                        }`}
                        onClick={() => toggleTemplateSelection(form.id)}
                        onKeyDown={(event) => {
                          if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            toggleTemplateSelection(form.id);
                          }
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleTemplate(form.id, Boolean(value))}
                          className="mt-1"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{form.title}</p>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                              Version {form.latestVersionNumber}
                            </Badge>
                          </div>
                          {form.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                  Publish a form from the Forms library before assigning it here.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-due-date">Optional due date</Label>
              <Input
                id="form-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                onClick={handleAssign}
                disabled={!availableForms.length || isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Assign selected forms
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FormSubmissionReviewSheet
        submissionId={openSubmissionId}
        open={Boolean(openSubmissionId)}
        onOpenChange={(open) => {
          if (!open) {
            setOpenSubmissionId(null);
          }
        }}
        availableClients={clients}
        onSubmissionAttached={(submission) => {
          setSectionData((current) => {
            const movedSubmission = current.unassignedSubmissions.find(
              (entry) => entry.id === submission.id,
            );
            if (!movedSubmission) {
              return current;
            }

            return {
              ...current,
              submissions: [
                {
                  id: submission.id,
                  templateId: submission.templateId,
                  templateTitle: submission.templateTitle,
                  versionNumber: submission.versionNumber,
                  reviewState: submission.reviewState,
                  submittedAt: submission.submittedAt,
                  assignmentId: submission.assignmentId,
                },
                ...current.submissions.filter((entry) => entry.id !== submission.id),
              ],
              unassignedSubmissions: current.unassignedSubmissions.filter(
                (entry) => entry.id !== submission.id,
              ),
            };
          });
        }}
      />
    </>
  );
}
