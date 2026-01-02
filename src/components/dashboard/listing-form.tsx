"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Loader2, Save, CheckCircle2, Pencil, X, Building2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateListing, updateAgencyName } from "@/lib/actions/listings";
import { LogoUploader } from "@/components/dashboard/logo-uploader";
import { useFormErrorHandler, FormErrorSummary } from "@/hooks/use-form-error-handler";

const listingFormSchema = z.object({
  agencyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
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
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

interface ListingFormProps {
  initialData: {
    agencyName: string;
    slug: string;
    headline: string | null;
    description: string | null;
    summary: string | null;
    logoUrl: string | null;
  };
}

export function ListingForm({ initialData }: ListingFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Current data state (updates after successful save)
  const [currentData, setCurrentData] = useState({
    ...initialData,
  });

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      agencyName: initialData.agencyName || "",
      headline: initialData.headline || "",
      description: initialData.description || "",
      summary: initialData.summary || "",
    },
  });

  const { formRef, hasErrors, errorCount } = useFormErrorHandler({
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
  });

  const handleSubmit = (values: ListingFormValues) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      let newSlug = currentData.slug;

      // Update agency name if changed (this also updates the slug)
      if (values.agencyName !== currentData.agencyName) {
        const nameResult = await updateAgencyName(values.agencyName);

        if (!nameResult.success) {
          setError(nameResult.error);
          return;
        }

        // Get the new slug from the response
        if (nameResult.data?.newSlug) {
          newSlug = nameResult.data.newSlug;
        }
      }

      // Update listing details
      const listingResult = await updateListing({
        headline: values.headline,
        description: values.description,
        summary: values.summary || undefined,
      });

      if (!listingResult.success) {
        setError(listingResult.error);
        return;
      }

      // Update current data state with new slug
      setCurrentData({
        agencyName: values.agencyName,
        slug: newSlug,
        headline: values.headline,
        description: values.description,
        summary: values.summary || null,
        logoUrl: initialData.logoUrl,
      });

      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    });
  };

  const handleCancel = () => {
    // Reset form to current data
    form.reset({
      agencyName: currentData.agencyName || "",
      headline: currentData.headline || "",
      description: currentData.description || "",
      summary: currentData.summary || "",
    });
    setError(null);
    setIsEditing(false);
  };

  // View Mode - Read-only display
  if (!isEditing) {
    const descriptionTruncated = currentData.description && currentData.description.length > 200;

    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Company Details</CardTitle>
              <CardDescription className="mt-1">Your company information visible to families</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 self-start">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved successfully
            </div>
          )}

          {/* Logo and Company Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
              {currentData.logoUrl ? (
                <Image
                  src={currentData.logoUrl}
                  alt="Company logo"
                  width={64}
                  height={64}
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{currentData.agencyName}</p>
              <p className="text-sm text-muted-foreground font-mono">/provider/{currentData.slug}</p>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Headline</p>
            <p className="text-foreground">
              {currentData.headline || <span className="italic text-muted-foreground">No headline set</span>}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
            {currentData.description ? (
              <div>
                <p className="text-foreground whitespace-pre-wrap">
                  {showFullDescription || !descriptionTruncated
                    ? currentData.description
                    : `${currentData.description.slice(0, 200)}...`}
                </p>
                {descriptionTruncated && (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {showFullDescription ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No description set</p>
            )}
          </div>

          {/* Summary */}
          {currentData.summary && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
              <p className="text-foreground">{currentData.summary}</p>
            </div>
          )}
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
            <CardTitle>Edit Company Details</CardTitle>
            <CardDescription className="mt-1">
              Update your company information. Click Save when done.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="shrink-0 self-start">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Logo Uploader */}
          <LogoUploader currentLogoUrl={initialData.logoUrl} />

          <div className="space-y-2">
            <Label htmlFor="agencyName">Company Name</Label>
            <Input
              id="agencyName"
              placeholder="Your ABA Practice Name"
              {...form.register("agencyName")}
              disabled={isPending}
            />
            {form.formState.errors.agencyName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.agencyName.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Changing your company name will update your listing URL. Old links to <span className="font-mono">/provider/{currentData.slug}</span> will no longer work.
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

          <div className="flex flex-col items-end gap-2">
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
