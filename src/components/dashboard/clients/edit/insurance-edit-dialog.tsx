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
  insuranceTypeSchema,
  insuranceStatusSchema,
  subscriberRelationshipSchema,
  INSURANCE_TYPE_OPTIONS,
  INSURANCE_STATUS_OPTIONS,
  SUBSCRIBER_RELATIONSHIP_OPTIONS,
  type ClientInsurance,
} from "@/lib/validations/clients";
import { INSURANCE_OPTIONS } from "@/lib/validations/onboarding";
import { addClientInsurance, updateClientInsurance } from "@/lib/actions/clients";

// Explicitly define the form schema to avoid type inference issues with .default()
const formSchema = z.object({
  insurance_name: z.string().max(200).optional().or(z.literal("")),
  insurance_type: insuranceTypeSchema.optional(),
  is_primary: z.boolean().optional(),
  effective_date: z.string().optional().or(z.literal("")),
  expiration_date: z.string().optional().or(z.literal("")),
  member_id: z.string().max(100).optional().or(z.literal("")),
  group_number: z.string().max(100).optional().or(z.literal("")),
  plan_name: z.string().max(200).optional().or(z.literal("")),
  subscriber_relationship: subscriberRelationshipSchema.optional(),
  status: insuranceStatusSchema.optional(),
  copay_amount: z.number().min(0).optional(),
  coinsurance_percentage: z.number().min(0).max(100).optional(),
  deductible_total: z.number().min(0).optional(),
  deductible_remaining: z.number().min(0).optional(),
  oop_max_total: z.number().min(0).optional(),
  oop_max_remaining: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof formSchema>;

interface InsuranceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  insurance?: ClientInsurance & { id: string };
  onSuccess?: (insurance: ClientInsurance & { id: string }) => void;
}

export function InsuranceEditDialog({
  open,
  onOpenChange,
  clientId,
  insurance,
  onSuccess,
}: InsuranceEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!insurance?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      insurance_name: insurance?.insurance_name || "",
      insurance_type: insurance?.insurance_type,
      is_primary: insurance?.is_primary || false,
      effective_date: insurance?.effective_date || "",
      expiration_date: insurance?.expiration_date || "",
      member_id: insurance?.member_id || "",
      group_number: insurance?.group_number || "",
      plan_name: insurance?.plan_name || "",
      subscriber_relationship: insurance?.subscriber_relationship,
      status: insurance?.status || "pending_verification",
      copay_amount: insurance?.copay_amount,
      coinsurance_percentage: insurance?.coinsurance_percentage,
      deductible_total: insurance?.deductible_total,
      deductible_remaining: insurance?.deductible_remaining,
      oop_max_total: insurance?.oop_max_total,
      oop_max_remaining: insurance?.oop_max_remaining,
      notes: insurance?.notes || "",
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      if (isEditing && insurance.id) {
        const result = await updateClientInsurance(insurance.id, data);
        if (result.success) {
          onSuccess?.({ ...data, id: insurance.id } as ClientInsurance & { id: string });
          onOpenChange(false);
        } else if (!result.success) {
          form.setError("root", { message: result.error });
        }
      } else {
        const result = await addClientInsurance(clientId, data);
        if (result.success && result.data) {
          onSuccess?.({ ...data, id: result.data.id } as ClientInsurance & { id: string });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Insurance" : "Add Insurance"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the insurance information."
              : "Add a new insurance record for this client."}
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
              <Label htmlFor="insurance_name">Insurance Provider</Label>
              <Select
                value={form.watch("insurance_name") || ""}
                onValueChange={(value) => form.setValue("insurance_name", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurance" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_type">Insurance Type</Label>
              <Select
                value={form.watch("insurance_type") || ""}
                onValueChange={(value) => form.setValue("insurance_type", value as FormValues["insurance_type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member_id">Member ID</Label>
              <Input
                id="member_id"
                {...form.register("member_id")}
                placeholder="Member ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_number">Group Number</Label>
              <Input
                id="group_number"
                {...form.register("group_number")}
                placeholder="Group number"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan_name">Plan Name</Label>
              <Input
                id="plan_name"
                {...form.register("plan_name")}
                placeholder="Plan name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriber_relationship">Subscriber Relationship</Label>
              <Select
                value={form.watch("subscriber_relationship") || ""}
                onValueChange={(value) => form.setValue("subscriber_relationship", value as FormValues["subscriber_relationship"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIBER_RELATIONSHIP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                {...form.register("effective_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                {...form.register("expiration_date")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                  {INSURANCE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copay_amount">Copay Amount ($)</Label>
              <Input
                id="copay_amount"
                type="number"
                step="0.01"
                min="0"
                {...form.register("copay_amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes about this insurance..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_primary" className="text-sm font-medium">
                Primary Insurance
              </Label>
              <p className="text-xs text-muted-foreground">
                Mark this as the primary insurance for billing
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
              {isEditing ? "Save Changes" : "Add Insurance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
