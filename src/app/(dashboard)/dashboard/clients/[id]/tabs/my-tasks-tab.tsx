"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateClientTask, deleteClientTask } from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";
import { TASK_STATUS_OPTIONS, type ClientTask } from "@/lib/validations/clients";
import { TaskFormDialog } from "@/components/dashboard/tasks";

type TaskStatus = "pending" | "in_progress" | "completed";

interface MyTasksTabProps {
  client: ClientDetail;
}

export function MyTasksTab({ client }: MyTasksTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<(ClientTask & { id: string }) | null>(null);

  const childName = [client.child_first_name, client.child_last_name].filter(Boolean).join(" ") || "Client";
  const activeTasks = client.tasks?.filter((t) => t.status !== "completed") || [];
  const completedTasks = client.tasks?.filter((t) => t.status === "completed") || [];
  const allTasks = client.tasks || [];

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    startTransition(async () => {
      await updateClientTask(taskId, { status: newStatus });
      router.refresh();
    });
  };

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      await deleteClientTask(taskId);
      toast.success("Task deleted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
          {activeTasks.length > 0 && (
            <DashboardStatusBadge tone="default">{activeTasks.length} active</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add task
        </Button>
      </div>

      {allTasks.length === 0 ? (
        <DashboardEmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Add internal tasks to track your work for this client."
          action={
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add task
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Active Tasks */}
          {activeTasks.map((task) => {
            const statusOption = TASK_STATUS_OPTIONS.find((o) => o.value === task.status);
            return (
              <DashboardCard key={task.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <DashboardStatusBadge
                        tone={task.status === "in_progress" ? "info" : "default"}
                      >
                        {statusOption?.label}
                      </DashboardStatusBadge>
                    </div>
                    {task.content && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{task.content}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(task.due_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}
                    >
                      Edit
                    </Button>
                    {task.status !== "completed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {TASK_STATUS_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleTaskStatusChange(task.id, option.value as TaskStatus)}
                              className={cn(task.status === option.value && "bg-muted")}
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DashboardCard>
            );
          })}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-3 text-xs text-muted-foreground">Done ({completedTasks.length})</p>
              <div className="space-y-3">
              {completedTasks.map((task) => (
                <DashboardCard key={task.id} className="p-4 opacity-60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground line-through">{task.title}</p>
                        <DashboardStatusBadge tone="success">completed</DashboardStatusBadge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </DashboardCard>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={
          editingTask
            ? {
                id: editingTask.id,
                title: editingTask.title,
                content: editingTask.content || "",
                status: editingTask.status as TaskStatus,
                due_date: editingTask.due_date || "",
                client_id: client.id,
                client_name: childName,
              }
            : null
        }
        clientId={client.id}
        clientName={childName}
        onSuccess={() => {
          setEditingTask(null);
          router.refresh();
        }}
      />
    </div>
  );
}
