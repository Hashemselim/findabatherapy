"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  File,
  FileImage,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { submitPublicClientDocumentUpload, type ClientDocumentUploadAccessData } from "@/lib/actions/clients";
import {
  DOCUMENT_TYPE_OPTIONS,
  type ClientDocument,
} from "@/lib/validations/clients";
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_MAX_SIZE,
  formatFileSize,
  getDocumentIconName,
} from "@/lib/storage/config";

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
      return <FileImage className="h-8 w-8 text-sky-600" />;
    case "doc":
      return <FileText className="h-8 w-8 text-blue-600" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
}

interface PublicDocumentUploadFormProps {
  token: string;
  clientName: string;
  providerName: string;
  brandColor: string;
  existingDocuments: ClientDocumentUploadAccessData["uploadedDocuments"];
}

const RECOMMENDED_DOCUMENTS: Array<{
  label: string;
  value: ClientDocument["document_type"];
}> = [
  { label: "Diagnosis Report", value: "diagnosis_report" },
  { label: "Referral", value: "referral" },
  { label: "Medical Records", value: "medical_records" },
  { label: "Insurance Card", value: "insurance_card" },
  { label: "Authorization", value: "authorization" },
];

export function PublicDocumentUploadForm({
  token,
  clientName,
  providerName,
  brandColor,
  existingDocuments,
}: PublicDocumentUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      document_type: undefined,
      file_description: "",
      notes: "",
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFileError(null);
      setSuccessMessage(null);

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > DOCUMENT_MAX_SIZE) {
        setFileError(
          `File too large (${formatFileSize(file.size)}). Maximum is ${formatFileSize(DOCUMENT_MAX_SIZE)}.`
        );
        return;
      }

      setSelectedFile(file);

      if (!form.getValues("label")) {
        form.setValue("label", file.name.replace(/\.[^/.]+$/, ""), {
          shouldValidate: true,
        });
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
    if (!selectedFile) {
      setFileError("Please select a file to upload.");
      return;
    }

    setSuccessMessage(null);

    startTransition(async () => {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("label", data.label);
      if (data.document_type) uploadFormData.append("document_type", data.document_type);
      if (data.file_description) uploadFormData.append("file_description", data.file_description);
      if (data.notes) uploadFormData.append("notes", data.notes);

      const result = await submitPublicClientDocumentUpload(token, uploadFormData);
      if (!result.success) {
        form.setError("root", { message: result.error });
        return;
      }

      setSuccessMessage(`Uploaded ${data.label} for ${clientName}.`);
      setSelectedFile(null);
      setFileError(null);
      form.reset({
        label: "",
        document_type: undefined,
        file_description: "",
        notes: "",
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{
          borderColor: `${brandColor}30`,
          backgroundColor: `${brandColor}08`,
        }}
      >
        <p className="text-sm font-medium text-foreground">
          Recommended documents for ABA intake
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the records your family already has. {providerName} can request anything else later.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {RECOMMENDED_DOCUMENTS.map((document) => (
            <Badge key={document.value} variant="secondary" className="rounded-full px-3 py-1">
              {document.label}
            </Badge>
          ))}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {form.formState.errors.root.message}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            } ${isPending ? "pointer-events-none opacity-60" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop the file here..." : "Drag and drop a file, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, DOCX, JPEG, PNG, WebP up to {formatFileSize(DOCUMENT_MAX_SIZE)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-4">
            <FileTypeIcon mimeType={selectedFile.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedFile.name}</p>
              <div className="mt-1 flex items-center gap-2">
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

        {fileError && <p className="text-xs text-destructive">{fileError}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="label">Document Name</Label>
            <Input
              id="label"
              {...form.register("label")}
              placeholder="e.g., Autism diagnosis report"
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
              onValueChange={(value) => form.setValue("document_type", value)}
            >
              <SelectTrigger id="document_type">
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
            <Input
              id="file_description"
              {...form.register("file_description")}
              placeholder="Optional context for your provider"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Anything your provider should know about this document"
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Upload one document at a time. You can come back to this secure page to add more.
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Document
          </Button>
        </div>
      </form>

      {existingDocuments.length > 0 && (
        <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Already uploaded</h3>
              <p className="text-sm text-muted-foreground">
                {existingDocuments.length} document{existingDocuments.length === 1 ? "" : "s"} on file.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {existingDocuments.map((document) => {
              const documentTypeLabel = DOCUMENT_TYPE_OPTIONS.find(
                (option) => option.value === document.documentType
              )?.label;

              return (
                <div key={document.id} className="rounded-xl border bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {document.label || document.fileName || "Document"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {documentTypeLabel && <span>{documentTypeLabel}</span>}
                        {document.fileSize != null && <span>{formatFileSize(document.fileSize)}</span>}
                        <span>
                          Uploaded{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(document.createdAt))}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
