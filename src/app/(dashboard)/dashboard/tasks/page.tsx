import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { getTasks, getClientsList } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_TASKS } from "@/lib/demo/data";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { Skeleton } from "@/components/ui/skeleton";

import { TasksList } from "./tasks-list";

export const metadata = {
  title: "Tasks | Dashboard",
  description: "Manage your client tasks",
};

export default async function TasksPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  return (
    <div className="space-y-3">
      {isPreview && (
        <PreviewBanner
          message="This is a preview of task management with example tasks. Go Live to track real tasks and deadlines."
          variant="inline"
          triggerFeature="tasks"
        />
      )}
      <DashboardPageHeader title="Tasks" description="Manage tasks across all your clients">
        {isPreview ? (
          <LockedButton label="Add Task" />
        ) : (
          <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/tasks?new=1">
              <Plus className="h-4 w-4" />
              Add Task
            </Link>
          </Button>
        )}
      </DashboardPageHeader>

      <PreviewOverlay isPreview={isPreview}>
        {isPreview ? (
          <DashboardCard className="p-5 sm:p-6">
            <TasksList initialTasks={DEMO_TASKS} clients={[]} />
          </DashboardCard>
        ) : (
          <Suspense fallback={<TasksContentFallback />}>
            <TasksContent />
          </Suspense>
        )}
      </PreviewOverlay>
    </div>
  );
}

async function TasksContent() {
  const [tasksResult, clientsResult] = await Promise.all([
    getTasks(),
    getClientsList(),
  ]);

  const tasks = tasksResult.success ? tasksResult.data?.tasks || [] : [];
  const clients = clientsResult.success ? clientsResult.data || [] : [];

  return (
    <DashboardCard className="p-5 sm:p-6">
      <TasksList initialTasks={tasks} clients={clients} />
    </DashboardCard>
  );
}

function TasksContentFallback() {
  return (
    <DashboardCard className="p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
