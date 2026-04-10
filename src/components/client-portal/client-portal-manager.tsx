"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckSquare,
  Copy,
  Eye,
  FileStack,
  Link2,
  Loader2,
  Mail,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  deletePortalMessage,
  deletePortalResource,
  deletePortalTask,
  deletePortalTool,
  getPortalGuardianSignInPageLink,
  savePortalDocumentShare,
  savePortalGuardian,
  savePortalMessage,
  savePortalResource,
  savePortalTask,
  savePortalTool,
  sendPortalGuardianMagicLink,
  setClientPortalEnabled,
  uploadProviderPortalDocument,
  type ClientPortalData,
  type PortalDocumentData,
  type PortalGuardianData,
  type PortalMessageData,
  type PortalResourceData,
  type PortalTaskData,
  type PortalToolData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardStatusBadge, DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TASK_TYPE_OPTIONS = [
  { value: "form_completion", label: "Form Completion" },
  { value: "file_upload", label: "File Upload" },
  { value: "review_and_sign", label: "Review & Sign" },
  { value: "custom_task", label: "Custom Task" },
] as const;

const FORM_OPTIONS = [{ value: "intake", label: "Intake Form" }] as const;

const FILE_TYPE_OPTIONS = [
  { value: "insurance_card", label: "Insurance Card" },
  { value: "diagnosis_report", label: "Diagnosis Report" },
  { value: "referral", label: "Physician Referral" },
  { value: "iep", label: "IEP" },
  { value: "medical_records", label: "Medical Records" },
  { value: "administrative", label: "Administrative File" },
  { value: "other", label: "Other" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "visible", label: "Visible" },
  { value: "action_required", label: "Action required" },
] as const;

const MESSAGE_TYPE_OPTIONS = [
  { value: "general_update", label: "General update" },
  { value: "reminder", label: "Reminder" },
  { value: "policy_update", label: "Policy update" },
  { value: "important_notice", label: "Important notice" },
  { value: "celebration", label: "Celebration / check-in" },
] as const;

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
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

function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "submitted") return "info" as const;
  if (status === "cancelled") return "default" as const;
  if (status === "in_progress") return "warning" as const;
  return "warning" as const;
}

function taskTypeLabel(taskType: string) {
  return (
    TASK_TYPE_OPTIONS.find((option) => option.value === taskType)?.label ??
    taskType.replaceAll("_", " ")
  );
}

function getDocumentSourceMeta(uploadSource: string) {
  switch (uploadSource) {
    case "portal_family":
      return {
        label: "Family upload",
        tone: "info" as const,
      };
    case "intake_form":
      return {
        label: "Intake upload",
        tone: "default" as const,
      };
    default:
      return {
        label: "Provider shared",
        tone: "success" as const,
      };
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

export function ClientPortalManager({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("overview");
  const [signInPageUrls, setSignInPageUrls] = useState<Record<string, string>>({});
  const [signInLinkCopied, setSignInLinkCopied] = useState(false);
  const [inviteEmailSentGuardianId, setInviteEmailSentGuardianId] = useState<string | null>(null);
  const [portalLinkError, setPortalLinkError] = useState<string | null>(null);
  const [portalActionError, setPortalActionError] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<Partial<PortalTaskData>>({
    taskType: "custom_task",
    status: "pending",
  });
  const [taskAttachmentFile, setTaskAttachmentFile] = useState<File | null>(null);
  const [taskAttachmentLabel, setTaskAttachmentLabel] = useState("");
  const [guardianDraft, setGuardianDraft] = useState<Partial<PortalGuardianData>>({
    relationship: "guardian",
  });
  const [messageDraft, setMessageDraft] = useState<Partial<PortalMessageData>>({
    messageType: "general_update",
    audience: "client",
    emailNotify: true,
  });
  const [resourceDraft, setResourceDraft] = useState<Partial<PortalResourceData>>({
    category: "faq",
    visibility: "visible",
    pinned: true,
  });
  const [toolDraft, setToolDraft] = useState<Partial<PortalToolData>>({
    category: "billing",
    visibility: "visible",
  });
  const [documentDraft, setDocumentDraft] = useState<Partial<PortalDocumentData>>({
    category: "administrative",
    visibility: "visible",
    acknowledgementRequired: false,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    setSignInPageUrls({});
  }, [data.client.id]);

  const previewUrl = `/dashboard/clients/${data.client.id}/portal/preview`;
  const providerSharedDocuments = data.documents.filter(
    (document) => document.uploadSource === "dashboard",
  );
  const familyUploadedDocuments = data.documents.filter(
    (document) => document.uploadSource !== "dashboard",
  );
  const primaryGuardian =
    data.guardians.find((guardian) => guardian.isPrimary && guardian.email) ??
    data.guardians.find((guardian) => guardian.email) ??
    null;

  const normalizeInviteUrl = (inviteUrl: string) => {
    if (typeof window === "undefined") {
      return inviteUrl;
    }

    const parsed = new URL(inviteUrl, window.location.origin);
    return `${window.location.origin}${parsed.pathname}${parsed.search}`;
  };

  const latestSignInPageLink = primaryGuardian ? signInPageUrls[primaryGuardian.id] ?? null : null;

  const copySignInPageLink = () => {
    if (!data.branding.slug || !primaryGuardian?.email) {
      setPortalLinkError("Add a guardian email first, then copy the sign-in page link.");
      setActiveTab("guardians");
      return;
    }

    setPortalLinkError(null);
    startTransition(async () => {
      const result = await getPortalGuardianSignInPageLink({
        clientId: data.client.id,
        guardianId: primaryGuardian.id,
      });
      if (!result.success) {
        setPortalLinkError(result.error);
        return;
      }

      const signInData = result.data;
      if (!signInData?.url) {
        setPortalLinkError("Failed to create sign-in page link.");
        return;
      }

      const normalizedUrl = normalizeInviteUrl(signInData.url);
      setSignInPageUrls((current) => ({
        ...current,
        [primaryGuardian.id]: normalizedUrl,
      }));

      if (typeof navigator !== "undefined") {
        try {
          await navigator.clipboard.writeText(normalizedUrl);
          setSignInLinkCopied(true);
          window.setTimeout(() => setSignInLinkCopied(false), 2000);
        } catch {
          setPortalLinkError("Sign-in page link created, but clipboard copy was blocked by the browser.");
        }
      }
    });
  };

  const sendGuardianInviteEmail = (guardianId: string) => {
    startTransition(async () => {
      setPortalLinkError(null);
      setInviteEmailSentGuardianId(null);
      const result = await sendPortalGuardianMagicLink({
        clientId: data.client.id,
        guardianId,
      });
      if (!result.success) {
        setPortalLinkError(result.error);
        return;
      }

      const signInPageUrl = result.data?.url ? normalizeInviteUrl(result.data.url) : null;
      if (signInPageUrl) {
        setSignInPageUrls((current) => ({
          ...current,
          [guardianId]: signInPageUrl,
        }));
      }

      if (!result.data?.emailSent) {
        setPortalLinkError(
          `Sign-in email was not sent${result.data?.emailError ? `: ${result.data.emailError}` : "."}`,
        );
        return;
      }

      setInviteEmailSentGuardianId(guardianId);
      window.setTimeout(() => setInviteEmailSentGuardianId(null), 2000);
      router.refresh();
    });
  };

  const runRefresh = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        setPortalActionError(null);
        await action();
        router.refresh();
      } catch (error) {
        setPortalActionError(
          error instanceof Error ? error.message : "Something went wrong in the client portal.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <DashboardCard className="overflow-hidden rounded-[32px]">
        <div className="border-b border-border/60 bg-linear-to-r from-primary/12 via-card to-emerald-500/8 p-6 sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="min-w-0 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client Portal</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {data.client.name}
                  </h1>
                </div>
              </div>

              <div className="grid max-w-2xl grid-cols-2 gap-3">
                {[
                  {
                    label: "Status",
                    value: data.portal.enabled ? "Live" : "Disabled",
                    detail: data.portal.enabled ? "Family can sign in" : "Hidden from family",
                  },
                  {
                    label: "Completion",
                    value: `${data.portal.completionPercentage}%`,
                    detail: `${data.portal.completedTasks}/${data.portal.openTasks + data.portal.completedTasks} completed`,
                  },
                  {
                    label: "Open Tasks",
                    value: String(data.portal.openTasks),
                    detail: data.portal.openTasks === 1 ? "1 item left" : `${data.portal.openTasks} items left`,
                  },
                  {
                    label: "Guardians",
                    value: `${data.portal.guardiansReady}/${data.portal.guardiansTotal}`,
                    detail:
                      data.portal.guardiansReady === 1
                        ? "1 ready or invited"
                        : `${data.portal.guardiansReady} ready or invited`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-2xl border border-border/60 bg-background/85 p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold leading-none text-foreground sm:text-[1.75rem]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge tone={data.portal.overdueTasks > 0 ? "warning" : "default"}>
                  {data.portal.overdueTasks > 0
                    ? `${data.portal.overdueTasks} overdue`
                    : "No overdue items"}
                </DashboardStatusBadge>
                <DashboardStatusBadge tone="default">
                  Last activity {formatDate(data.portal.lastActivityAt)}
                </DashboardStatusBadge>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/60 bg-background/85 p-4 sm:p-5">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Portal status
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {data.portal.enabled ? "Live for family access" : "Hidden from family access"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={data.portal.enabled}
                      disabled={isPending}
                      onCheckedChange={(enabled) =>
                        runRefresh(async () => {
                          await setClientPortalEnabled(data.client.id, enabled);
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button asChild variant="outline" className="justify-start rounded-full">
                    <Link href={previewUrl}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview family view
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start rounded-full"
                    disabled={isPending || !primaryGuardian?.email}
                    onClick={() => {
                      if (!primaryGuardian?.id) {
                        setPortalLinkError("Add a guardian email first, then send the sign-in email.");
                        setActiveTab("guardians");
                        return;
                      }
                      void sendGuardianInviteEmail(primaryGuardian.id);
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {inviteEmailSentGuardianId === primaryGuardian?.id
                      ? "Email sent"
                      : "Send sign-in email"}
                  </Button>

                  <Button
                    className="justify-start rounded-full"
                    disabled={isPending || !data.branding.slug}
                    onClick={copySignInPageLink}
                  >
                    {signInLinkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {signInLinkCopied ? "Copied sign-in page link" : "Copy sign-in page link"}
                  </Button>
                </div>

                {latestSignInPageLink ? (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Sign-in page link
                    </p>
                    <div className="flex flex-col gap-2">
                      <Input
                        readOnly
                        value={latestSignInPageLink}
                        className="h-11 min-w-0 flex-1 text-xs sm:text-sm"
                      />
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(latestSignInPageLink);
                            setSignInLinkCopied(true);
                            window.setTimeout(() => setSignInLinkCopied(false), 2000);
                          } catch {
                            setPortalLinkError("Clipboard copy was blocked by the browser.");
                          }
                        }}
                      >
                        {signInLinkCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {signInLinkCopied ? "Copied" : "Copy link"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {portalLinkError ? (
          <div className="border-t border-border/60 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            {portalLinkError}
          </div>
        ) : null}
        {portalActionError ? (
          <div className="border-t border-border/60 bg-rose-50 px-6 py-3 text-sm text-rose-900">
            {portalActionError}
          </div>
        ) : null}

      </DashboardCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <DashboardTabsList className="grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <DashboardTabsTrigger value="overview">Overview</DashboardTabsTrigger>
          <DashboardTabsTrigger value="guardians">Guardians</DashboardTabsTrigger>
          <DashboardTabsTrigger value="tasks">Tasks</DashboardTabsTrigger>
          <DashboardTabsTrigger value="documents">Documents</DashboardTabsTrigger>
          <DashboardTabsTrigger value="messages">Messages</DashboardTabsTrigger>
          <DashboardTabsTrigger value="resources">Resources</DashboardTabsTrigger>
          <DashboardTabsTrigger value="tools">Connected Tools</DashboardTabsTrigger>
          <DashboardTabsTrigger value="activity">Activity</DashboardTabsTrigger>
        </DashboardTabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <DashboardCard className="rounded-[28px] p-6 lg:col-span-2">
              <SectionHeading
                title="Recent portal activity"
                description="Recent invites, completions, uploads, signatures, and profile updates."
              />
              <div className="mt-5 space-y-3">
                {data.activity.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
                    Activity will appear here as soon as the provider or family interacts with the portal.
                  </div>
                ) : (
                  data.activity.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border/60 bg-background/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description || "Portal activity recorded."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard className="rounded-[28px] p-6">
              <SectionHeading
                title="Quick links"
                description="Go straight to the main portal work."
              />
              <div className="mt-5 grid gap-3">
                {[
                  { label: "Manage tasks", tab: "tasks", icon: CheckSquare },
                  { label: "Review documents", tab: "documents", icon: FileStack },
                  { label: "Publish message", tab: "messages", icon: Mail },
                  { label: "Invite guardian", tab: "guardians", icon: UserRound },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setActiveTab(item.tab)}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </DashboardCard>
          </div>
        </TabsContent>

        <TabsContent value="guardians" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title={guardianDraft.id ? "Edit guardian access" : "Add a guardian"}
              description="Access is tied to guardian records, not generic links. Each guardian controls their own notifications and invite state."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={guardianDraft.firstName ?? ""}
                  onChange={(event) =>
                    setGuardianDraft((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={guardianDraft.lastName ?? ""}
                  onChange={(event) =>
                    setGuardianDraft((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={guardianDraft.email ?? ""}
                  onChange={(event) =>
                    setGuardianDraft((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={guardianDraft.phone ?? ""}
                  onChange={(event) =>
                    setGuardianDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={guardianDraft.relationship ?? ""}
                  onChange={(event) =>
                    setGuardianDraft((current) => ({ ...current, relationship: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Access state</Label>
                <Select
                  value={guardianDraft.accessStatus ?? "ready"}
                  onValueChange={(value) =>
                    setGuardianDraft((current) => ({ ...current, accessStatus: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm">
                <Switch
                  checked={guardianDraft.isPrimary ?? false}
                  onCheckedChange={(checked) =>
                    setGuardianDraft((current) => ({ ...current, isPrimary: checked }))
                  }
                />
                Primary guardian
              </label>
              <label className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm">
                <Switch
                  checked={guardianDraft.notificationsEnabled ?? true}
                  onCheckedChange={(checked) =>
                    setGuardianDraft((current) => ({ ...current, notificationsEnabled: checked }))
                  }
                />
                Email notifications on
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !(guardianDraft.firstName || guardianDraft.email)}
                onClick={() =>
                  runRefresh(async () => {
                    await savePortalGuardian({
                      recordId: guardianDraft.id,
                      clientId: data.client.id,
                      firstName: guardianDraft.firstName ?? null,
                      lastName: guardianDraft.lastName ?? null,
                      email: guardianDraft.email ?? null,
                      phone: guardianDraft.phone ?? null,
                      relationship: guardianDraft.relationship ?? null,
                      isPrimary: guardianDraft.isPrimary ?? false,
                      notificationsEnabled: guardianDraft.notificationsEnabled ?? true,
                      accessStatus: guardianDraft.accessStatus ?? "ready",
                    });
                    setGuardianDraft({ relationship: "guardian" });
                  })
                }
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {guardianDraft.id ? "Save guardian" : "Add guardian"}
              </Button>
              {guardianDraft.id ? (
                <Button
                  variant="outline"
                  onClick={() => setGuardianDraft({ relationship: "guardian" })}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.guardians.map((guardian) => (
              <DashboardCard key={guardian.id} className="rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{guardian.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {guardian.relationship} • {guardian.email || "No email on file"}
                    </p>
                  </div>
                  <DashboardStatusBadge tone={guardian.accessStatus === "active" ? "success" : "warning"}>
                    {guardian.accessStatus}
                  </DashboardStatusBadge>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  <p>Invited: {formatDate(guardian.invitedAt)}</p>
                  <p>Accepted: {formatDate(guardian.acceptedAt)}</p>
                  <p>Last viewed: {formatDate(guardian.lastViewedAt)}</p>
                </div>

                {signInPageUrls[guardian.id] ? (
                  <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Sign-in page link
                    </p>
                    <p className="mt-2 break-all text-sm text-foreground">{signInPageUrls[guardian.id]}</p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setGuardianDraft({
                        id: guardian.id,
                        firstName: guardian.firstName,
                        lastName: guardian.lastName,
                        relationship: guardian.relationship,
                        email: guardian.email,
                        phone: guardian.phone,
                        isPrimary: guardian.isPrimary,
                        notificationsEnabled: guardian.notificationsEnabled,
                        accessStatus: guardian.accessStatus,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    disabled={isPending || !guardian.email}
                    onClick={() => sendGuardianInviteEmail(guardian.id)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {inviteEmailSentGuardianId === guardian.id ? "Email sent" : "Send invite email"}
                  </Button>
                </div>
              </DashboardCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title={taskDraft.id ? "Edit task" : "Create a family task"}
              description="Assign one clear client-facing action at a time. Pick the task type, describe what the family needs to do, and attach anything they should review."
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Task type</Label>
                <Select
                  value={taskDraft.taskType ?? "custom_task"}
                  onValueChange={(value) =>
                    setTaskDraft((current) => ({
                      ...current,
                      taskType: value,
                      formKey: value === "form_completion" ? current.formKey ?? "intake" : null,
                      externalUrl: value === "custom_task" ? current.externalUrl ?? "" : "",
                      requiredDocumentType: value === "file_upload" ? current.requiredDocumentType ?? "other" : null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input
                  value={taskDraft.title ?? ""}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Plain-language instructions</Label>
                <Textarea
                  rows={4}
                  value={taskDraft.instructions ?? ""}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, instructions: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={taskDraft.dueDate ? taskDraft.dueDate.slice(0, 10) : ""}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))
                  }
                />
              </div>
              {taskDraft.taskType === "form_completion" ? (
                <div className="space-y-2">
                  <Label>Form</Label>
                  <Select
                    value={taskDraft.formKey ?? "intake"}
                    onValueChange={(value) =>
                      setTaskDraft((current) => ({ ...current, formKey: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {taskDraft.taskType === "file_upload" ? (
                <div className="space-y-2">
                  <Label>Requested file</Label>
                  <Select
                    value={taskDraft.requiredDocumentType ?? "other"}
                    onValueChange={(value) =>
                      setTaskDraft((current) => ({ ...current, requiredDocumentType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {taskDraft.taskType === "review_and_sign" ? (
                <div className="space-y-2">
                  <Label>Existing document</Label>
                  <Select
                    value={taskDraft.linkedDocumentId ?? "__none__"}
                    onValueChange={(value) =>
                      setTaskDraft((current) => ({
                        ...current,
                        linkedDocumentId: value === "__none__" ? null : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No existing document selected</SelectItem>
                      {data.documents
                        .filter((document) => document.uploadSource !== "portal_family")
                        .map((document) => (
                          <SelectItem key={document.id} value={document.id}>
                            {document.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <Label>External URL</Label>
                <Input
                  value={taskDraft.externalUrl ?? ""}
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, externalUrl: event.target.value }))
                  }
                  placeholder="Optional tool or form link"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Supporting file (optional)</Label>
                <Input
                  type="file"
                  onChange={(event) => setTaskAttachmentFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Supporting file label</Label>
                <Input
                  value={taskAttachmentLabel}
                  onChange={(event) => setTaskAttachmentLabel(event.target.value)}
                  placeholder="Optional label for the file families will see"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !taskDraft.title}
                onClick={() =>
                  runRefresh(async () => {
                    let linkedDocumentId = taskDraft.linkedDocumentId ?? null;

                    if (taskAttachmentFile) {
                      const formData = new FormData();
                      formData.set("file", taskAttachmentFile);
                      formData.set("label", taskAttachmentLabel || taskAttachmentFile.name);
                      formData.set("document_type", taskDraft.taskType === "review_and_sign" ? "administrative" : "other");
                      formData.set("portal_note", taskDraft.instructions || "");
                      formData.set("portal_visibility", "visible");
                      formData.set(
                        "portal_ack_required",
                        String(taskDraft.taskType === "review_and_sign"),
                      );
                      const uploadResult = await uploadProviderPortalDocument(data.client.id, formData);
                      if (!uploadResult.success || !uploadResult.data?.id) {
                        throw new Error(uploadResult.success ? "Failed to upload task attachment" : uploadResult.error);
                      }
                      linkedDocumentId = uploadResult.data.id;
                    }

                    if (taskDraft.taskType === "review_and_sign" && !linkedDocumentId) {
                      throw new Error("Review & Sign tasks need a document to review.");
                    }

                    const taskResult = await savePortalTask({
                      recordId: taskDraft.id,
                      clientId: data.client.id,
                      title: taskDraft.title || "",
                      instructions: taskDraft.instructions ?? null,
                      dueDate: taskDraft.dueDate ?? null,
                      taskType: taskDraft.taskType ?? "custom_task",
                      formKey: taskDraft.formKey ?? null,
                      status: taskDraft.status ?? "pending",
                      externalUrl: taskDraft.externalUrl ?? null,
                      linkedDocumentId,
                      requiredDocumentType: taskDraft.requiredDocumentType ?? null,
                    });
                    if (!taskResult.success) {
                      throw new Error(taskResult.error);
                    }
                    setTaskDraft({
                      taskType: "custom_task",
                      status: "pending",
                    });
                    setTaskAttachmentFile(null);
                    setTaskAttachmentLabel("");
                  })
                }
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {taskDraft.id ? "Save task" : "Create task"}
              </Button>
              {taskDraft.id ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setTaskDraft({
                      taskType: "custom_task",
                      status: "pending",
                    })
                  }
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </DashboardCard>

          <div className="grid gap-4">
            {data.tasks.map((task) => (
              <DashboardCard key={task.id} className="rounded-[28px] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{task.title}</p>
                      <DashboardStatusBadge tone={statusTone(task.status)}>
                        {task.status}
                      </DashboardStatusBadge>
                      <DashboardStatusBadge tone="default">{taskTypeLabel(task.taskType)}</DashboardStatusBadge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {task.instructions || "No additional instructions"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDate(task.dueDate)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setTaskDraft(task)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        runRefresh(async () => {
                          await savePortalTask({
                            recordId: task.id,
                            clientId: data.client.id,
                            title: task.title,
                            instructions: task.instructions,
                            dueDate: task.dueDate,
                            taskType: task.taskType,
                            status: "completed",
                            formKey: task.formKey,
                            externalUrl: task.externalUrl,
                            linkedDocumentId: task.linkedDocumentId,
                            requiredDocumentType: task.requiredDocumentType,
                          });
                        })
                      }
                    >
                      Complete
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        runRefresh(async () => {
                          await deletePortalTask(data.client.id, task.id);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title="Upload and share documents"
              description="Provider-shared files live in one center. Visibility and acknowledgement rules stay explicit."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>File</Label>
                <Input type="file" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={documentDraft.label ?? ""}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({ ...current, label: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={documentDraft.category ?? ""}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Family note</Label>
                <Textarea
                  rows={3}
                  value={documentDraft.note ?? ""}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({ ...current, note: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={documentDraft.visibility ?? "visible"}
                  onValueChange={(value) =>
                    setDocumentDraft((current) => ({ ...current, visibility: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-background/80 px-4 py-3">
                <Switch
                  checked={documentDraft.acknowledgementRequired ?? false}
                  onCheckedChange={(checked) =>
                    setDocumentDraft((current) => ({ ...current, acknowledgementRequired: checked }))
                  }
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Require acknowledgement</p>
                  <p className="text-xs text-muted-foreground">
                    Families must explicitly confirm they reviewed the document.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !uploadFile}
                onClick={() =>
                  runRefresh(async () => {
                    if (!uploadFile) return;
                    const formData = new FormData();
                    formData.set("file", uploadFile);
                    formData.set("label", documentDraft.label || uploadFile.name);
                    formData.set("document_type", documentDraft.category || "administrative");
                    formData.set("portal_note", documentDraft.note || "");
                    formData.set("portal_visibility", documentDraft.visibility || "visible");
                    formData.set(
                      "portal_ack_required",
                      String(documentDraft.acknowledgementRequired ?? false),
                    );
                    await uploadProviderPortalDocument(data.client.id, formData);
                    setUploadFile(null);
                    setDocumentDraft({
                      category: "administrative",
                      visibility: "visible",
                      acknowledgementRequired: false,
                    });
                  })
                }
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileStack className="mr-2 h-4 w-4" />}
                Upload and share
              </Button>
            </div>
          </DashboardCard>

          <div className="space-y-6">
            <div className="space-y-3">
              <SectionHeading
                title="Provider-shared documents"
                description="These are the files your team intentionally published into the family portal."
              />
              {providerSharedDocuments.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {providerSharedDocuments.map((document) => {
                    const sourceMeta = getDocumentSourceMeta(document.uploadSource);
                    return (
                      <DashboardCard key={document.id} className="rounded-[28px] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">{document.label}</p>
                              <DashboardStatusBadge tone={sourceMeta.tone}>
                                {sourceMeta.label}
                              </DashboardStatusBadge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {document.category} • {document.visibility}
                            </p>
                          </div>
                          <DashboardStatusBadge tone={document.acknowledgementRequired ? "warning" : "default"}>
                            {document.acknowledgementRequired ? "Ack required" : "Shared"}
                          </DashboardStatusBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {document.note || "No family-facing note."}
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Acknowledged by {document.acknowledgedByGuardianIds.length} guardian
                          {document.acknowledgedByGuardianIds.length === 1 ? "" : "s"}.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              runRefresh(async () => {
                                await savePortalDocumentShare({
                                  clientId: data.client.id,
                                  existingDocumentId: document.id,
                                  label: document.label,
                                  category: document.category,
                                  note: document.note,
                                  visibility:
                                    document.visibility === "action_required" ? "visible" : "action_required",
                                  acknowledgementRequired: true,
                                  linkedTaskId: document.linkedTaskId,
                                });
                              })
                            }
                          >
                            Make action required
                          </Button>
                        </div>
                      </DashboardCard>
                    );
                  })}
                </div>
              ) : (
                <DashboardCard className="rounded-[28px] p-5 text-sm text-muted-foreground">
                  No provider-shared documents yet.
                </DashboardCard>
              )}
            </div>

            <div className="space-y-3">
              <SectionHeading
                title="Family uploads"
                description="These files came from the family, either through the portal or an intake upload flow."
              />
              {familyUploadedDocuments.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {familyUploadedDocuments.map((document) => {
                    const sourceMeta = getDocumentSourceMeta(document.uploadSource);
                    return (
                      <DashboardCard key={document.id} className="rounded-[28px] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">{document.label}</p>
                              <DashboardStatusBadge tone={sourceMeta.tone}>
                                {sourceMeta.label}
                              </DashboardStatusBadge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {document.category} • {formatDate(document.createdAt)}
                            </p>
                          </div>
                          <DashboardStatusBadge tone="info">
                            Received
                          </DashboardStatusBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {document.note || "No note was included with this upload."}
                        </p>
                      </DashboardCard>
                    );
                  })}
                </div>
              ) : (
                <DashboardCard className="rounded-[28px] p-5 text-sm text-muted-foreground">
                  No family uploads yet.
                </DashboardCard>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title={messageDraft.id ? "Edit message" : "Publish a provider update"}
              description="Messages are one-way updates. Keep them calm and scannable."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Subject</Label>
                <Input
                  value={messageDraft.subject ?? ""}
                  onChange={(event) =>
                    setMessageDraft((current) => ({ ...current, subject: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Message body</Label>
                <Textarea
                  rows={5}
                  value={messageDraft.body ?? ""}
                  onChange={(event) =>
                    setMessageDraft((current) => ({ ...current, body: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={messageDraft.messageType ?? "general_update"}
                  onValueChange={(value) =>
                    setMessageDraft((current) => ({ ...current, messageType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-background/80 px-4 py-3">
                <Switch
                  checked={messageDraft.emailNotify ?? true}
                  onCheckedChange={(checked) =>
                    setMessageDraft((current) => ({ ...current, emailNotify: checked }))
                  }
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Email notify family</p>
                  <p className="text-xs text-muted-foreground">Store this as an email-notified post.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !messageDraft.subject || !messageDraft.body}
                onClick={() =>
                  runRefresh(async () => {
                    await savePortalMessage({
                      recordId: messageDraft.id,
                      clientId: data.client.id,
                      subject: messageDraft.subject || "",
                      body: messageDraft.body || "",
                      messageType: messageDraft.messageType ?? "general_update",
                      audience: "client",
                      emailNotify: messageDraft.emailNotify ?? true,
                    });
                    setMessageDraft({
                      messageType: "general_update",
                      audience: "client",
                      emailNotify: true,
                    });
                  })
                }
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {messageDraft.id ? "Save message" : "Publish message"}
              </Button>
              {messageDraft.id ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setMessageDraft({
                      messageType: "general_update",
                      audience: "client",
                      emailNotify: true,
                    })
                  }
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </DashboardCard>

          <div className="grid gap-4">
            {data.messages.map((message) => (
              <DashboardCard key={message.id} className="rounded-[28px] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{message.subject}</p>
                      <DashboardStatusBadge tone="info">{message.messageType}</DashboardStatusBadge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{message.body}</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Posted {formatDate(message.createdAt)} • Read by {message.readByGuardianIds.length} guardian
                      {message.readByGuardianIds.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setMessageDraft(message)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        runRefresh(async () => {
                          await deletePortalMessage(data.client.id, message.id);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title={resourceDraft.id ? "Edit resource" : "Publish a resource"}
              description="Resources should stay helpful but secondary to tasks."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={resourceDraft.title ?? ""}
                  onChange={(event) =>
                    setResourceDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input
                  value={resourceDraft.href ?? ""}
                  onChange={(event) =>
                    setResourceDraft((current) => ({ ...current, href: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={resourceDraft.description ?? ""}
                  onChange={(event) =>
                    setResourceDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !resourceDraft.title}
                onClick={() =>
                  runRefresh(async () => {
                    await savePortalResource({
                      recordId: resourceDraft.id,
                      clientId: data.client.id,
                      title: resourceDraft.title || "",
                      description: resourceDraft.description ?? null,
                      href: resourceDraft.href ?? null,
                      category: resourceDraft.category ?? "faq",
                      recommendedStage: resourceDraft.recommendedStage ?? null,
                      pinned: resourceDraft.pinned ?? true,
                      visibility: resourceDraft.visibility ?? "visible",
                    });
                    setResourceDraft({
                      category: "faq",
                      visibility: "visible",
                      pinned: true,
                    });
                  })
                }
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {resourceDraft.id ? "Save resource" : "Publish resource"}
              </Button>
            </div>
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.resources.map((resource) => (
              <DashboardCard key={resource.id} className="rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{resource.title}</p>
                    <p className="text-sm text-muted-foreground">{resource.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setResourceDraft(resource)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        runRefresh(async () => {
                          await deletePortalResource(data.client.id, resource.id);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {resource.description || "No description provided."}
                </p>
                {normalizeExternalUrl(resource.href) ? (
                  <a
                    href={normalizeExternalUrl(resource.href) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    Open resource
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
              </DashboardCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <DashboardCard className="rounded-[28px] p-6">
            <SectionHeading
              title={toolDraft.id ? "Edit connected tool" : "Add a connected tool"}
              description="GoodABA can stay the family hub even when another system handles billing, scheduling, or telehealth."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={toolDraft.name ?? ""}
                  onChange={(event) =>
                    setToolDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={toolDraft.url ?? ""}
                  onChange={(event) =>
                    setToolDraft((current) => ({ ...current, url: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={toolDraft.description ?? ""}
                  onChange={(event) =>
                    setToolDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>When to use this</Label>
                <Textarea
                  rows={2}
                  value={toolDraft.whenToUse ?? ""}
                  onChange={(event) =>
                    setToolDraft((current) => ({ ...current, whenToUse: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={isPending || !toolDraft.name}
                onClick={() =>
                  runRefresh(async () => {
                    await savePortalTool({
                      recordId: toolDraft.id,
                      clientId: data.client.id,
                      name: toolDraft.name || "",
                      description: toolDraft.description ?? null,
                      url: toolDraft.url ?? null,
                      category: toolDraft.category ?? "general",
                      whenToUse: toolDraft.whenToUse ?? null,
                      logoLabel: toolDraft.logoLabel ?? null,
                      visibility: toolDraft.visibility ?? "visible",
                    });
                    setToolDraft({
                      category: "billing",
                      visibility: "visible",
                    });
                  })
                }
              >
                <Link2 className="mr-2 h-4 w-4" />
                {toolDraft.id ? "Save tool" : "Add tool"}
              </Button>
            </div>
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.connectedTools.map((tool) => (
              <DashboardCard key={tool.id} className="rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{tool.name}</p>
                    <p className="text-sm text-muted-foreground">{tool.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setToolDraft(tool)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        runRefresh(async () => {
                          await deletePortalTool(data.client.id, tool.id);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {tool.description || "No description provided."}
                </p>
                {tool.whenToUse ? (
                  <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-3 text-sm text-muted-foreground">
                    {tool.whenToUse}
                  </div>
                ) : null}
                {normalizeExternalUrl(tool.url) ? (
                  <a
                    href={normalizeExternalUrl(tool.url) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    Open tool
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
              </DashboardCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {data.activity.map((item) => (
            <DashboardCard key={item.id} className="rounded-[28px] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description || "Portal activity was recorded."}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{item.actorName || item.actorType}</p>
                  <p>{formatDate(item.createdAt)}</p>
                </div>
              </div>
            </DashboardCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
