"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveFormTemplate,
  createFormTemplate,
  createGenericFormLink,
  restoreFormTemplate,
  type FormSubmissionListItem,
  type FormsDashboardData,
} from "@/lib/actions/forms";
import {
  FORM_REVIEW_STATE_OPTIONS,
  FORM_TEMPLATE_STATUS_OPTIONS,
} from "@/lib/validations/forms";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardStatusBadge,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCard,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeader,
  DashboardTableRow,
  DashboardTabsList,
  DashboardTabsTrigger,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FormSubmissionReviewSheet } from "@/components/dashboard/forms/form-submission-review-sheet";

function templateTone(status: string) {
  switch (status) {
    case "published":
      return "success";
    case "archived":
      return "warning";
    default:
      return "default";
  }
}

function reviewBadgeTone(reviewState: string) {
  switch (reviewState) {
    case "reviewed":
      return "success";
    case "flagged":
      return "warning";
    case "archived":
      return "default";
    default:
      return "info";
  }
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }
}

function rebaseToWindowOrigin(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  const parsedUrl = new URL(url, window.location.origin);
  parsedUrl.protocol = window.location.protocol;
  parsedUrl.host = window.location.host;
  return parsedUrl.toString();
}

export function FormsDashboard({
  data,
  initialTab = "forms",
  initialSubmissionId = null,
}: {
  data: FormsDashboardData;
  initialTab?: "forms" | "submissions" | "unassigned";
  initialSubmissionId?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(
    initialSubmissionId,
  );
  const [submissionFormFilter, setSubmissionFormFilter] = useState("all");
  const [submissionClientFilter, setSubmissionClientFilter] = useState("all");
  const [submissionReviewFilter, setSubmissionReviewFilter] = useState("all");
  const [submissionAssignmentFilter, setSubmissionAssignmentFilter] = useState("all");
  const [submissionDateFrom, setSubmissionDateFrom] = useState("");
  const [submissionDateTo, setSubmissionDateTo] = useState("");

  useEffect(() => {
    if (initialSubmissionId) {
      setTab("submissions");
      setOpenSubmissionId(initialSubmissionId);
    }
  }, [initialSubmissionId]);

  const unassignedSubmissions = useMemo(
    () => data.submissions.filter((submission) => !submission.clientId),
    [data.submissions],
  );
  const filteredSubmissions = useMemo(() => {
    const inDateRange = (submission: FormSubmissionListItem) => {
      const submittedAt = new Date(submission.submittedAt);
      if (Number.isNaN(submittedAt.getTime())) {
        return true;
      }

      if (submissionDateFrom) {
        const from = new Date(`${submissionDateFrom}T00:00:00`);
        if (submittedAt < from) {
          return false;
        }
      }

      if (submissionDateTo) {
        const to = new Date(`${submissionDateTo}T23:59:59`);
        if (submittedAt > to) {
          return false;
        }
      }

      return true;
    };

    return data.submissions.filter((submission) => {
      if (submissionFormFilter !== "all" && submission.templateId !== submissionFormFilter) {
        return false;
      }

      if (submissionClientFilter === "assigned" && !submission.clientId) {
        return false;
      }

      if (submissionClientFilter === "unassigned" && submission.clientId) {
        return false;
      }

      if (
        submissionClientFilter !== "all" &&
        submissionClientFilter !== "assigned" &&
        submissionClientFilter !== "unassigned" &&
        submission.clientId !== submissionClientFilter
      ) {
        return false;
      }

      if (
        submissionReviewFilter !== "all" &&
        submission.reviewState !== submissionReviewFilter
      ) {
        return false;
      }

      if (submissionAssignmentFilter === "assignment" && !submission.assignmentId) {
        return false;
      }

      if (submissionAssignmentFilter === "generic" && submission.assignmentId) {
        return false;
      }

      return inDateRange(submission);
    });
  }, [
    data.submissions,
    submissionAssignmentFilter,
    submissionClientFilter,
    submissionDateFrom,
    submissionDateTo,
    submissionFormFilter,
    submissionReviewFilter,
  ]);
  const filteredUnassignedSubmissions = useMemo(
    () => filteredSubmissions.filter((submission) => !submission.clientId),
    [filteredSubmissions],
  );
  const activeForms = useMemo(
    () => data.forms.filter((form) => form.status !== "archived"),
    [data.forms],
  );
  const archivedForms = useMemo(
    () => data.forms.filter((form) => form.status === "archived"),
    [data.forms],
  );

  const handleCreateForm = () => {
    startTransition(async () => {
      const result = await createFormTemplate();
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to create form." : result.error);
        return;
      }

      router.push(`/dashboard/forms/custom/${result.data.id}`);
    });
  };

  const handleCreateGenericLink = (templateId: string) => {
    startTransition(async () => {
      const result = await createGenericFormLink(templateId);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Failed to create link." : result.error);
        return;
      }

      const linkUrl = rebaseToWindowOrigin(result.data.url);
      const copied = await copyToClipboard(linkUrl);
      if (!copied) {
        toast.error("Link created, but clipboard copy was blocked.");
        return;
      }

      toast.success("Reusable form link copied.");
    });
  };

  const handleOpenGenericLink = (templateId: string) => {
    const popup =
      typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;

    startTransition(async () => {
      const result = await createGenericFormLink(templateId);
      if (!result.success || !result.data) {
        popup?.close();
        toast.error(result.success ? "Failed to create link." : result.error);
        return;
      }

      const linkUrl = rebaseToWindowOrigin(result.data.url);
      if (popup) {
        popup.opener = null;
        popup.location.href = linkUrl;
        return;
      }

      window.location.assign(linkUrl);
    });
  };

  const handleArchive = (templateId: string) => {
    startTransition(async () => {
      const result = await archiveFormTemplate(templateId);
      if (!result.success) {
        toast.error(result.error || "Failed to archive form.");
        return;
      }

      toast.success("Form archived.");
      router.refresh();
    });
  };

  const handleRestore = (templateId: string) => {
    startTransition(async () => {
      const result = await restoreFormTemplate(templateId);
      if (!result.success) {
        toast.error(result.error || "Failed to restore form.");
        return;
      }

      toast.success("Form restored.");
      router.refresh();
    });
  };

  const renderFormsTable = (forms: FormsDashboardData["forms"]) => (
    <DashboardTableCard>
      <DashboardTable>
        <DashboardTableHeader>
          <DashboardTableRow>
            <DashboardTableHead>Form</DashboardTableHead>
            <DashboardTableHead>Status</DashboardTableHead>
            <DashboardTableHead>Questions</DashboardTableHead>
            <DashboardTableHead>Activity</DashboardTableHead>
            <DashboardTableHead className="text-right">Actions</DashboardTableHead>
          </DashboardTableRow>
        </DashboardTableHeader>
        <DashboardTableBody>
          {forms.map((form) => {
            return (
              <DashboardTableRow key={form.id}>
                <DashboardTableCell className="align-top">
                  <div className="space-y-1">
                    <Link
                      href={`/dashboard/forms/custom/${form.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {form.title}
                    </Link>
                    {form.description ? (
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {form.description}
                      </p>
                    ) : null}
                    {form.latestVersionNumber ? (
                      <p className="text-xs text-muted-foreground">
                        Latest version: v{form.latestVersionNumber}
                      </p>
                    ) : null}
                  </div>
                </DashboardTableCell>
                <DashboardTableCell className="align-top">
                  <DashboardStatusBadge tone={templateTone(form.status)}>
                    {FORM_TEMPLATE_STATUS_OPTIONS.find((option) => option.value === form.status)?.label ?? form.status}
                  </DashboardStatusBadge>
                </DashboardTableCell>
                <DashboardTableCell className="align-top text-sm text-muted-foreground">
                  {form.questionCount}
                </DashboardTableCell>
                <DashboardTableCell className="align-top">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                      {form.submissionCount} submissions
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                      {form.pendingAssignments} open tasks
                    </Badge>
                    {form.unassignedSubmissionCount ? (
                      <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                        {form.unassignedSubmissionCount} unassigned
                      </Badge>
                    ) : null}
                  </div>
                </DashboardTableCell>
                <DashboardTableCell className="align-top text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/forms/custom/${form.id}`}>Open builder</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={form.status !== "published" || isPending}
                      onClick={() => handleCreateGenericLink(form.id)}
                    >
                      <Link2 className="h-4 w-4" />
                      Copy link
                    </Button>
                    {form.status === "published" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={isPending}
                        onClick={() => handleOpenGenericLink(form.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open link
                      </Button>
                    ) : null}
                    {form.status === "archived" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={isPending}
                        onClick={() => handleRestore(form.id)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={isPending}
                        onClick={() => handleArchive(form.id)}
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    )}
                  </div>
                </DashboardTableCell>
              </DashboardTableRow>
            );
          })}
        </DashboardTableBody>
      </DashboardTable>
    </DashboardTableCard>
  );

  return (
    <>
      <div className="space-y-3">
        <DashboardPageHeader
          title="Forms"
          description="Create reusable provider forms, assign them as client tasks, and review every submission in one place."
        >
          <Button size="sm" className="gap-2" onClick={handleCreateForm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New form
          </Button>
        </DashboardPageHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <DashboardCard className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Published forms</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {data.forms.filter((form) => form.status === "published").length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ready to assign or share
            </p>
          </DashboardCard>
          <DashboardCard className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Pending assignments</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {data.forms.reduce((sum, form) => sum + form.pendingAssignments, 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open client tasks waiting on completion
            </p>
          </DashboardCard>
          <DashboardCard className="px-5 py-4">
            <p className="text-sm text-muted-foreground">Unassigned submissions</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {unassignedSubmissions.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generic-link responses ready to attach
            </p>
          </DashboardCard>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="space-y-3">
          <DashboardTabsList className="grid-cols-3">
            <DashboardTabsTrigger value="forms">
              All Forms
            </DashboardTabsTrigger>
            <DashboardTabsTrigger value="submissions">
              Submissions
            </DashboardTabsTrigger>
            <DashboardTabsTrigger value="unassigned">
              Unassigned Submissions
            </DashboardTabsTrigger>
          </DashboardTabsList>

          <TabsContent value="forms" className="space-y-3">
            {data.forms.length ? (
              <div className="space-y-4">
                {activeForms.length ? (
                  renderFormsTable(activeForms)
                ) : (
                  <DashboardCard className="px-5 py-8 text-sm text-muted-foreground">
                    No active forms.
                  </DashboardCard>
                )}

                {archivedForms.length ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pt-2">
                      <div className="h-px flex-1 bg-border/60" />
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Archived Forms
                      </p>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                    {renderFormsTable(archivedForms)}
                  </div>
                ) : null}
              </div>
            ) : (
              <DashboardEmptyState
                icon={FileText}
                title="Build your first custom form"
                description="Create reusable client questionnaires, check-ins, and signatures that can be assigned as client tasks or shared with a reusable public link."
                benefits={[
                  "Provider-level reusable templates",
                  "Version snapshots on every assignment",
                  "Autosaving branded family completion pages",
                ]}
                action={(
                  <Button onClick={handleCreateForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New form
                  </Button>
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-3">
            {data.submissions.length ? (
              <>
                <DashboardCard className="px-5 py-4">
                  <div className="grid gap-4 lg:grid-cols-5">
                    <div className="space-y-2">
                      <Label>Form</Label>
                      <Select value={submissionFormFilter} onValueChange={setSubmissionFormFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All forms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All forms</SelectItem>
                          {data.forms.map((form) => (
                            <SelectItem key={form.id} value={form.id}>
                              {form.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select value={submissionClientFilter} onValueChange={setSubmissionClientFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All clients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All clients</SelectItem>
                          <SelectItem value="assigned">Assigned only</SelectItem>
                          <SelectItem value="unassigned">Unassigned only</SelectItem>
                          {data.clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Review state</Label>
                      <Select value={submissionReviewFilter} onValueChange={setSubmissionReviewFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All review states" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All review states</SelectItem>
                          {FORM_REVIEW_STATE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select value={submissionAssignmentFilter} onValueChange={setSubmissionAssignmentFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sources</SelectItem>
                          <SelectItem value="assignment">Assigned task</SelectItem>
                          <SelectItem value="generic">Generic link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label>From</Label>
                        <Input type="date" value={submissionDateFrom} onChange={(event) => setSubmissionDateFrom(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Input type="date" value={submissionDateTo} onChange={(event) => setSubmissionDateTo(event.target.value)} />
                      </div>
                    </div>
                  </div>
                </DashboardCard>

                <DashboardTableCard>
                <DashboardTable>
                  <DashboardTableHeader>
                    <DashboardTableRow>
                      <DashboardTableHead>Submission</DashboardTableHead>
                      <DashboardTableHead>Client</DashboardTableHead>
                      <DashboardTableHead>Review</DashboardTableHead>
                      <DashboardTableHead>Submitted</DashboardTableHead>
                      <DashboardTableHead className="text-right">Action</DashboardTableHead>
                    </DashboardTableRow>
                  </DashboardTableHeader>
                  <DashboardTableBody>
                    {filteredSubmissions.map((submission) => (
                      <DashboardTableRow key={submission.id}>
                        <DashboardTableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              {submission.templateTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Version {submission.versionNumber}
                              {submission.responderName ? ` • ${submission.responderName}` : ""}
                            </p>
                          </div>
                        </DashboardTableCell>
                        <DashboardTableCell className="text-sm text-muted-foreground">
                          {submission.clientName ?? "Unassigned"}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          <DashboardStatusBadge tone={reviewBadgeTone(submission.reviewState)}>
                            {submission.reviewState}
                          </DashboardStatusBadge>
                        </DashboardTableCell>
                        <DashboardTableCell className="text-sm text-muted-foreground">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </DashboardTableCell>
                        <DashboardTableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenSubmissionId(submission.id)}
                          >
                            Review submission
                          </Button>
                        </DashboardTableCell>
                      </DashboardTableRow>
                    ))}
                  </DashboardTableBody>
                </DashboardTable>
                </DashboardTableCard>
              </>
            ) : (
              <DashboardEmptyState
                icon={CheckCircle2}
                title="No submissions yet"
                description="Completed form responses will appear here with review state, client context, and direct links back into the relevant record."
                benefits={[
                  "See every completed response in one queue",
                  "Filter assigned vs. unassigned work",
                  "Review signatures, uploads, and timestamps",
                ]}
              />
            )}
          </TabsContent>

          <TabsContent value="unassigned" className="space-y-3">
            {filteredUnassignedSubmissions.length ? (
              <div className="space-y-3">
                {filteredUnassignedSubmissions.map((submission) => (
                  <DashboardCard key={submission.id} className="px-5 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                            Unassigned
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                            {submission.templateTitle}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {submission.responderName || submission.responderEmail || "Unknown responder"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => setOpenSubmissionId(submission.id)}
                      >
                        <Send className="h-4 w-4" />
                        Review and attach
                      </Button>
                    </div>
                  </DashboardCard>
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                icon={ShieldCheck}
                title="No unassigned submissions"
                description="Generic-link responses that are not tied to a client will land here so you can review them and attach them later."
                benefits={[
                  "Families can submit before account creation",
                  "Nothing auto-creates a client unexpectedly",
                  "You stay in control of record matching",
                ]}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FormSubmissionReviewSheet
        submissionId={openSubmissionId}
        open={Boolean(openSubmissionId)}
        onOpenChange={(open) => {
          if (!open) {
            setOpenSubmissionId(null);
          }
        }}
        availableClients={data.clients}
      />
    </>
  );
}
