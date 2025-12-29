"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { updateListing, getListingAttributes, updateListingAttributes } from "@/lib/actions/listings";
import { SERVICE_MODE_OPTIONS, INSURANCE_OPTIONS } from "@/lib/validations/onboarding";
import { LogoUploader } from "@/components/dashboard/logo-uploader";

const listingFormSchema = z.object({
  headline: z
    .string()
    .min(10, "Headline must be at least 10 characters")
    .max(150, "Headline must be less than 150 characters"),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000, "Description must be less than 2000 characters"),
  summary: z
    .string()
    .max(300, "Summary must be less than 300 characters")
    .optional()
    .or(z.literal("")),
  serviceModes: z
    .array(z.string())
    .min(1, "Please select at least one service mode"),
  insurances: z
    .array(z.string())
    .min(1, "Please select at least one insurance option"),
  isAcceptingClients: z.boolean(),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  initialData: {
    agencyName: string;
    headline: string | null;
    description: string | null;
    summary: string | null;
    serviceModes: string[];
    isAcceptingClients: boolean;
    logoUrl: string | null;
  };
  initialInsurances?: string[];
}

export function ListingForm({ initialData, initialInsurances }: ListingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [insurancesLoaded, setInsurancesLoaded] = useState(!!initialInsurances);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      headline: initialData.headline || "",
      description: initialData.description || "",
      summary: initialData.summary || "",
      serviceModes: initialData.serviceModes || [],
      insurances: initialInsurances || [],
      isAcceptingClients: initialData.isAcceptingClients,
    },
  });

  // Load insurances from attributes if not provided
  useEffect(() => {
    if (!initialInsurances) {
      const loadInsurances = async () => {
        const result = await getListingAttributes();
        if (result.success && result.data) {
          const insurances = (result.data.insurances as string[]) || [];
          form.setValue("insurances", insurances);
        }
        setInsurancesLoaded(true);
      };
      loadInsurances();
    }
  }, [initialInsurances, form]);

  const handleSubmit = (values: ListingFormValues) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      // Update listing details
      const listingResult = await updateListing({
        headline: values.headline,
        description: values.description,
        summary: values.summary || undefined,
        serviceModes: values.serviceModes,
        isAcceptingClients: values.isAcceptingClients,
      });

      if (!listingResult.success) {
        setError(listingResult.error);
        return;
      }

      // Update insurances (stored in attributes)
      const attrResult = await updateListingAttributes({
        insurances: values.insurances,
        isAcceptingClients: values.isAcceptingClients,
      });

      if (!attrResult.success) {
        setError(attrResult.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const serviceModes = form.watch("serviceModes");
  const insurances = form.watch("insurances");

  const toggleServiceMode = (value: string) => {
    const current = form.getValues("serviceModes");
    if (current.includes(value)) {
      form.setValue(
        "serviceModes",
        current.filter((m) => m !== value),
        { shouldValidate: true }
      );
    } else {
      form.setValue("serviceModes", [...current, value], { shouldValidate: true });
    }
  };

  const toggleInsurance = (value: string) => {
    const current = form.getValues("insurances");
    if (current.includes(value)) {
      form.setValue(
        "insurances",
        current.filter((i) => i !== value),
        { shouldValidate: true }
      );
    } else {
      form.setValue("insurances", [...current, value], { shouldValidate: true });
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>
          Update your listing information. Changes are saved automatically when you click Save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved successfully
            </div>
          )}

          {/* Logo Uploader */}
          <LogoUploader currentLogoUrl={initialData.logoUrl} />

          <div className="space-y-2">
            <Label htmlFor="agencyName">Company Name</Label>
            <Input
              id="agencyName"
              value={initialData.agencyName}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Company name cannot be changed here. Contact support if you need to update it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="Compassionate ABA therapy for every child"
              {...form.register("headline")}
              disabled={isPending}
            />
            {form.formState.errors.headline && (
              <p className="text-sm text-destructive">
                {form.formState.errors.headline.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              A brief tagline that appears in search results
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={6}
              placeholder="Tell families about your approach, values, and what makes your agency unique..."
              {...form.register("description")}
              disabled={isPending}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Detailed description shown on your listing page (50-2000 characters)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary (Optional)</Label>
            <Textarea
              id="summary"
              rows={2}
              placeholder="A short summary for search result previews..."
              {...form.register("summary")}
              disabled={isPending}
            />
            {form.formState.errors.summary && (
              <p className="text-sm text-destructive">
                {form.formState.errors.summary.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Brief summary shown in search results (max 300 characters)
            </p>
          </div>

          <div className="space-y-3">
            <Label>Service Modes</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICE_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    serviceModes.includes(option.value)
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={serviceModes.includes(option.value)}
                    onCheckedChange={() => toggleServiceMode(option.value)}
                    disabled={isPending}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.serviceModes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.serviceModes.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Insurance Accepted</Label>
            <p className="text-xs text-muted-foreground">
              Select all insurance plans your practice accepts
            </p>
            {!insurancesLoaded ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {INSURANCE_OPTIONS.map((insurance) => (
                  <label
                    key={insurance}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      insurances.includes(insurance)
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={insurances.includes(insurance)}
                      onCheckedChange={() => toggleInsurance(insurance)}
                      disabled={isPending}
                    />
                    <span className="text-sm">{insurance}</span>
                  </label>
                ))}
              </div>
            )}
            {form.formState.errors.insurances && (
              <p className="text-sm text-destructive">
                {form.formState.errors.insurances.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <Label htmlFor="acceptingClients" className="cursor-pointer">
                Accepting New Clients
              </Label>
              <p className="text-sm text-muted-foreground">
                Show families that you have availability
              </p>
            </div>
            <Switch
              id="acceptingClients"
              checked={form.watch("isAcceptingClients")}
              onCheckedChange={(checked) =>
                form.setValue("isAcceptingClients", checked)
              }
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
