"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOnboardingData } from "@/lib/actions/onboarding";
import { createCheckoutSession } from "@/lib/stripe/actions";

export default function OnboardingBrandedPreviewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [agencyName, setAgencyName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data) {
        setAgencyName(result.data.profile?.agencyName || "Your Agency");
        setSlug(result.data.listing?.slug || null);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  function handleUpgrade() {
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

  function handleContinueFree() {
    router.push("/dashboard/onboarding/review");
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
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Your Branded Pages
        </h1>
        <p className="mt-2 mx-auto max-w-lg text-muted-foreground">
          See what you get with a Pro plan — branded pages that you can share
          with doctors, schools, and families as a referral sheet and intake
          funnel.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Star Card: Branded Agency Page */}
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Crown className="h-3 w-3" />
            Pro
          </span>
        </div>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Branded Agency Page
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A professional, shareable page for{" "}
                <span className="font-medium text-foreground">
                  {agencyName}
                </span>{" "}
                — complete with your logo, services, locations, and a direct
                intake funnel. Share it with referral partners and families.
              </p>
              {slug && (
                <div className="mt-3 flex items-center gap-2">
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supporting Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
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
                Receive inquiries directly from families through your branded
                page
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
                Branded Intake Form
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Collect client information with a professional intake process
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
                Attract qualified candidates with a professional careers hub
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
                Parent Resources Hub
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Share ABA resources and guides with families on your page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Upgrade to Pro
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Activate branded pages, client lifecycle management, communication
          templates, analytics, and hiring tools.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={handleUpgrade}
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
                Upgrade to Pro — $79/mo
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleContinueFree}
            disabled={isPending}
            size="lg"
            className="rounded-full text-muted-foreground"
          >
            Continue with Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Cancel anytime. 14-day free trial available.
        </p>
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/onboarding/enhanced")}
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
