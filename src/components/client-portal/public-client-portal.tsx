"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileStack,
  Link2,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";

import {
  acceptPublicPortalInvite,
  acknowledgePublicPortalDocument,
  completePublicPortalTask,
  getPublicPortalIntakeFormUrl,
  getPublicPortalDocumentDownload,
  markPublicPortalMessageRead,
  startPublicPortalTask,
  submitPublicPortalUpload,
  updatePublicPortalProfile,
  type PublicClientPortalData,
} from "@/lib/actions/client-portal";
import { BrandedLogo } from "@/components/branded/branded-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function getLighterShade(hexColor: string, opacity = 0.1) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No date";
  }
  return format(date, "MMM d, yyyy");
}

function bytesToLabel(byteSize: number) {
  if (!byteSize) {
    return "File";
  }
  if (byteSize < 1024 * 1024) {
    return `${Math.round(byteSize / 1024)} KB`;
  }
  return `${(byteSize / 1024 / 1024).toFixed(1)} MB`;
}

function getDocumentSourceLabel(uploadSource: string) {
  switch (uploadSource) {
    case "portal_family":
      return "Family upload";
    case "intake_form":
      return "Intake upload";
    default:
      return "Provider shared";
  }
}

function normalizeExternalUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function taskStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function taskStatusClasses(status: string) {
  switch (status) {
    case "overdue":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "submitted":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function taskTypeLabel(taskType: string) {
  switch (taskType) {
    case "form_completion":
      return "Form completion";
    case "file_upload":
      return "File upload";
    case "review_and_sign":
      return "Review & sign";
    default:
      return "Custom task";
  }
}

const PORTAL_TABS = [
  { value: "tasks", label: "Tasks" },
  { value: "messages", label: "Messages" },
  { value: "documents", label: "Documents" },
  { value: "resources", label: "Resources" },
  { value: "personal", label: "Personal Info" },
  { value: "tools", label: "Tools" },
] as const;

export function PublicClientPortal({
  slug,
  data,
  previewMode = false,
}: {
  slug: string;
  data: PublicClientPortalData;
  previewMode?: boolean;
}) {
  const [activeTab, setActiveTab] = useState("tasks");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [taskUploadId, setTaskUploadId] = useState<string | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    phone: data.profile.phone ?? "",
    email: data.profile.email ?? "",
    streetAddress: data.profile.streetAddress ?? "",
    city: data.profile.city ?? "",
    state: data.profile.state ?? "",
    postalCode: data.profile.postalCode ?? "",
    insuranceName: data.profile.insuranceName ?? "",
    insuranceMemberId: data.profile.insuranceMemberId ?? "",
    insuranceGroupNumber: data.profile.insuranceGroupNumber ?? "",
    emergencyContactName: data.profile.emergencyContactName ?? "",
    emergencyContactPhone: data.profile.emergencyContactPhone ?? "",
    emergencyContactRelationship: data.profile.emergencyContactRelationship ?? "",
  });

  const openTasks = useMemo(
    () =>
      data.tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "submitted" &&
          task.status !== "cancelled",
      ),
    [data.tasks],
  );
  const completedTasks = useMemo(
    () =>
      data.tasks.filter(
        (task) => task.status === "completed" || task.status === "submitted",
      ),
    [data.tasks],
  );
  const unreadMessages = useMemo(
    () =>
      data.messages.filter(
        (message) => !message.readByGuardianIds.includes(data.guardian.id),
      ).length,
    [data.guardian.id, data.messages],
  );
  const providerDocuments = useMemo(
    () =>
      data.documents.filter((document) => document.uploadSource !== "portal_family"),
    [data.documents],
  );
  const familyDocuments = useMemo(
    () =>
      data.documents.filter((document) => document.uploadSource === "portal_family"),
    [data.documents],
  );
  const nextTask = openTasks[0] ?? null;
  const documentsById = useMemo(
    () => new Map(data.documents.map((document) => [document.id, document])),
    [data.documents],
  );

  const resetUploadDraft = () => {
    setUploadFile(null);
    setUploadLabel("");
    setUploadNote("");
  };

  const runPortalAction = (
    action: () => Promise<{ success: boolean; error?: string }>,
    options?: {
      onSuccess?: () => void;
      reload?: boolean;
    },
  ) => {
    if (previewMode) {
      setActionError("Preview mode only. Use the family access link to complete portal actions.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          setActionError(result.error ?? "Something went wrong. Please try again.");
          return;
        }

        setActionError(null);
        options?.onSuccess?.();
        if (options?.reload ?? true) {
          window.location.reload();
        }
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    });
  };

  const handleTaskComplete = (taskId: string) => {
    const task = data.tasks.find((entry) => entry.id === taskId) ?? null;
    const note = taskNotes[taskId]?.trim() || null;
    if (task?.taskType === "review_and_sign" && !note) {
      setActionError("Enter your full name before signing the document.");
      return;
    }

    runPortalAction(
      () =>
        completePublicPortalTask(
          slug,
          taskId,
          task?.taskType === "review_and_sign" && note ? `Signed by ${note}` : note,
          data.client.id,
        ),
      {
        onSuccess: () => {
          setTaskNotes((current) => ({ ...current, [taskId]: "" }));
        },
      },
    );
  };

  const handleTaskStart = (taskId: string) => {
    runPortalAction(() => startPublicPortalTask(slug, taskId, data.client.id));
  };

  const handleUploadSubmit = (taskId?: string | null) => {
    runPortalAction(
      async () => {
        if (!uploadFile) {
          return {
            success: false as const,
            error: "Choose a file before uploading.",
          };
        }

        const formData = new FormData();
        formData.set("file", uploadFile);
        formData.set("label", uploadLabel || uploadFile.name);
        formData.set("note", uploadNote);
        if (taskId) {
          formData.set("taskId", taskId);
        }

        return submitPublicPortalUpload(slug, formData, taskId, data.client.id);
      },
      {
        onSuccess: () => {
          resetUploadDraft();
          setTaskUploadId(null);
          setShowDocumentUpload(false);
        },
      },
    );
  };

  const handleProfileSave = () => {
    runPortalAction(() => updatePublicPortalProfile(slug, profileDraft, data.client.id));
  };

  const handleDocumentOpen = (documentId: string) => {
    if (previewMode) {
      setActionError("Preview mode only. Use the family access link to open live documents.");
      return;
    }
    startTransition(async () => {
      const result = await getPublicPortalDocumentDownload(slug, documentId, data.client.id);
      if (!result.success) {
        setActionError(result.error ?? "Failed to open document");
        return;
      }

      if (result.data) {
        setActionError(null);
        window.open(result.data.url, "_blank", "noopener,noreferrer");
        return;
      }

      setActionError("Failed to open document");
    });
  };

  const openTaskUpload = (taskId: string) => {
    resetUploadDraft();
    setShowDocumentUpload(false);
    setTaskUploadId((current) => (current === taskId ? null : taskId));
  };

  const openGeneralUpload = () => {
    resetUploadDraft();
    setTaskUploadId(null);
    setShowDocumentUpload((current) => !current);
  };

  const handleOpenIntakeForm = (taskId: string) => {
    if (previewMode) {
      setActionError("Preview mode only. Use the family access link to open the live intake form.");
      return;
    }
    startTransition(async () => {
      const result = await getPublicPortalIntakeFormUrl(slug, taskId, data.client.id);
      if (!result.success) {
        setActionError(result.error ?? "Failed to open form");
        return;
      }

      if (!result.data?.url) {
        setActionError("Failed to open form");
        return;
      }

      setActionError(null);
      const resolvedUrl = new URL(result.data.url, window.location.origin);
      const canonicalMatch = resolvedUrl.pathname.match(/^\/intake\/([^/]+)\/client$/);
      const canonicalPath = canonicalMatch
        ? `/provider/${canonicalMatch[1]}/intake`
        : resolvedUrl.pathname;
      window.location.href = `${window.location.origin}${canonicalPath}${resolvedUrl.search}`;
    });
  };

  const renderTaskActionArea = (task: PublicClientPortalData["tasks"][number]) => {
    const externalUrl = normalizeExternalUrl(task.externalUrl);
    const uploadOpen = taskUploadId === task.id;
    const requiresTypedCompletion = task.taskType === "custom_task" || task.taskType === "review_and_sign";
    const reviewDocument = task.linkedDocumentId ? documentsById.get(task.linkedDocumentId) : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {task.status === "pending" ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => handleTaskStart(task.id)}
            >
              Start task
            </Button>
          ) : null}

          {task.taskType === "form_completion" ? (
            <Button
              className="rounded-full"
              onClick={() => handleOpenIntakeForm(task.id)}
            >
              Open form
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}

          {task.taskType === "file_upload" ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => openTaskUpload(task.id)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadOpen ? "Hide upload" : "Upload file"}
            </Button>
          ) : null}

          {task.taskType === "review_and_sign" && reviewDocument ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => handleDocumentOpen(reviewDocument.id)}
            >
              Review document
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          ) : null}

          {task.taskType === "custom_task" && externalUrl ? (
            <Button asChild className="rounded-full">
              <a href={externalUrl} target="_blank" rel="noreferrer">
                Open link
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}

          {requiresTypedCompletion ? (
            <Button
              disabled={isPending}
              className="rounded-full"
              onClick={() => handleTaskComplete(task.id)}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mark complete
            </Button>
          ) : null}
        </div>

        {task.taskType === "review_and_sign" && reviewDocument ? (
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-4">
            <div className="space-y-2">
              <p className="font-medium text-foreground">{reviewDocument.label}</p>
              <p className="text-sm text-muted-foreground">
                Review the document, then enter your full name to acknowledge and sign.
              </p>
            </div>
          </div>
        ) : null}

        {task.taskType === "file_upload" && uploadOpen ? (
          <div className="rounded-[24px] border border-border/60 bg-muted/20 p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`task-upload-${task.id}`}>Upload file</Label>
                <Input
                  id={`task-upload-${task.id}`}
                  type="file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-upload-label-${task.id}`}>Label</Label>
                <Input
                  id={`task-upload-label-${task.id}`}
                  placeholder="Document label"
                  value={uploadLabel}
                  onChange={(event) => setUploadLabel(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-upload-note-${task.id}`}>Note</Label>
                <Textarea
                  id={`task-upload-note-${task.id}`}
                  rows={3}
                  placeholder="Optional note"
                  value={uploadNote}
                  onChange={(event) => setUploadNote(event.target.value)}
                />
              </div>
              <Button
                disabled={isPending || !uploadFile}
                className="rounded-full"
                onClick={() => handleUploadSubmit(task.id)}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload and submit
              </Button>
            </div>
          </div>
        ) : null}

        {requiresTypedCompletion ? (
          <div className="space-y-2">
            <Label htmlFor={`task-note-${task.id}`}>
              {task.taskType === "review_and_sign" ? "Full name for signature" : "Note for provider"}
            </Label>
            <Textarea
              id={`task-note-${task.id}`}
              rows={task.taskType === "review_and_sign" ? 2 : 3}
              placeholder={task.taskType === "review_and_sign" ? "Type your full name" : "Optional note"}
              value={taskNotes[task.id] ?? ""}
              onChange={(event) =>
                setTaskNotes((current) => ({
                  ...current,
                  [task.id]: event.target.value,
                }))
              }
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
          <div
            className="border-b border-border/60 px-6 py-8 text-center sm:px-8 sm:py-12"
            style={{ backgroundColor: getLighterShade(data.branding.backgroundColor, 0.08) }}
          >
            <div className="space-y-6">
              <div className="mx-auto mb-6">
                <BrandedLogo
                  logoUrl={data.branding.logoUrl}
                  agencyName={data.branding.agencyName}
                  brandColor={data.branding.backgroundColor}
                  variant="hero"
                />
              </div>

              <div className="space-y-3 text-center">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {data.branding.agencyName}
                </h1>
                <div
                  className="mx-auto h-0.5 w-12 rounded-full"
                  style={{ backgroundColor: getLighterShade(data.branding.backgroundColor, 0.3) }}
                />
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Client Portal
                </h2>
              </div>

              <div className="mx-auto grid max-w-2xl grid-cols-3 gap-3">
                <div className="rounded-[24px] border border-white/70 bg-white/90 px-3 py-4 text-center sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                    Tasks
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">{openTasks.length}</p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/90 px-3 py-4 text-center sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                    Progress
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
                    {data.portal.completionPercentage}%
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/90 px-3 py-4 text-center sm:px-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                    Updates
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">{unreadMessages}</p>
                </div>
              </div>
            </div>
          </div>

          {!previewMode && !data.portal.inviteAccepted ? (
            <div className="border-b border-border/60 bg-emerald-50 px-5 py-5 sm:px-8">
              <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="font-semibold">Accept your portal invitation</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Confirm access once for this family portal.
                  </p>
                </div>
                <Button
                  disabled={isPending}
                  className="rounded-full"
                  onClick={() =>
                    runPortalAction(() => acceptPublicPortalInvite(slug, data.client.id))
                  }
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Accept invitation
                </Button>
              </div>
            </div>
          ) : null}

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {actionError ? (
              <div className="mb-6 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {actionError}
              </div>
            ) : null}

            <div className="space-y-6">
              <div
                role="tablist"
                aria-label="Family portal sections"
                className="grid w-full grid-cols-2 gap-2 rounded-[28px] border border-border/60 bg-muted/20 p-1.5 sm:grid-cols-3 lg:grid-cols-6"
              >
                {PORTAL_TABS.map((tab) => {
                  const isActive = activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`portal-panel-${tab.value}`}
                      className={`min-h-10 rounded-[18px] px-3 py-2 text-center text-sm font-medium leading-tight transition-colors ${
                        isActive
                          ? "bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                          : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "tasks" ? (
                <div id="portal-panel-tasks" role="tabpanel" className="space-y-4">
                {openTasks.length > 0 ? (
                  <Card className="rounded-[28px] border-border/60 p-5">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Next task</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                            {nextTask?.title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {nextTask?.instructions}
                          </p>
                        </div>
                        <Button
                          className="rounded-full"
                          onClick={() => setActiveTab("tasks")}
                        >
                          Continue
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Progress</span>
                          <span>{data.portal.completionPercentage}% complete</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-emerald-500 via-primary to-sky-500"
                            style={{ width: `${Math.max(data.portal.completionPercentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : null}

                {openTasks.length > 0 ? (
                  openTasks.map((task) => (
                    <Card key={task.id} className="rounded-[28px] border-border/60 p-5">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">
                                {task.title}
                              </p>
                              <div
                                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${taskStatusClasses(task.status)}`}
                              >
                                {taskStatusLabel(task.status)}
                              </div>
                              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                                {taskTypeLabel(task.taskType)}
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">
                              {task.instructions || "No additional instructions."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <Clock3 className="h-4 w-4" />
                            Due {formatDate(task.dueDate)}
                          </div>
                        </div>

                        {renderTaskActionArea(task)}
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="rounded-[28px] border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-semibold">All caught up</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-emerald-800/80">
                      Everything assigned in the portal has been completed or submitted.
                    </p>
                  </Card>
                )}

                {completedTasks.length > 0 ? (
                  <Card className="rounded-[28px] border-border/60 p-0">
                    <Collapsible
                      open={showCompletedTasks}
                      onOpenChange={setShowCompletedTasks}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left">
                        <div>
                          <p className="text-base font-semibold text-slate-950">
                            Completed tasks
                          </p>
                          <p className="text-sm text-slate-500">
                            {completedTasks.length} completed or submitted
                          </p>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${showCompletedTasks ? "rotate-180" : ""}`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t border-border/60 px-5 pb-5">
                        <div className="space-y-3 pt-4">
                                {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                <p className="font-medium text-emerald-950">{task.title}</p>
                              </div>
                              <p className="mt-2 text-sm text-emerald-800/80">
                                {task.taskType === "file_upload" && task.submittedDocumentId
                                  ? `${documentsById.get(task.submittedDocumentId)?.label ?? "Uploaded file"} submitted for provider review.`
                                  : task.taskType === "review_and_sign" && task.linkedDocumentId
                                    ? `${documentsById.get(task.linkedDocumentId)?.label ?? "Document"} signed and acknowledged.`
                                    : task.taskType === "form_completion"
                                      ? "Form submitted for provider review."
                                      : task.completionNote || (task.status === "submitted"
                                        ? "Submitted for provider review."
                                        : "Completed.")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ) : null}
                </div>
              ) : null}

              {activeTab === "messages" ? (
                <div id="portal-panel-messages" role="tabpanel" className="space-y-4">
                {data.messages.length > 0 ? (
                  data.messages.map((message) => {
                    const unread = !message.readByGuardianIds.includes(data.guardian.id);
                    return (
                      <Card key={message.id} className="rounded-[28px] border-border/60 p-5">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-foreground">
                                  {message.subject}
                                </p>
                                {unread ? (
                                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                    Unread
                                  </div>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {formatDate(message.createdAt)}
                              </p>
                            </div>
                            {unread ? (
                              <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() =>
                                  runPortalAction(() =>
                                    markPublicPortalMessageRead(
                                      slug,
                                      message.id,
                                      data.client.id,
                                    ),
                                  )
                                }
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Mark read
                              </Button>
                            ) : null}
                          </div>
                          <p className="text-sm leading-7 text-slate-600">{message.body}</p>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="rounded-[28px] border-border/60 p-5">
                    <p className="text-lg font-semibold text-foreground">No messages yet</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Provider updates will show up here.
                    </p>
                  </Card>
                )}
                </div>
              ) : null}

              {activeTab === "documents" ? (
                <div id="portal-panel-documents" role="tabpanel" className="space-y-4">
                <Card className="rounded-[28px] border-border/60 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileStack className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">Documents</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Review provider documents and upload items when needed.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={openGeneralUpload}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {showDocumentUpload ? "Hide upload" : "Upload document"}
                    </Button>
                  </div>
                </Card>

                {showDocumentUpload ? (
                  <Card className="rounded-[28px] border-border/60 p-5">
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          Upload a document
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          This upload will be shared with your provider and timestamped automatically.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document-upload-file">File</Label>
                        <Input
                          id="document-upload-file"
                          type="file"
                          onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document-upload-label">Label</Label>
                        <Input
                          id="document-upload-label"
                          placeholder="Document label"
                          value={uploadLabel}
                          onChange={(event) => setUploadLabel(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document-upload-note">Note</Label>
                        <Textarea
                          id="document-upload-note"
                          rows={3}
                          placeholder="Optional note"
                          value={uploadNote}
                          onChange={(event) => setUploadNote(event.target.value)}
                        />
                      </div>
                      <Button
                        disabled={isPending || !uploadFile}
                        className="rounded-full"
                        onClick={() => handleUploadSubmit(null)}
                      >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Upload document
                      </Button>
                    </div>
                  </Card>
                ) : null}

                <Card className="rounded-[28px] border-border/60 p-5">
                  <p className="text-lg font-semibold text-foreground">
                    Provider-shared documents
                  </p>
                  <div className="mt-4 space-y-3">
                    {providerDocuments.length > 0 ? (
                      providerDocuments.map((document) => {
                        const needsAck =
                          document.acknowledgementRequired &&
                          !document.acknowledgedByGuardianIds.includes(data.guardian.id);
                        return (
                          <div
                            key={document.id}
                            className="rounded-[24px] border border-border/60 bg-background/80 p-4"
                          >
                            <div className="space-y-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-semibold text-foreground">
                                      {document.label}
                                    </p>
                                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                                      {getDocumentSourceLabel(document.uploadSource)}
                                    </div>
                                    {needsAck ? (
                                      <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                        Acknowledge
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    {document.category} • {bytesToLabel(document.byteSize)} •{" "}
                                    {formatDate(document.createdAt)}
                                  </p>
                                  <p className="mt-3 text-sm leading-6 text-slate-600">
                                    {document.note || "No additional note."}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={previewMode}
                                variant="outline"
                                className="rounded-full"
                                onClick={() => handleDocumentOpen(document.id)}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Open
                                  </Button>
                                  {needsAck ? (
                                    <Button
                                      disabled={previewMode}
                                      className="rounded-full"
                                      onClick={() =>
                                        runPortalAction(async () => {
                                          const result =
                                            await acknowledgePublicPortalDocument(
                                              slug,
                                              document.id,
                                              data.client.id,
                                            );
                                          if (!result.success) {
                                            return result;
                                          }

                                          if (document.linkedTaskId) {
                                            return completePublicPortalTask(
                                              slug,
                                              document.linkedTaskId,
                                              null,
                                              data.client.id,
                                            );
                                          }

                                          return { success: true as const };
                                        })
                                      }
                                    >
                                      <ShieldCheck className="mr-2 h-4 w-4" />
                                      Acknowledge
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                        No provider documents yet.
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="rounded-[28px] border-border/60 p-5">
                  <p className="text-lg font-semibold text-foreground">Your uploads</p>
                  <div className="mt-4 space-y-3">
                    {familyDocuments.length > 0 ? (
                      familyDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-[24px] border border-border/60 bg-background/80 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-foreground">
                                  {document.label}
                                </p>
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                                  {getDocumentSourceLabel(document.uploadSource)}
                                </div>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {document.category} • {bytesToLabel(document.byteSize)} •{" "}
                                {formatDate(document.createdAt)}
                              </p>
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {document.note || "No additional note."}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="rounded-full"
                              onClick={() => handleDocumentOpen(document.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Open
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                        No family uploads yet.
                      </div>
                    )}
                  </div>
                </Card>
                </div>
              ) : null}

              {activeTab === "resources" ? (
                <div id="portal-panel-resources" role="tabpanel" className="space-y-4">
                {data.resources.length > 0 ? (
                  data.resources.map((resource) => (
                    <Card key={resource.id} className="rounded-[28px] border-border/60 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-foreground">
                            {resource.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {resource.description || "Helpful provider-shared resource."}
                          </p>
                          {normalizeExternalUrl(resource.href) ? (
                            <Button asChild variant="outline" className="mt-4 rounded-full">
                              <a
                                href={normalizeExternalUrl(resource.href) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open resource
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="rounded-[28px] border-border/60 p-5">
                    <p className="text-lg font-semibold text-foreground">No resources yet</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Provider resources will show up here.
                    </p>
                  </Card>
                )}
                </div>
              ) : null}

              {activeTab === "personal" ? (
                <div id="portal-panel-personal" role="tabpanel" className="space-y-4">
                <Card className="rounded-[28px] border-border/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        Family information
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Update the details your provider needs on file.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={profileDraft.phone}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={profileDraft.email}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Street address</Label>
                      <Input
                        value={profileDraft.streetAddress}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            streetAddress: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={profileDraft.city}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              city: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={profileDraft.state}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              state: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal code</Label>
                        <Input
                          value={profileDraft.postalCode}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              postalCode: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Insurance name</Label>
                      <Input
                        value={profileDraft.insuranceName}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            insuranceName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Insurance member ID</Label>
                        <Input
                          value={profileDraft.insuranceMemberId}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              insuranceMemberId: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Insurance group number</Label>
                        <Input
                          value={profileDraft.insuranceGroupNumber}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              insuranceGroupNumber: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency contact name</Label>
                      <Input
                        value={profileDraft.emergencyContactName}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            emergencyContactName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Emergency contact phone</Label>
                        <Input
                          value={profileDraft.emergencyContactPhone}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              emergencyContactPhone: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency contact relationship</Label>
                        <Input
                          value={profileDraft.emergencyContactRelationship}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              emergencyContactRelationship: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="mt-5 rounded-full"
                    disabled={isPending}
                    onClick={handleProfileSave}
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save family information
                  </Button>
                </Card>
                </div>
              ) : null}

              {activeTab === "tools" ? (
                <div id="portal-panel-tools" role="tabpanel" className="space-y-4">
                {data.connectedTools.length > 0 ? (
                  data.connectedTools.map((tool) => (
                    <Card key={tool.id} className="rounded-[28px] border-border/60 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Link2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-foreground">
                            {tool.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {tool.description || "Provider-recommended connected tool."}
                          </p>
                          {tool.whenToUse ? (
                            <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                              {tool.whenToUse}
                            </div>
                          ) : null}
                          {normalizeExternalUrl(tool.url) ? (
                            <Button asChild variant="outline" className="mt-4 rounded-full">
                              <a
                                href={normalizeExternalUrl(tool.url) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open tool
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="rounded-[28px] border-border/60 p-5">
                    <p className="text-lg font-semibold text-foreground">
                      No connected tools yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Provider-recommended links will show up here.
                    </p>
                  </Card>
                )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
    </div>
  );
}
