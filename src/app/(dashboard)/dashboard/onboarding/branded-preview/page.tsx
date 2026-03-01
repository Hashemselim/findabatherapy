"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Palette,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeOnboarding, getOnboardingData } from "@/lib/actions/onboarding";
import { getPaymentStatus } from "@/lib/actions/billing";
import { createCheckoutSession } from "@/lib/stripe/actions";
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

export default function OnboardingPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier>("free");
  const [error, setError] = useState<string | null>(null);

  const paymentSuccess = searchParams.get("payment") === "success";
  const isPro = planTier !== "free";
  const slug = data?.listing?.slug || null;
  const agencyName = data?.profile?.agencyName || "Your Agency";

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

  function handleGoLive() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession("pro", "month", "onboarding");
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else if (!result.success) {
        setError(result.error);
      } else {
        setError("Failed to start checkout. Please try again.");
      }
    });
  }

  function handleContinuePreview() {
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

  function handlePublish() {
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

  return (
    <div className="space-y-6">
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

      <div className="text-center">
        <Badge className="mb-4 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Profile Complete
        </Badge>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Preview your listing
        </h1>
        <p className="mt-2 mx-auto max-w-lg text-muted-foreground">
          Here&apos;s what families will see. Go Live to activate branded pages, CRM, and all Pro features.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Listing Preview Card */}
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden border-border/60">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              {agencyName}
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

            {/* Languages */}
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

      {/* Branded Page Preview Link */}
      {slug && (
        <Card className="mx-auto max-w-2xl border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Branded Agency Page
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A shareable page for {agencyName} with your logo, services, and intake funnel
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  behaviorwork.com/p/{slug}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    window.open(`/p/${slug}`, "_blank", "noopener")
                  }
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Preview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Features Grid */}
      <div className="mx-auto max-w-2xl grid gap-3 sm:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Branded Contact Form
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Receive inquiries directly from families
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                CRM & Communications
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Unlimited clients, templates, and automation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Branded Careers Page
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Attract qualified candidates with a professional hub
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Analytics & Insights
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Track views, clicks, and referral sources
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Go Live CTA */}
      {isPro ? (
        <div className="mx-auto max-w-2xl rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            You&apos;re all set!
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your Pro plan is active. Publish your listing to go live on FindABATherapy.org.
          </p>
          <div className="mt-5">
            <Button
              onClick={handlePublish}
              disabled={isPending}
              size="lg"
              className="rounded-full px-8"
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
      ) : (
        <div className="mx-auto max-w-2xl rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Ready to go live?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Activate branded pages, CRM, communication templates, analytics, and all Pro features.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={handleGoLive}
              disabled={isPending}
              size="lg"
              className="rounded-full px-8"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Go Live — $79/mo
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleContinuePreview}
              disabled={isPending}
              size="lg"
              className="rounded-full text-muted-foreground"
            >
              Continue exploring in preview mode
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Cancel anytime. Your listing is published on the free plan too.
          </p>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/onboarding/location")}
          disabled={isPending}
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
