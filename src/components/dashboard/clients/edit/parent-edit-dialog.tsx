"use client";

import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  parentRelationshipSchema,
  PARENT_RELATIONSHIP_OPTIONS,
  type ClientParent,
} from "@/lib/validations/clients";
import { addClientParent, updateClientParent } from "@/lib/actions/clients";

// Explicitly define the form schema to avoid type inference issues with .default()
const formSchema = z.object({
  first_name: z.string().max(100).optional().or(z.literal("")),
  last_name: z.string().max(100).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  relationship: parentRelationshipSchema.optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  is_primary: z.boolean().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface ParentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  parent?: ClientParent & { id: string };
  onSuccess?: (parent: ClientParent & { id: string }) => void;
}

export function ParentEditDialog({
  open,
  onOpenChange,
  clientId,
  parent,
  onSuccess,
}: ParentEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!parent?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      date_of_birth: "",
      relationship: undefined,
      phone: "",
      email: "",
      notes: "",
      is_primary: false,
    },
  });

  // Reset form when dialog opens or parent changes
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: parent?.first_name || "",
        last_name: parent?.last_name || "",
        date_of_birth: parent?.date_of_birth || "",
        relationship: parent?.relationship,
        phone: parent?.phone || "",
        email: parent?.email || "",
        notes: parent?.notes || "",
        is_primary: parent?.is_primary || false,
      });
    }
  }, [open, parent, form]);

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (isEditing && parent.id) {
        const result = await updateClientParent(parent.id, data);
        if (result.success) {
          onSuccess?.({ ...data, id: parent.id } as ClientParent & { id: string });
          onOpenChange(false);
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      } else {
        const result = await addClientParent(clientId, data);
        if (result.success && result.data) {
          onSuccess?.({ ...data, id: result.data.id } as ClientParent & { id: string });
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
          <DialogTitle>{isEditing ? "Edit Parent/Guardian" : "Add Parent/Guardian"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the parent or guardian information."
              : "Add a new parent or guardian for this client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {form.formState.errors.root.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...form.register("first_name")}
                placeholder="First name"
              />
              {form.formState.errors.first_name && (
                <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...form.register("last_name")}
                placeholder="Last name"
              />
              {form.formState.errors.last_name && (
                <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select
              value={form.watch("relationship") || ""}
              onValueChange={(value) => form.setValue("relationship", value as FormValues["relationship"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {PARENT_RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                placeholder="(555) 555-5555"
              />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="email@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about this parent/guardian..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_primary" className="text-sm font-medium">
                Primary Contact
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark this as the primary parent/guardian for communications
              </p>
            </div>
            <Switch
              id="is_primary"
              checked={form.watch("is_primary")}
              onCheckedChange={(checked) => form.setValue("is_primary", checked)}
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
              {isEditing ? "Save Changes" : "Add Parent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
