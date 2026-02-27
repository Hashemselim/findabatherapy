import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getTasks, getClientsList } from "@/lib/actions/clients";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

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

  const [tasksResult, clientsResult] = await Promise.all([
    getTasks(),
    getClientsList(),
  ]);

  const tasks = tasksResult.success ? tasksResult.data?.tasks || [] : [];
  const clients = clientsResult.success ? clientsResult.data || [] : [];

  return (
    <div className="space-y-3">
      <DashboardPageHeader title="Tasks" description="Manage tasks across all your clients" />

      <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-sm dark:bg-zinc-950 sm:p-6">
        <TasksList initialTasks={tasks} clients={clients} />
      </div>
    </div>
  );
}
