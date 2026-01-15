import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getTasks } from "@/lib/actions/clients";

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

  const result = await getTasks();
  const tasks = result.success ? result.data?.tasks || [] : [];

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Manage tasks across all your clients
        </p>
      </div>

      <TasksList initialTasks={tasks} />
    </div>
  );
}
