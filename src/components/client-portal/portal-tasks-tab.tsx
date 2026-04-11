"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deletePortalTask,
  savePortalTask,
  type ClientPortalData,
  type PortalTaskData,
} from "@/lib/actions/client-portal";
import { DashboardCard, DashboardEmptyState, DashboardStatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, statusTone, taskTypeLabel } from "./portal-utils";
import { PortalTaskDialog } from "./dialogs/portal-task-dialog";

export function PortalTasksTab({ data }: { data: ClientPortalData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PortalTaskData | undefined>();

  const handleComplete = (task: PortalTaskData) => {
    startTransition(async () => {
      try {
        await savePortalTask({
          recordId: task.id,
          clientId: data.client.id,
          title: task.title,
          instructions: task.instructions,
          dueDate: task.dueDate,
          taskType: task.taskType,
          status: "completed",
          formKey: task.formKey,
          externalUrl: task.externalUrl,
          linkedDocumentId: task.linkedDocumentId,
          requiredDocumentType: task.requiredDocumentType,
        });
        toast.success("Task marked as complete");
        router.refresh();
      } catch {
        toast.error("Failed to complete task");
      }
    });
  };

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      try {
        await deletePortalTask(data.client.id, taskId);
        toast.success("Task deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete task");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
          {data.tasks.length > 0 && (
            <DashboardStatusBadge tone="default">{data.tasks.length}</DashboardStatusBadge>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditingTask(undefined); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create task
        </Button>
      </div>

      {data.tasks.length === 0 ? (
        <DashboardEmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create a task to assign work to this client's family."
          action={
            <Button size="sm" onClick={() => { setEditingTask(undefined); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create task
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.tasks.map((task) => (
            <DashboardCard key={task.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <DashboardStatusBadge tone={statusTone(task.status)}>
                      {task.status}
                    </DashboardStatusBadge>
                    <DashboardStatusBadge tone="default">
                      {taskTypeLabel(task.taskType)}
                    </DashboardStatusBadge>
                  </div>
                  {task.instructions && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {task.instructions}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Due {formatDate(task.dueDate)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingTask(task); setDialogOpen(true); }}
                  >
                    Edit
                  </Button>
                  {task.status !== "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleComplete(task)}
                    >
                      Complete
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete task</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{task.title}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(task.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <PortalTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={data.client.id}
        task={editingTask}
        documents={data.documents}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
