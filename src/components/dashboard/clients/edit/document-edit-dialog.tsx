"use client";

import { useState, useCallback, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import {
  Loader2,
  AlertCircle,
  Upload,
  FileText,
  FileImage,
  File,
  X,
} from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_TYPE_OPTIONS,
  type ClientDocument,
} from "@/lib/validations/clients";
import {
  uploadClientDocument,
  updateClientDocument,
} from "@/lib/actions/clients";
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_MAX_SIZE,
  formatFileSize,
  getDocumentIconName,
} from "@/lib/storage/config";

// Shared form schema for both modes
const formSchema = z.object({
  label: z.string().min(1, "Document name is required"),
  document_type: z.string().optional(),
  file_description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  const iconType = getDocumentIconName(mimeType);
  switch (iconType) {
    case "pdf":
      return <FileText className="h-8 w-8 text-red-500" />;
    case "image":
      return <FileImage className="h-8 w-8 text-blue-500" />;
    case "doc":
      return <FileText className="h-8 w-8 text-blue-600" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  document?: ClientDocument & { id: string };
  onSuccess?: () => void;
}

export function DocumentEditDialog({
  open,
  onOpenChange,
  clientId,
  document,
  onSuccess,
}: DocumentEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const isEditing = !!document?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: document?.label || "",
      document_type: document?.document_type || undefined,
      file_description: document?.file_description || "",
      notes: document?.notes || "",
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFileError(null);
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > DOCUMENT_MAX_SIZE) {
        setFileError(
          `File too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(DOCUMENT_MAX_SIZE)}.`
        );
        return;
      }

      setSelectedFile(file);
      // Auto-fill label from filename if empty
      const currentLabel = form.getValues("label");
      if (!currentLabel) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        form.setValue("label", nameWithoutExt);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_DOCUMENT_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<string, string[]>
    ),
    maxFiles: 1,
    multiple: false,
    disabled: isPending,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  const onSubmit = (data: FormValues) => {
    if (!isEditing && !selectedFile) {
      setFileError("Please select a file to upload.");
      return;
    }

    startTransition(async () => {
      if (isEditing && document?.id) {
        // Edit mode — update metadata only
        const result = await updateClientDocument(document.id, {
          label: data.label,
          document_type: data.document_type as ClientDocument["document_type"],
          file_description: data.file_description,
          notes: data.notes,
        });
        if (result.success) {
          onSuccess?.();
          onOpenChange(false);
        } else {
          form.setError("root", { message: result.error });
        }
      } else {
        // Upload mode — send file + metadata
        const formData = new FormData();
        formData.append("file", selectedFile!);
        formData.append("label", data.label);
        if (data.document_type) formData.append("document_type", data.document_type);
        if (data.file_description) formData.append("file_description", data.file_description);
        if (data.notes) formData.append("notes", data.notes);

        const result = await uploadClientDocument(clientId, formData);
        if (result.success) {
          onSuccess?.();
          onOpenChange(false);
          form.reset();
          setSelectedFile(null);
        } else {
          form.setError("root", { message: result.error });
        }
      }
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFile(null);
      setFileError(null);
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Document" : "Upload Document"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the document details."
              : "Upload a file to this client's profile."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Dropzone — only shown for new uploads */}
          {!isEditing && (
            <div className="space-y-2">
              {!selectedFile ? (
                <div
                  {...getRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  } ${isPending ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Drop the file here..."
                      : "Drag & drop a file, or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOC, DOCX, JPEG, PNG, WebP — max{" "}
                    {formatFileSize(DOCUMENT_MAX_SIZE)}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <FileTypeIcon mimeType={selectedFile.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(selectedFile.size)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedFile.type.split("/").pop()?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={removeFile}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {fileError && (
                <p className="text-xs text-destructive">{fileError}</p>
              )}
            </div>
          )}

          {/* Show existing file info in edit mode */}
          {isEditing && document?.file_path && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <FileTypeIcon mimeType={document?.file_type || null} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {document?.file_name || document.label || "Uploaded file"}
                </p>
                {document?.file_size != null && (
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(document.file_size)}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="label">Document Name</Label>
            <Input
              id="label"
              {...form.register("label")}
              placeholder="e.g., Insurance Card Front"
            />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">
                {form.formState.errors.label.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type</Label>
            <Select
              value={form.watch("document_type") || ""}
              onValueChange={(value) =>
                form.setValue("document_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_description">Description</Label>
            <Textarea
              id="file_description"
              {...form.register("file_description")}
              placeholder="Brief description of this document..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Upload Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
