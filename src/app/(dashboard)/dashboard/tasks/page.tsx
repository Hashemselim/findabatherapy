import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getTasks, getClientsList } from "@/lib/actions/clients";

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
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Manage tasks across all your clients
        </p>
      </div>

      <TasksList initialTasks={tasks} clients={clients} />
    </div>
  );
}
