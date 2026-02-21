import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Crown,
  ExternalLink,
  Palette,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

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
  const isPro = planTier === "pro" || planTier === "enterprise";

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Refresh profile to update sidebar (hide onboarding tab) */}
      <ProfileRefresher />
      {/* PostHog onboarding completion tracking */}
      <OnboardingTracker step="success" stepNumber={6} totalSteps={6} isComplete />

      {/* Success Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>

      {/* Plan Badge */}
      <Badge
        className={`mb-4 rounded-full px-4 py-1 ${
          isPro
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground"
        }`}
      >
        {isPro ? (
          <>
            <Crown className="mr-1 h-3 w-3" />
            {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
          </>
        ) : (
          "Free Plan"
        )}
      </Badge>

      {/* Title & Subtitle */}
      <h1 className="text-3xl font-semibold text-foreground">
        {isPro ? "You're all set!" : "Your listing is live!"}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {isPro
          ? "Your agency is live with branded pages, client management tools, and hiring features."
          : "Families can now find you on FindABATherapy. Share your listing and start connecting with families."}
      </p>

      {/* Primary Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>

        {isPro ? (
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href={`/p/${listing.slug}`} target="_blank">
              <Palette className="mr-2 h-4 w-4" />
              Share Your Branded Page
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href={`/provider/${listing.slug}`} target="_blank">
              <Share2 className="mr-2 h-4 w-4" />
              Share Your Listing
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Free Plan Upgrade CTA */}
      {!isPro && (
        <Card className="mt-10 max-w-md border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Upgrade to activate branded pages
              </h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Get a professional branded page, client intake forms, communication
              templates, analytics, and hiring tools.
            </p>
            <Button asChild className="w-full rounded-full">
              <Link href="/dashboard/settings/billing">
                <Crown className="mr-2 h-4 w-4" />
                See Pro Benefits
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* What's Next */}
      <div className="mt-10 max-w-md text-left">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What&apos;s Next
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span className="text-muted-foreground">
              Your listing is now indexed and searchable by families
            </span>
          </li>
          {isPro && (
            <li className="flex items-start gap-3 text-sm">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-muted-foreground">
                <Link
                  href="/dashboard/clients"
                  className="font-medium text-primary hover:underline"
                >
                  Add your first client
                </Link>{" "}
                to start managing your caseload
              </span>
            </li>
          )}
          <li className="flex items-start gap-3 text-sm">
            <Briefcase className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span className="text-muted-foreground">
              <Link
                href="/dashboard/team/jobs"
                className="font-medium text-emerald-600 hover:underline"
              >
                Post your first job
              </Link>{" "}
              to start building your team
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span className="text-muted-foreground">
              You can update your profile anytime from the dashboard
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
