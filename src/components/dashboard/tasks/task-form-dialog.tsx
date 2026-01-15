"use client";

import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { TASK_STATUS_OPTIONS } from "@/lib/validations/clients";
import { addClientTask, updateClientTask } from "@/lib/actions/clients";

export interface TaskFormData {
  id?: string;
  title: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  due_date: string;
  client_id?: string | null;
  client_name?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskFormData | null;
  clientId?: string | null;
  clientName?: string;
  clients?: ClientOption[];
  showClientSelector?: boolean;
  onSuccess?: (task: TaskFormData) => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  clientId,
  clientName,
  clients = [],
  showClientSelector = false,
  onSuccess,
}: TaskFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!task?.id;

  const [title, setTitle] = useState(task?.title || "");
  const [content, setContent] = useState(task?.content || "");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">(
    task?.status || "pending"
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? new Date(task.due_date) : undefined
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(
    task?.client_id || clientId || ""
  );

  // Sync form state when task prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(task?.title || "");
      setContent(task?.content || "");
      setStatus(task?.status || "pending");
      setDueDate(task?.due_date ? new Date(task.due_date) : undefined);
      setSelectedClientId(task?.client_id || clientId || "");
    }
  }, [task, clientId, open]);

  // Reset form when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    startTransition(async () => {
      const taskData = {
        title: title.trim(),
        content: content.trim(),
        status,
        due_date: dueDate ? dueDate.toISOString() : "",
      };

      let result;
      if (isEditing && task?.id) {
        result = await updateClientTask(task.id, taskData);
      } else {
        const effectiveClientId = showClientSelector
          ? selectedClientId || null
          : clientId || null;
        result = await addClientTask(effectiveClientId, taskData);
      }

      if (result.success) {
        const savedTask: TaskFormData = {
          id: isEditing ? task?.id : (result as { data?: { id: string } }).data?.id,
          ...taskData,
          client_id: showClientSelector ? selectedClientId || null : clientId,
          client_name: showClientSelector
            ? clients.find((c) => c.id === selectedClientId)?.name
            : clientName,
        };
        onSuccess?.(savedTask);
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {clientName && !showClientSelector
                ? `Task for ${clientName}`
                : showClientSelector
                  ? "Create a task and optionally assign it to a client"
                  : "Create a new task"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Client Selector */}
            {showClientSelector && (
              <div className="grid gap-2">
                <Label htmlFor="client">Client (optional)</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="No client selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="content">Description</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add details about this task..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                  {dueDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDueDate(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
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
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
