"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { PortalDocumentData, PortalTaskData } from "@/lib/actions/client-portal";
import { savePortalTask, uploadProviderPortalDocument } from "@/lib/actions/client-portal";
import {
  FILE_TYPE_OPTIONS,
  FORM_OPTIONS,
  TASK_TYPE_OPTIONS,
} from "../portal-constants";

interface PortalTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  task?: PortalTaskData;
  documents: PortalDocumentData[];
  onSuccess?: () => void;
}

export function PortalTaskDialog({
  open,
  onOpenChange,
  clientId,
  task,
  documents,
  onSuccess,
}: PortalTaskDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!task;

  const [taskType, setTaskType] = useState("custom_task");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formKey, setFormKey] = useState("");
  const [fileType, setFileType] = useState("");
  const [linkedDocumentId, setLinkedDocumentId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [supportingFileLabel, setSupportingFileLabel] = useState("");

  useEffect(() => {
    if (open) {
      setTaskType(task?.taskType ?? "custom_task");
      setTitle(task?.title ?? "");
      setInstructions(task?.instructions ?? "");
      setDueDate(task?.dueDate ?? "");
      setFormKey(task?.formKey ?? "");
      setFileType(task?.requiredDocumentType ?? "");
      setLinkedDocumentId(task?.linkedDocumentId ?? "");
      setExternalUrl(task?.externalUrl ?? "");
      setSupportingFile(null);
      setSupportingFileLabel("");
    }
  }, [open, task]);

  const isValid = title.trim().length > 0;

  const signableDocuments = documents.filter((d) => d.category !== "portal_family");

  function handleSubmit() {
    startTransition(async () => {
      let uploadedDocId: string | null = null;

      if (supportingFile) {
        const formData = new FormData();
        formData.set("file", supportingFile);
        formData.set("label", supportingFileLabel || supportingFile.name);
        formData.set("document_type", "administrative");
        formData.set("portal_visibility", "visible");
        formData.set("portal_ack_required", "false");

        const uploadResult = await uploadProviderPortalDocument(clientId, formData);
        if (!uploadResult.success) {
          toast.error(uploadResult.error);
          return;
        }
        uploadedDocId = uploadResult.data?.id ?? null;
      }

      const result = await savePortalTask({
        recordId: task?.id,
        clientId,
        title: title.trim(),
        instructions: instructions.trim() || null,
        dueDate: dueDate || null,
        taskType,
        formKey: taskType === "form_completion" ? formKey || null : null,
        externalUrl: externalUrl.trim() || null,
        linkedDocumentId:
          taskType === "review_and_sign"
            ? linkedDocumentId || null
            : uploadedDocId ?? task?.linkedDocumentId ?? null,
        requiredDocumentType: taskType === "file_upload" ? fileType || null : null,
      });

      if (result.success) {
        toast.success(isEditing ? "Task updated" : "Task created");
        router.refresh();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit task" : "Create task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Task type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-instructions">Instructions</Label>
            <Textarea
              id="task-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions for the family"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {taskType === "form_completion" && (
            <div className="space-y-2">
              <Label>Form</Label>
              <Select value={formKey} onValueChange={setFormKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "file_upload" && (
            <div className="space-y-2">
              <Label>Required file type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "review_and_sign" && (
            <div className="space-y-2">
              <Label>Document to review</Label>
              <Select value={linkedDocumentId} onValueChange={setLinkedDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {signableDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.label || doc.filename || doc.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-external-url">External URL</Label>
            <Input
              id="task-external-url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="Optional link"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-file">Supporting file</Label>
            <Input
              id="task-file"
              type="file"
              onChange={(e) => setSupportingFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-file-label">Supporting file label</Label>
            <Input
              id="task-file-label"
              value={supportingFileLabel}
              onChange={(e) => setSupportingFileLabel(e.target.value)}
              placeholder="Label for the attached file"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button disabled={isPending || !isValid} onClick={handleSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
