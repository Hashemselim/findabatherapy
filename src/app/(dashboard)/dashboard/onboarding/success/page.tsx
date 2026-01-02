import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileRefresher } from "@/components/onboarding/profile-refresher";
import { OnboardingTracker } from "@/components/analytics/onboarding-tracker";
import { getListing } from "@/lib/actions/listings";
import { getProfile } from "@/lib/supabase/server";

export default async function OnboardingSuccessPage() {
  const [profile, listingResult] = await Promise.all([
    getProfile(),
    getListing(),
  ]);

  // If no profile or listing, redirect to onboarding
  if (!profile || !listingResult.success || !listingResult.data) {
    redirect("/dashboard/onboarding");
  }

  const listing = listingResult.data;
  const planTier = listing.profile.planTier;
  const isFreePlan = planTier === "free";

  // Determine message based on plan
  const getTitle = () => {
    switch (planTier) {
      case "pro":
        return "Your Pro listing is live!";
      case "enterprise":
        return "Your Enterprise listing is live!";
      default:
        return "Your listing is live!";
    }
  };

  const getSubtitle = () => {
    switch (planTier) {
      case "pro":
        return "Your Pro listing is now discoverable by families searching for ABA providers.";
      case "enterprise":
        return "Your Enterprise listing is live across all locations and featured on our homepage.";
      default:
        return "Families can now find you on Find ABA Therapy.";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Refresh profile to update sidebar (hide onboarding tab) */}
      <ProfileRefresher />
      {/* PostHog onboarding completion tracking */}
      <OnboardingTracker step="success" stepNumber={4} totalSteps={4} isComplete />

      {/* Success Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>

      {/* Plan Badge */}
      <Badge className="mb-4 rounded-full border-primary/30 bg-primary/10 px-4 py-1 text-primary">
        {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
      </Badge>

      {/* Title & Subtitle */}
      <h1 className="text-3xl font-semibold text-foreground">{getTitle()}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{getSubtitle()}</p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/dashboard">
            Go to dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href={`/provider/${listing.slug}`} target="_blank">
            View your public listing
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Free Plan Upgrade CTA */}
      {isFreePlan && (
        <Card className="mt-10 max-w-md border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Want to stand out?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro for priority search placement, direct contact
              forms, photo galleries, and more.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/billing">
                See Pro benefits
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* What's Next */}
      <div className="mt-10 max-w-md text-left">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          What&apos;s Next
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <span className="text-muted-foreground">
              Your listing is now indexed and searchable by families
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <span className="text-muted-foreground">
              You can update your profile anytime from the dashboard
            </span>
          </li>
          {!isFreePlan && (
            <li className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
              <span className="text-muted-foreground">
                Add photos and videos to make your listing more engaging
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
