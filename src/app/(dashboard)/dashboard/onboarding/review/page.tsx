"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
  Globe,
  Mail,
  Check,
  Sparkles,
  Crown,
  Lock,
  Users,
  Video,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { completeOnboarding, getOnboardingData, updateProfilePlan } from "@/lib/actions/onboarding";
import { getPaymentStatus } from "@/lib/actions/billing";
import { SERVICE_MODE_OPTIONS } from "@/lib/validations/onboarding";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/plans/features";

interface OnboardingData {
  profile: {
    agencyName: string;
    contactEmail: string;
    contactPhone: string | null;
    website: string | null;
    planTier: string;
  } | null;
  listing: {
    id: string;
    slug: string;
    headline: string | null;
    description: string | null;
    serviceModes: string[];
    isAcceptingClients: boolean;
    videoUrl: string | null;
  } | null;
  location: {
    street: string | null;
    city: string;
    state: string;
    postalCode: string | null;
    serviceRadiusMiles: number;
    latitude: number | null;
    longitude: number | null;
  } | null;
  attributes: Record<string, unknown>;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Basic listing to get started",
    features: [
      "1 location",
      "Standard search placement",
      "Basic profile",
      "Insurance display",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "Everything you need to stand out",
    popular: true,
    features: [
      "Priority search placement",
      "Direct contact form",
      "Photo gallery (up to 10)",
      "Video embed",
      "Up to 5 locations",
      "Verified badge",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$149",
    period: "/month",
    description: "For multi-location agencies",
    features: [
      "All Pro features",
      "Unlimited locations",
      "Homepage placement",
      "Priority support",
    ],
  },
];

function formatServiceMode(mode: string): string {
  const option = SERVICE_MODE_OPTIONS.find((o) => o.value === mode);
  return option?.label || mode;
}

export default function OnboardingReviewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");

  // Payment status
  const [isPaid, setIsPaid] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>("free");

  useEffect(() => {
    async function loadData() {
      const [onboardingResult, paymentResult] = await Promise.all([
        getOnboardingData(),
        getPaymentStatus(),
      ]);

      if (onboardingResult.success && onboardingResult.data) {
        setData(onboardingResult.data);
        setSelectedPlan(onboardingResult.data.profile?.planTier || "free");
      }

      if (paymentResult.success && paymentResult.data) {
        setIsPaid(paymentResult.data.isPaid);
        setPlanTier(paymentResult.data.planTier);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const isPaidPlanSelected = selectedPlan !== "free";

  async function handleGoLive() {
    setError(null);

    startTransition(async () => {
      // Update plan if user changed it (only for unpaid users selecting a plan)
      if (!isPaid && selectedPlan !== data?.profile?.planTier) {
        await updateProfilePlan(selectedPlan as "free" | "pro" | "enterprise");
      }

      const result = await completeOnboarding(true);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // For already paid users, go to success
      // For unpaid users selecting paid plan, go to checkout
      // For unpaid users selecting free, go to success
      if (isPaid) {
        router.push("/dashboard/onboarding/success");
      } else if (isPaidPlanSelected) {
        router.push(`/dashboard/billing/checkout?plan=${selectedPlan}`);
      } else {
        router.push("/dashboard/onboarding/success");
      }
    });
  }

  async function handleContinueWithFree() {
    setError(null);

    startTransition(async () => {
      await updateProfilePlan("free");

      const result = await completeOnboarding(true);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/onboarding/success");
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#5788FF]" />
      </div>
    );
  }

  const insurances = (data?.attributes?.insurances as string[]) || [];
  const languages = (data?.attributes?.languages as string[]) || [];
  const diagnoses = (data?.attributes?.diagnoses as string[]) || [];
  const specialties = (data?.attributes?.clinical_specialties as string[]) || [];
  const agesServed = data?.attributes?.ages_served as { min?: number; max?: number } | undefined;
  const contactFormEnabled = data?.attributes?.contact_form_enabled as boolean | undefined;
  const planConfig = PLAN_CONFIGS[planTier];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <Badge className="mb-4 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Profile Complete
        </Badge>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Your listing is ready to go live
        </h1>
        <p className="mt-1 text-muted-foreground sm:mt-2">
          {isPaid
            ? "Review your listing preview and publish."
            : "Review your listing preview and choose a plan to publish."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Two Column Layout on Desktop */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Listing Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Listing Preview
            </h2>
            {isPaid && (
              <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {planConfig.displayName} Plan
              </Badge>
            )}
          </div>
          <Card className="border-border/60 overflow-hidden">
            {/* Preview Header */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6">
              <h3 className="text-xl font-semibold text-foreground">
                {data?.profile?.agencyName || "Your Practice"}
              </h3>
              {data?.listing?.headline && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.listing.headline}
                </p>
              )}
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Location */}
              {data?.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-[#5788FF]" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {data.location.city}, {data.location.state}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Serves within {data.location.serviceRadiusMiles} miles
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                {data?.profile?.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#5788FF]" />
                    <span className="text-sm text-foreground">
                      {data.profile.contactEmail}
                    </span>
                  </div>
                )}
                {data?.profile?.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[#5788FF]" />
                    <span className="text-sm text-foreground">
                      {data.profile.contactPhone}
                    </span>
                  </div>
                )}
                {data?.profile?.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-[#5788FF]" />
                    <span className="text-sm text-foreground truncate">
                      {data.profile.website}
                    </span>
                  </div>
                )}
              </div>

              {/* Service Modes */}
              {data?.listing?.serviceModes && data.listing.serviceModes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Service Modes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.listing.serviceModes.map((mode) => (
                      <Badge key={mode} variant="secondary" className="text-xs">
                        {formatServiceMode(mode)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Insurances */}
              {insurances.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Insurance Accepted
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {insurances.slice(0, 4).map((ins) => (
                      <Badge key={ins} variant="outline" className="text-xs">
                        {ins}
                      </Badge>
                    ))}
                    {insurances.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{insurances.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Premium Fields - Only show if paid */}
              {isPaid ? (
                <>
                  {/* Ages Served */}
                  {agesServed && (agesServed.min !== undefined || agesServed.max !== undefined) && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-[#5788FF]" />
                      <span className="text-sm text-foreground">
                        Ages {agesServed.min ?? 0} - {agesServed.max ?? 21} years
                      </span>
                    </div>
                  )}

                  {/* Languages */}
                  {languages.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Languages
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {languages.map((lang) => (
                          <Badge key={lang} variant="outline" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnoses */}
                  {diagnoses.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Diagnoses Supported
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {diagnoses.slice(0, 3).map((diag) => (
                          <Badge key={diag} variant="outline" className="text-xs">
                            {diag}
                          </Badge>
                        ))}
                        {diagnoses.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{diagnoses.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Specialties */}
                  {specialties.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Specialties
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {specialties.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{specialties.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Video & Contact Form Status */}
                  <div className="flex flex-wrap gap-3">
                    {data?.listing?.videoUrl && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <Video className="h-4 w-4" />
                        <span>Video added</span>
                      </div>
                    )}
                    {contactFormEnabled && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <MessageSquare className="h-4 w-4" />
                        <span>Contact form enabled</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Premium Fields Locked Message for Unpaid */
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Premium profile details available with Pro plan</span>
                  </div>
                </div>
              )}

              {/* Accepting Clients Status */}
              {data?.listing?.isAcceptingClients && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Accepting new clients</span>
                </div>
              )}
            </CardContent>

            {/* Edit Link */}
            <div className="border-t border-border/60 bg-muted/30 px-6 py-3">
              <Link
                href="/dashboard/onboarding/details"
                className="text-sm text-[#5788FF] hover:underline"
              >
                Edit listing details
              </Link>
            </div>
          </Card>
        </div>

        {/* Right: Plan Selection (only for unpaid users) OR Current Plan Display (paid users) */}
        <div className="space-y-4">
          {isPaid ? (
            /* Paid User: Show current plan badge */
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your Plan
              </h2>
              <Card className="border-2 border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-lg">{planConfig.displayName}</CardTitle>
                    <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">${planConfig.pricing.monthly.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{planConfig.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {planConfig.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Unpaid User: Show plan selection */
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Choose Your Plan
              </h2>
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      selectedPlan === plan.id
                        ? "border-primary shadow-md"
                        : "border-border/60 hover:border-border"
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {plan.id === "enterprise" && (
                            <Crown className="h-4 w-4 text-[#5788FF]" />
                          )}
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {plan.popular && (
                            <Badge className="rounded-full border-[#FEE720] bg-[#FEE720] text-[#333333]">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                            selectedPlan === plan.id
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {selectedPlan === plan.id && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="h-3 w-3 text-[#5788FF] flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {isPaidPlanSelected && (
                <p className="text-xs text-center text-muted-foreground">
                  Cancel anytime. No long-term contract.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/onboarding/enhanced")}
          disabled={isPending}
          className="w-full rounded-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!isPaid && isPaidPlanSelected && (
            <Button
              variant="ghost"
              onClick={handleContinueWithFree}
              disabled={isPending}
              className="w-full text-muted-foreground sm:w-auto"
            >
              Continue Free
            </Button>
          )}
          <Button
            onClick={handleGoLive}
            disabled={isPending}
            size="lg"
            className={cn(
              "w-full rounded-full px-8 sm:w-auto",
              !isPaid && selectedPlan === "pro" &&
                "border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                {isPaid
                  ? "Publish Listing"
                  : isPaidPlanSelected
                    ? "Upgrade & Go Live"
                    : "Publish Free Listing"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
