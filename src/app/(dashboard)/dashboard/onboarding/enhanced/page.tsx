"use client";

import { Suspense, useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Video, MessageSquare, MapPin, Users, Globe, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumFieldCard } from "@/components/onboarding/premium-field-card";
import { UpgradeBanner } from "@/components/onboarding/upgrade-banner";
import { PaidSuccessBanner } from "@/components/onboarding/paid-success-banner";
import { getOnboardingData, updatePremiumAttributes } from "@/lib/actions/onboarding";
import { getPaymentStatus } from "@/lib/actions/billing";
import {
  LANGUAGE_OPTIONS,
  DIAGNOSIS_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/lib/validations/onboarding";
import type { PlanTier } from "@/lib/plans/features";

// Age range options
const AGE_OPTIONS = Array.from({ length: 100 }, (_, i) => i);

function EnhancedPageLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[#5788FF]" />
    </div>
  );
}

function EnhancedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment status
  const [isPaid, setIsPaid] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>("free");

  // Check if user just came from successful payment
  const paymentSuccess = searchParams.get("payment") === "success";

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
      const [onboardingResult, paymentResult] = await Promise.all([
        getOnboardingData(),
        getPaymentStatus(),
      ]);

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

        setPlanTier((onboardingResult.data.profile?.planTier || "free") as PlanTier);
      }

      if (paymentResult.success && paymentResult.data) {
        setIsPaid(paymentResult.data.isPaid);
        setPlanTier(paymentResult.data.planTier);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  function toggleArrayItem(array: string[], item: string, field: keyof typeof formData) {
    const currentArray = array as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    setFormData((prev) => ({ ...prev, [field]: newArray }));
  }

  async function handleUpgrade(plan: "pro" | "enterprise") {
    router.push(`/dashboard/billing/checkout?plan=${plan}&return_to=onboarding`);
  }

  async function handleContinueFree() {
    setError(null);

    startTransition(async () => {
      const result = await updatePremiumAttributes(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/onboarding/review");
    });
  }

  async function handleContinue() {
    setError(null);

    startTransition(async () => {
      const result = await updatePremiumAttributes(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/onboarding/review");
    });
  }

  if (isLoading) {
    return <EnhancedPageLoading />;
  }

  // Determine if user has selected a paid plan (Pro or Enterprise)
  const hasPaidPlanSelected = planTier === "pro" || planTier === "enterprise";
  // User can access premium fields if they selected a paid plan OR just completed payment
  const canAccessPremiumFields = hasPaidPlanSelected || paymentSuccess;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Enhance Your Profile
        </h1>
        <p className="mt-1 text-muted-foreground sm:mt-2">
          Add more details to help families find you. Premium features help you stand out in search results.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Banner for users with paid plan selected (shows payment status) */}
      {canAccessPremiumFields && (
        <PaidSuccessBanner planTier={planTier} isPaid={isPaid || paymentSuccess} />
      )}

      {/* Upgrade Banner for Free users only */}
      {!canAccessPremiumFields && (
        <UpgradeBanner
          onUpgradePro={() => handleUpgrade("pro")}
          onUpgradeEnterprise={() => handleUpgrade("enterprise")}
          disabled={isPending}
        />
      )}

      {/* Premium Fields */}
      <div className="space-y-6">
        {/* Ages Served */}
        <PremiumFieldCard
          title="Ages Served"
          description="Specify the age range you serve to help families find appropriate care"
          isPaid={canAccessPremiumFields}
        >
          <div className="flex items-center gap-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Select
                value={formData.agesServedMin.toString()}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, agesServedMin: parseInt(val) }))}
                disabled={!canAccessPremiumFields || isPending}
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
                disabled={!canAccessPremiumFields || isPending}
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
        </PremiumFieldCard>

        {/* Languages */}
        <PremiumFieldCard
          title="Languages Spoken"
          description="Help multilingual families find providers who speak their language"
          isPaid={canAccessPremiumFields}
        >
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
                  } ${!canAccessPremiumFields ? "pointer-events-none opacity-60" : ""}`}
                >
                  <Checkbox
                    checked={formData.languages.includes(language)}
                    onCheckedChange={() => toggleArrayItem(formData.languages, language, "languages")}
                    disabled={!canAccessPremiumFields || isPending}
                  />
                  <span className="text-sm">{language}</span>
                </label>
              ))}
            </div>
          </div>
        </PremiumFieldCard>

        {/* Diagnoses */}
        <PremiumFieldCard
          title="Diagnoses Supported"
          description="Specify which diagnoses your team specializes in treating"
          isPaid={canAccessPremiumFields}
        >
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
                  } ${!canAccessPremiumFields ? "pointer-events-none opacity-60" : ""}`}
                >
                  <Checkbox
                    checked={formData.diagnoses.includes(diagnosis)}
                    onCheckedChange={() => toggleArrayItem(formData.diagnoses, diagnosis, "diagnoses")}
                    disabled={!canAccessPremiumFields || isPending}
                  />
                  <span className="text-sm">{diagnosis}</span>
                </label>
              ))}
            </div>
          </div>
        </PremiumFieldCard>

        {/* Clinical Specialties */}
        <PremiumFieldCard
          title="Clinical Specialties"
          description="Highlight your specialized services and areas of expertise"
          isPaid={canAccessPremiumFields}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {SPECIALTY_OPTIONS.map((specialty) => (
              <label
                key={specialty}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  formData.clinicalSpecialties.includes(specialty)
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:bg-muted/50"
                } ${!canAccessPremiumFields ? "pointer-events-none opacity-60" : ""}`}
              >
                <Checkbox
                  checked={formData.clinicalSpecialties.includes(specialty)}
                  onCheckedChange={() => toggleArrayItem(formData.clinicalSpecialties, specialty, "clinicalSpecialties")}
                  disabled={!canAccessPremiumFields || isPending}
                />
                <span className="text-sm">{specialty}</span>
              </label>
            ))}
          </div>
        </PremiumFieldCard>

        {/* Video Embed */}
        <PremiumFieldCard
          title="Video Embed"
          description="Add a YouTube or Vimeo video to showcase your practice"
          isPaid={canAccessPremiumFields}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Video className="h-5 w-5" />
              <span className="text-sm">Paste a YouTube or Vimeo URL</span>
            </div>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={formData.videoUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
              disabled={!canAccessPremiumFields || isPending}
            />
          </div>
        </PremiumFieldCard>

        {/* Contact Form Toggle */}
        <PremiumFieldCard
          title="Contact Form"
          description="Allow families to contact you directly through your listing"
          isPaid={canAccessPremiumFields}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="contact-form-toggle" className="text-sm font-medium">
                  Enable Contact Form
                </Label>
                <p className="text-xs text-muted-foreground">
                  Families can send you inquiries directly from your profile
                </p>
              </div>
            </div>
            <Switch
              id="contact-form-toggle"
              checked={formData.contactFormEnabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, contactFormEnabled: checked }))}
              disabled={!canAccessPremiumFields || isPending}
            />
          </div>
        </PremiumFieldCard>

        {/* Additional Locations Note */}
        <PremiumFieldCard
          title="Additional Locations"
          description="Add multiple service locations beyond your primary location"
          isPaid={canAccessPremiumFields}
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {canAccessPremiumFields
                ? "You can add additional locations from your dashboard after completing onboarding."
                : "Upgrade to Pro to add up to 5 locations, or Enterprise for unlimited locations."}
            </p>
          </div>
        </PremiumFieldCard>

        {/* Photo Gallery Note */}
        <PremiumFieldCard
          title="Photo Gallery"
          description="Showcase your facility with up to 10 photos"
          isPaid={canAccessPremiumFields}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-full items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {canAccessPremiumFields
                  ? "You can upload photos from your dashboard after completing onboarding."
                  : "Upgrade to add photos to your listing."}
              </p>
            </div>
          </div>
        </PremiumFieldCard>
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
        <div className="flex flex-col gap-2 sm:flex-row">
          {!canAccessPremiumFields && (
            <>
              <Button
                onClick={() => handleUpgrade("pro")}
                disabled={isPending}
                className="w-full rounded-full border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2] sm:w-auto"
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="ghost"
                onClick={handleContinueFree}
                disabled={isPending}
                className="w-full rounded-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
          {canAccessPremiumFields && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingEnhancedPage() {
  return (
    <Suspense fallback={<EnhancedPageLoading />}>
      <EnhancedPageContent />
    </Suspense>
  );
}
