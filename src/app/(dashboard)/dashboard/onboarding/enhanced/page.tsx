"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Users, Globe, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOnboardingData, updatePremiumAttributes } from "@/lib/actions/onboarding";
import {
  LANGUAGE_OPTIONS,
  DIAGNOSIS_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/lib/validations/onboarding";

// Age range options
const AGE_OPTIONS = Array.from({ length: 100 }, (_, i) => i);

export default function OnboardingEnhancedPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    agesServedMin: 0,
    agesServedMax: 21,
    languages: [] as string[],
    diagnoses: [] as string[],
    clinicalSpecialties: [] as string[],
    videoUrl: "",
    contactFormEnabled: true,
  });

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const onboardingResult = await getOnboardingData();

      if (onboardingResult.success && onboardingResult.data) {
        const attrs = onboardingResult.data.attributes;
        const agesServed = attrs.ages_served as { min?: number; max?: number } | undefined;

        setFormData({
          agesServedMin: agesServed?.min ?? 0,
          agesServedMax: agesServed?.max ?? 21,
          languages: (attrs.languages as string[]) || [],
          diagnoses: (attrs.diagnoses as string[]) || [],
          clinicalSpecialties: (attrs.clinical_specialties as string[]) || [],
          videoUrl: onboardingResult.data.listing?.videoUrl || "",
          contactFormEnabled: (attrs.contact_form_enabled as boolean) ?? true,
        });
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  function toggleArrayItem(array: string[], item: string, field: keyof typeof formData) {
    const newArray = array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  }

  function handleContinue() {
    setError(null);

    startTransition(async () => {
      const result = await updatePremiumAttributes(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/onboarding/branded-preview");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Add Your Details
        </h1>
        <p className="mt-1 text-muted-foreground sm:mt-2">
          These details help families find you in search results. The more you add, the better your listing.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Ages Served */}
        <div className="rounded-xl border border-border/60 p-5">
          <Label className="text-base font-semibold">Ages Served</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Specify the age range you serve to help families find appropriate care
          </p>
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Select
                value={formData.agesServedMin.toString()}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, agesServedMin: parseInt(val) }))}
                disabled={isPending}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((age) => (
                    <SelectItem key={age} value={age.toString()}>
                      {age} {age === 0 ? "(birth)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">to</span>
              <Select
                value={formData.agesServedMax.toString()}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, agesServedMax: parseInt(val) }))}
                disabled={isPending}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((age) => (
                    <SelectItem key={age} value={age.toString()}>
                      {age}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="rounded-xl border border-border/60 p-5">
          <Label className="text-base font-semibold">Languages Spoken</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Help multilingual families find providers who speak their language
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-5 w-5" />
              <span className="text-sm">Select all languages your team speaks</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {LANGUAGE_OPTIONS.map((language) => (
                <label
                  key={language}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    formData.languages.includes(language)
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.languages.includes(language)}
                    onCheckedChange={() => toggleArrayItem(formData.languages, language, "languages")}
                    disabled={isPending}
                  />
                  <span className="text-sm">{language}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        <div className="rounded-xl border border-border/60 p-5">
          <Label className="text-base font-semibold">Diagnoses Supported</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Specify which diagnoses your team specializes in treating
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="h-5 w-5" />
              <span className="text-sm">Select all diagnoses you support</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                <label
                  key={diagnosis}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                    formData.diagnoses.includes(diagnosis)
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={formData.diagnoses.includes(diagnosis)}
                    onCheckedChange={() => toggleArrayItem(formData.diagnoses, diagnosis, "diagnoses")}
                    disabled={isPending}
                  />
                  <span className="text-sm">{diagnosis}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Clinical Specialties */}
        <div className="rounded-xl border border-border/60 p-5">
          <Label className="text-base font-semibold">Clinical Specialties</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Highlight your specialized services and areas of expertise
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SPECIALTY_OPTIONS.map((specialty) => (
              <label
                key={specialty}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  formData.clinicalSpecialties.includes(specialty)
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={formData.clinicalSpecialties.includes(specialty)}
                  onCheckedChange={() => toggleArrayItem(formData.clinicalSpecialties, specialty, "clinicalSpecialties")}
                  disabled={isPending}
                />
                <span className="text-sm">{specialty}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/onboarding/location")}
          disabled={isPending}
          className="w-full rounded-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
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
    </div>
  );
}
