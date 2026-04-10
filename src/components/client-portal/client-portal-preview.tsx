"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FolderOpen,
  Link2,
  Mail,
  Phone,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

import type { ClientDetail } from "@/lib/actions/clients";
import { buildClientPortalSummary, getPortalDueLabel } from "@/lib/client-portal";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/validations/clients";
import { DashboardStatusBadge, DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const FAMILY_RESOURCES = [
  {
    title: "Getting started with ABA",
    description: "A plain-language walkthrough of what to expect after intake and before services begin.",
    href: "/learn",
  },
  {
    title: "Insurance glossary",
    description: "Quick definitions for common terms families usually need during authorizations and onboarding.",
    href: "/learn/glossary",
  },
  {
    title: "Parent FAQs",
    description: "Answers to the most common family questions about schedules, documents, and next steps.",
    href: "/faq",
  },
] as const;

function getDocumentTypeLabel(documentType: ClientDetail["documents"][number]["document_type"]) {
  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === documentType)?.label ?? "Document";
}

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-background/80 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export function ClientPortalPreview({
  client,
  previewMode = false,
}: {
  client: ClientDetail;
  previewMode?: boolean;
}) {
  const summary = buildClientPortalSummary(client);
  const childName =
    [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "your child";
  const progressWidth = `${Math.max(summary.completionPercentage, 4)}%`;
  const currentInsurance = client.insurances.find((insurance) => insurance.is_primary) || client.insurances[0];
  const primaryLocation = client.locations.find((location) => location.is_primary) || client.locations[0];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(229,240,235,0.95),_rgba(248,245,239,0.85)_45%,_rgba(255,255,255,1)_75%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {previewMode ? (
          <PreviewBanner
            message="Provider preview of the family-facing portal. Live invitations and richer notifications can layer on top of this flow."
            variant="inline"
            triggerFeature="client_portal"
          />
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 px-2">
            <Link href={`/dashboard/clients/${client.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to client record
            </Link>
          </Button>
          <DashboardStatusBadge tone="info">Provider Preview</DashboardStatusBadge>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/75 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-[#dfeee4]/80 via-[#f3eee4]/70 to-[#e9f2f6]/80" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                GoodABA Family Action Center
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                One calm place to see what matters now for {childName}.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Start with the next task, then review updates, documents, and family details when
                you are ready. The portal is designed to reduce back-and-forth and keep families on
                one clear next step.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-1.5 rounded-full px-6">
                  <a href={summary.nextTask ? `#task-${summary.nextTask.id}` : "#tasks"}>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Remaining"
                  value={String(summary.remainingTasks)}
                  detail={
                    summary.remainingTasks === 1
                      ? "One next step is waiting."
                      : `${summary.remainingTasks} action items are still open.`
                  }
                />
                <StatTile
                  label="Progress"
                  value={`${summary.completionPercentage}%`}
                  detail={
                    summary.completedTasks > 0
                      ? `${summary.completedTasks} completed so far.`
                      : "Families start here and move one step at a time."
                  }
                />
                <StatTile
                  label="Documents"
                  value={String(summary.documentCount)}
                  detail={
                    summary.documentCount > 0
                      ? "Shared files are organized in one place."
                      : "Shared documents will appear here."
                  }
                />
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white/80 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Completion progress</p>
                    <p className="text-sm text-slate-600">{summary.nextStepLabel}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {summary.completionPercentage}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-emerald-500 via-emerald-400 to-sky-500 transition-[width]"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>
            </div>
          </section>

          <Card className="overflow-hidden rounded-[32px] border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Next recommended task</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {summary.nextTask?.title || "All caught up"}
                  </h2>
                </div>
                <DashboardStatusBadge
                  tone={summary.overdueTasks > 0 ? "warning" : "success"}
                  className="shrink-0"
                >
                  {summary.overdueTasks > 0 ? `${summary.overdueTasks} overdue` : "On track"}
                </DashboardStatusBadge>
              </div>

              {summary.nextTask ? (
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    <p className="text-sm font-medium text-slate-800">{summary.nextTask.dueLabel}</p>
                  </div>
                  {summary.nextTask.content ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{summary.nextTask.content}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      The portal keeps this focused on one clear next step instead of a long admin list.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">All active items are complete.</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-emerald-800/80">
                    Families see a clean confirmation state once nothing is left to do.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Guardians ready
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {summary.guardians.length > 0
                      ? `${summary.guardiansReadyCount}/${summary.guardians.length}`
                      : "0"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{summary.portalStatusLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Due soon
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {summary.dueSoonTasks}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Includes tasks due within the next week.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tasks" className="gap-6">
          <DashboardTabsList className="grid-cols-2 gap-2 sm:grid-cols-6">
            <DashboardTabsTrigger value="tasks">Tasks</DashboardTabsTrigger>
            <DashboardTabsTrigger value="messages">Messages</DashboardTabsTrigger>
            <DashboardTabsTrigger value="documents">Documents</DashboardTabsTrigger>
            <DashboardTabsTrigger value="resources">Resources</DashboardTabsTrigger>
            <DashboardTabsTrigger value="personal">Personal Info</DashboardTabsTrigger>
            <DashboardTabsTrigger value="tools">Connected Tools</DashboardTabsTrigger>
          </DashboardTabsList>

          <TabsContent value="tasks" id="tasks" className="space-y-4">
            <Tabs defaultValue={summary.remainingTasks > 0 ? "open" : "completed"} className="gap-4">
              <TabsList className="w-full justify-start rounded-full bg-white/80 p-1 sm:w-fit">
                <TabsTrigger value="open">Open tasks</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-4">
                {summary.remainingTasks > 0 ? (
                  client.tasks
                    .filter((task) => task.status !== "completed")
                    .map((task) => {
                      const isNextTask = summary.nextTask?.id === task.id;
                      const dueLabel = isNextTask
                        ? summary.nextTask?.dueLabel || "No due date"
                        : getPortalDueLabel(task.due_date);

                      return (
                        <Card
                          key={task.id}
                          id={`task-${task.id}`}
                          className={cn(
                            "overflow-hidden rounded-[28px] border-slate-200/80 bg-white/90 shadow-sm",
                            isNextTask && "border-primary/30 shadow-md"
                          )}
                        >
                          <CardContent className="space-y-4 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  {isNextTask ? (
                                    <DashboardStatusBadge tone="info">Start here</DashboardStatusBadge>
                                  ) : null}
                                  <DashboardStatusBadge
                                    tone={task.status === "in_progress" ? "info" : "default"}
                                  >
                                    {task.status === "in_progress" ? "In progress" : "To do"}
                                  </DashboardStatusBadge>
                                </div>
                                <h3 className="mt-3 text-xl font-semibold text-slate-950">
                                  {task.title}
                                </h3>
                              </div>
                              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {dueLabel}
                              </div>
                            </div>
                            {task.content ? (
                              <p className="text-sm leading-7 text-slate-600">{task.content}</p>
                            ) : (
                              <p className="text-sm leading-7 text-slate-600">
                                Instructions appear here in plain language so families know exactly
                                what to do next.
                              </p>
                            )}
                            <p className="text-sm font-medium text-slate-500">
                              The primary action stays singular and obvious on the family screen.
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })
                ) : (
                  <EmptyState
                    title="All caught up"
                    description="Families see a clear completion state instead of a busy dashboard once nothing is left to do."
                    icon={CheckCircle2}
                  />
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {client.tasks.filter((task) => task.status === "completed").length > 0 ? (
                  client.tasks
                    .filter((task) => task.status === "completed")
                    .map((task) => (
                      <Card
                        key={task.id}
                        className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm"
                      >
                        <CardContent className="flex items-start gap-4 p-5">
                          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-950">{task.title}</h3>
                              <DashboardStatusBadge tone="success">Completed</DashboardStatusBadge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              Completed{" "}
                              {task.completed_at
                                ? format(new Date(task.completed_at), "MMM d, yyyy")
                                : "recently"}
                              .
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <EmptyState
                    title="Nothing completed yet"
                    description="Completed history stays visible so families can see what has already been handled."
                    icon={Clock3}
                  />
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            {summary.updates.length > 0 ? (
              summary.updates.map((update) => (
                <Card
                  key={update.id}
                  className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                          {update.kind === "document" ? (
                            <FolderOpen className="h-5 w-5 text-slate-600" />
                          ) : (
                            <Mail className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-950">{update.title}</h3>
                          <p className="text-sm text-slate-500">
                            {format(new Date(update.timestamp), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <DashboardStatusBadge tone="default">
                        {update.kind === "document" ? "Document" : "Update"}
                      </DashboardStatusBadge>
                    </div>
                    <p className="text-sm leading-7 text-slate-600">{update.description}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                title="No updates yet"
                description="One-way provider messages and notices can live here without turning the portal into a chat app."
                icon={Mail}
              />
            )}
          </TabsContent>

          <TabsContent value="documents" id="documents" className="space-y-4">
            {client.documents.length > 0 ? (
              client.documents.map((document) => (
                <Card
                  key={document.id}
                  className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <DashboardStatusBadge tone="info">
                            {getDocumentTypeLabel(document.document_type)}
                          </DashboardStatusBadge>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-950">
                          {document.label || document.file_name || "Shared document"}
                        </h3>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {format(new Date(document.created_at), "MMM d")}
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-slate-600">
                      {document.file_description ||
                        document.notes ||
                        "Shared by your provider for review or reference."}
                    </p>
                    <p className="text-sm font-medium text-slate-500">
                      Open and download actions would live here in the family-facing flow.
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                title="No documents shared yet"
                description="Families will find shared forms, signed agreements, and uploads here instead of searching across email threads."
                icon={FolderOpen}
              />
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {FAMILY_RESOURCES.map((resource) => (
                <Card
                  key={resource.href}
                  className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm"
                >
                  <CardContent className="space-y-4 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                      <BookOpen className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{resource.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{resource.description}</p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full px-5">
                      <Link href={resource.href}>Open resource</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm lg:col-span-2">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Guardians</h3>
                  </div>
                  {summary.guardians.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {summary.guardians.map((guardian) => (
                        <div
                          key={guardian.id}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{guardian.name}</p>
                              <p className="text-sm text-slate-500">{guardian.relationship}</p>
                            </div>
                            <DashboardStatusBadge
                              tone={guardian.status === "ready" ? "success" : "warning"}
                            >
                              {guardian.statusLabel}
                            </DashboardStatusBadge>
                          </div>
                          <div className="mt-4 space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span>{guardian.email || "No email on file"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span>{guardian.phone || "No phone on file"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No guardian details yet"
                      description="Guardian records appear here with tracked contact info and access readiness."
                      icon={User}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-slate-500" />
                      <h3 className="text-lg font-semibold text-slate-950">Insurance</h3>
                    </div>
                    {currentInsurance ? (
                      <>
                        <p className="font-medium text-slate-900">
                          {currentInsurance.insurance_name || "Insurance on file"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Member ID: {currentInsurance.member_id || "Not added yet"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Plan: {currentInsurance.plan_name || "Not added yet"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm leading-7 text-slate-600">
                        Insurance details appear here when the provider adds them.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white/90 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-slate-500" />
                      <h3 className="text-lg font-semibold text-slate-950">Service location</h3>
                    </div>
                    {primaryLocation ? (
                      <p className="text-sm leading-7 text-slate-600">
                        {[
                          primaryLocation.street_address,
                          primaryLocation.city,
                          primaryLocation.state,
                          primaryLocation.postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Location details coming soon."}
                      </p>
                    ) : (
                      <p className="text-sm leading-7 text-slate-600">
                        Approved editable fields like address and emergency contacts can live here.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <EmptyState
              title="No connected tools yet"
              description="When providers share scheduling, billing, telehealth, or training tools, families can access them here without hunting across multiple systems."
              icon={Link2}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
