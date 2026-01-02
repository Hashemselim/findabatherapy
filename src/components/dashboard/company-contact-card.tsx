"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, CheckCircle2, Pencil, X, Phone, Mail, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyContact } from "@/lib/actions/listings";
import { useFormErrorHandler, FormErrorSummary } from "@/hooks/use-form-error-handler";

const companyContactSchema = z.object({
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z
    .string()
    .regex(/^[\d\s\-\(\)\+]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => {
      if (!val || val === "") return "";
      // Auto-prepend https:// if no protocol specified
      if (!val.match(/^https?:\/\//i)) {
        return `https://${val}`;
      }
      return val;
    })
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Please enter a valid website URL",
    }),
});

type CompanyContactFormValues = z.infer<typeof companyContactSchema>;

interface CompanyContactCardProps {
  initialData: {
    contactEmail: string;
    contactPhone: string | null;
    website: string | null;
  };
}

export function CompanyContactCard({ initialData }: CompanyContactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Current data state (updates after successful save)
  const [currentData, setCurrentData] = useState(initialData);

  const form = useForm<CompanyContactFormValues>({
    resolver: zodResolver(companyContactSchema),
    defaultValues: {
      contactEmail: initialData.contactEmail || "",
      contactPhone: initialData.contactPhone || "",
      website: initialData.website || "",
    },
  });

  const { formRef, hasErrors, errorCount } = useFormErrorHandler({
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
  });

  const handleSubmit = (values: CompanyContactFormValues) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateCompanyContact({
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || undefined,
        website: values.website || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Update current data state
      setCurrentData({
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || null,
        website: values.website || null,
      });

      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const handleCancel = () => {
    form.reset({
      contactEmail: currentData.contactEmail || "",
      contactPhone: currentData.contactPhone || "",
      website: currentData.website || "",
    });
    setError(null);
    setIsEditing(false);
  };

  // View Mode - Read-only display
  if (!isEditing) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Company Contact Info</CardTitle>
              <CardDescription className="mt-1">
                Contact details shown on your listing and used as defaults for locations
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 self-start">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved successfully
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="truncate text-foreground">
                  {currentData.contactEmail || <span className="italic text-muted-foreground">Not set</span>}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                <p className="truncate text-foreground">
                  {currentData.contactPhone || <span className="italic text-muted-foreground">Not set</span>}
                </p>
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                {currentData.website ? (
                  <a
                    href={currentData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-foreground hover:text-primary hover:underline"
                  >
                    {currentData.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <p className="italic text-muted-foreground">Not set</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit Mode - Full form
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Edit Company Contact Info</CardTitle>
            <CardDescription className="mt-1">
              Update your contact details. These are used as defaults for all locations.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="shrink-0 self-start">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@yourcompany.com"
                {...form.register("contactEmail")}
                disabled={isPending}
              />
              {form.formState.errors.contactEmail && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contactEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="(555) 123-4567"
                {...form.register("contactPhone")}
                disabled={isPending}
              />
              {form.formState.errors.contactPhone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contactPhone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="text"
                placeholder="yourcompany.com"
                {...form.register("website")}
                disabled={isPending}
              />
              {form.formState.errors.website && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 pt-2">
            {hasErrors && <FormErrorSummary errorCount={errorCount} />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
