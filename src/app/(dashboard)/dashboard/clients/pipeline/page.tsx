import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { DashboardTracker } from "@/components/analytics/dashboard-tracker";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getProfile } from "@/lib/supabase/server";
import { getPipelineData } from "@/lib/actions/pipeline";
import { runTaskAutomation } from "@/lib/actions/task-automation";
import { getCurrentPlanFeatures } from "@/lib/plans/guards";

// Stage configuration matching client-status-badge.tsx colors
const STAGES = [
  { key: "inquiry", label: "Inquiry", color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200" },
  { key: "intake_pending", label: "Intake Pending", color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700", borderColor: "border-purple-200" },
  { key: "waitlist", label: "Waitlist", color: "bg-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-200" },
  { key: "assessment", label: "Assessment", color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700", borderColor: "border-orange-200" },
  { key: "authorization", label: "Authorization", color: "bg-cyan-500", bgColor: "bg-cyan-50", textColor: "text-cyan-700", borderColor: "border-cyan-200" },
  { key: "active", label: "Active", color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700", borderColor: "border-green-200" },
  { key: "on_hold", label: "On Hold", color: "bg-yellow-500", bgColor: "bg-yellow-50", textColor: "text-yellow-700", borderColor: "border-yellow-200" },
  { key: "discharged", label: "Discharged", color: "bg-gray-400", bgColor: "bg-gray-50", textColor: "text-gray-600", borderColor: "border-gray-200" },
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

const ACTIVITY_COLORS = {
  new_client: "text-blue-500 bg-blue-50",
  status_change: "text-purple-500 bg-purple-50",
  communication_sent: "text-emerald-500 bg-emerald-50",
  task_completed: "text-green-500 bg-green-50",
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

        <Card className="overflow-hidden border-slate-200">
          <BubbleBackground
            interactive={false}
            size="default"
            className="bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5788FF] shadow-lg shadow-[#5788FF]/25">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <p className="text-xl font-semibold text-slate-900">
                Complete Your Onboarding
              </p>
              <p className="mt-3 max-w-md text-sm text-slate-600">
                Set up your practice profile to start tracking your client
                pipeline.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/dashboard/onboarding" className="gap-2">
                  Continue Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </BubbleBackground>
        </Card>
      </div>
    );
  }

  // Fetch pipeline data and plan features in parallel
  const [result, planFeatures] = await Promise.all([
    getPipelineData(),
    getCurrentPlanFeatures(),
  ]);
  const pipeline = result.success ? result.data : null;

  // Run task automation in background for Pro/Enterprise users (non-blocking)
  if (planFeatures.hasTaskAutomation) {
    runTaskAutomation().catch((err) =>
      console.error("[PIPELINE] Task automation failed:", err)
    );
  }
  const counts = pipeline?.counts ?? {};
  const attentionItems = pipeline?.attentionItems ?? [];
  const recentActivity = pipeline?.recentActivity ?? [];

  const totalClients = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const totalActive = totalClients - (counts.discharged || 0);

  // Empty state for agencies with no clients
  if (totalClients === 0) {
    return (
      <div className="space-y-3">
        <DashboardTracker section="pipeline" />
        <DashboardPageHeader
          title="Client Pipeline"
          description="Your daily command center for managing clients."
        />

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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DashboardTracker section="pipeline" />

      {/* Header */}
      <DashboardPageHeader
        title="Client Pipeline"
        description={`${totalActive} active client${totalActive !== 1 ? "s" : ""} across your pipeline`}
      >
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
        >
          <Link href="/dashboard/clients" className="gap-2">
            <Users className="h-4 w-4" />
            All Clients
          </Link>
        </Button>
      </DashboardPageHeader>

      {/* Stage Cards — Horizontal Row */}
      <div className="rounded-2xl border border-border/50 bg-white shadow-sm dark:bg-zinc-950 p-5 sm:p-6">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-7">
          {STAGES.map((stage) => {
            const count = counts[stage.key] || 0;
            return (
              <Link
                key={stage.key}
                href={`/dashboard/clients?status=${stage.key}`}
                className={`flex-shrink-0 w-[120px] sm:w-auto rounded-lg border ${stage.borderColor} p-3 hover:shadow-sm transition-shadow cursor-pointer`}
              >
                <div className={`h-1 w-8 rounded-full ${stage.color} mb-2`} />
                <p className={`text-2xl font-bold ${stage.textColor}`}>
                  {count}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                  {stage.label}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Attention Items */}
      {attentionItems.length > 0 && (
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 text-xs"
              >
                {attentionItems.length}
              </Badge>
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
                    className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
                  >
                    <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link
                          href={`/dashboard/clients/${item.clientId}`}
                          className="font-medium hover:underline"
                        >
                          {item.clientName}
                        </Link>
                        <span className="text-muted-foreground ml-1.5">
                          — {item.description}
                        </span>
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
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
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>
            Latest events across your client pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
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
                const colorClass =
                  ACTIVITY_COLORS[
                    item.type as keyof typeof ACTIVITY_COLORS
                  ] || "text-gray-500 bg-gray-50";
                return (
                  <div
                    key={`${item.type}-${item.clientId}-${i}`}
                    className="flex items-start gap-3 py-3 border-b last:border-b-0"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${colorClass} shrink-0 mt-0.5`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/clients/${item.clientId}`}
                      className="text-xs text-primary hover:underline shrink-0 mt-1"
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
    </div>
  );
}
