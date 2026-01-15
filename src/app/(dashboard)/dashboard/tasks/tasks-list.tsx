"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { completeClientTask, deleteClientTask } from "@/lib/actions/clients";

interface TaskWithClient {
  id: string;
  client_id: string | null;
  title: string;
  content?: string | null;
  status: "pending" | "completed";
  due_date?: string | null;
  reminder_at?: string | null;
  created_at: string;
  completed_at: string | null;
  client_name?: string;
}

interface TasksListProps {
  initialTasks: TaskWithClient[];
}

export function TasksList({ initialTasks }: TasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithClient | null>(null);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return task.status === "pending";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleToggleComplete = (task: TaskWithClient) => {
    if (task.status === "completed") return;

    startTransition(async () => {
      const result = await completeClientTask(task.id);
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "completed" as const, completed_at: new Date().toISOString() }
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

  const getDueDateBadge = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;

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

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              {filter === "pending"
                ? "No pending tasks"
                : filter === "completed"
                  ? "No completed tasks"
                  : "No tasks yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    disabled={isPending || task.status === "completed"}
                    className={cn(
                      "mt-0.5 shrink-0 transition-colors",
                      task.status === "completed"
                        ? "text-green-500"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium",
                            task.status === "completed" && "text-muted-foreground line-through"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.content && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {task.content}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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

                    {/* Meta info */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {getDueDateBadge(task.due_date)}

                      {task.client_name && task.client_id && (
                        <Link href={`/dashboard/clients/${task.client_id}`}>
                          <Badge variant="secondary" className="gap-1 hover:bg-secondary/80">
                            <User className="h-3 w-3" />
                            {task.client_name}
                          </Badge>
                        </Link>
                      )}

                      {task.status === "completed" && task.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{taskToDelete?.title}&rdquo;? This action cannot be undone.
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
