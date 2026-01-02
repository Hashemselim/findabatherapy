"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingTracker } from "@/components/analytics/onboarding-tracker";
import { useFormErrorHandler, FormErrorSummary } from "@/hooks/use-form-error-handler";
import {
  getOnboardingData,
  updateProfileBasics,
  updateListingDetails,
} from "@/lib/actions/onboarding";
import { SERVICES_OFFERED_OPTIONS } from "@/lib/validations/onboarding";

// Schema for practice details (Step 1)
const practiceDetailsSchema = z.object({
  // Practice basics
  agencyName: z.string().min(2, "Practice name must be at least 2 characters"),
  contactEmail: z.string().email("Please enter a valid email"),
  contactPhone: z.string().optional().or(z.literal("")),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  // Listing details
  headline: z.string().max(150, "Tagline must be less than 150 characters").optional().or(z.literal("")),
  description: z.string().min(50, "About text must be at least 50 characters").max(2000, "About text must be less than 2000 characters"),
  // Services offered
  servicesOffered: z.array(z.string()).min(1, "Please select at least one service"),
});

type PracticeDetailsData = z.infer<typeof practiceDetailsSchema>;

export default function OnboardingDetailsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<PracticeDetailsData>({
    resolver: zodResolver(practiceDetailsSchema),
    defaultValues: {
      agencyName: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      headline: "",
      description: "",
      servicesOffered: ["aba"], // Default to ABA therapy
    },
  });

  const { formRef, hasErrors, errorCount } = useFormErrorHandler({
    errors,
    isSubmitting,
  });

  const description = watch("description");
  const selectedServices = watch("servicesOffered") || [];

  function toggleService(service: string) {
    const current = selectedServices || [];
    if (current.includes(service)) {
      setValue(
        "servicesOffered",
        current.filter((s) => s !== service),
        { shouldValidate: true }
      );
    } else {
      setValue("servicesOffered", [...current, service], { shouldValidate: true });
    }
  }

  // Load existing data
  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data) {
        const { profile, listing, attributes } = result.data;

        reset({
          agencyName: profile?.agencyName || "",
          contactEmail: profile?.contactEmail || "",
          contactPhone: profile?.contactPhone || "",
          website: profile?.website || "",
          headline: listing?.headline || "",
          description: listing?.description || "",
          servicesOffered: (attributes?.services_offered as string[]) || ["aba"],
        });
      }
      setIsLoading(false);
    }
    loadData();
  }, [reset]);

  async function onSubmit(data: PracticeDetailsData) {
    setError(null);

    startTransition(async () => {
      // Update profile basics
      const profileResult = await updateProfileBasics({
        agencyName: data.agencyName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || undefined,
        website: data.website || undefined,
      });

      if (!profileResult.success) {
        setError(profileResult.error);
        return;
      }

      // Update listing details (creates listing if needed)
      const detailsResult = await updateListingDetails({
        headline: data.headline || "",
        description: data.description,
        serviceModes: ["in_home"], // Default, will be updated in location step
        servicesOffered: data.servicesOffered,
      });

      if (!detailsResult.success) {
        setError(detailsResult.error);
        return;
      }

      // Navigate to Location & Services (Step 2)
      router.push("/dashboard/onboarding/location");
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#5788FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* PostHog onboarding tracking */}
      <OnboardingTracker step="details" stepNumber={1} totalSteps={4} />

      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Tell us about your ABA practice
        </h1>
        <p className="mt-1 text-muted-foreground sm:mt-2">
          This information will appear on your public listing. You can update it anytime.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Practice Info */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Practice Information</CardTitle>
            <CardDescription>
              Basic details about your ABA therapy practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agencyName">
                Practice Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agencyName"
                placeholder="ABC ABA Therapy"
                {...register("agencyName")}
                disabled={isPending}
              />
              {errors.agencyName && (
                <p className="text-sm text-destructive">{errors.agencyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Tagline (optional)</Label>
              <Input
                id="headline"
                placeholder="Compassionate ABA therapy for every child"
                {...register("headline")}
                disabled={isPending}
              />
              {errors.headline && (
                <p className="text-sm text-destructive">{errors.headline.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A brief description that appears in search results
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                About Your Practice <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                rows={5}
                placeholder="Tell families about your approach, values, and what makes your practice unique..."
                {...register("description")}
                disabled={isPending}
              />
              <div className="flex justify-between text-xs">
                {errors.description ? (
                  <p className="text-destructive">{errors.description.message}</p>
                ) : (
                  <span className="text-muted-foreground">50-2000 characters</span>
                )}
                <span className={description?.length > 2000 ? "text-destructive" : "text-muted-foreground"}>
                  {description?.length || 0} / 2000
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Offered */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Services Offered</CardTitle>
            <CardDescription>
              Select all therapy services your practice provides <span className="text-destructive">*</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES_OFFERED_OPTIONS.map((service) => (
                <label
                  key={service.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedServices.includes(service.value)
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedServices.includes(service.value)}
                    onCheckedChange={() => toggleService(service.value)}
                    disabled={isPending}
                  />
                  <span className="text-sm">{service.label}</span>
                </label>
              ))}
            </div>
            {errors.servicesOffered && (
              <p className="mt-2 text-sm text-destructive">{errors.servicesOffered.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How families can reach you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@yourpractice.com"
                  {...register("contactEmail")}
                  disabled={isPending}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone (optional)</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  {...register("contactPhone")}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.yourpractice.com"
                {...register("website")}
                disabled={isPending}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col items-end gap-2">
          {hasErrors && <FormErrorSummary errorCount={errorCount} />}
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            className="w-full rounded-full px-8 sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
