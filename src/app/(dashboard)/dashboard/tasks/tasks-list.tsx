"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Calendar,
  User,
  MoreHorizontal,
  Trash2,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { TASK_STATUS_OPTIONS } from "@/lib/validations/clients";
import { updateClientTask, deleteClientTask } from "@/lib/actions/clients";
import { TaskFormDialog, type TaskFormData } from "@/components/dashboard/tasks";

type TaskStatus = "pending" | "in_progress" | "completed";

interface TaskWithClient {
  id: string;
  client_id: string | null;
  title: string;
  content?: string | null;
  status: TaskStatus;
  due_date?: string | null;
  reminder_at?: string | null;
  created_at: string;
  completed_at: string | null;
  client_name?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface TasksListProps {
  initialTasks: TaskWithClient[];
  clients?: ClientOption[];
}

export function TasksList({ initialTasks, clients = [] }: TasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithClient | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithClient | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const activeCount = tasks.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleStatusChange = (task: TaskWithClient, newStatus: TaskStatus) => {
    startTransition(async () => {
      const result = await updateClientTask(task.id, { status: newStatus });
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: newStatus,
                  completed_at:
                    newStatus === "completed" ? new Date().toISOString() : null,
                }
              : t
          )
        );
      }
    });
  };

  const handleDelete = (task: TaskWithClient) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;

    startTransition(async () => {
      const result = await deleteClientTask(taskToDelete.id);
      if (result.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      }
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    });
  };

  const handleEdit = (task: TaskWithClient) => {
    setEditingTask(task);
    setFormDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTask(null);
    setFormDialogOpen(true);
  };

  const handleFormSuccess = (savedTask: TaskFormData) => {
    if (editingTask) {
      // Update existing task
      setTasks((prev) =>
        prev.map((t) =>
          t.id === savedTask.id
            ? {
                ...t,
                title: savedTask.title,
                content: savedTask.content,
                status: savedTask.status,
                due_date: savedTask.due_date || null,
                completed_at:
                  savedTask.status === "completed" && t.status !== "completed"
                    ? new Date().toISOString()
                    : t.completed_at,
              }
            : t
        )
      );
    } else {
      // Add new task
      setTasks((prev) => [
        {
          id: savedTask.id!,
          client_id: savedTask.client_id || null,
          title: savedTask.title,
          content: savedTask.content,
          status: savedTask.status,
          due_date: savedTask.due_date || null,
          reminder_at: null,
          created_at: new Date().toISOString(),
          completed_at: null,
          client_name: savedTask.client_name,
        },
        ...prev,
      ]);
    }
  };

  const getDueDateBadge = (dueDate: string | null | undefined, status: TaskStatus) => {
    if (!dueDate) return null;
    if (status === "completed") return null;

    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);

    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1",
          isOverdue && "border-red-500 text-red-600",
          isToday(date) && "border-yellow-500 text-yellow-600"
        )}
      >
        <Calendar className="h-3 w-3" />
        {isToday(date)
          ? "Today"
          : isOverdue
            ? `Overdue (${formatDistanceToNow(date, { addSuffix: true })})`
            : format(date, "MMM d")}
      </Badge>
    );
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <CircleDot className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const option = TASK_STATUS_OPTIONS.find((o) => o.value === status);
    if (!option) return null;

    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-xs",
          status === "pending" && "bg-gray-100 text-gray-700",
          status === "in_progress" && "bg-blue-100 text-blue-700",
          status === "completed" && "bg-green-100 text-green-700"
        )}
      >
        {option.label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Add Button and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters - horizontally scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="all" className="flex-1 sm:flex-none px-4">All ({tasks.length})</TabsTrigger>
              <TabsTrigger value="active" className="flex-1 sm:flex-none px-4">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 sm:flex-none px-4">Done ({completedCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              {filter === "active"
                ? "No active tasks"
                : filter === "completed"
                  ? "No completed tasks"
                  : "No tasks yet"}
            </p>
            <Button onClick={handleAddNew} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" />
              Create your first task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="border-border/60">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  {/* Status Icon - Clickable */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={isPending}
                        className="mt-0.5 shrink-0 transition-colors hover:opacity-80 touch-manipulation"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {TASK_STATUS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() =>
                            handleStatusChange(task, option.value as TaskStatus)
                          }
                          className={cn(
                            task.status === option.value && "bg-muted"
                          )}
                        >
                          {option.value === "pending" && (
                            <Circle className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          {option.value === "in_progress" && (
                            <CircleDot className="mr-2 h-4 w-4 text-blue-500" />
                          )}
                          {option.value === "completed" && (
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          )}
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium break-words",
                            task.status === "completed" &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.content && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 break-words">
                            {task.content}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                          >
                            <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(task)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta info - stack on mobile, inline on desktop */}
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      {getStatusBadge(task.status)}
                      {getDueDateBadge(task.due_date, task.status)}

                      {task.client_name && task.client_id && (
                        <Link href={`/dashboard/clients/${task.client_id}`}>
                          <Badge
                            variant="secondary"
                            className="gap-1 hover:bg-secondary/80 w-fit"
                          >
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{task.client_name}</span>
                          </Badge>
                        </Link>
                      )}

                      {task.status === "completed" && task.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          Completed{" "}
                          {formatDistanceToNow(new Date(task.completed_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        task={
          editingTask
            ? {
                id: editingTask.id,
                title: editingTask.title,
                content: editingTask.content || "",
                status: editingTask.status,
                due_date: editingTask.due_date || "",
                client_id: editingTask.client_id,
                client_name: editingTask.client_name,
              }
            : null
        }
        clients={clients}
        showClientSelector={!editingTask}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{taskToDelete?.title}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
