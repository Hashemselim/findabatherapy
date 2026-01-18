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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientDocumentSchema,
  DOCUMENT_TYPE_OPTIONS,
  type ClientDocument,
} from "@/lib/validations/clients";
import { addClientDocument, updateClientDocument } from "@/lib/actions/clients";

const formSchema = clientDocumentSchema.omit({ id: true, sort_order: true, file_path: true });
type FormValues = z.infer<typeof formSchema>;

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  document?: ClientDocument & { id: string };
  onSuccess?: (document: ClientDocument & { id: string }) => void;
}

export function DocumentEditDialog({
  open,
  onOpenChange,
  clientId,
  document,
  onSuccess,
}: DocumentEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!document?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      document_type: document?.document_type,
      label: document?.label || "",
      url: document?.url || "",
      notes: document?.notes || "",
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (isEditing && document.id) {
        const result = await updateClientDocument(document.id, data);
        if (result.success) {
          onSuccess?.({ ...data, id: document.id } as ClientDocument & { id: string });
          onOpenChange(false);
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      } else {
        const result = await addClientDocument(clientId, data);
        if (result.success && result.data) {
          onSuccess?.({ ...data, id: result.data.id } as ClientDocument & { id: string });
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
          <DialogTitle>{isEditing ? "Edit Document" : "Add Document"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the document details."
              : "Add a new document link for this client."}
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
            <Label htmlFor="label">Document Name</Label>
            <Input
              id="label"
              {...form.register("label")}
              placeholder="e.g., Insurance Card Front"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type</Label>
            <Select
              value={form.watch("document_type") || ""}
              onValueChange={(value) => form.setValue("document_type", value as FormValues["document_type"])}
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
            <Label htmlFor="url">Document URL</Label>
            <Input
              id="url"
              type="url"
              {...form.register("url")}
              placeholder="https://..."
            />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Link to the document (Google Drive, Dropbox, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about this document..."
              rows={3}
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
              {isEditing ? "Save Changes" : "Add Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
