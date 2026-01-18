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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientStatusSchema,
  fundingSourceSchema,
  CLIENT_STATUS_OPTIONS,
  CLIENT_FUNDING_SOURCE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  type Client,
} from "@/lib/validations/clients";
import { updateClient } from "@/lib/actions/clients";

// Explicitly define the form schema to avoid type inference issues
const formSchema = z.object({
  status: clientStatusSchema.optional(),
  referral_source: z.string().max(100).optional().or(z.literal("")),
  referral_date: z.string().optional().or(z.literal("")),
  service_start_date: z.string().optional().or(z.literal("")),
  service_end_date: z.string().optional().or(z.literal("")),
  discharge_reason: z.string().max(500).optional().or(z.literal("")),
  funding_source: fundingSourceSchema.optional(),
  notes: z.string().max(10000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

interface StatusEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  client: Client;
  onSuccess?: (client: Partial<Client>) => void;
}

export function StatusEditDialog({
  open,
  onOpenChange,
  clientId,
  client,
  onSuccess,
}: StatusEditDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "inquiry",
      referral_source: "",
      referral_date: "",
      service_start_date: "",
      service_end_date: "",
      discharge_reason: "",
      funding_source: undefined,
      notes: "",
    },
  });

  // Reset form when dialog opens or client changes
  useEffect(() => {
    if (open) {
      form.reset({
        status: client.status || "inquiry",
        referral_source: client.referral_source || "",
        referral_date: client.referral_date || "",
        service_start_date: client.service_start_date || "",
        service_end_date: client.service_end_date || "",
        discharge_reason: client.discharge_reason || "",
        funding_source: client.funding_source,
        notes: client.notes || "",
      });
    }
  }, [open, client, form]);

  const status = form.watch("status");

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
          <DialogTitle>Edit Status & Service Information</DialogTitle>
          <DialogDescription>
            Update the client&apos;s status and service details.
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
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status") || ""}
              onValueChange={(value) => form.setValue("status", value as FormValues["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="referral_source">Referral Source</Label>
              <Select
                value={form.watch("referral_source") || ""}
                onValueChange={(value) => form.setValue("referral_source", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_date">Referral Date</Label>
              <Input
                id="referral_date"
                type="date"
                {...form.register("referral_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funding_source">Funding Source</Label>
            <Select
              value={form.watch("funding_source") || ""}
              onValueChange={(value) => form.setValue("funding_source", value as FormValues["funding_source"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select funding source" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_FUNDING_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service_start_date">Service Start Date</Label>
              <Input
                id="service_start_date"
                type="date"
                {...form.register("service_start_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_end_date">Service End Date</Label>
              <Input
                id="service_end_date"
                type="date"
                {...form.register("service_end_date")}
              />
            </div>
          </div>

          {status === "discharged" && (
            <div className="space-y-2">
              <Label htmlFor="discharge_reason">Discharge Reason</Label>
              <Textarea
                id="discharge_reason"
                {...form.register("discharge_reason")}
                placeholder="Reason for discharge..."
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="General notes about this client..."
              rows={4}
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
