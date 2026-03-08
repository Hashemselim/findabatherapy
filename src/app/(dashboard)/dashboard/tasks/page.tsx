import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { getTasks, getClientsList } from "@/lib/actions/clients";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { DEMO_TASKS } from "@/lib/demo/data";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { LockedButton, PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";

import { TasksList } from "./tasks-list";

export const metadata = {
  title: "Tasks | Dashboard",
  description: "Manage your client tasks",
};

export default async function TasksPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  let tasks: Array<{
    id: string;
    client_id: string | null;
    title: string;
    content?: string | null;
    status: "pending" | "in_progress" | "completed";
    due_date?: string | null;
    reminder_at?: string | null;
    created_at: string;
    completed_at: string | null;
    client_name?: string;
  }> = [];
  let clients: { id: string; name: string }[] = [];

  if (isPreview) {
    tasks = DEMO_TASKS;
  } else {
    const [tasksResult, clientsResult] = await Promise.all([
      getTasks(),
      getClientsList(),
    ]);
    tasks = tasksResult.success ? tasksResult.data?.tasks || [] : [];
    clients = clientsResult.success ? clientsResult.data || [] : [];
  }

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
        <DashboardCard className="p-5 sm:p-6">
          <TasksList initialTasks={tasks} clients={clients} />
        </DashboardCard>
      </PreviewOverlay>
    </div>
  );
}
