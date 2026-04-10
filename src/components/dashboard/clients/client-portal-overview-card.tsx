import Link from "next/link";
import { Eye, FolderOpen, Mail, Sparkles, CheckSquare } from "lucide-react";

import type { ClientDetail } from "@/lib/actions/clients";
import { buildClientPortalSummary } from "@/lib/client-portal";
import { DashboardCard, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ClientPortalOverviewCard({ client }: { client: ClientDetail }) {
  const summary = buildClientPortalSummary(client);

  return (
    <DashboardCard
      tone={summary.portalStatus === "ready" ? "success" : "warning"}
      className="overflow-hidden rounded-3xl"
    >
      <div className="border-b border-border/60 bg-linear-to-r from-primary/10 via-card to-emerald-500/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Portal</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Family action center overview
                </h2>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep families focused on the next action instead of chasing forms, documents, and
              updates across multiple systems.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <DashboardStatusBadge
                tone={summary.portalStatus === "ready" ? "success" : "warning"}
              >
                {summary.portalStatusLabel}
              </DashboardStatusBadge>
              <DashboardStatusBadge tone="info">
                {summary.completionPercentage}% completion
              </DashboardStatusBadge>
            </div>
          </div>

          <Button asChild className="gap-1.5 rounded-full px-5">
            <Link href={`/dashboard/clients/${client.id}/portal`}>
              <Eye className="h-4 w-4" />
              Manage portal
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Open tasks"
            value={String(summary.remainingTasks)}
            detail={
              summary.nextTask
                ? `${summary.nextTask.title} is next.`
                : "No open tasks right now."
            }
          />
          <Metric
            label="Due soon"
            value={String(summary.dueSoonTasks)}
            detail={
              summary.overdueTasks > 0
                ? `${summary.overdueTasks} task${summary.overdueTasks === 1 ? "" : "s"} overdue.`
                : "No overdue tasks."
            }
          />
          <Metric
            label="Guardians"
            value={
              summary.guardians.length > 0
                ? `${summary.guardiansReadyCount}/${summary.guardians.length}`
                : "0"
            }
            detail="Guardians with email on file"
          />
          <Metric
            label="Documents"
            value={String(summary.documentCount)}
            detail="Shared files available in one place"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Guardian access</p>
            </div>
            {summary.guardians.length > 0 ? (
              <div className="mt-4 space-y-3">
                {summary.guardians.map((guardian) => (
                  <div
                    key={guardian.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{guardian.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {guardian.email || "No email on file"}
                      </p>
                    </div>
                    <DashboardStatusBadge
                      tone={guardian.status === "ready" ? "success" : "warning"}
                      className="w-fit"
                    >
                      {guardian.statusLabel}
                    </DashboardStatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Add at least one guardian with an email address to prepare portal access.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">What families see first</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-lg font-semibold text-foreground">
                {summary.nextTask?.title || "All caught up"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {summary.nextTask?.content || summary.nextStepLabel}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Documents</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Families get one shared place for uploads, signed documents, and provider files.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Updates</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Provider messages stay lightweight and visible without turning into chat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
