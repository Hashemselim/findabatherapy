"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  companyBasicsSchema,
  type CompanyBasics,
} from "@/lib/validations/onboarding";
import { updateProfileBasics, getOnboardingData } from "@/lib/actions/onboarding";
export default function OnboardingBasicsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyBasics>({
    resolver: zodResolver(companyBasicsSchema),
    defaultValues: {
      agencyName: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
    },
  });

  // Load existing data
  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data?.profile) {
        reset({
          agencyName: result.data.profile.agencyName || "",
          contactEmail: result.data.profile.contactEmail || "",
          contactPhone: result.data.profile.contactPhone || "",
          website: result.data.profile.website || "",
        });
      }
    }
    loadData();
  }, [reset]);

  async function onSubmit(data: CompanyBasics) {
    setError(null);

    startTransition(async () => {
      const result = await updateProfileBasics(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/onboarding/details");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Company basics</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your ABA therapy practice. This information will appear
          on your public listing.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Agency information</CardTitle>
            <CardDescription>
              Enter your company name and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="agencyName">
                Agency name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agencyName"
                placeholder="e.g., Bright Path ABA Services"
                {...register("agencyName")}
              />
              {errors.agencyName && (
                <p className="text-sm text-destructive">
                  {errors.agencyName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">
                Contact email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@yourpractice.com"
                {...register("contactEmail")}
              />
              {errors.contactEmail && (
                <p className="text-sm text-destructive">
                  {errors.contactEmail.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This email will be visible on your listing for families to contact you.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">
                  Phone number
                </Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  {...register("contactPhone")}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-destructive">
                    {errors.contactPhone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourpractice.com"
                  {...register("website")}
                />
                {errors.website && (
                  <p className="text-sm text-destructive">
                    {errors.website.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            className="rounded-full px-8"
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
