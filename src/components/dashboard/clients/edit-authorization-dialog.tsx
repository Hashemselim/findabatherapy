"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { updateClientAuthorization } from "@/lib/actions/clients";
import {
  AUTH_PAYOR_TYPE_OPTIONS,
  AUTH_STATUS_OPTIONS,
  BILLING_CODE_OPTIONS,
  type AuthPayorType,
  type AuthStatus,
  type ClientAuthorization,
} from "@/lib/validations/clients";

// Common ABA service types
const SERVICE_TYPE_OPTIONS = [
  { value: "assessment", label: "Assessment (97151)" },
  { value: "direct_treatment", label: "Direct Treatment (97153)" },
  { value: "supervision", label: "BCBA Supervision (97155)" },
  { value: "family_guidance", label: "Family Guidance (97156)" },
  { value: "group_treatment", label: "Group Treatment (97154)" },
  { value: "other", label: "Other" },
] as const;

// Form schema
const authorizationFormSchema = z.object({
  payor_type: z.string().optional(),
  service_type: z.string().optional(),
  billing_code: z.string().optional(),
  auth_reference_number: z.string().optional(),
  treatment_requested: z.string().optional(),
  units_requested: z.union([z.number().int().min(0), z.string().transform(v => v === "" ? undefined : parseInt(v, 10))]).optional(),
  units_used: z.union([z.number().int().min(0), z.string().transform(v => v === "" ? undefined : parseInt(v, 10))]).optional(),
  units_per_week_authorized: z.union([z.number().int().min(0), z.string().transform(v => v === "" ? undefined : parseInt(v, 10))]).optional(),
  rate_per_unit: z.union([z.number().min(0), z.string().transform(v => v === "" ? undefined : parseFloat(v))]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  requires_prior_auth: z.boolean().optional(),
  notes: z.string().optional(),
});

type AuthorizationFormValues = {
  payor_type?: string;
  service_type?: string;
  billing_code?: string;
  auth_reference_number?: string;
  treatment_requested?: string;
  units_requested?: number | string;
  units_used?: number | string;
  units_per_week_authorized?: number | string;
  rate_per_unit?: number | string;
  start_date?: string;
  end_date?: string;
  status?: string;
  requires_prior_auth?: boolean;
  notes?: string;
};

interface EditAuthorizationDialogProps {
  authorization: ClientAuthorization & { id: string };
  trigger?: React.ReactNode;
}

export function EditAuthorizationDialog({
  authorization,
  trigger,
}: EditAuthorizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AuthorizationFormValues>({
    resolver: zodResolver(authorizationFormSchema),
    defaultValues: {
      payor_type: authorization.payor_type || undefined,
      service_type: authorization.service_type || undefined,
      billing_code: authorization.billing_code || undefined,
      auth_reference_number: authorization.auth_reference_number || undefined,
      treatment_requested: authorization.treatment_requested || undefined,
      units_requested: authorization.units_requested || undefined,
      units_used: authorization.units_used || 0,
      units_per_week_authorized: authorization.units_per_week_authorized || undefined,
      rate_per_unit: authorization.rate_per_unit || undefined,
      start_date: authorization.start_date || undefined,
      end_date: authorization.end_date || undefined,
      status: authorization.status || "pending",
      requires_prior_auth: authorization.requires_prior_auth || false,
      notes: authorization.notes || undefined,
    },
  });

  // Reset form when authorization changes
  useEffect(() => {
    form.reset({
      payor_type: authorization.payor_type || undefined,
      service_type: authorization.service_type || undefined,
      billing_code: authorization.billing_code || undefined,
      auth_reference_number: authorization.auth_reference_number || undefined,
      treatment_requested: authorization.treatment_requested || undefined,
      units_requested: authorization.units_requested || undefined,
      units_used: authorization.units_used || 0,
      units_per_week_authorized: authorization.units_per_week_authorized || undefined,
      rate_per_unit: authorization.rate_per_unit || undefined,
      start_date: authorization.start_date || undefined,
      end_date: authorization.end_date || undefined,
      status: authorization.status || "pending",
      requires_prior_auth: authorization.requires_prior_auth || false,
      notes: authorization.notes || undefined,
    });
  }, [authorization, form]);

  const parseNumber = (value: number | string | undefined): number | undefined => {
    if (value === undefined || value === "") return undefined;
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  };

  const onSubmit = async (data: AuthorizationFormValues) => {
    setError(null);

    startTransition(async () => {
      const result = await updateClientAuthorization(authorization.id, {
        payor_type: data.payor_type as AuthPayorType | undefined,
        service_type: data.service_type,
        billing_code: data.billing_code,
        auth_reference_number: data.auth_reference_number,
        treatment_requested: data.treatment_requested,
        units_requested: parseNumber(data.units_requested),
        units_used: parseNumber(data.units_used),
        units_per_week_authorized: parseNumber(data.units_per_week_authorized),
        rate_per_unit: parseNumber(data.rate_per_unit),
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status as AuthStatus | undefined,
        requires_prior_auth: data.requires_prior_auth,
        notes: data.notes,
      });

      if (!result.success) {
        setError(result.error || "Failed to update authorization");
        return;
      }

      setOpen(false);
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 w-full">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Authorization</DialogTitle>
          <DialogDescription>
            Update the authorization details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payor Type</Label>
              <Select
                value={form.watch("payor_type") || ""}
                onValueChange={(value) => form.setValue("payor_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payor type" />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_PAYOR_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status") || "pending"}
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service & Billing */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select
                value={form.watch("service_type") || ""}
                onValueChange={(value) => form.setValue("service_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing Code</Label>
              <Select
                value={form.watch("billing_code") || ""}
                onValueChange={(value) => form.setValue("billing_code", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select billing code" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auth Reference */}
          <div className="space-y-2">
            <Label>Authorization Reference Number</Label>
            <Input
              {...form.register("auth_reference_number")}
              placeholder="Auth reference number"
            />
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...form.register("end_date")} />
            </div>
          </div>

          {/* Units */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Units Requested</Label>
              <Input
                type="number"
                min={0}
                {...form.register("units_requested")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Units Used</Label>
              <Input
                type="number"
                min={0}
                {...form.register("units_used")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Units/Week Authorized</Label>
              <Input
                type="number"
                min={0}
                {...form.register("units_per_week_authorized")}
                placeholder="0"
              />
            </div>
          </div>

          {/* Rate */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rate Per Unit ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                {...form.register("rate_per_unit")}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Treatment Requested</Label>
              <Input
                {...form.register("treatment_requested")}
                placeholder="e.g., ABA Therapy"
              />
            </div>
          </div>

          {/* Prior Auth Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Requires Prior Authorization</Label>
              <p className="text-sm text-muted-foreground">
                Does this service require prior authorization approval?
              </p>
            </div>
            <Switch
              checked={form.watch("requires_prior_auth") || false}
              onCheckedChange={(checked) =>
                form.setValue("requires_prior_auth", checked)
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Additional notes about this authorization..."
              rows={3}
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
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
