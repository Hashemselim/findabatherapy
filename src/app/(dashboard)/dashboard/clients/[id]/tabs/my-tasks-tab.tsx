"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckSquare, Clock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateClientTask, deleteClientTask } from "@/lib/actions/clients";
import type { ClientDetail } from "@/lib/actions/clients";
import { TASK_STATUS_OPTIONS, type ClientTask } from "@/lib/validations/clients";
import { TaskFormDialog } from "@/components/dashboard/tasks";
import { CopyButton } from "../client-detail-helpers";

type TaskStatus = "pending" | "in_progress" | "completed";

interface MyTasksTabProps {
  client: ClientDetail;
}

export function MyTasksTab({ client }: MyTasksTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
        <div className="space-y-2">
          {/* Active Tasks */}
          {activeTasks.map((task) => {
            const statusOption = TASK_STATUS_OPTIONS.find((o) => o.value === task.status);
            return (
              <div key={task.id} className="group flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-disabled={isPending || undefined}
                      className={cn(
                        "mt-0.5 shrink-0 cursor-pointer transition-colors hover:opacity-80",
                        isPending && "pointer-events-none opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={task.status === "completed"}
                        tabIndex={-1}
                        className={cn(
                          "pointer-events-none",
                          task.status === "in_progress" && "border-primary data-[state=checked]:bg-primary"
                        )}
                      />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <p className="text-sm font-medium wrap-break-word">{task.title}</p>
                    <div className="flex items-center gap-1">
                      <DashboardStatusBadge
                        tone={task.status === "in_progress" ? "info" : "default"}
                        className="shrink-0 text-xs"
                      >
                        {statusOption?.label}
                      </DashboardStatusBadge>
                      <CopyButton value={task.title} label="task" />
                    </div>
                  </div>
                  {task.content && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{task.content}</p>
                  )}
                  {task.due_date && (
                    <div className="mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Due {format(new Date(task.due_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs text-muted-foreground">Done ({completedTasks.length})</p>
              {completedTasks.map((task) => (
                <div key={task.id} className="group flex items-start gap-3 rounded-lg border bg-muted/20 p-3 opacity-60">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div role="button" tabIndex={0} className={cn("mt-0.5 shrink-0 cursor-pointer", isPending && "pointer-events-none opacity-50")}>
                        <Checkbox checked tabIndex={-1} className="pointer-events-none border-primary data-[state=checked]:bg-primary" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-through">{task.title}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
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
