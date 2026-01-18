"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clientTaskSchema,
  type ClientTask,
} from "@/lib/validations/clients";
import { addClientTask, updateClientTask } from "@/lib/actions/clients";

const formSchema = clientTaskSchema.omit({ id: true, client_id: true, status: true });
type FormValues = z.infer<typeof formSchema>;

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  task?: ClientTask & { id: string };
  onSuccess?: (task: ClientTask & { id: string }) => void;
}

export function TaskEditDialog({
  open,
  onOpenChange,
  clientId,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!task?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || "",
      content: task?.content || "",
      due_date: task?.due_date || "",
      reminder_at: task?.reminder_at || "",
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (isEditing && task.id) {
        const result = await updateClientTask(task.id, data);
        if (result.success) {
          onSuccess?.({ ...data, id: task.id, status: task.status } as ClientTask & { id: string });
          onOpenChange(false);
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      } else {
        const result = await addClientTask(clientId, { ...data, status: "pending" });
        if (result.success && result.data) {
          onSuccess?.({ ...data, id: result.data.id, status: "pending" } as ClientTask & { id: string });
          onOpenChange(false);
          form.reset();
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details."
              : "Add a new task for this client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {form.formState.errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Task title"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Description</Label>
            <Textarea
              id="content"
              {...form.register("content")}
              placeholder="Task description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              {...form.register("due_date")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
