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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Client } from "@/lib/validations/clients";
import { DIAGNOSIS_OPTIONS } from "@/lib/validations/onboarding";
import { updateClient } from "@/lib/actions/clients";

// Schema for clinical/medical information
const formSchema = z.object({
  child_diagnosis: z.array(z.string()).optional(),
  child_diagnosis_codes: z.array(z.string()).optional(),
  child_primary_concerns: z.string().max(2000).optional().or(z.literal("")),
  child_aba_history: z.string().max(2000).optional().or(z.literal("")),
  child_other_therapies: z.string().max(500).optional().or(z.literal("")),
  child_pediatrician_name: z.string().max(200).optional().or(z.literal("")),
  child_pediatrician_phone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

interface ClinicalInfoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  client: Client;
  onSuccess?: (client: Partial<Client>) => void;
}

export function ClinicalInfoEditDialog({
  open,
  onOpenChange,
  clientId,
  client,
  onSuccess,
}: ClinicalInfoEditDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      child_diagnosis: [],
      child_diagnosis_codes: [],
      child_primary_concerns: "",
      child_aba_history: "",
      child_other_therapies: "",
      child_pediatrician_name: "",
      child_pediatrician_phone: "",
    },
  });

  // Reset form when dialog opens or client changes
  useEffect(() => {
    if (open) {
      form.reset({
        child_diagnosis: client.child_diagnosis || [],
        child_diagnosis_codes: client.child_diagnosis_codes || [],
        child_primary_concerns: client.child_primary_concerns || "",
        child_aba_history: client.child_aba_history || "",
        child_other_therapies: client.child_other_therapies || "",
        child_pediatrician_name: client.child_pediatrician_name || "",
        child_pediatrician_phone: client.child_pediatrician_phone || "",
      });
    }
  }, [open, client, form]);

  const selectedDiagnoses = form.watch("child_diagnosis") || [];

  const toggleDiagnosis = (diagnosis: string) => {
    const current = form.getValues("child_diagnosis") || [];
    if (current.includes(diagnosis)) {
      form.setValue(
        "child_diagnosis",
        current.filter((d) => d !== diagnosis)
      );
    } else {
      form.setValue("child_diagnosis", [...current, diagnosis]);
    }
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const result = await updateClient(clientId, data);
      if (result.success) {
        onSuccess?.(data);
        onOpenChange(false);
      } else {
        form.setError("root", { message: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Clinical Information</DialogTitle>
          <DialogDescription>
            Update the client&apos;s diagnosis, clinical history, and medical contacts.
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
            <Label>Diagnosis</Label>
            <div className="flex flex-wrap gap-2">
              {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                <Button
                  key={diagnosis}
                  type="button"
                  variant={selectedDiagnoses.includes(diagnosis) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDiagnosis(diagnosis)}
                  className={cn(
                    "text-xs",
                    selectedDiagnoses.includes(diagnosis) && "bg-primary text-primary-foreground"
                  )}
                >
                  {diagnosis}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="child_primary_concerns">Primary Concerns</Label>
            <Textarea
              id="child_primary_concerns"
              {...form.register("child_primary_concerns")}
              placeholder="Describe the primary concerns or reasons for seeking services..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="child_aba_history">ABA History</Label>
            <Textarea
              id="child_aba_history"
              {...form.register("child_aba_history")}
              placeholder="Previous ABA therapy experience, if any..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="child_other_therapies">Other Therapies</Label>
            <Textarea
              id="child_other_therapies"
              {...form.register("child_other_therapies")}
              placeholder="Other therapies currently receiving (OT, Speech, etc.)..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="child_pediatrician_name">Pediatrician Name</Label>
              <Input
                id="child_pediatrician_name"
                {...form.register("child_pediatrician_name")}
                placeholder="Dr. Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="child_pediatrician_phone">Pediatrician Phone</Label>
              <Input
                id="child_pediatrician_phone"
                type="tel"
                {...form.register("child_pediatrician_phone")}
                placeholder="(555) 555-5555"
              />
              {form.formState.errors.child_pediatrician_phone && (
                <p className="text-xs text-destructive">{form.formState.errors.child_pediatrician_phone.message}</p>
              )}
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
