"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { completeOnboarding, getOnboardingData } from "@/lib/actions/onboarding";
import { getPaymentStatus } from "@/lib/actions/billing";
import { SERVICE_MODE_OPTIONS } from "@/lib/validations/onboarding";
import { type PlanTier } from "@/lib/plans/features";

interface OnboardingData {
  profile: {
    agencyName: string;
    contactEmail: string;
    contactPhone: string | null;
    website: string | null;
    planTier: string;
    billingInterval: string;
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

function formatServiceMode(mode: string): string {
  const option = SERVICE_MODE_OPTIONS.find((o) => o.value === mode);
  return option?.label || mode;
}

export default function OnboardingReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [planTier, setPlanTier] = useState<PlanTier>("free");

  const paymentSuccess = searchParams.get("payment") === "success";

  useEffect(() => {
    async function loadData() {
      const [onboardingResult, paymentResult] = await Promise.all([
        getOnboardingData(),
        getPaymentStatus(),
      ]);

      if (onboardingResult.success && onboardingResult.data) {
        setData(onboardingResult.data);
      }

      if (paymentResult.success && paymentResult.data) {
        setPlanTier(paymentResult.data.planTier);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const isPro = planTier !== "free";

  async function handleGoLive() {
    setError(null);

    startTransition(async () => {
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
          Review your listing preview and publish it to the directory.
        </p>
      </div>

      {/* Payment Success Banner */}
      {paymentSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <Crown className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              Pro plan activated!
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Your branded pages and premium features are now available.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Listing Preview */}
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Listing Preview
          </h2>
          {isPro && (
            <Badge className="rounded-full border-primary/30 bg-primary/10 text-primary">
              <Crown className="mr-1 h-3 w-3" />
              Pro
            </Badge>
          )}
        </div>

        <Card className="overflow-hidden border-border/60">
          {/* Preview Header */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              {data?.profile?.agencyName || "Your Agency"}
            </h3>
            {data?.listing?.headline && (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.listing.headline}
              </p>
            )}
          </div>

          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Location */}
            {data?.location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#5788FF]" />
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
                <div className="flex min-w-0 items-center gap-3">
                  <Globe className="h-4 w-4 flex-shrink-0 text-[#5788FF]" />
                  <span className="truncate text-sm text-foreground">
                    {data.profile.website}
                  </span>
                </div>
              )}
            </div>

            {/* Service Modes */}
            {data?.listing?.serviceModes && data.listing.serviceModes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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

            {/* Ages Served — now free for all */}
            {agesServed && (agesServed.min !== undefined || agesServed.max !== undefined) && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-[#5788FF]" />
                <span className="text-sm text-foreground">
                  Ages {agesServed.min ?? 0} - {agesServed.max ?? 21} years
                </span>
              </div>
            )}

            {/* Languages — now free for all */}
            {languages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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

            {/* Diagnoses — now free for all */}
            {diagnoses.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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

            {/* Specialties — now free for all */}
            {specialties.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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

            {/* Video & Contact Form Status (Pro features) */}
            {isPro && (
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

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/onboarding/branded-preview")}
          disabled={isPending}
          className="w-full rounded-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleGoLive}
          disabled={isPending}
          size="lg"
          className="w-full rounded-full px-8 sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              Publish Listing
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
