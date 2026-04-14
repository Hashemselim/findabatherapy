import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Suspense } from "react";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Mail,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardStatusBadge,
  getDashboardToneClasses,
  type DashboardTone,
} from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/platform/workspace/server";
import { getPipelineData } from "@/lib/actions/pipeline";
import { runTaskAutomation } from "@/lib/actions/task-automation";
import { getCurrentPlanFeatures, getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_PIPELINE_STATS } from "@/lib/demo/data";

const STAGES = [
  { key: "inquiry", label: "Inquiry", tone: "info" },
  { key: "intake_pending", label: "Intake Pending", tone: "premium" },
  { key: "waitlist", label: "Waitlist", tone: "warning" },
  { key: "assessment", label: "Assessment", tone: "info" },
  { key: "authorization", label: "Authorization", tone: "info" },
  { key: "active", label: "Active", tone: "success" },
  { key: "on_hold", label: "On Hold", tone: "warning" },
  { key: "discharged", label: "Discharged", tone: "default" },
] as const;

const ATTENTION_ICONS = {
  overdue_task: Clock,
  expiring_auth: Shield,
  stale_inquiry: Mail,
  stale_waitlist: Users,
} as const;

const ACTIVITY_ICONS = {
  new_client: UserPlus,
  status_change: ArrowRight,
  communication_sent: Mail,
  task_completed: CheckCircle2,
} as const;

const ACTIVITY_TONES = {
  new_client: "info",
  status_change: "premium",
  communication_sent: "success",
  task_completed: "success",
} as const;

export default async function PipelinePage() {
  let profile;
  try {
    profile = await getProfile();
  } catch {
    profile = null;
  }

  if (!profile?.onboarding_completed_at) {
    return (
      <div className="space-y-3">
        <DashboardTracker section="pipeline" />
        <DashboardPageHeader
          title="Client Pipeline"
          description="Complete your onboarding to start managing your client pipeline."
        />

        <DashboardEmptyState
          icon={ClipboardList}
          title="Complete Your Onboarding"
          description="Set up your practice profile to start tracking your client pipeline."
          benefits={["Track new inquiries", "Manage follow-up", "Monitor active clients"]}
          action={(
            <Button asChild size="lg">
              <Link href="/dashboard/onboarding" className="gap-2">
                Continue Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        />
      </div>
    );
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  return (
    <div className="space-y-3">
      <DashboardTracker section="pipeline" />

      {isPreview && (
        <PreviewBanner
          message="This is a preview of your client pipeline. Go Live to manage real clients."
          variant="inline"
          triggerFeature="pipeline"
        />
      )}

      {/* Header */}
      <DashboardPageHeader
        title="Client Pipeline"
        description={
          isPreview
            ? "Preview your client pipeline before going live."
            : "Your daily command center for managing clients."
        }
      >
        {isPreview ? (
          <LockedButton label="Add Client" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/clients/new" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        )}
        {isPreview ? (
          <LockedButton label="Add Task" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/tasks?new=1" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Add Task
            </Link>
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <Link href="/dashboard/clients" className="gap-2">
            <Users className="h-4 w-4" />
            View Clients
          </Link>
        </Button>
      </DashboardPageHeader>

      {isPreview ? (
        <PipelineBody
          isPreview
          counts={DEMO_PIPELINE_STATS.counts ?? {}}
          attentionItems={DEMO_PIPELINE_STATS.attentionItems ?? []}
          recentActivity={DEMO_PIPELINE_STATS.recentActivity ?? []}
        />
      ) : (
        <Suspense fallback={<PipelineContentFallback />}>
          <PipelineContent />
        </Suspense>
      )}
    </div>
  );
}

async function PipelineContent() {
  const [result, planFeatures] = await Promise.all([
    getPipelineData(),
    getCurrentPlanFeatures(),
  ]);

  if (planFeatures.hasTaskAutomation) {
    runTaskAutomation().catch((err) =>
      console.error("[PIPELINE] Task automation failed:", err)
    );
  }

  const pipeline = result.success ? result.data : null;
  const counts = pipeline?.counts ?? {};
  const attentionItems = pipeline?.attentionItems ?? [];
  const recentActivity = pipeline?.recentActivity ?? [];
  const totalClients = Object.values(counts).reduce((sum, n) => sum + n, 0);

  if (totalClients === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold">Welcome to Your Pipeline</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Start by adding your first client or sharing your intake form to
            begin receiving inquiries.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/clients" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Your First Client
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/intake-pages/intake-form" className="gap-2">
                <FileText className="h-4 w-4" />
                Share Intake Form
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PipelineBody
      isPreview={false}
      counts={counts}
      attentionItems={attentionItems}
      recentActivity={recentActivity}
    />
  );
}

function PipelineBody({
  isPreview,
  counts,
  attentionItems,
  recentActivity,
}: {
  isPreview: boolean;
  counts: Record<string, number>;
  attentionItems: Array<{
    type: string;
    clientId: string;
    clientName: string;
    description: string;
  }>;
  recentActivity: Array<{
    type: string;
    clientId: string;
    description: string;
    timestamp: string;
  }>;
}) {
  return (
    <>
      <PreviewOverlay isPreview={isPreview}>
        <DashboardCard className="p-5 sm:p-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
            {STAGES.map((stage) => {
              const count = counts[stage.key] || 0;
              const toneClasses = getDashboardToneClasses(stage.tone);
              return (
                <Link
                  key={stage.key}
                  href={`/dashboard/clients?status=${stage.key}`}
                  className="rounded-lg border border-border/60 bg-background/80 p-2 transition-colors hover:bg-muted/40 sm:p-3"
                >
                  <div className={`mb-2 h-1 w-8 rounded-full ${toneClasses.icon}`} />
                  <p className={`text-xl font-bold sm:text-2xl ${toneClasses.emphasis}`}>{count}</p>
                  <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground sm:text-xs">
                    {stage.label}
                  </p>
                </Link>
              );
            })}
          </div>
        </DashboardCard>
      </PreviewOverlay>

      {attentionItems.length > 0 && (
        <PreviewOverlay isPreview={isPreview} showLabel={false}>
          <DashboardCard tone="warning" className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-foreground" />
                Needs Attention
                <DashboardStatusBadge tone="warning" className="text-xs">
                  {attentionItems.length}
                </DashboardStatusBadge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {attentionItems.map((item, i) => {
                  const Icon =
                    ATTENTION_ICONS[
                      item.type as keyof typeof ATTENTION_ICONS
                    ] || AlertTriangle;
                  return (
                    <div
                      key={`${item.type}-${item.clientId}-${i}`}
                      className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <Link
                            href={`/dashboard/clients/${item.clientId}`}
                            className="font-medium hover:underline"
                          >
                            {item.clientName}
                          </Link>
                          <span className="ml-1.5 text-muted-foreground">
                            — {item.description}
                          </span>
                        </p>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                      >
                        <Link href={`/dashboard/clients/${item.clientId}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </DashboardCard>
        </PreviewOverlay>
      )}

      <PreviewOverlay isPreview={isPreview} showLabel={false}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>
              Latest events across your client pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recent activity yet. Activity will appear here as you manage
                clients.
              </p>
            ) : (
              <div className="space-y-0">
                {recentActivity.map((item, i) => {
                  const Icon =
                    ACTIVITY_ICONS[
                      item.type as keyof typeof ACTIVITY_ICONS
                    ] || CheckCircle2;
                  const tone =
                    ACTIVITY_TONES[
                      item.type as keyof typeof ACTIVITY_TONES
                    ] || "default";
                  const toneClasses = getDashboardToneClasses(tone as DashboardTone);
                  return (
                    <div
                      key={`${item.type}-${item.clientId}-${i}`}
                      className="flex items-start gap-3 border-b py-3 last:border-b-0"
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClasses.icon}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{item.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/clients/${item.clientId}`}
                        className="mt-1 shrink-0 text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PreviewOverlay>
    </>
  );
}

function PipelineContentFallback() {
  return (
    <div className="space-y-3">
      <DashboardCard className="p-5 sm:p-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border/60 bg-background/80 p-3">
              <Skeleton className="mb-2 h-1 w-8" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </DashboardCard>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b pb-3 last:border-b-0 last:pb-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
